import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { serve } from '../../scripts/serve.ts';
import axe from 'axe-core';
import { selectedBuilds } from '../selected.ts';
for (const selected of selectedBuilds) test(`${selected.sourceDir}: operator layout remains readable at desktop, mobile and enlarged-text widths`, async ({ browser }, info) => {
  const server = await serve({ root: selected.directory, port: 0 });
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const context = await browser.newContext();
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const site = JSON.parse(await readFile(`${selected.sourceDir}/site.json`, 'utf8'));
    const data = JSON.parse(await readFile(`${selected.directory}/data/v1/resources.json`, 'utf8'));
    const inView = (resource: { cost?: { state?: string } }, view: 'emergency' | 'affordable') => view === 'emergency' ? ['free', 'mixed'].includes(resource.cost?.state ?? '') : ['low_cost', 'subsidized', 'mixed'].includes(resource.cost?.state ?? '');
    const emergency = data.resources.filter((resource: { cost?: { state?: string } }) => inView(resource, 'emergency'));
    const affordable = data.resources.filter((resource: { cost?: { state?: string } }) => inView(resource, 'affordable'));
    const page = await context.newPage(); await page.clock.install({ time: new Date('2026-09-14T19:00:00Z') });
    await page.setViewportSize({ width: 1920, height: 912 }); await page.goto(origin); await expect(page.locator('#filters')).toBeVisible(); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('h1')).toHaveText(`Find food help in ${site.community.name}`);
    if (site.presentation?.category_groups) {
      const groups = site.presentation.category_groups.filter((group: { categories: string[] }) => group.categories.some(category => emergency.some((resource: { categories: string[] }) => resource.categories.includes(category))));
      for (const group of groups) {
        await page.getByRole('button', { name: group.label, exact: true }).click();
        await expect(page.locator('#resource-list article')).toHaveCount(emergency.filter((r: { categories: string[] }) => r.categories.some(category => group.categories.includes(category))).length);
      }
      await page.getByRole('button', { name: 'All types', exact: true }).click();
    }
    const footer = await page.locator('.site-footer').boundingBox();
    expect(footer!.width).toBe(await page.evaluate(() => document.documentElement.clientWidth)); expect(footer!.height).toBeLessThan(220);
    const search = await page.locator('#search').boundingBox(), locate = await page.locator('#locate').boundingBox();
    if (locate) { expect(locate.width).toBeLessThan(250); expect(Math.abs(locate.y - search!.y)).toBeLessThan(2); }
    for (const record of emergency) {
      const article = page.locator(`[data-resource-id="${record.id}"]`);
      await expect(article.locator('.summary')).toHaveText(record.summary);
      if (record.summary === record.food_access_purpose) expect(await article.locator('p').evaluateAll((nodes, summary) => nodes.filter(node => node.textContent === summary).length, record.summary)).toBe(1);
    }
    await page.goto(`${origin}/affordable-food/`); await expect(page.locator('#filters')).toBeVisible(); await expect(page.locator('#resource-list article')).toHaveCount(affordable.length);
    for (const record of affordable) await expect(page.locator(`[data-resource-id="${record.id}"] .summary`)).toHaveText(record.summary);
    await page.screenshot({ path: `artifacts/screenshots/${site.deployment_id}/${info.project.name}-affordable-desktop.png`, fullPage: true });
    await page.goto(origin); await expect(page.locator('#filters')).toBeVisible();
    await page.screenshot({ path: `artifacts/screenshots/${site.deployment_id}/${info.project.name}-restored-desktop.png`, fullPage: true });
    await page.screenshot({ path: `artifacts/screenshots/${site.deployment_id}/${info.project.name}-restored-top.png` });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.screenshot({ path: `artifacts/screenshots/${site.deployment_id}/${info.project.name}-restored-footer.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['/', '/affordable-food/']) {
        await page.goto(origin + route); await expect(page.locator('#filters')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator(`.browse-view-control a[href="${route}"]`)).toHaveAttribute('aria-current', 'page');
        if (site.help_contact) { await expect(page.locator('.header-help strong')).toBeVisible(); expect(await page.locator('.header-help strong').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14); }
        const inner = await page.locator('.footer-inner').boundingBox(); expect(inner!.width).toBeGreaterThan(width - 60);
      }
    }
    await page.screenshot({ path: `artifacts/screenshots/${site.deployment_id}/${info.project.name}-restored-mobile.png`, fullPage: true });
    await page.screenshot({ path: `artifacts/screenshots/${site.deployment_id}/${info.project.name}-restored-mobile-top.png` });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByText('Your privacy', { exact: true }).click();
    await page.evaluate(axe.source);
    const result = await page.evaluate(async () => (window as unknown as { axe: typeof axe }).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(result.violations.map(item => item.id)).toEqual([]);
  } finally { await context.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
