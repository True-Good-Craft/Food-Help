// SPDX-License-Identifier: MPL-2.0
import { execFileSync } from 'node:child_process';
import { readdir, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export function selectedChecks(changed: string[], deployments: string[]): string[] {
  const shared = changed.some(file => !file.startsWith('deployments/'));
  return shared ? ['examples/exampleville', ...deployments].sort() : deployments.filter(folder => changed.some(file => file.startsWith(`${folder}/`))).sort();
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const folders = (await readdir('deployments', { withFileTypes: true }).catch(() => [])).filter(entry => entry.isDirectory()).map(entry => `deployments/${entry.name}`);
  const base = process.env.FOOD_HELP_CHECK_BASE, head = process.env.FOOD_HELP_CHECK_HEAD ?? 'HEAD';
  const changed = base && !/^0+$/.test(base) ? execFileSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' }).trim().split('\n').filter(Boolean) : ['src/'];
  const sites = selectedChecks(changed, folders);
  const matrix = JSON.stringify({ site: sites.length ? sites : ['examples/exampleville'] });
  console.log(matrix);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `matrix=${matrix}\n`);
}
