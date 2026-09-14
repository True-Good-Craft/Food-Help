import { test, expect, chromium, type Page } from '@playwright/test';
import { serve } from '../../scripts/serve.ts';
const ready = async (page: Page) => {
  await expect(page.locator('#filters')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(key => key.includes('-data-v1-')))).toBe(true);
};
test('offline launch and validated last-good fallback', async ({ page }) => {
  // Stop the origin itself so all engines face actual network failure without changing interception/cache settings.
  let server = await serve({ root: 'artifacts/exampleville', port: 0 });
  const port = (server.address() as { port: number }).port;
  const origin = 'http://127.0.0.1:' + port;
  try {
    await page.goto(origin); await ready(page);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await page.reload();
    await expect(page.locator('#resource-list article')).toHaveCount(5); await expect(page.locator('#data-status')).toContainText('last saved validated');
    await page.locator('#search').fill('pantry'); await expect(page.locator('#resource-list article')).toHaveCount(1);
    await page.getByRole('link', { name: 'Example Neighbourhood Pantry', exact: true }).click(); await expect(page.locator('h1')).toHaveText('Example Neighbourhood Pantry');
    server = await serve({ root: 'artifacts/exampleville', port });
    await page.goto(origin); await expect(page.locator('#data-status')).toContainText('latest validated');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
test('bad response never overwrites last-good data; absent storage leaves static HTML', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' }); const page = await context.newPage();
  let corrupt = false;
  // Configure interception before storing data; changing WebKit interception settings clears its caches.
  await page.route('**/data/v1/resources.json', route => corrupt ? route.fulfill({ contentType: 'application/json', body: '{"format":"corrupt"}' }) : route.continue());
  await page.goto('http://127.0.0.1:4173/'); await expect(page.locator('#filters')).toBeVisible();
  corrupt = true;
  await page.reload(); await expect(page.locator('#data-status')).toContainText('last saved validated'); await expect(page.locator('#resource-list article')).toHaveCount(5);
  await page.evaluate(async () => { await Promise.all((await caches.keys()).map(key => caches.delete(key))); });
  await page.reload(); await expect(page.locator('#data-status')).toContainText('published page remains'); await expect(page.locator('#resource-list article')).toHaveCount(5); await expect(page.locator('#filters')).toBeHidden(); await context.close();
});
test('cold restart uses the persisted worker and data with no network', async ({ browserName }, info) => {
  test.skip(browserName !== 'chromium', 'Persistent browser-process restart is exercised in Chromium; all engines exercise offline navigation.');
  const profile = info.outputPath('persistent-profile');
  let context = await chromium.launchPersistentContext(profile, { headless: true });
  try {
    const page = await context.newPage(); await page.goto('http://127.0.0.1:4173/'); await ready(page); await context.close();
    context = await chromium.launchPersistentContext(profile, { headless: true, offline: true });
    const cold = await context.newPage(); await cold.goto('http://127.0.0.1:4173/'); await expect(cold.locator('#filters')).toBeVisible(); await expect(cold.locator('#data-status')).toContainText('last saved validated');
    await cold.locator('#search').fill('garden'); await expect(cold.locator('#resource-list article')).toHaveCount(1);
  } finally { await context.close(); }
});
test('failed update, explicit activation across two tabs, cleanup and rollback', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'The full release lifecycle is covered once in Chromium.');
  let root = 'artifacts/exampleville', corrupt = false;
  const server = await serve({ root: () => root, port: 0, fail: route => corrupt && route.includes('/assets/') });
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const context = await browser.newContext();
  try {
    const page = await context.newPage(); await page.goto(url); await ready(page);
    const second = await context.newPage(); await second.goto(url); await ready(second);
    await page.evaluate(async () => { await caches.open('unrelated-application'); });
    root = 'artifacts/release-b'; corrupt = true;
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r!.update().catch(() => {}); });
    await expect.poll(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return Boolean(r?.installing); })).toBe(false);
    await expect(page.locator('#update-notice')).toBeHidden();
    expect(await page.evaluate(async () => (await caches.keys()).filter(k => k.includes('-app-')).length)).toBe(1);
    corrupt = false;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect(page.locator('#update-notice')).toBeVisible();
    await expect(page.locator('.brand')).toHaveText('Exampleville Food Help');
    let firstLoads = 0, secondLoads = 0;
    page.on('load', () => firstLoads++); second.on('load', () => secondLoads++);
    await page.locator('#apply-update').click();
    await expect(page.locator('.brand')).toHaveText('Exampleville Food Help updated'); await expect(second.locator('.brand')).toHaveText('Exampleville Food Help updated');
    expect(firstLoads).toBe(1); expect(secondLoads).toBe(1);
    expect(await page.evaluate(async () => (await caches.keys()).filter(k => k.includes('-app-')).length)).toBe(1);
    expect(await page.evaluate(() => caches.has('unrelated-application'))).toBe(true);
    root = 'artifacts/exampleville';
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); }); await expect(page.locator('#update-notice')).toBeVisible(); await page.locator('#apply-update').click();
    await expect(page.locator('.brand')).toHaveText('Exampleville Food Help'); await expect(second.locator('.brand')).toHaveText('Exampleville Food Help');
    await context.setOffline(true); await page.reload(); await expect(page.locator('#filters')).toBeVisible();
  } finally { await context.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
