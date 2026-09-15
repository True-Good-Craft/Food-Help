// SPDX-License-Identifier: MPL-2.0
// Read-only host/browser verification. Browser privacy signals suppress optional collection.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import axe from 'axe-core';
import { argumentsFor, selection } from './lib/selection.ts';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const args = argumentsFor();
if (!args.siteDir) throw new Error('Explicit --site required for production verification');
const selected = await selection(args), site = JSON.parse(await readFile(path.join(selected.siteDir, 'site.json'), 'utf8'));
const reportArg = process.argv.indexOf('--report');
const reportPath = reportArg < 0 ? `artifacts/reports/${site.deployment_id}/${hash(selected.outDir).slice(0, 16)}.json` : process.argv[reportArg + 1];
const built = JSON.parse(await readFile(reportPath, 'utf8'));
assert.equal(built.production, true, 'Use the exact production build report');
assert.equal(built.deployment_id, site.deployment_id);
const origin = site.canonical_origin;
const evidenceDir = `artifacts/verification/${site.deployment_id}-${built.release.slice(0, 16)}`;
await mkdir(evidenceDir, { recursive: true });
const result = { origin, checked_at: new Date().toISOString(), source_revision: built.source_revision, release: built.release, dataset_version: built.dataset_version, checks: [], issues: [] };
async function check(name, task) {
  try { await task(); result.checks.push(name); console.log(`PASS ${name}`); }
  catch (error) { result.issues.push({ check: name, message: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
async function get(route) {
  const response = await fetch(origin + route, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { response, bytes, text: bytes.toString('utf8') };
}
let data, workerBuild;
await check('production identity and HTTP policies', async () => {
  const [home, worker, json, manifest, sitemap, robots, error] = await Promise.all(['/', '/service-worker.js', '/data/v1/resources.json', '/manifest.webmanifest', '/sitemap.xml', '/robots.txt', '/verification-unknown-route/'].map(get));
  for (const response of [home, worker, json, manifest, sitemap, robots]) assert.equal(response.response.status, 200);
  assert.equal(error.response.status, 404);
  assert.equal(error.response.headers.get('content-security-policy'), built.common_headers['Content-Security-Policy']);
  assert.equal(home.response.headers.get('content-security-policy'), built.common_headers['Content-Security-Policy']);
  assert.equal(home.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(home.response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(home.response.headers.get('strict-transport-security'), /max-age=/);
  assert.match(home.text, /<meta name="robots" content="index,follow">/);
  assert.equal(home.response.headers.get('x-robots-tag'), null);
  assert.match(worker.response.headers.get('cache-control'), /no-store|no-cache/);
  assert.match(worker.response.headers.get('content-type'), /javascript/);
  assert.equal(worker.response.headers.get('service-worker-allowed'), '/');
  assert.match(json.response.headers.get('cache-control'), /no-store/);
  assert.equal(json.response.headers.get('access-control-allow-origin'), '*');
  assert.equal(hash(json.bytes), built.file_hashes['data/v1/resources.json']);
  assert.equal(hash(worker.bytes), built.file_hashes['service-worker.js'], 'Served worker must match the exact built artifact');
  data = JSON.parse(json.text); assert.equal(data.dataset_version, built.dataset_version);
  assert.equal(data.resources.length, built.resources);
  const app = JSON.parse(manifest.text); assert.equal(app.name, site.site_name); assert.equal(app.scope, '/'); assert.equal(app.start_url, '/');
  assert.ok(robots.text.includes(`Sitemap: ${origin}/sitemap.xml`));
  for (const resource of data.resources) assert.ok(sitemap.text.includes(`${origin}/resources/${resource.id}/`));
  workerBuild = JSON.parse(worker.text.match(/^const BUILD = (.+);/)[1]);
  assert.equal(workerBuild.cache, `food-help-${site.deployment_id}-app-${built.release}`);
  assert.equal(workerBuild.dataCache, `food-help-${site.deployment_id}-data-v1-${built.compatibility_id}`);
});
const aliases = process.env.FOOD_HELP_VERIFY_ALIASES?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
for (const alias of aliases) await check(`provider alias is noindex: ${alias}`, async () => {
  const url = new URL(alias); assert.equal(url.protocol, 'https:'); assert.ok(url.hostname.endsWith('.pages.dev'));
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) }); assert.equal(response.status, 200);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
});
if (workerBuild) {
  const pending = [...workerBuild.entries];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let entry; (entry = pending.shift());) await check(`integrity ${entry.url}`, async () => {
      assert.ok(!['/robots.txt', '/sitemap.xml', '/llms.txt'].includes(entry.url));
      const r = await get(entry.url); assert.equal(r.response.status, 200); assert.equal(hash(r.bytes), entry.hash);
      if (entry.url.endsWith('.html')) {
        assert.equal(r.response.headers.get('content-security-policy'), built.common_headers['Content-Security-Policy']);
        assert.ok(!/email-decode|\/cdn-cgi\/l\/email-protection|static\.cloudflareinsights\.com/.test(r.text), 'Unexpected host injection');
      }
    });
  }));
}
await check('normalized HTML routes and corresponding source', async () => {
  for (const route of ['/404', '/directory/download', '/directory/download.html']) {
    const r = await get(route); assert.equal(r.response.status, 200); assert.equal(r.response.headers.get('content-security-policy'), built.common_headers['Content-Security-Policy']);
  }
  const licenses = await get('/licenses/'); assert.ok(licenses.text.includes(built.source_url));
  const download = await get('/directory/download'); assert.ok(download.text.includes(built.source_url)); assert.ok(download.text.includes('SIL OPEN FONT LICENSE'));
});
let context;
await mkdir('artifacts/profiles', { recursive: true });
const profile = await mkdtemp(path.resolve('artifacts/profiles', 'verify-'));
const browserFailures = [], outsideRequests = [], runtimeErrors = [];
async function privacy(browserContext) {
  await browserContext.addInitScript(() => { Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }); Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }); });
  browserContext.on('request', request => { if (new URL(request.url()).origin !== origin) outsideRequests.push({ url: request.url(), method: request.method() }); });
  browserContext.on('requestfailed', request => browserFailures.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText }));
  browserContext.on('page', page => page.on('pageerror', error => runtimeErrors.push(error.message)));
}
try {
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 1920, height: 912 } });
  await privacy(context);
  const page = await context.newPage();
  await check('live interface, accessibility, mobile and optional-collection suppression', async () => {
    await page.goto(origin); await expect(page.locator('.brand')).toHaveText(site.site_name); await expect(page.locator('#filters')).toBeVisible();
    await expect(page.locator('#resource-list article')).toHaveCount(built.resources);
    for (const group of site.presentation?.category_groups ?? []) {
      await page.locator(`[data-category="${group.id}"]`).click();
      await expect(page.locator('#resource-list article')).toHaveCount(data.resources.filter(r => r.categories.some(c => group.categories.includes(c))).length);
    }
    await page.locator('[data-category="all"]').click();
    await page.locator('#search').fill(data.resources[0].name); await expect(page.locator('#resource-list article')).toHaveCount(1); await page.locator('#search').fill('');
    await page.locator('h1').click();
    await page.evaluate(axe.source);
    const accessibility = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    assert.deepEqual(accessibility.violations.map(v => v.id), []);
    await page.screenshot({ path: `${evidenceDir}/desktop.png` }); await page.locator('.site-footer').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${evidenceDir}/footer.png` });
    for (const width of [768, 390, 320]) { await page.setViewportSize({ width, height: 844 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)); }
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${evidenceDir}/mobile.png` });
    assert.deepEqual(runtimeErrors, []); assert.deepEqual(outsideRequests, []);
  });
  await check('first connected visit installs a complete validated offline release', async () => {
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 60000 }).toBe(true);
    const keys = await page.evaluate(() => caches.keys()); assert.ok(keys.includes(workerBuild.cache)); assert.ok(keys.includes(workerBuild.dataCache));
  });
  await context.close(); context = undefined;
  await check('offline cold browser restart, resource navigation and reconnection', async () => {
    context = await chromium.launchPersistentContext(profile, { headless: true, offline: true }); await privacy(context);
    const cold = await context.newPage(); await cold.goto(origin);
    await expect(cold.locator('#resource-list article')).toHaveCount(built.resources); await expect(cold.locator('#data-retention-status')).toContainText('last saved validated');
    await cold.getByRole('link', { name: data.resources[0].name, exact: true }).click(); await expect(cold.locator('h1')).toHaveText(data.resources[0].name);
    await context.setOffline(false); await cold.goto(origin); await expect(cold.locator('#data-status')).toContainText('Listings updated');
    await context.close(); context = undefined;
  });
  await check('no-JavaScript directory, print and standalone download', async () => {
    context = await chromium.launchPersistentContext(await mkdtemp(path.resolve('artifacts/profiles', 'nojs-')), { headless: true, javaScriptEnabled: false });
    await privacy(context);
    const simple = await context.newPage(); await simple.goto(origin); await expect(simple.locator('#resource-list article')).toHaveCount(built.resources);
    await simple.goto(`${origin}/directory/`); await expect(simple.locator('article')).toHaveCount(built.resources); await simple.emulateMedia({ media: 'print' }); await simple.pdf({ path: `${evidenceDir}/directory.pdf` });
    await simple.goto(`${origin}/directory/download`); await expect(simple.locator('article')).toHaveCount(built.resources);
    await context.close(); context = undefined;
  });
} finally {
  await context?.close();
  await check('all browsing stages remain free of external requests and runtime errors', async () => {
    assert.deepEqual(outsideRequests, []); assert.deepEqual(runtimeErrors, []);
  });
  result.browser_failures = browserFailures; result.external_requests = outsideRequests; result.runtime_errors = runtimeErrors;
  result.status = result.issues.length ? 'failed' : 'passed';
  await writeFile(`${evidenceDir}/verification.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(`Evidence: ${evidenceDir}/verification.json`);
}
if (result.issues.length) throw new Error(`${result.issues.length} production checks failed; the release is not verified`);
