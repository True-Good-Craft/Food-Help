// SPDX-License-Identifier: MPL-2.0
import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { generateContracts } from './lib/contracts.ts';
await generateContracts();
const validation: typeof import('../src/validation.ts') = await import('../src/validation.ts');
await mkdir('site/assets', { recursive: true });
for (const file of ['site.json', 'resources.json']) { try { await access(`site/${file}`); } catch { await copyFile(`examples/exampleville/${file}`, `site/${file}`); } }
const site = JSON.parse(await readFile('site/site.json', 'utf8'));
if (process.stdin.isTTY && !process.argv.includes('--validate-only')) {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label: string, current: string) => (await input.question(`${label} [${current}]: `)).trim() || current;
  try {
    site.deployment_id = await ask('Deployment slug', site.deployment_id);
    site.community.name = await ask('Community name', site.community.name);
    site.site_name = await ask('Site name', `${site.community.name} Food Help`);
    site.community.locality = await ask('Locality', site.community.locality);
    site.community.region = await ask('Region/province/state', site.community.region);
    site.community.country = await ask('Country code', site.community.country);
    site.locale = await ask('Locale', site.locale);
    site.time_zone = await ask('IANA timezone', site.time_zone);
    site.canonical_origin = await ask('Canonical HTTPS origin', site.canonical_origin);
    site.operator.name = await ask('Operator name', site.operator.name);
    site.corrections.email = await ask('Corrections email', site.corrections.email);
    validation.assertSite(site);
    await writeFile('site/site.json', JSON.stringify(site, null, 2) + '\n');
    console.log(`Saved configuration. When replacing the fictional dataset, use a new dataset_id, for example ${randomUUID()}.`);
  } finally { input.close(); }
}
validation.assertSite(site); validation.assertDataset(JSON.parse(await readFile('site/resources.json', 'utf8')));
console.log('Site and resource contracts are valid. Review the example-content flag, contacts, evidence and data rights before production. See docs/data.md.');
