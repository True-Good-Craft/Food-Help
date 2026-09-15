import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import siteJSON from '../../examples/exampleville/site.json' with { type: 'json' };
import { createAnalytics, classifyAttribution, type AnalyticsEnvironment, type EventKind } from '../../src/analytics.ts';
import { assertSite } from '../../src/validation.ts';
import type { Site } from '../../src/types.ts';

function fixture() {
  const site = structuredClone(siteJSON) as Site;
  site.canonical_origin = 'https://analytics.example.test';
  site.analytics = {
    enabled: true, endpoint: 'https://metrics.example.invalid/events', collection_mode: 'opt_out', disclosure: 'Fictional aggregate collector used only by local tests.',
    preference_key: 'example-choice', content_type: 'text/plain;charset=UTF-8', click_keepalive: true,
    constants: { site_key: 'example_directory', contract_version: 3, collection_mode: 'opt_out', page: 'directory' },
    event_payloads: {
      page_start: { event_name: 'page_view' }, call: { event_name: 'contact_click', event_value: 'resource_call' },
      help: { event_name: 'contact_click', event_value: 'help_211' }, directions: { event_name: 'outbound_click', event_value: 'directions' },
      source: { event_name: 'outbound_click', event_value: 'official_source' }, install: { event_name: 'pwa_install' },
    },
    attribution: {
      events: ['page_start', 'call', 'help', 'directions', 'source'], sources: ['direct_unknown', 'community', 'search', 'other'],
      campaigns: ['none', 'example_outreach'], contents: ['none', 'example_poster'], internal_hosts: ['former.example.test'],
      referrers: [{ host: 'search.example.test', source: 'search', include_subdomains: true }],
    },
  };
  const values = new Map<string, string>(), requests: RequestInit[] = [];
  const env: AnalyticsEnvironment = {
    origin: site.canonical_origin, url: `${site.canonical_origin}/?src=community&utm_campaign=example_outreach&utm_content=example_poster&search=secret&fbclid=private#location`, referrer: 'https://search.example.test/private?q=secret',
    online: () => true, visible: () => true, privacySignal: () => false, cookies: () => '',
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } },
    fetch: async (_url, init) => { requests.push(init!); return new Response(null, { status: 204 }); }, now: () => 1000,
  };
  const collection = createAnalytics(site, true, env);
  return { site, env, values, requests, collection };
}
describe('optional aggregate collection', () => {
  it('sends exact static payloads and only finite public labels, without identity or provider context', () => {
    const { site, collection, values, requests } = fixture(); assertSite(site);
    for (const kind of ['page_start', 'call', 'help', 'directions', 'source', 'install'] as EventKind[]) collection.emit(kind);
    expect(values.size).toBe(0); expect(requests).toHaveLength(6);
    for (const [index, kind] of (['page_start', 'call', 'help', 'directions', 'source', 'install'] as EventKind[]).entries()) {
      expect(JSON.parse(requests[index]!.body as string)).toEqual({ ...site.analytics!.constants, ...site.analytics!.event_payloads![kind], ...(kind === 'install' ? {} : { source: 'community', campaign: 'example_outreach', content: 'example_poster' }) });
      expect(requests[index]).toMatchObject({ method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'text/plain;charset=UTF-8' } });
    }
    expect(JSON.stringify(requests.map(request => request.body))).not.toMatch(/secret|private|fbclid|location/);
    expect(requests[0]).not.toHaveProperty('keepalive'); expect(requests[1]!.keepalive).toBe(true); expect(requests[5]).not.toHaveProperty('keepalive'); collection.pause();
  });
  it('keeps the original simple JSON adapter compatible and opt-in', () => {
    const { site, env, requests } = fixture();
    site.analytics = { enabled: true, endpoint: 'https://metrics.example.invalid/events', collection_mode: 'opt_in', disclosure: 'Example only.', constants: { deployment: 'exampleville' } };
    const collection = createAnalytics(site, true, env); collection.emit('page_start'); expect(requests).toHaveLength(0);
    collection.setAllowed(true); expect(JSON.parse(requests[0]!.body as string)).toEqual({ deployment: 'exampleville', event: 'page_start' });
    expect(requests[0]!.headers).toEqual({ 'Content-Type': 'application/json' }); collection.pause();
  });
  it('suppresses disabled builds, previews and every origin except the configured canonical HTTPS origin', () => {
    for (const origin of ['http://localhost:4174', 'https://preview.example.test', 'http://analytics.example.test', 'https://analytics.example.test.evil.invalid']) {
      const { site, env, requests } = fixture(); env.origin = origin; const collection = createAnalytics(site, true, env);
      collection.emit('page_start'); collection.emit('directions'); expect(requests).toHaveLength(0); expect(collection.state().suppression).toBe('preview');
    }
    const { site, env, requests } = fixture(); createAnalytics(site, false, env).emit('page_start');
    site.analytics = { enabled: false }; createAnalytics(site, true, env).emit('page_start'); expect(requests).toHaveLength(0);
  });
  it('does not measure static resource, simple-directory, privacy or other page history', () => {
    for (const path of ['/resources/example-service/', '/directory/', '/privacy/', '/about/']) {
      const { site, env, requests } = fixture(); env.url = site.canonical_origin + path;
      const collection = createAnalytics(site, true, env); collection.emit('page_start'); collection.emit('directions'); expect(requests).toHaveLength(0);
    }
  });
  it('retains opt-out and rechecks privacy and canonical operator suppression before every event', () => {
    for (const setup of [
      (f: ReturnType<typeof fixture>) => f.values.set('example-choice', 'no'),
      (f: ReturnType<typeof fixture>) => { f.env.privacySignal = () => true; },
      (f: ReturnType<typeof fixture>) => f.values.set('noAnalytics', '1'),
      (f: ReturnType<typeof fixture>) => { f.env.cookies = () => 'ordinary=value; dev_mode=0'; },
      (f: ReturnType<typeof fixture>) => { f.env.cookies = () => 'dev_mode='; },
    ]) { const f = fixture(); setup(f); f.collection.emit('page_start'); f.collection.emit('help'); expect(f.requests).toHaveLength(0); }
    const { collection, env, requests } = fixture(); env.cookies = () => 'not_dev_mode=1'; collection.emit('page_start'); expect(requests).toHaveLength(1);
    env.privacySignal = () => true; collection.emit('source'); expect(requests).toHaveLength(1); collection.pause();
  });
  it('fails closed when preferences cannot be read or written', () => {
    const { collection, env, requests } = fixture(); env.storage.getItem = () => { throw new Error('blocked'); };
    collection.emit('page_start'); expect(collection.state().suppression).toBe('storage'); expect(requests).toHaveLength(0);
    env.storage.getItem = () => null; env.storage.setItem = () => { throw new Error('blocked'); };
    collection.setAllowed(true); collection.emit('help'); expect(collection.allowed()).toBe(false); expect(requests).toHaveLength(0);
  });
  it('deduplicates startup, install and rapid broad actions only in memory and rejects unknown events', () => {
    const { collection, env, requests } = fixture();
    collection.emit('page_start'); collection.emit('page_start'); collection.emit('install'); collection.emit('install');
    collection.emit('directions'); collection.emit('directions'); collection.emit('provider-secret' as EventKind); expect(requests).toHaveLength(3);
    env.now = () => 1750; collection.emit('directions'); expect(requests).toHaveLength(4); collection.pause();
  });
  it('drops offline/hidden attempts with no reconnection replay', () => {
    for (const mode of ['online', 'visible'] as const) {
      const { collection, env, requests } = fixture(); env[mode] = () => false;
      collection.emit('page_start'); collection.emit('directions'); collection.emit('install'); env[mode] = () => true;
      collection.emit('page_start'); collection.emit('install'); expect(requests).toHaveLength(0);
      env.now = () => 1750; collection.emit('directions'); expect(requests).toHaveLength(1); collection.pause();
    }
  });
  it('aborts all pending deliveries and clears attribution on cross-tab revocation', () => {
    const { collection, env, values, requests } = fixture(); env.fetch = (_url, init) => { requests.push(init!); return new Promise(() => {}); };
    collection.emit('page_start'); collection.emit('directions'); values.set('example-choice', 'no'); collection.state();
    expect(requests.every(request => request.signal!.aborted)).toBe(true); collection.setAllowed(true); env.now = () => 1750; collection.emit('help');
    expect(JSON.parse(requests[2]!.body as string)).toMatchObject({ source: 'direct_unknown', campaign: 'none', content: 'none' }); collection.pause();
  });
  it('lets already-started clicks finish on backgrounding only when configured; privacy still aborts them', () => {
    const { collection, env, requests } = fixture(); env.fetch = (_url, init) => { requests.push(init!); return new Promise(() => {}); };
    collection.emit('page_start'); collection.emit('directions'); collection.background();
    expect(requests[0]!.signal!.aborted).toBe(true); expect(requests[1]!.signal!.aborted).toBe(false);
    env.privacySignal = () => true; collection.background(); expect(requests[1]!.signal!.aborted).toBe(true);
  });
  it('bounds hanging requests to 1500ms while the realm runs; failed sends are never retried', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const { collection, env, requests } = fixture(); env.fetch = (_url, init) => { requests.push(init!); return new Promise(() => {}); };
    collection.emit('page_start'); t.mock.timers.tick(1500); expect(requests[0]!.signal!.aborted).toBe(true); expect(requests).toHaveLength(1);
    env.fetch = () => { throw new Error('network'); }; expect(() => collection.emit('directions')).not.toThrow();
    env.fetch = async () => { throw new Error('network'); }; expect(() => collection.emit('help')).not.toThrow(); t.mock.timers.tick(10_000); expect(requests).toHaveLength(1); collection.pause();
  });
  it('maps unregistered attribution to fallback labels and matches referrer host boundaries', () => {
    const { site } = fixture(), policy = site.analytics!.attribution!;
    expect(classifyAttribution(`${site.canonical_origin}/?src=person_123&utm_campaign=private&utm_content=private`, '', site.canonical_origin, policy)).toEqual({ source: 'other', campaign: 'none', content: 'none' });
    expect(classifyAttribution(site.canonical_origin, 'https://sub.search.example.test/?q=private', site.canonical_origin, policy).source).toBe('search');
    expect(classifyAttribution(site.canonical_origin, 'https://search.example.test.evil.invalid/', site.canonical_origin, policy).source).toBe('other');
    expect(classifyAttribution(site.canonical_origin, 'https://former.example.test/private', site.canonical_origin, policy).source).toBe('direct_unknown');
  });
  it('rejects ambiguous payload contracts, unknown dynamic fields and unbounded attribution policies', () => {
    const { site } = fixture(); assertSite(site);
    for (const change of [
      (s: Site) => { s.analytics!.event_names = { call: 'also-call' }; },
      (s: Site) => { delete s.analytics!.event_payloads!.help; },
      (s: Site) => { s.analytics!.constants!.source = 'override'; },
      (s: Site) => { s.analytics!.event_payloads!.call!.site_key = 'override'; },
      (s: Site) => { s.analytics!.attribution!.sources = ['unbounded']; },
      (s: Site) => { s.analytics!.attribution!.referrers[0]!.source = 'unknown'; },
      (s: Site) => { s.analytics!.attribution!.referrers[0]!.host = 'https://bad.example'; },
      (s: Site) => { (s.analytics!.attribution as unknown as Record<string, unknown>).provider = true; },
    ]) { const candidate = structuredClone(site); change(candidate); expect(() => assertSite(candidate)).toThrow(); }
  });
});
