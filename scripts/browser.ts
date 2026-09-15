// SPDX-License-Identifier: MPL-2.0
import { spawn } from 'node:child_process';
import { argumentsFor, selection } from './lib/selection.ts';
const selected = await selection(argumentsFor());
const args = process.argv.slice(2).filter((_arg, index, all) => !['--site', '--out'].includes(all[index]!) && !['--site', '--out'].includes(all[index - 1]!));
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...args], { stdio: 'inherit', env: { ...process.env, FOOD_HELP_TEST_DEPLOYMENTS: JSON.stringify([{ directory: selected.outDir, sourceDir: selected.siteDir, production: false }]) } });
child.on('error', error => { throw error; });
child.on('exit', code => { process.exitCode = code ?? 1; });
