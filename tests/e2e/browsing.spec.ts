import { test, expect } from '@playwright/test';
import axe from 'axe-core';
test('accessible search, categories, static pages and private browsing', async ({ page }) => {
  const external: string[] = [], errors: string[] = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4173') && !r.url().startsWith('data:')) external.push(r.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#filters')).toBeVisible();
  await page.locator('#search').fill('pantry'); await expect(page.locator('#resource-list article')).toHaveCount(1);
  await page.locator('#search').fill(''); await page.locator('[data-category="community_fridges"]').click(); await expect(page.locator('#resource-list article')).toHaveCount(1);
  await page.locator('[data-category="all"]').click(); await expect(page.locator('#resource-list article')).toHaveCount(5);
  await page.locator('details').first().locator('summary').click();
  await page.evaluate(axe.source); const result = await page.evaluate(async () => (window as unknown as { axe: typeof axe }).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.getByRole('link', { name: 'Example Community Table', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Example Community Table'); await expect(page.locator('body')).toContainText('Evidence and provenance');
  expect(external).toEqual([]); expect(errors).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
test('JavaScript and service-worker failure leave a complete directory', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }); const page = await context.newPage(); await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#resource-list article')).toHaveCount(5); await page.goto('http://127.0.0.1:4173/directory/'); await expect(page.locator('details[open]')).toHaveCount(5);
  await page.getByRole('link', { name: 'Example Community Table', exact: true }).click(); await expect(page.locator('h1')).toHaveText('Example Community Table'); await context.close();
});
test('small screens and keyboard access remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto('/'); await page.keyboard.press('Tab'); await expect(page.locator('.skip-link')).toBeFocused(); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/screenshots/${test.info().project.name}-mobile.png`, fullPage: true });
});
test('the today filter includes future hours and preserves keyboard category selection', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T07:00:00Z') });
  await page.goto('/'); await expect(page.locator('#filters')).toBeVisible();
  await page.locator('#scheduled').check(); await expect(page.locator('#resource-list article')).toHaveCount(2);
  await expect(page.locator('[data-schedule-status]').first()).toContainText('Later today');
  const meals = page.locator('[data-category="prepared_meals"]'); await meals.focus(); await page.keyboard.press('Space');
  await expect(meals).toHaveAttribute('aria-pressed', 'true'); await expect(meals).toBeFocused(); await expect(page.locator('#resource-list article')).toHaveCount(1);
  await page.clock.setSystemTime(new Date('2026-09-07T18:00:00Z')); await page.locator('[data-category="all"]').click(); await expect(page.locator('#resource-list article')).toHaveCount(0);
});
