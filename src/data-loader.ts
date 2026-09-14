// SPDX-License-Identifier: MPL-2.0
import { publicDataset } from './validation.ts';
import type { PublicDataset, RuntimeConfig } from './types.ts';
export type LoadResult = { data: PublicDataset | null; source: 'network' | 'cached' | 'unavailable'; retained: boolean };
const bounded = <T>(promise: Promise<T>, ms: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Storage timed out')), ms);
  promise.then(result => { clearTimeout(timer); resolve(result); }, error => { clearTimeout(timer); reject(error); });
});
export function dataCacheName(config: RuntimeConfig): string { return `food-help-${config.site.deployment_id}-data-v1-${config.compatibility_id}`; }
export async function loadData(config: RuntimeConfig): Promise<LoadResult> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(config.data_url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
    if (!response.ok) throw new Error('Data request failed');
    const text = await response.text();
    if (text.length > 5_000_000) throw new Error('Dataset exceeds supported size');
    const data = publicDataset(JSON.parse(text), config.site.deployment_id, config.compatibility_id);
    clearTimeout(timer);
    let retained = false;
    try { await bounded((async () => { const cache = await caches.open(dataCacheName(config)); await cache.put(config.data_url, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })); })(), 1000); retained = true; } catch { /* Browsing does not depend on persistent storage. */ }
    return { data, source: 'network', retained };
  } catch {
    try {
      const response = await bounded((async () => (await caches.open(dataCacheName(config))).match(config.data_url))(), 1000);
      if (response) return { data: publicDataset(JSON.parse(await bounded(response.text(), 1000)), config.site.deployment_id, config.compatibility_id), source: 'cached', retained: true };
    } catch { /* Invalid or unavailable storage cannot replace static HTML. */ }
    return { data: null, source: 'unavailable', retained: false };
  } finally { clearTimeout(timer); }
}
