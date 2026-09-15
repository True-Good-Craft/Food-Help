// SPDX-License-Identifier: MPL-2.0
import type { Site } from './types.ts';

export type EventKind = 'page_start' | 'call' | 'help' | 'directions' | 'source' | 'install';
type Suppression = 'disabled' | 'preview' | 'privacy' | 'operator' | 'storage' | null;
type Attribution = { source: string; campaign: string; content: string };
type AttributionConfig = NonNullable<NonNullable<Site['analytics']>['attribution']>;
export interface AnalyticsEnvironment {
  origin: string; url: string; referrer: string;
  online(): boolean; visible(): boolean; privacySignal(): boolean; cookies(): string;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  fetch: typeof fetch; now(): number;
}
const kinds: readonly EventKind[] = ['page_start', 'call', 'help', 'directions', 'source', 'install'];
const emptyAttribution = (): Attribution => ({ source: 'direct_unknown', campaign: 'none', content: 'none' });

/** Reduce public outreach labels in memory. No raw context leaves this boundary. */
export function classifyAttribution(url: string, referrer: string, origin: string, policy?: AttributionConfig): Attribution {
  const result = emptyAttribution();
  if (!policy) return result;
  try {
    const params = new URL(url).searchParams, source = params.get('src') ?? params.get('utm_source');
    if (source) result.source = policy.sources.includes(source) ? source : 'other';
    else if (referrer) {
      const host = new URL(referrer).hostname;
      const match = policy.referrers.find(item => host === item.host || (item.include_subdomains && host.endsWith(`.${item.host}`)));
      if (match) result.source = match.source;
      else if (host !== new URL(origin).hostname && !policy.internal_hosts.some(value => value === host)) result.source = 'other';
    }
    const campaign = params.get('utm_campaign'), content = params.get('utm_content');
    if (campaign && policy.campaigns.includes(campaign)) result.campaign = campaign;
    if (content && policy.contents.includes(content)) result.content = content;
  } catch { /* Malformed optional context stays bounded. */ }
  return result;
}

/** The only event input is a fixed broad kind, never an element, provider or URL. */
export function createAnalytics(site: Site, production: boolean, env: AnalyticsEnvironment) {
  const config = site.analytics, key = config?.preference_key ?? `food-help-${site.deployment_id}-analytics-preference`;
  let attribution = classifyAttribution(env.url, env.referrer, site.canonical_origin, config?.attribution);
  let pageAttempted = false, installAttempted = false, storageFailed = false;
  const lastAction = new Map<EventKind, number>();
  const pending = new Map<AbortController, { action: boolean; timer: ReturnType<typeof setTimeout> }>();
  function pause(backgroundOnly = false): void {
    for (const [controller, request] of pending) {
      if (backgroundOnly && request.action && config?.click_keepalive) continue;
      controller.abort(); clearTimeout(request.timer); pending.delete(controller);
    }
  }
  function state(): { choice: boolean; suppression: Suppression } {
    let choice = config?.collection_mode === 'opt_out', suppression: Suppression = null;
    if (!config?.enabled) suppression = 'disabled';
    else if (!production || env.origin !== site.canonical_origin) suppression = 'preview';
    else try {
      if (storageFailed) throw new Error('Preference unavailable');
      const saved = env.storage.getItem(key);
      if (saved === 'yes' || saved === 'no') choice = saved === 'yes';
      if (env.storage.getItem('noAnalytics') === '1' || env.cookies().split(';').some(cookie => /^\s*dev_mode=/.test(cookie))) suppression = 'operator';
      if (env.privacySignal()) suppression = 'privacy';
    } catch { suppression = 'storage'; }
    if (!choice || suppression) { attribution = emptyAttribution(); pause(); }
    return { choice, suppression };
  }
  const allowed = () => { const current = state(); return current.choice && !current.suppression; };
  function emit(kind: EventKind): void {
    if (!kinds.includes(kind)) return;
    if (kind === 'page_start') {
      if (pageAttempted || !state().choice) return;
      pageAttempted = true;
    } else if (kind === 'install') {
      if (installAttempted) return;
      installAttempted = true;
    } else {
      const now = env.now();
      if (now - (lastAction.get(kind) ?? -Infinity) < 750) return;
      lastAction.set(kind, now);
    }
    if (!allowed() || !config?.endpoint || !env.online() || !env.visible()) return;
    // Directory startup/actions only; no resource-page browsing or other page history.
    try { if (new URL(env.url).pathname !== '/') return; } catch { return; }
    const event = config.event_payloads ? config.event_payloads[kind] : { event: config.event_names?.[kind] ?? kind };
    if (!event) return;
    const body = JSON.stringify({ ...config.constants, ...event, ...(config.attribution?.events.includes(kind as Exclude<EventKind, 'install'>) ? attribution : {}) });
    const action = kind !== 'page_start' && kind !== 'install', controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); pending.delete(controller); }, 1500);
    pending.set(controller, { action, timer });
    try {
      // One attempt; no response dependency, beacon, navigation wait, queue or retry.
      void env.fetch(config.endpoint, {
        method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': config.content_type ?? 'application/json' }, body, signal: controller.signal,
        ...(action && config.click_keepalive ? { keepalive: true } : {}),
      }).catch(() => {}).finally(() => { clearTimeout(timer); pending.delete(controller); });
    } catch { clearTimeout(timer); pending.delete(controller); }
  }
  function setAllowed(value: boolean): void {
    if (!value) { attribution = emptyAttribution(); pause(); }
    try { env.storage.setItem(key, value ? 'yes' : 'no'); } catch { storageFailed = true; pause(); return; }
    if (value) emit('page_start');
  }
  function background(): void { state(); pause(true); }
  return { emit, allowed, setAllowed, state, pause, background };
}

export function analytics(site: Site, production: boolean) {
  const collection = createAnalytics(site, production, {
    origin: location.origin, get url() { return location.href; }, referrer: document.referrer,
    online: () => navigator.onLine, visible: () => !document.hidden,
    privacySignal: () => (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === '1' || (window as Window & { doNotTrack?: string }).doNotTrack === '1',
    cookies: () => document.cookie,
    storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
    fetch: window.fetch.bind(window), now: () => performance.now(),
  });
  window.addEventListener('offline', () => collection.pause());
  window.addEventListener('pagehide', collection.background);
  window.addEventListener('storage', () => collection.state());
  document.addEventListener('visibilitychange', () => { if (document.hidden) collection.background(); else collection.state(); });
  return collection;
}
