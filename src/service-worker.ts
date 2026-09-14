// SPDX-License-Identifier: MPL-2.0
/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;
declare const BUILD: { cache: string; dataCache: string; prefix: string; entries: { url: string; hash: string }[]; routes: Record<string, string> };
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(BUILD.cache);
    try {
      for (const entry of BUILD.entries) {
        const response = await fetch(new Request(entry.url, { cache: 'reload', credentials: 'omit' }));
        if (!response.ok || new URL(response.url).origin !== self.location.origin) throw new Error('Incomplete application release');
        const body = await response.arrayBuffer();
        if (hex(await crypto.subtle.digest('SHA-256', body)) !== entry.hash) throw new Error('Application release integrity mismatch');
        await cache.put(entry.url, new Response(body, { status: 200, headers: response.headers }));
      }
    } catch (error) { await caches.delete(BUILD.cache); throw error; }
    // First install activates normally. Subsequent releases wait for an explicit user action.
  })());
});
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => (key.startsWith(`${BUILD.prefix}app-`) && key !== BUILD.cache) || (key.startsWith(`${BUILD.prefix}data-`) && key !== BUILD.dataCache)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/data/')) return;
  const route = BUILD.routes[url.pathname], asset = BUILD.entries.some(entry => entry.url === url.pathname);
  if (!route && !asset) return;
  event.respondWith((async () => {
    const cache = await caches.open(BUILD.cache), saved = await cache.match(route ?? url.pathname);
    if (saved) return saved;
    return fetch(request);
  })());
});
