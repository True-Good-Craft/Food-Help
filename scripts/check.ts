// SPDX-License-Identifier: MPL-2.0
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { build } from './build.ts';
import { buildProject } from './build-project.ts';
import { digest } from './lib/web.ts';
import { argumentsFor, starterSite } from './lib/selection.ts';
const options = argumentsFor();
if (process.argv.includes('--all') && options.siteDir) throw new Error('Use either --all or --site, not both');
if (options.outDir || options.production) throw new Error('Check makes isolated preview outputs; use build for production or an explicit output path');
const run = (script: string, args: string[] = []) => new Promise<void>((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit', env: process.env });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${script} failed (${code})`)));
});
async function variant(folder: string, patch: Record<string, unknown>) {
  await mkdir(folder, { recursive: true });
  const site = { ...JSON.parse(await readFile('examples/exampleville/site.json', 'utf8')), ...patch };
  await writeFile(`${folder}/site.json`, JSON.stringify(site, null, 2)); await copyFile('examples/exampleville/resources.json', `${folder}/resources.json`);
}
await mkdir('.generated', { recursive: true });
try { await mkdir('.generated/check.lock'); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Another Food Help check is active. Checks sharing test fixtures are explicitly serialized. If a process crashed, confirm it has stopped before removing .generated/check.lock.'); throw error; }
try {
const independent = await build({ siteDir: 'examples/exampleville', outDir: 'artifacts/exampleville' });
const projectPreview = await buildProject({ outDir: 'artifacts/project-check/preview' });
const projectProduction = await buildProject({ outDir: 'artifacts/project-check/production', production: true, sourceRevision: 'a'.repeat(40) });
process.env.FOOD_HELP_TEST_PROJECT = JSON.stringify({ preview: projectPreview.outDir, production: projectProduction.outDir });
const requestedReviewSource = options.siteDir ?? starterSite;
const requestedReviewData = JSON.parse(await readFile(`${requestedReviewSource}/resources.json`, 'utf8')) as { resources?: Array<{ publication_status?: string }> };
const reviewSource = requestedReviewData.resources?.some(resource => resource.publication_status === 'draft') ? requestedReviewSource : starterSite;
const review = await build({ siteDir: reviewSource, reviewDrafts: true });
process.env.FOOD_HELP_TEST_REVIEW = JSON.stringify({ directory: review.outDir, sourceDir: reviewSource });
const untouchedFiles = JSON.parse(await readFile(independent.reportPath, 'utf8')).file_hashes as Record<string, string>;
await build({ siteDir: 'tests/fixtures/kingston-like', outDir: 'artifacts/kingston-like' });
await variant('artifacts/production-site', { example_content: false, canonical_origin: 'https://directory.example.test', indexing: { enabled: true } });
await build({ siteDir: 'artifacts/production-site', outDir: 'artifacts/production', production: true, sourceUrl: 'https://source.example.test/fixture/' });
await variant('artifacts/release-b-site', { site_name: 'Exampleville Food Help updated' });
await build({ siteDir: 'artifacts/release-b-site', outDir: 'artifacts/release-b' });
await variant('artifacts/analytics-site', { example_content: false, canonical_origin: 'https://analytics.example.test', analytics: { enabled: true, endpoint: 'https://metrics.example.invalid/events', collection_mode: 'opt_in', disclosure: 'Fictional test endpoint, used only by automated tests.', constants: { deployment: 'exampleville' } }, public_usage: { enabled: true, file: 'usage.json' } });
await writeFile('artifacts/analytics-site/usage.json', JSON.stringify({ schema_version: 1, deployment_id: 'exampleville', period_start: '2026-08-01', period_end: '2026-08-31', generated_at: '2026-09-01', counts: { page_starts: 10, call_actions: null, directions_actions: 2, source_link_actions: 3, installation_signals: 1 } }));
await build({ siteDir: 'artifacts/analytics-site', outDir: 'artifacts/analytics', production: true, sourceUrl: 'https://source.example.test/fixture/' });
const sites = process.argv.includes('--all') ? [starterSite, ...(await readdir('deployments', { withFileTypes: true }).catch(() => [])).filter(entry => entry.isDirectory()).map(entry => `deployments/${entry.name}`)].sort() : [options.siteDir ?? starterSite];
const selected = [], ids = new Set<string>();
for (const [index, siteDir] of sites.entries()) {
  const result = await build({ siteDir, outDir: `artifacts/check/selected-${index}` });
  if (ids.has(result.data.deployment_id)) throw new Error(`Duplicate deployment_id in selected communities: ${result.data.deployment_id}`);
  ids.add(result.data.deployment_id);
  selected.push({ directory: result.outDir, sourceDir: siteDir, production: false });
}
process.env.FOOD_HELP_TEST_DEPLOYMENTS = JSON.stringify(selected);
for (const [file, expected] of Object.entries(untouchedFiles)) {
  if (digest(await readFile(`${independent.outDir}/${file}`)) !== expected) throw new Error(`A different deployment build contaminated the independent Exampleville artifact: ${file}`);
}
await run('node_modules/typescript/bin/tsc', ['--noEmit']);
await run('node_modules/typescript/bin/tsc', ['-p', 'tsconfig.worker.json']);
await run('--test', ['tests/unit/*.test.ts', 'tests/contracts/*.test.ts']);
await run('node_modules/@playwright/test/cli.js', ['test']);
console.log('PASS: structurally safe and internally consistent enough for publication review. Provider facts, rights and deployment still require human review.');
} finally { await rm('.generated/check.lock', { recursive: true, force: true }); }
