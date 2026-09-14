// SPDX-License-Identifier: MPL-2.0
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { compile } from 'json-schema-to-typescript';

export async function generateContracts(): Promise<void> {
  await mkdir('.generated', { recursive: true });
  const site = JSON.parse(await readFile('schemas/site.schema.json', 'utf8'));
  const data = JSON.parse(await readFile('schemas/resources.schema.json', 'utf8'));
  const ajv = new Ajv({ strict: true, allowUnionTypes: true, allErrors: true, code: { source: true, esm: true }, inlineRefs: true });
  ajv.addSchema(site); ajv.addSchema(data);
  const publicData = { ...data, $id: 'urn:food-help:public:v1', required: [...data.required, 'deployment_id', 'dataset_version', 'compatibility_id', 'data_updated_on'] };
  ajv.addSchema(publicData);
  ajv.addSchema({ $id: 'urn:food-help:usage:v1', $ref: 'urn:food-help:site:v1#/$defs/usage' });
  const code = standaloneCode(ajv, { validateSite: site.$id, validateSource: data.$id, validatePublic: publicData.$id, validateUsage: 'urn:food-help:usage:v1' });
  // Emit self-contained validators with the two small helpers these schemas need.
  const standalone = code.replaceAll('require("ajv/dist/runtime/ucs2length").default', '((value) => Array.from(value).length)')
    .replaceAll('require("ajv/dist/runtime/equal").default', '(function equal(a, b) { if (a === b) return true; if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false; const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key])); })');
  if (standalone.includes('require(')) throw new Error(`New schema runtime helper needs explicit bundling review: ${standalone.match(/require\([^)]*\)/g)?.join(', ')}`);
  await writeFile('.generated/validators.js', standalone);
  await writeFile('.generated/validators.d.ts', 'type Validator = ((value: unknown) => boolean) & { errors?: unknown };\nexport const validateSite: Validator, validateSource: Validator, validatePublic: Validator, validateUsage: Validator;\n');
  await writeFile('.generated/site.d.ts', await compile(site, 'Site', { bannerComment: '// Generated from site.schema.json; do not edit.' }));
  await writeFile('.generated/dataset.d.ts', await compile(data, 'Dataset', { bannerComment: '// Generated from resources.schema.json; do not edit.' }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await generateContracts();
