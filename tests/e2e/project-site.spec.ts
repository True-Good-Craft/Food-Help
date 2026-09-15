// SPDX-License-Identifier: MPL-2.0
import { test, expect } from '@playwright/test';
import { serve } from '../../scripts/serve.ts';

const targets = process.env.FOOD_HELP_TEST_PROJECT ? JSON.parse(process.env.FOOD_HELP_TEST_PROJECT) as { preview: string; production: string } : { preview: 'dist/project', production: 'dist/project' };

test('project homepage works on mobile, by keyboard and without JavaScript', async ({ browser, page }) => {
  const server = await serve({ root: targets.preview, port: 0 });
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    await page.setViewportSize({ width: 320, height: 760 }); await page.goto(origin);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find food help in your community.');
    await expect(page.getByRole('link', { name: 'Open Kingston directory' })).toHaveAttribute('href', 'https://kingston.food-help.ca/');
    await expect(page.getByRole('link', { name: 'Email Jamie' })).toHaveAttribute('href', /mailto:jamie@truegoodcraft\.ca/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter'); await expect(page.locator('#main')).toBeFocused();
    const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 760 } });
    const noScriptPage = await noScriptContext.newPage(); await noScriptPage.goto(origin);
    await expect(noScriptPage.getByRole('heading', { level: 1 })).toHaveText('Find food help in your community.');
    await expect(noScriptPage.getByRole('link', { name: 'Open Kingston directory' })).toBeVisible();
    const missing = await noScriptPage.goto(`${origin}/not-a-real-page`); expect(missing?.status()).toBe(404);
    await expect(noScriptPage.getByRole('heading', { level: 1 })).toHaveText('That page isn’t here.');
    await expect(noScriptPage.getByRole('link', { name: 'Food Help homepage' })).toHaveAttribute('href', '/');
    await noScriptContext.close();
  } finally { await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
});
