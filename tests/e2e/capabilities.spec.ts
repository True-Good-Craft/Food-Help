import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { serve } from '../../scripts/serve.ts';
import axe from 'axe-core';
import { selectedBuilds } from '../selected.ts';
for (const selected of selectedBuilds) test(`${selected.sourceDir}: the operator deployment itself passes browsing and accessibility checks`, async ({ browser }) => {
  const server = await serve({ root: selected.directory, port: 0 }); const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const context = await browser.newContext();
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const data = JSON.parse(await readFile(`${selected.directory}/data/v1/resources.json`, 'utf8')), site = JSON.parse(await readFile(`${selected.sourceDir}/site.json`, 'utf8'));
    const page = await context.newPage(); await page.goto(origin); await expect(page.locator('.brand')).toHaveText(site.site_name); await expect(page.locator('#filters')).toBeVisible(); await expect(page.locator('#resource-list article')).toHaveCount(data.resources.length);
    await page.evaluate(axe.source); const result = await page.evaluate(async () => (window as unknown as { axe: typeof axe }).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
    await page.screenshot({ path: `artifacts/screenshots/${site.deployment_id}/${test.info().project.name}-desktop.png`, fullPage: true });
  } finally { await context.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
test('analytics adapter is opt-in, context-free, and independent of public aggregates', async ({ browser }) => {
  const server = await serve({ root: 'artifacts/analytics', port: 0 }); const local = `http://127.0.0.1:${(server.address() as { port: number }).port}`, origin = 'https://analytics.example.test';
  // WebKit does not reliably intercept requests made from worker-controlled pages.
  // Exercise the adapter with a blocked worker; its lifecycle is covered separately.
  const context = await browser.newContext({ serviceWorkers: 'block' }), events: unknown[] = [];
  try {
    // The production-origin gate is exercised without opening a network path to it.
    await context.route(`${origin}/**`, async route => { const url = new URL(route.request().url()); const response = await route.fetch({ url: local + url.pathname + url.search }); await route.fulfill({ response }); });
    await context.route('https://metrics.example.invalid/**', async route => { if (route.request().method() === 'POST') events.push(route.request().postDataJSON()); await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' } }); });
    const page = await context.newPage(); await page.goto(`${origin}/privacy/`); expect(events).toEqual([]);
    await page.locator('#analytics-preference').check(); await page.goto(origin); await expect.poll(() => events.length).toBe(1); expect(events[0]).toEqual({ deployment: 'exampleville', event: 'page_start' });
    await page.locator('#search').fill('sensitive search'); await page.locator('[data-category="community_fridges"]').click(); expect(events).toHaveLength(1);
    await page.goto(`${origin}/usage/`); await expect(page.locator('main')).toContainText('Page starts'); await expect(page.locator('main')).toContainText('Unavailable'); await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    await page.goto(`${origin}/privacy/`); await page.locator('#analytics-preference').uncheck(); const count = events.length; await page.goto(origin); expect(events).toHaveLength(count);
    await context.addInitScript(() => { Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }); });
    await page.goto(`${origin}/privacy/`); await expect(page.locator('#analytics-preference')).toBeDisabled(); await expect(page.locator('#analytics-status')).toContainText('browser requests privacy'); await page.goto(origin); expect(events).toHaveLength(count);
  } finally { await context.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
