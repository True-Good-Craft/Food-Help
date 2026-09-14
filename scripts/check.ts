// SPDX-License-Identifier: MPL-2.0
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { build } from './build.ts';
const run = (script: string, args: string[] = []) => new Promise<void>((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit', env: process.env });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${script} failed (${code})`)));
});
async function variant(folder: string, patch: Record<string, unknown>) {
  await mkdir(folder, { recursive: true });
  const site = { ...JSON.parse(await readFile('examples/exampleville/site.json', 'utf8')), ...patch };
  await writeFile(`${folder}/site.json`, JSON.stringify(site, null, 2)); await copyFile('examples/exampleville/resources.json', `${folder}/resources.json`);
}
await build({ siteDir: 'examples/exampleville', outDir: 'artifacts/exampleville' });
await build({ siteDir: 'tests/fixtures/kingston-like', outDir: 'artifacts/kingston-like' });
await variant('artifacts/production-site', { example_content: false, canonical_origin: 'https://directory.example.test', indexing: { enabled: true } });
await build({ siteDir: 'artifacts/production-site', outDir: 'artifacts/production', production: true });
await variant('artifacts/release-b-site', { site_name: 'Exampleville Food Help updated' });
await build({ siteDir: 'artifacts/release-b-site', outDir: 'artifacts/release-b' });
await variant('artifacts/analytics-site', { analytics: { enabled: true, endpoint: 'https://metrics.example.invalid/events', collection_mode: 'opt_in', disclosure: 'Fictional test endpoint, used only by automated tests.', constants: { deployment: 'exampleville' } }, public_usage: { enabled: true, file: 'usage.json' } });
await writeFile('artifacts/analytics-site/usage.json', JSON.stringify({ schema_version: 1, deployment_id: 'exampleville', period_start: '2026-08-01', period_end: '2026-08-31', generated_at: '2026-09-01', counts: { page_starts: 10, call_actions: null, directions_actions: 2, source_link_actions: 3, installation_signals: 1 } }));
await build({ siteDir: 'artifacts/analytics-site', outDir: 'artifacts/analytics' });
await build();
await run('node_modules/typescript/bin/tsc', ['--noEmit']);
await run('node_modules/typescript/bin/tsc', ['-p', 'tsconfig.worker.json']);
await run('--test', ['tests/unit/*.test.ts', 'tests/contracts/*.test.ts']);
await run('node_modules/@playwright/test/cli.js', ['test']);
console.log('PASS: structurally safe and internally consistent enough for publication review. Provider facts, rights and deployment still require human review.');
