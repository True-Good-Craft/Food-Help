// SPDX-License-Identifier: MPL-2.0
import type { Site } from './types.ts';
export type EventKind = 'page_start' | 'call' | 'directions' | 'source' | 'install';
export function analytics(site: Site): { emit: (kind: EventKind) => void; allowed: () => boolean; setAllowed: (value: boolean) => void } {
  const config = site.analytics, key = `food-help-${site.deployment_id}-analytics-preference`;
  let preference = config?.collection_mode === 'opt_out';
  try { const saved = localStorage.getItem(key); if (saved !== null) preference = saved === 'yes'; } catch { /* Optional preference. */ }
  const allowed = () => Boolean(config?.enabled && preference && navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
  return { allowed, setAllowed(value) { preference = value; try { localStorage.setItem(key, value ? 'yes' : 'no'); } catch { /* In-memory preference remains effective. */ } }, emit(kind) {
    if (!allowed() || !config?.endpoint || !navigator.onLine) return;
    const body = JSON.stringify({ ...config.constants, event: config.event_names?.[kind] ?? kind });
    void fetch(config.endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(2500) }).catch(() => {});
  } };
}
