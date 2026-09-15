// SPDX-License-Identifier: MPL-2.0
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { buildLegacyTransition, legacyFiles, retirementWorker, transitionDestination } from '../../scripts/legacy-transition.ts';

describe('legacy static transition', () => {
  it('maps website paths and queries but leaves machine and compatibility paths alone', () => {
    for (const entry of ['/directory', '/directory.html']) assert.equal(transitionDestination(`https://old.example${entry}?x=1%202&x=three#section`, 'https://new.example'), 'https://new.example/directory/?x=1%202&x=three#section');
    assert.equal(transitionDestination('https://old.example/index.html?q=1', 'https://new.example'), 'https://new.example/?q=1');
    assert.equal(transitionDestination('https://old.example/resources/a/?q=1', 'https://new.example'), 'https://new.example/resources/a/?q=1');
    for (const route of [...legacyFiles, '/data/v1/resources.json', '/assets/file.js', '/fonts/font.woff2', '/transition-licenses/OFL.txt']) assert.equal(transitionDestination('https://old.example' + route, 'https://new.example'), null);
  });
  it('retirement deletes only owned legacy caches and reloads website windows on the old origin', async () => {
    const handlers = new Map<string, (event: unknown) => void>(), removed: string[] = [], navigated: string[] = [];
    let claimed = false, skipped = false;
    const urls = ['https://old.example/directory.html?from=bookmark', 'https://old.example/data/v1/resources.json', 'https://unrelated.example/'];
    vm.runInNewContext(retirementWorker('https://new.example'), {
      URL, Response, caches: { keys: async () => ['kfh-app-one', 'kfh-app-two', 'kfh-data-v1', 'kfh-data-v10', 'kfh-other', 'food-help-example-app-one', 'unrelated'], delete: async (name: string) => { removed.push(name); return true; } },
      self: { location: { origin: 'https://old.example' }, addEventListener: (type: string, listener: (event: unknown) => void) => handlers.set(type, listener), skipWaiting: async () => { skipped = true; }, clients: { claim: async () => { claimed = true; }, matchAll: async () => urls.map(url => ({ url, navigate: async (next: string) => { navigated.push(next); } })) } }
    });
    let pending: Promise<unknown> | undefined;
    handlers.get('install')!({ waitUntil: (value: Promise<unknown>) => { pending = value; } }); await pending; assert.equal(skipped, true);
    handlers.get('activate')!({ waitUntil: (value: Promise<unknown>) => { pending = value; } }); await pending;
    assert.equal(claimed, true); assert.deepEqual(removed.sort(), ['kfh-app-one', 'kfh-app-two', 'kfh-data-v1']); assert.deepEqual(navigated, [urls[0]]);
    let response: Promise<Response> | undefined;
    handlers.get('fetch')!({ request: { method: 'GET', mode: 'navigate', url: urls[0] }, respondWith: (value: Promise<Response>) => { response = value; } });
    assert.equal((await response)!.status, 308); assert.equal((await response)!.headers.get('location'), 'https://new.example/directory/?from=bookmark');
    response = undefined;
    handlers.get('fetch')!({ request: { method: 'GET', mode: 'navigate', url: urls[1] }, respondWith: (value: Promise<Response>) => { response = value; } }); assert.equal(response, undefined);
  });
  it('copies exact legacy bytes without private receipts or old HTML and refuses destructive destinations', async () => {
    await mkdir('artifacts/legacy-tests', { recursive: true }); const root = await mkdtemp(path.resolve('artifacts/legacy-tests/build-')), source = path.join(root, 'source'), output = path.join(root, 'output');
    await mkdir(path.join(source, 'data/v1'), { recursive: true }); await mkdir(path.join(source, 'assets'));
    const data = '{\n "schema_version": 1, "resources": [{"id":"synthetic"}]\n}\n';
    await writeFile(path.join(source, 'data/v1/resources.json'), data);
    for (const file of legacyFiles.filter(file => file !== '/sw.js')) await writeFile(path.join(source, file), file + '\r\n');
    await writeFile(path.join(source, 'assets/old.js'), '/* preserved synthetic code */');
    await writeFile(path.join(source, 'sw.js'), 'const APP_CACHE="kfh-app-old";const DATA_CACHE="kfh-data-v1";const PRECACHE_URLS = ["/index.html","/assets/old.js"];');
    await writeFile(path.join(source, 'index.html'), 'Old application with private marker'); await writeFile(path.join(source, 'receipt.json'), '{"private":"receipt"}');
    const options = { fromDir: source, toOrigin: 'https://new.example', outDir: output };
    const result = await buildLegacyTransition(options);
    assert.equal(await readFile(path.join(output, 'data/v1/resources.json'), 'utf8'), data); assert.equal(await readFile(path.join(output, 'assets/old.js'), 'utf8'), '/* preserved synthetic code */');
    assert.equal((await readdir(output)).includes('receipt.json'), false); assert.equal((await readFile(path.join(output, 'index.html'), 'utf8')).includes('private marker'), false);
    assert.equal(result.legacy_resource_count, 1); assert.equal(result.requires_external_website_redirect, true);
    const provenance = await readFile(path.join(output, 'transition-licenses/legacy-provenance.txt'), 'utf8');
    assert.match(provenance, /does not relicense these historical assets/);
    assert.match(provenance, /no claim that the historical source is publicly available/);
    assert.match(provenance, /https:\/\/new\.example\/licenses\//);
    assert.equal(provenance.includes('github.com'), false);
    assert.match(await readFile(path.join(output, 'index.html'), 'utf8'), /href="\/transition-licenses\/legacy-provenance.txt"/);
    assert.match(await readFile(path.join(output, '_headers'), 'utf8'), /Cache-Control: no-store/);
    await assert.rejects(buildLegacyTransition(options), /must be empty/);
    await assert.rejects(buildLegacyTransition({ ...options, outDir: source }), /separate child/);
    await assert.rejects(buildLegacyTransition({ ...options, toOrigin: 'http://new.example', outDir: path.join(root, 'unsafe') }), /HTTPS origin/);
  });
});
