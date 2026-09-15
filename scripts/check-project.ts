// SPDX-License-Identifier: MPL-2.0
import { spawn } from 'node:child_process';
import { buildProject } from './build-project.ts';
import { generateContracts } from './lib/contracts.ts';

const run = (script: string, args: string[] = []) => new Promise<void>((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit', env: process.env });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${script} failed (${code})`)));
});

await generateContracts();
const preview = await buildProject({ outDir: 'artifacts/project-check/preview' });
const production = await buildProject({ outDir: 'artifacts/project-check/production', production: true, sourceRevision: 'a'.repeat(40) });
process.env.FOOD_HELP_TEST_PROJECT = JSON.stringify({ preview: preview.outDir, production: production.outDir });
await run('node_modules/typescript/bin/tsc', ['--noEmit']);
await run('--test', ['tests/unit/project-site.test.ts', 'tests/contracts/project-site.test.ts']);
await run('node_modules/@playwright/test/cli.js', ['test', '--config', 'playwright.project.config.ts']);
console.log('PASS: Food Help project site is ready for local publication review. External hosting, redirects, Search Console and analytics remain separate approvals.');
