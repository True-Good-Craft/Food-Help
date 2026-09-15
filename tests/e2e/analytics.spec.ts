import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import siteJSON from '../../examples/exampleville/site.json' with { type: 'json' };

test('local collector receives a single broad click through native navigation, with no replay or raw context', async ({ browser }) => {
  const module = stripTypeScriptTypes(await readFile('src/analytics.ts', 'utf8'));
  const received: { body: Record<string, unknown>; referrer?: string; cookie?: string }[] = [];
  let origin = '';
  const server = createServer((request, response) => {
    if (request.url === '/module.js') { response.writeHead(200, { 'Content-Type': 'application/javascript' }); response.end(module); return; }
    if (request.url === '/metrics' && request.method === 'POST') {
      let body = ''; request.on('data', chunk => { body += String(chunk); }); request.on('end', () => {
        received.push({ body: JSON.parse(body), referrer: request.headers.referer, cookie: request.headers.cookie });
        setTimeout(() => { response.writeHead(204); response.end(); }, 250);
      }); return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html' });
    if (request.url === '/next') { response.end('<!doctype html><title>Destination</title><p>Navigation completed</p>'); return; }
    const site = { ...siteJSON, canonical_origin: origin, analytics: { enabled: true, endpoint: `${origin}/metrics`, collection_mode: 'opt_out', click_keepalive: true, constants: { deployment: 'fictional-collector-test' } } };
    response.end(`<!doctype html><title>Local collector test</title><a id="same" href="/next">Same tab</a><a id="new" href="/next" target="_blank">New tab</a><button id="revoke">Disable</button><script type="module">
      import { createAnalytics } from '/module.js';
      const collection = createAnalytics(${JSON.stringify(site)}, true, { origin: location.origin, url: location.href, referrer: document.referrer,
        online: () => navigator.onLine, visible: () => !document.hidden, privacySignal: () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1', cookies: () => document.cookie,
        storage: localStorage, fetch: window.fetch.bind(window), now: () => performance.now() });
      document.querySelectorAll('a').forEach(link => link.onclick = () => collection.emit('directions'));
      document.querySelector('#revoke').onclick = () => collection.setAllowed(false);
      window.addEventListener('pagehide', collection.background); window.addEventListener('offline', () => collection.pause());
      document.addEventListener('visibilitychange', () => { if (document.hidden) collection.background(); });
      collection.emit('page_start'); window.ready = true;
    </script>`);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const context = await browser.newContext();
  try {
    // All URLs are loopback. Do not intercept transport: that changes keepalive
    // behaviour in WebKit and would test the harness instead of native delivery.
    const page = await context.newPage(); await page.goto(`${origin}/?query=secret&provider=private#location`); await page.waitForFunction(() => (window as unknown as { ready: boolean }).ready);
    await expect.poll(() => received.length).toBe(1);
    await page.locator('#same').click(); await expect(page).toHaveURL(`${origin}/next`); await expect.poll(() => received.length).toBe(2);
    expect(received[1]!.body).toEqual({ deployment: 'fictional-collector-test', event: 'directions' });
    await page.goto(origin); await page.waitForFunction(() => (window as unknown as { ready: boolean }).ready); await expect.poll(() => received.length).toBe(3);
    const popupPromise = context.waitForEvent('page'); await page.locator('#new').click(); const popup = await popupPromise; await popup.waitForLoadState(); await expect.poll(() => received.length).toBe(4); await popup.close();
    await page.bringToFront(); await page.locator('#revoke').click(); await page.locator('#same').click(); expect(received).toHaveLength(4);
    expect(received.every(event => !event.referrer && !event.cookie)).toBe(true);
    expect(JSON.stringify(received)).not.toMatch(/secret|private|provider|location/);
  } finally { await context.close(); await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
});

for (const signal of ['navigator-dnt', 'window-dnt', 'gpc', 'operator', 'unreadable-storage'] as const) test(`browser suppression: ${signal}`, async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const module = stripTypeScriptTypes(await readFile('src/analytics.ts', 'utf8'));
    await context.route('https://suppression.example.test/**', route => route.fulfill({ body: '<!doctype html><title>Local suppression test</title>' }));
    const page = await context.newPage(); await page.goto('https://suppression.example.test/');
    const result = await page.evaluate(async ({ module, siteJSON, signal }) => {
      // A module URL generated in this browser contains the actual transpiled adapter.
      const url = URL.createObjectURL(new Blob([module], { type: 'application/javascript' }));
      const { analytics } = await import(url); URL.revokeObjectURL(url);
      if (signal === 'navigator-dnt') Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
      if (signal === 'window-dnt') Object.defineProperty(window, 'doNotTrack', { get: () => '1' });
      if (signal === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
      if (signal === 'operator') document.cookie = 'dev_mode=0';
      if (signal === 'unreadable-storage') Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
      let attempts = 0; window.fetch = async () => { attempts += 1; return new Response(null, { status: 204 }); };
      const collection = analytics({ ...siteJSON, canonical_origin: location.origin, analytics: { enabled: true, endpoint: 'https://metrics.example.invalid/events', collection_mode: 'opt_out' } }, true);
      collection.emit('page_start'); collection.emit('directions'); return { attempts, state: collection.state() };
    }, { module, siteJSON, signal });
    expect(result.attempts).toBe(0); expect(result.state.suppression).toBe(signal === 'operator' ? 'operator' : signal === 'unreadable-storage' ? 'storage' : 'privacy');
  } finally { await context.close(); }
});
