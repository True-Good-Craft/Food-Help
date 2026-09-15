// SPDX-License-Identifier: MPL-2.0
import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import sourceJSON from '../../deployments/kingston/resources.json' with { type: 'json' };
import { assertDataset } from '../../src/validation.ts';
import type { Dataset, Resource } from '../../src/types.ts';

const source = sourceJSON as unknown as Dataset;
const lionhearts = source.resources.filter(resource => resource.organization_id === 'lionhearts');
const byId = (suffix: string) => lionhearts.find(resource => resource.id === `lionhearts-market-${suffix}`)!;
const weeklyInterval = (resource: Resource, day: number) => resource.schedule.weekly.find(item => item.day === day)?.intervals;

describe('Kingston Lionhearts publication', () => {
  it('uses one provider and eight reviewed, published, stable venue records', () => {
    expect(() => assertDataset(source)).not.toThrow();
    expect(source.organizations.filter(organization => organization.id === 'lionhearts')).toHaveLength(1);
    expect(lionhearts).toHaveLength(8);
    expect(new Set(lionhearts.map(resource => resource.id)).size).toBe(8);
    expect(new Set(lionhearts.map(resource => resource.location?.address?.street)).size).toBe(8);
    for (const resource of lionhearts) {
      expect(resource.publication_status).toBe('published');
      expect(resource.verification).toEqual({ reviewed_on: '2026-09-15', method: 'multiple_sources', state: 'partially_confirmed' });
      expect(resource.updated_on).toBe('2026-09-15');
    }
  });

  it('preserves the supplied visitor facts and precise direct-confirmation provenance', () => {
    for (const resource of lionhearts) {
      expect(resource.eligibility).toContain('Open to everyone — no income requirement.');
      expect(resource.cost).toEqual({ state: 'low_cost', description: 'Affordable food, with prices kept as low as possible.' });
      expect(resource.before_you_go).toContain('All payment methods accepted, including debit, credit and mobile payments.');
      expect(resource.categories).toEqual(expect.arrayContaining(['community_markets', 'groceries', 'prepared_meals']));
      expect(resource.limitations.join(' ')).toMatch(/selection varies by market session/i);
      expect(resource.limitations.join(' ')).toMatch(/not every product is confirmed Canadian or local/i);
      expect(resource.official_url).toBe('https://www.instagram.com/freshfoodmktygk/');
      expect(resource.phone).toBe('+16137660664');
      const relay = resource.evidence.find(evidence => evidence.id === 'jamie-provider-relay')!;
      expect(relay.source_kind).toBe('direct_confirmation'); expect(relay.checked_on).toBe('2026-09-15'); expect(relay.url).toBeUndefined();
      expect(relay.note).toMatch(/Provider information relayed by Jamie Whelan/); expect(relay.note).not.toMatch(/\bSquare\b/);
      expect(relay.supports).toContain('access.details'); expect(relay.supports.some(field => /^access\.(?:walk_in|appointment_required|registration_required|identification_required)$/.test(field))).toBe(false);
      const provider = resource.evidence.find(evidence => evidence.id === 'lionhearts-schedule')!;
      expect(provider.checked_on).toBe('2026-09-15'); expect(provider.supports).toContain('categories'); expect(provider.supports).toContain('schedule');
    }
  });

  it('keeps unsupported access modes unknown while retaining market-specific corroboration', () => {
    const corroborated = new Set(['lionhearts-market-seniors-association', 'lionhearts-market-st-lawrence-college', 'lionhearts-market-artillery-park']);
    for (const resource of lionhearts) {
      const modes = [resource.access.walk_in, resource.access.appointment_required, resource.access.registration_required, resource.access.identification_required];
      expect(modes).toEqual(corroborated.has(resource.id) ? ['yes', 'no', 'no', 'no'] : ['unknown', 'unknown', 'unknown', 'unknown']);
      expect(resource.access.details.join(' ')).toMatch(/aims to choose locations accessible/i);
    }
  });

  it('models recurring schedules, dated pop-ups, and narrow exceptions without inventing hours', () => {
    expect(weeklyInterval(byId('seniors-association'), 2)).toEqual([{ opens: '10:00', closes: '13:00' }]);
    expect(weeklyInterval(byId('kingston-east'), 3)).toEqual([{ opens: '10:00', closes: '11:30' }]);
    expect(weeklyInterval(byId('rideau-heights'), 3)).toEqual([{ opens: '13:30', closes: '16:30' }]);
    expect(weeklyInterval(byId('isabel-turner'), 4)).toEqual([{ opens: '14:30', closes: '17:30' }]);
    const ymca = byId('ymca-wright-crescent');
    expect(weeklyInterval(ymca, 2)).toEqual([{ opens: '16:30', closes: '18:30' }]); expect(weeklyInterval(ymca, 5)).toEqual([{ opens: '10:00', closes: '13:00' }]);
    expect(ymca.schedule.exceptions).toContainEqual(expect.objectContaining({ date: '2026-09-15', intervals: [] }));
    const slc = byId('st-lawrence-college'), wj = byId('wj-henderson'), artillery = byId('artillery-park');
    expect(slc.schedule.kind).toBe('dated'); expect(slc.schedule.exceptions.map(item => item.date)).toEqual(['2026-09-10', '2026-09-24', '2026-10-08', '2026-10-22', '2026-11-05', '2026-11-19', '2026-12-03']);
    expect(wj.schedule.kind).toBe('dated'); expect(wj.schedule.exceptions.map(item => item.date)).toEqual(['2026-09-04', '2026-09-18', '2026-10-02', '2026-10-16', '2026-10-30', '2026-11-13', '2026-11-27', '2026-12-11']);
    expect(artillery.service_condition).toBe('active'); expect(artillery.schedule.exceptions).toContainEqual(expect.objectContaining({ date: '2026-09-19', confirmed: true, intervals: [] }));
    expect(artillery.notices).toContainEqual(expect.objectContaining({ starts_on: '2026-09-08', ends_on: '2026-09-20' }));
  });

  it('classifies all previously published Kingston listings as evidence-backed Emergency food', () => {
    const existing = source.resources.filter(resource => resource.organization_id !== 'lionhearts' && resource.publication_status === 'published' && resource.service_condition !== 'closed');
    expect(existing).toHaveLength(8);
    for (const resource of existing) {
      expect(resource.cost?.state).toBe('free');
      expect(resource.evidence.some(evidence => evidence.supports.includes('cost'))).toBe(true);
    }
  });
});
