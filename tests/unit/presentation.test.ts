import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import siteJSON from '../../examples/exampleville/site.json' with { type: 'json' };
import sourceJSON from '../../examples/exampleville/resources.json' with { type: 'json' };
import { categoryFilter, categoryGroups, publishedSchedule, resourceInCategoryGroup, scheduledToday } from '../../src/domain.ts';
import { card, scheduleSummary } from '../../src/presentation.ts';
import { assertSite } from '../../src/validation.ts';
import type { Site, Dataset, PublicDataset } from '../../src/types.ts';
const site = siteJSON as Site, source = sourceJSON as unknown as Dataset;
const resource = () => structuredClone(source.resources[0]!);
describe('directory presentation and schedule decisions', () => {
  it('includes later-today hours, excludes ended hours, and labels appointments clearly', () => {
    const r = resource(), early = new Date('2026-09-07T07:00:00Z'), end = new Date('2026-09-07T16:00:00Z');
    expect(publishedSchedule(r, site, early).kind).toBe('later'); expect(scheduledToday(r, site, early)).toBe(true);
    expect(publishedSchedule(r, site, end).kind).toBe('ended'); expect(scheduledToday(r, site, end)).toBe(false);
    r.access.appointment_required = 'yes';
    expect(scheduleSummary(r, site, early).label).toBe('Appointments later today');
    expect(scheduleSummary(r, site, new Date('2026-09-07T10:00:00Z')).label).toBe('Appointment hours');
  });
  it('keeps unconfirmed, overdue, interrupted, and out-of-range services out of the today filter', () => {
    const now = new Date('2026-09-07T10:00:00Z');
    for (const change of [
      (r: ReturnType<typeof resource>) => { r.schedule.confirmed = false; },
      (r: ReturnType<typeof resource>) => { r.verification.reviewed_on = '2025-01-01'; },
      (r: ReturnType<typeof resource>) => { r.service_condition = 'temporarily_unavailable'; },
      (r: ReturnType<typeof resource>) => { r.schedule.valid_from = '2026-09-08'; },
      (r: ReturnType<typeof resource>) => { r.verification.state = 'needs_review'; },
    ]) { const r = resource(); change(r); expect(scheduledToday(r, site, now)).toBe(false); }
  });
  it('honours local warning dates and provider exceptions for future hours', () => {
    const s = structuredClone(site); s.jurisdiction = { coverage_through: '2026-09-30', warning_dates: [{ date: '2026-09-07', note: 'Confirm service', source_url: 'https://example.invalid/notice', checked_on: '2026-09-01' }] };
    const r = resource(), now = new Date('2026-09-07T07:00:00Z');
    expect(publishedSchedule(r, s, now).kind).toBe('unknown');
    r.schedule.exceptions = [{ date: '2026-09-07', confirmed: true, intervals: [{ opens: '14:00', closes: '16:00' }], note: 'Special hours', evidence_ids: ['example-source'] }];
    expect(publishedSchedule(r, s, now).kind).toBe('later');
    r.schedule.exceptions[0]!.intervals = []; expect(scheduledToday(r, s, now)).toBe(false);
    r.schedule.exceptions[0]!.confirmed = false; expect(publishedSchedule(r, s, now).kind).toBe('unknown');
  });
  it('retains overnight carry-in but does not import hours from before validity begins', () => {
    const r = resource(); r.schedule.weekly = [{ day: 1, state: 'published', intervals: [{ opens: '22:00', closes: '02:00', closes_next_day: true }] }];
    const now = new Date('2026-09-08T00:00:00Z'); expect(publishedSchedule(r, site, now).kind).toBe('now');
    r.schedule.valid_from = '2026-09-08'; expect(publishedSchedule(r, site, now).kind).toBe('unknown');
  });
  it('groups categories without changing facts and rejects ambiguous configuration', () => {
    const s = structuredClone(site); s.presentation = { category_groups: [{ id: 'take-home', label: 'Take-home food', categories: ['groceries', 'food_banks_pantries'] }] };
    expect(() => assertSite(s)).not.toThrow(); expect(categoryGroups(s, source.resources)).toHaveLength(1);
    s.presentation.category_groups!.push(s.presentation.category_groups![0]!); expect(() => assertSite(s)).toThrow(/Duplicate/);
    s.presentation.category_groups = [{ id: 'all', label: 'All', categories: ['groceries'] }]; expect(() => assertSite(s)).toThrow(/built in/);
    s.presentation.category_groups = [{ id: 'unknown', label: 'Unknown', categories: ['invented_category'] }]; expect(() => assertSite(s)).toThrow(/Unknown category/);
  });
  it('uses the primary category for configured filters and hides a redundant All types choice', () => {
    const s = structuredClone(site);
    s.presentation = { category_groups: [
      { id: 'meals', label: 'Meals', categories: ['prepared_meals'] },
      { id: 'groceries', label: 'Groceries', categories: ['groceries', 'food_banks_pantries'] },
      { id: 'markets', label: 'Markets', categories: ['community_markets'] }
    ] };
    const market = resource(); market.categories = ['community_markets', 'groceries', 'prepared_meals'];
    const marketOnly = categoryFilter(s, [market]);
    expect(marketOnly.groups.map(group => group.id)).toEqual(['markets']);
    expect(marketOnly.includeAll).toBe(false);
    expect(resourceInCategoryGroup(s, market, marketOnly.groups[0]!)).toBe(true);
    expect(resourceInCategoryGroup(s, market, s.presentation!.category_groups![1]!)).toBe(false);

    const groceries = resource(); groceries.categories = ['groceries'];
    const twoTypes = categoryFilter(s, [market, groceries]);
    expect(twoTypes.groups.map(group => group.id)).toEqual(['groceries', 'markets']);
    expect(twoTypes.includeAll).toBe(true);
  });
  it('renders a repeated purpose once, keeps links and warnings, and escapes author text', () => {
    const r = resource(); r.summary = 'A unique <support> description'; r.food_access_purpose = r.summary;
    r.notices = [{ id: 'warning', text: 'Call to confirm access', starts_on: '2026-09-01', evidence_ids: ['example-source'] }];
    const html = card(r, source as PublicDataset, site);
    expect(html.match(/A unique &lt;support&gt; description/g)).toHaveLength(1);
    expect(html).toContain('class="temporary-notice"'); expect(html).toContain(`/resources/${r.id}/`);
    expect(html).not.toContain('access.walk_in'); expect(html).toContain('Not confirmed');
  });
  it('keeps cost and eligibility prominent, labels browse membership, and links schedule evidence', () => {
    const r = resource();
    const html = card(r, source as PublicDataset, site);
    const details = html.indexOf('<details');
    expect(html).toContain('<span class="tag browse-view-tag">Emergency food</span>');
    expect(html).not.toContain('<span class="tag browse-view-tag">Affordable food</span>');
    expect(html.indexOf('Example: community residents.')).toBeLessThan(details);
    expect(html.indexOf('Fictional example of a free service.')).toBeLessThan(details);
    expect(html).toContain('href="https://providers.example.invalid/about"');
    expect(html).toContain('>Schedule and updates</a>');
    expect(html).toContain('href="https://providers.example.invalid/community-table"');
  });
  it('labels mixed-cost listings in both views and marks drafts unmistakably', () => {
    const r = resource();
    r.cost = { state: 'mixed', description: 'Free or lower-cost options.' };
    r.publication_status = 'draft';
    const html = card(r, source as PublicDataset, site);
    expect(html).toContain('data-browse-views="emergency affordable"');
    expect(html).toContain('>Emergency food</span>');
    expect(html).toContain('>Affordable food</span>');
    expect(html).toContain('Review draft — not included in the public directory');
  });
});
