// SPDX-License-Identifier: MPL-2.0
import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import siteJSON from '../../deployments/kingston/site.json' with { type: 'json' };
import sourceJSON from '../../deployments/kingston/resources.json' with { type: 'json' };
import { inBrowseView, publishedSchedule, scheduledToday } from '../../src/domain.ts';
import { card, scheduleSummary } from '../../src/presentation.ts';
import type { Dataset, PublicDataset, Site } from '../../src/types.ts';

const site = siteJSON as unknown as Site, source = sourceJSON as unknown as Dataset;
const data = { ...source, deployment_id: site.deployment_id, dataset_version: '1', compatibility_id: 'x', data_updated_on: '2026-11-06' } as PublicDataset;
const byId = (id: string) => source.resources.find(resource => resource.id === id)!;
// Kingston is on Eastern Time: 14:00Z is 9 a.m. local in November.
const at = (local: string) => new Date(`${local}-05:00`);
const today = (view: 'emergency' | 'affordable', now: Date) => source.resources.filter(resource => inBrowseView(resource, view) && scheduledToday(resource, site, now)).map(resource => resource.id).sort();
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('Kingston published schedules and the today filter', () => {
  it('matches every listing whose published hours are today, on a weekday with no Lionhearts market', () => {
    const monday = at('2026-11-16T12:17:00');
    expect(today('emergency', monday)).toEqual(['brit-smith-social-market', 'loretta-meal-program', 'lunch-by-george', 'marthas-table', 'partners-in-mission', 'st-marys-drop-in', 'storehouse-of-hope']);
    expect(today('affordable', monday)).toEqual([]);
  });

  it('lists each Lionhearts market on its own market day', () => {
    expect(today('affordable', at('2026-11-17T09:00:00'))).toEqual(['lionhearts-market-seniors-association', 'lionhearts-market-ymca-wright-crescent']);
    expect(today('affordable', at('2026-11-18T09:00:00'))).toEqual(['lionhearts-market-kingston-east', 'lionhearts-market-rideau-heights']);
    expect(today('affordable', at('2026-11-19T09:00:00'))).toEqual(['lionhearts-market-isabel-turner', 'lionhearts-market-st-lawrence-college']);
    expect(today('affordable', at('2026-11-13T09:00:00'))).toEqual(['lionhearts-market-wj-henderson', 'lionhearts-market-ymca-wright-crescent']);
    expect(today('affordable', at('2026-11-13T15:00:00'))).toEqual(['lionhearts-market-wj-henderson']);
    expect(today('affordable', at('2026-11-21T09:00:00'))).toEqual(['lionhearts-market-artillery-park']);
  });

  it('treats dated market schedules as dates: open on a listed date, no service on other dates', () => {
    const slc = byId('lionhearts-market-st-lawrence-college'), wj = byId('lionhearts-market-wj-henderson');
    expect(publishedSchedule(slc, site, at('2026-11-19T09:00:00')).kind).toBe('later');
    expect(publishedSchedule(slc, site, at('2026-11-19T11:00:00')).kind).toBe('now');
    expect(scheduledToday(slc, site, at('2026-11-19T11:00:00'))).toBe(true);
    expect(publishedSchedule(slc, site, at('2026-11-19T12:00:00')).kind).toBe('ended');
    const monday = scheduleSummary(slc, site, at('2026-11-16T12:17:00'));
    expect(monday).toMatchObject({ kind: 'none', label: 'No published hours today', today: 'No service today' });
    expect(plain(monday.detail)).toBe('Next: Thu, Nov 19, 10 a.m.–12 p.m.');
    expect(plain(scheduleSummary(slc, site, at('2026-11-19T13:00:00')).detail)).toBe('Next: Thu, Dec 3, 10 a.m.–12 p.m.');
    expect(plain(scheduleSummary(wj, site, at('2026-11-16T12:17:00')).detail)).toBe('Next: Fri, Nov 27, 4–6 p.m.');
    expect(scheduledToday(wj, site, at('2026-11-27T17:30:00'))).toBe(true);
    // After the last published date there is nothing to go on: ask people to check, and do not guess a next date.
    const after = scheduleSummary(slc, site, at('2026-12-12T09:00:00'));
    expect(after.kind).toBe('unknown'); expect(after.detail).toBe('Call before travelling when you can.');
  });

  it('says "No service today" plainly and points to the next published day', () => {
    const seniors = scheduleSummary(byId('lionhearts-market-seniors-association'), site, at('2026-11-16T12:17:00'));
    expect(seniors.today).toBe('No service today'); expect(plain(seniors.detail)).toBe('Next: tomorrow, 10 a.m.–1 p.m.');
    expect(plain(scheduleSummary(byId('lionhearts-market-kingston-east'), site, at('2026-11-16T12:17:00')).detail)).toBe('Next: Wed, Nov 18, 10:00–11:30 a.m.');
  });

  it('counts a start-only day as later today before it starts, and never as open after', () => {
    const stall = byId('trellis-fresh-food-stall');
    const before = scheduleSummary(stall, site, at('2026-11-17T12:00:00'));
    expect(before.kind).toBe('later'); expect(scheduledToday(stall, site, at('2026-11-17T12:00:00'))).toBe(true);
    expect(plain(before.today)).toBe('From 1 p.m.; no set closing time');
    expect(scheduledToday(stall, site, at('2026-11-17T14:00:00'))).toBe(false);
    expect(publishedSchedule(stall, site, at('2026-11-17T14:00:00')).kind).toBe('unknown');
    expect(plain(scheduleSummary(stall, site, at('2026-11-16T12:00:00')).detail)).toBe('Next: tomorrow, from 1 p.m.');
  });

  it('keeps listings without published hours out of the filter and shows their own wording', () => {
    for (const id of ['good-food-box-kingston', 'salvation-army-pantry']) {
      const resource = byId(id);
      expect(scheduledToday(resource, site, at('2026-11-19T12:00:00'))).toBe(false);
      expect(scheduleSummary(resource, site, at('2026-11-19T12:00:00')).today).toBe(resource.schedule.note);
    }
  });

  it('shows no live-availability disclaimers or "by published schedule" wording on any card', () => {
    for (const now of [at('2026-11-16T12:17:00'), at('2026-11-19T09:00:00'), at('2026-12-12T09:00:00')]) {
      const html = source.resources.map(resource => card(resource, data, site, false, 3, now)).join('') + source.resources.map(resource => card(resource, data, site, true, 1, now)).join('');
      expect(html).not.toMatch(/live availability/i); expect(html).not.toMatch(/by published schedule/i);
    }
  });
});
