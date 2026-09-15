// SPDX-License-Identifier: MPL-2.0
import { test, expect, chromium } from '@playwright/test';
import { readFile, mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { selectedBuilds } from '../selected.ts';
import { serve } from '../../scripts/serve.ts';

for (const selected of selectedBuilds) {
  test(`${selected.sourceDir}: actual selected data survives offline navigation and reconnects`, async ({ page }) => {
    const data = JSON.parse(await readFile(`${selected.directory}/data/v1/resources.json`, 'utf8'));
    let server = await serve({ root: selected.directory, port: 0 });
    const port = (server.address() as { port: number }).port, origin = `http://127.0.0.1:${port}`;
    try {
      await page.goto(origin); await expect(page.locator('#filters')).toBeVisible();
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
      await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(key => key.includes('-data-v1-')))).toBe(true);
      await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
      await page.reload(); await expect(page.locator('#data-retention-status')).toContainText('last saved validated');
      await expect(page.locator('#resource-list article')).toHaveCount(data.resources.length);
      const resource = data.resources[0];
      if (resource) { await page.goto(`${origin}/resources/${resource.id}/`); await expect(page.locator('h1')).toHaveText(resource.name); }
      await page.goto(`${origin}/directory/`); await expect(page.locator('main article')).toHaveCount(data.resources.length);
      server = await serve({ root: selected.directory, port });
      await page.goto(origin); await expect(page.locator('#data-status')).toContainText('Listings updated');
    } finally { await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
  });
  test(`${selected.sourceDir}: actual selected community survives a browser-process cold restart`, async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Browser-process cold restart is exercised in Chromium; all engines test offline navigation.');
    const data = JSON.parse(await readFile(`${selected.directory}/data/v1/resources.json`, 'utf8'));
    const server = await serve({ root: selected.directory, port: 0 }), origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    // Keep Chromium's nested on-disk CacheStorage path below Windows path limits.
    await mkdir('artifacts/profiles', { recursive: true });
    const profile = await mkdtemp(path.resolve('artifacts/profiles/cold-'));
    let context = await chromium.launchPersistentContext(profile, { headless: true });
    try {
      let page = await context.newPage(); await page.goto(origin); await expect(page.locator('#filters')).toBeVisible();
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
      await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(key => key.includes('-data-v1-')))).toBe(true);
      await context.close();
      context = await chromium.launchPersistentContext(profile, { headless: true, offline: true });
      page = await context.newPage(); await page.goto(origin); await expect(page.locator('#data-retention-status')).toContainText('last saved validated');
      await expect(page.locator('#resource-list article')).toHaveCount(data.resources.length);
    } finally { await context.close(); await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
  });
}
