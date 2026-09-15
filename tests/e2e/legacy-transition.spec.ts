// SPDX-License-Identifier: MPL-2.0
import { createServer, type Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { retirementWorker, retainedLegacyPath, transitionDestination } from '../../scripts/legacy-transition.ts';

const listen = async (server: Server) => { await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${(server.address() as { port: number }).port}`; };
const close = async (server: Server) => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
test('existing legacy workers retire into the new origin without changing old JSON or unrelated storage', async ({ browser }) => {
  let transitioned = false;
  const fresh = createServer((request, response) => response.writeHead(200, { 'Content-Type': 'text/html' }).end(`<h1>New directory</h1><p>${request.url}</p>`));
  const target = await listen(fresh);
  const legacyData = '{"schema_version":1,"dataset_version":"old-test","resources":[]}\n';
  const oldWorker = `self.addEventListener('install', e => e.waitUntil((async () => { const c=await caches.open('kfh-app-synthetic');await c.add('/');await self.skipWaiting(); })()));self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate'&&!new URL(e.request.url).pathname.startsWith('/data/'))e.respondWith(caches.open('kfh-app-synthetic').then(c=>c.match('/')));});`;
  const oldHTML = '<h1>Old directory</h1><script>navigator.serviceWorker.register("/sw.js")</script>';
  const old = createServer((request, response) => {
    const url = new URL(request.url!, 'http://old.example'); response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/sw.js') { response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(transitioned ? retirementWorker(target) : oldWorker); return; }
    if (url.pathname === '/data/v1/resources.json') { response.writeHead(200, { 'Content-Type': 'application/json' }).end(legacyData); return; }
    if (retainedLegacyPath(url.pathname)) { response.writeHead(200, { 'Content-Type': 'text/plain' }).end('preserved compatibility asset'); return; }
    if (transitioned) { response.writeHead(308, { Location: transitionDestination(url.href, target)! }).end(); return; }
    response.writeHead(200, { 'Content-Type': 'text/html' }).end(oldHTML);
  });
  const origin = await listen(old), context = await browser.newContext();
  try {
    const first = await context.newPage(); await first.goto(origin + '/?kept=first');
    await expect.poll(() => first.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const second = await context.newPage(); await second.goto(origin + '/directory.html?kept=second');
    await expect(second.locator('h1')).toHaveText('Old directory');
    await first.evaluate(async () => { for (const key of ['kfh-data-v1', 'kfh-data-v10', 'kfh-other', 'unrelated']) await caches.open(key); localStorage.setItem('privacy-choice', 'off'); });
    transitioned = true;
    await first.evaluate(() => { void navigator.serviceWorker.getRegistration().then(registration => registration!.update()); });
    await expect(first).toHaveURL(target + '/?kept=first'); await expect(second).toHaveURL(target + '/directory/?kept=second');
    await expect(first.locator('h1')).toHaveText('New directory');
    const inspection = await context.newPage(); const response = await inspection.goto(origin + '/data/v1/resources.json');
    expect(response!.status()).toBe(200); expect(await response!.text()).toBe(legacyData); expect(inspection.url()).toBe(origin + '/data/v1/resources.json');
    await expect.poll(() => inspection.evaluate(() => caches.keys())).toEqual(['kfh-data-v10', 'kfh-other', 'unrelated']);
    expect(await inspection.evaluate(() => localStorage.getItem('privacy-choice'))).toBe('off');
    expect((await context.request.get(origin + '/manifest.webmanifest')).status()).toBe(200);
    expect((await context.request.get(origin + '/assets/old.js')).status()).toBe(200);
    const freshVisitor = await browser.newContext();
    try { const page = await freshVisitor.newPage(); await page.goto(origin + '/directory?from=fresh'); await expect(page).toHaveURL(target + '/directory/?from=fresh'); } finally { await freshVisitor.close(); }
  } finally { await context.close(); await close(old); await close(fresh); }
});
