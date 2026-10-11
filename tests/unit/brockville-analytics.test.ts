import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAnalytics, type AnalyticsEnvironment, type EventKind } from '../../src/analytics.ts';
import { assertSite } from '../../src/validation.ts';

const site = JSON.parse(readFileSync(new URL('../../deployments/brockville/site.json', import.meta.url), 'utf8'));
assertSite(site);
const kinds: EventKind[] = ['page_start', 'call', 'help', 'directions', 'source', 'install'];
const inert: EventKind[] = ['resource_open', 'install_prompt_show', 'install_prompt_dismiss'];

function fixture(overrides: Partial<AnalyticsEnvironment> = {}, production = true) {
  const requests: { url: string; options: RequestInit }[] = [];
  const saved = new Map<string, string>();
  const env: AnalyticsEnvironment = {
    origin: site.canonical_origin,
    url: `${site.canonical_origin}/?src=reddit&utm_campaign=outreach_2026_09&utm_content=post_02&search=PRIVATE#PRIVATE`,
    referrer: 'https://www.reddit.com/private-context', online: () => true, visible: () => true,
    privacySignal: () => false, cookies: () => '', now: () => 1000,
    storage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => { saved.set(key, value); } },
    fetch: async (url, options) => { requests.push({ url: String(url), options: options! }); return new Response(null, { status: 204 }); },
    ...overrides,
  };
  return { collection: createAnalytics(site, production, env), requests, saved };
}

test('Brockville sends only the six Kingston-standard v3 aggregates, no product signals and no first-visit preference write', () => {
  const { collection, requests, saved } = fixture();
  try {
    kinds.forEach(kind => collection.emit(kind));
    inert.forEach(kind => collection.emit(kind));
    assert.equal(requests.length, 6);
    const events = requests.map(request => JSON.parse(request.options.body as string));
    assert.deepEqual(events.map(event => [event.event_name, event.event_value ?? null]), [
      ['page_view', null], ['contact_click', 'resource_call'], ['contact_click', 'help_211'],
      ['outbound_click', 'directions'], ['outbound_click', 'official_source'], ['pwa_install', null],
    ]);
    for (const [index, event] of events.entries()) {
      assert.equal(event.site_key, 'brockville_food_help'); assert.equal(event.contract_version, 3);
      assert.equal(event.collection_mode, 'opt_out'); assert.equal(event.page, 'directory');
      const keys = ['site_key', 'contract_version', 'collection_mode', 'page', 'event_name'];
      if (index > 0 && index < 5) keys.push('event_value');
      if (index < 5) {
        keys.push('source', 'campaign', 'content');
        assert.equal(event.source, 'reddit'); assert.equal(event.campaign, 'outreach_2026_09'); assert.equal(event.content, 'post_02');
      }
      assert.deepEqual(Object.keys(event).sort(), keys.sort());
    }
    for (const request of requests) {
      assert.equal(request.url, 'https://lighthouse.buscore.ca/metrics/event');
      assert.equal(request.options.credentials, 'omit'); assert.equal(request.options.referrerPolicy, 'no-referrer');
      assert.equal(request.options.redirect, 'error'); assert.equal(request.options.cache, 'no-store');
    }
    assert.equal(saved.size, 0); assert.ok(!JSON.stringify(events).includes('PRIVATE'));
  } finally { collection.pause(); }
});

test('Brockville uses its own preference key and host, and its choices, privacy controls and gates are effective', () => {
  assert.equal(site.analytics?.preference_key, 'bfh-optional-analytics');
  assert.deepEqual(site.analytics?.attribution?.internal_hosts, ['brockville.food-help.ca']);
  assert.ok(!JSON.stringify(site.analytics).toLowerCase().includes('kingston'));
  for (const overrides of [
    { privacySignal: () => true }, { cookies: () => 'dev_mode=0' }, { online: () => false },
    { storage: { getItem: (key: string) => key === 'noAnalytics' ? '1' : null, setItem: () => {} } },
    { storage: { getItem: () => { throw new Error('unavailable'); }, setItem: () => {} } },
    { origin: 'https://preview.pages.dev' },
    ...['/affordable-food/', '/directory/', '/privacy/', '/resources/example/'].map(path => ({ url: site.canonical_origin + path })),
  ]) {
    const { collection, requests } = fixture(overrides);
    try { kinds.forEach(kind => collection.emit(kind)); assert.equal(requests.length, 0); }
    finally { collection.pause(); }
  }
  const preview = fixture({}, false);
  try { kinds.forEach(kind => preview.collection.emit(kind)); assert.equal(preview.requests.length, 0); }
  finally { preview.collection.pause(); }
  const other = fixture();
  try { other.saved.set('kfh-optional-analytics', 'no'); kinds.forEach(kind => other.collection.emit(kind)); assert.equal(other.requests.length, 6); }
  finally { other.collection.pause(); }
  const { collection, requests, saved } = fixture();
  try {
    saved.set('bfh-optional-analytics', 'no'); kinds.forEach(kind => collection.emit(kind)); assert.equal(requests.length, 0);
    collection.setAllowed(true); assert.equal(saved.get('bfh-optional-analytics'), 'yes'); assert.equal(requests.length, 1);
    collection.setAllowed(false); assert.equal(saved.get('bfh-optional-analytics'), 'no'); assert.equal(collection.allowed(), false);
  } finally { collection.pause(); }
});
