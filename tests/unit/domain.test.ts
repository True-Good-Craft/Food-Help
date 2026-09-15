import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import siteJSON from '../../examples/exampleville/site.json' with { type: 'json' };
import sourceJSON from '../../examples/exampleville/resources.json' with { type: 'json' };
import { assertDataset, assertSite, assertUsage, publicDataset, validDate } from '../../src/validation.ts';
import { browseViewFromPath, distanceKm, localTime, resourceBrowseViews, scheduledStatus } from '../../src/domain.ts';
import type { Site, Dataset } from '../../src/types.ts';
const site = siteJSON as Site, source = sourceJSON as unknown as Dataset;
const fixture = () => structuredClone(source);
describe('authoring contracts and evidence', () => {
  it('accepts the fictional contract and rejects legacy/unknown schema fields', () => { expect(() => assertSite(site)).not.toThrow(); expect(() => assertDataset(source)).not.toThrow(); expect(() => assertDataset({ ...source, format: undefined })).toThrow(); expect(() => assertSite({ ...site, tenant: 'hidden' })).toThrow(); });
  it('rejects ambiguous origins, invalid timezones and analytics half-configuration', () => { for (const patch of [{ canonical_origin: 'https://example.invalid/path' }, { time_zone: 'Kingston' }, { analytics: { enabled: true } }, { analytics: { enabled: false, endpoint: 'https://metrics.invalid' } }]) expect(() => assertSite({ ...site, ...patch })).toThrow(); });
  it('rejects duplicate IDs, missing organizations and fabricated access without evidence', () => { const d = fixture(); d.resources.push(d.resources[0]!); expect(() => assertDataset(d)).toThrow(/Duplicate/); const missing = fixture(); missing.resources[0]!.organization_id = 'absent'; expect(() => assertDataset(missing)).toThrow(/organization/); const access = fixture(); access.resources[0]!.access.identification_required = 'no'; expect(() => assertDataset(access)).toThrow(/Known access needs evidence/); });
  it('validates calendar dates, evidence chronology and source references', () => { expect(validDate('2026-02-30')).toBe(false); expect(validDate('2024-02-29')).toBe(true); const d = fixture(); d.resources[0]!.schedule.evidence_ids = ['absent']; expect(() => assertDataset(d)).toThrow(/evidence/); d.resources[0]!.schedule.evidence_ids = []; d.resources[0]!.verification.reviewed_on = '2025-01-01'; expect(() => assertDataset(d)).toThrow(/chronology/); });
  it('rejects invalid intervals and duplicate weekdays', () => { const d = fixture(); d.resources[0]!.schedule.weekly[0]!.intervals = [{ opens: '17:00', closes: '09:00' }]; expect(() => assertDataset(d)).toThrow(/interval/); d.resources[0]!.schedule.weekly[0]!.intervals = []; d.resources[0]!.schedule.weekly.push(d.resources[0]!.schedule.weekly[1]!); expect(() => assertDataset(d)).toThrow(); });
  it('rejects event-level and provider-level aggregate data', () => { const usage = { schema_version: 1, deployment_id: site.deployment_id, period_start: '2026-08-01', period_end: '2026-08-31', generated_at: '2026-09-01', counts: { page_starts: 12, call_actions: null, directions_actions: 0, source_link_actions: 5, installation_signals: 0 } }; expect(() => assertUsage(usage, site)).not.toThrow(); expect(() => assertUsage({ ...usage, events: [] }, site)).toThrow(); expect(() => assertUsage({ ...usage, counts: { ...usage.counts, providers: {} } }, site)).toThrow(); expect(() => assertUsage({ ...usage, period_end: '2026-10-01' }, site)).toThrow(); });
  it('rejects another deployment and incompatible public data', () => { expect(() => publicDataset(source, 'other', 'wrong')).toThrow(); });
});
describe('published schedules, never live availability', () => {
  it('uses the deployment timezone and exclusive interval end', () => { const r = fixture().resources[0]!; expect(scheduledStatus(r, site, new Date('2026-09-07T08:00:00Z'))).toBe('scheduled_now'); expect(scheduledStatus(r, site, new Date('2026-09-07T16:00:00Z'))).toBe('not_scheduled_now'); });
  it('handles DST using local wall-clock time', () => { expect(localTime(new Date('2026-03-29T00:30:00Z'), 'Europe/London').time).toBe('00:30'); expect(localTime(new Date('2026-03-29T01:30:00Z'), 'Europe/London').time).toBe('02:30'); expect(localTime(new Date('2026-11-01T05:30:00Z'), 'America/Toronto').time).toBe('01:30'); expect(localTime(new Date('2026-11-01T06:30:00Z'), 'America/Toronto').time).toBe('01:30'); });
  it('keeps old reviews and unknown days uncertain', () => { const r = fixture().resources[0]!; expect(scheduledStatus(r, site, new Date('2026-12-07T12:00:00Z'))).toBe('unknown'); expect(scheduledStatus(r, site, new Date('2026-09-06T12:00:00Z'))).toBe('unknown'); });
  it('supports overnight intervals and explicit all-day exceptions', () => { const r = fixture().resources[0]!; r.schedule.weekly = [{ day: 1, state: 'published', intervals: [{ opens: '22:00', closes: '02:00', closes_next_day: true }] }]; expect(scheduledStatus(r, site, new Date('2026-09-08T00:00:00Z'))).toBe('scheduled_now'); r.schedule.exceptions = [{ date: '2026-09-08', confirmed: true, intervals: [], note: 'Closed', evidence_ids: ['example-source'] }]; expect(scheduledStatus(r, site, new Date('2026-09-08T00:00:00Z'))).toBe('not_scheduled_now'); });
  it('requires explicit evidence at a configured local warning date', () => { const s = structuredClone(site); s.jurisdiction = { coverage_through: '2026-12-31', warning_dates: [{ date: '2026-09-07', note: 'Verify special hours', source_url: 'https://example.invalid/date', checked_on: '2026-09-01' }] }; expect(scheduledStatus(fixture().resources[0]!, s, new Date('2026-09-07T12:00:00Z'))).toBe('unknown'); });
  it('computes stable approximate distances', () => { expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0); expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2); });
});
describe('browse views', () => {
  it('derives Emergency and Affordable membership only from resolved cost', () => {
    const r = fixture().resources[0]!;
    const cases = [
      ['free', ['emergency']],
      ['low_cost', ['affordable']],
      ['subsidized', ['affordable']],
      ['mixed', ['emergency', 'affordable']],
      ['unknown', []],
    ] as const;
    for (const [state, expected] of cases) {
      r.cost = { state, description: 'Reviewed cost' };
      expect(resourceBrowseViews(r)).toEqual(expected);
    }
    delete r.cost;
    expect(resourceBrowseViews(r)).toEqual([]);
  });
  it('recognizes the canonical Affordable path with or without its static index spelling', () => {
    expect(browseViewFromPath('/')).toBe('emergency');
    expect(browseViewFromPath('/affordable-food/')).toBe('affordable');
    expect(browseViewFromPath('/affordable-food')).toBe('affordable');
    expect(browseViewFromPath('/affordable-food/index.html')).toBe('affordable');
  });
});
