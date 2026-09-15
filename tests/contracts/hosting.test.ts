// SPDX-License-Identifier: MPL-2.0
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serve } from '../../scripts/serve.ts';
import { selectedBuilds } from '../selected.ts';
import { assertPagesHeaders, responseHeaders } from '../../scripts/lib/headers.ts';

for (const selected of selectedBuilds) it(`${selected.sourceDir}: normalized pages and real errors retain one strict CSP; crawler metadata is outside atomic offline installation`, async () => {
  const server = await serve({ root: selected.directory, port: 0 });
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const declaration = await readFile(`${selected.directory}/_headers`, 'utf8');
    assertPagesHeaders(declaration);
    assert.equal((declaration.match(/Content-Security-Policy:/g) ?? []).length, 1);
    const responses = await Promise.all(['/', '/about/', '/about/index.html', '/directory/download', '/404', '/missing-resource-testing', '/service-worker.js'].map(route => fetch(`${origin}${route}`)));
    const csp = responses[0]!.headers.get('content-security-policy');
    assert.ok(csp); assert.ok(csp.includes("default-src 'none'"));
    assert.ok(!csp.includes("'unsafe-inline'"));
    for (const response of responses) assert.equal(response.headers.get('content-security-policy'), csp);
    assert.equal(responses[5]!.status, 404);
    assert.match(responses[6]!.headers.get('cache-control') ?? '', /no-store/);
    const download = await responses[3]!.text();
    assert.match(download, /data:font\/woff2;base64/);
    const worker = await responses[6]!.text();
    const build = JSON.parse(worker.match(/^const BUILD = (.*);\n/)![1]!);
    for (const filename of ['robots.txt', 'sitemap.xml', 'llms.txt']) assert.ok(!build.entries.some((entry: { url: string }) => entry.url === `/${filename}`));
    assert.ok(build.entries.some((entry: { url: string }) => entry.url === '/directory/download.html'));
    assert.equal(build.routes['/directory/download'], '/directory/download.html');
  } finally { await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
});

it('production provider aliases send noindex while the canonical home remains indexable', async () => {
  const declaration = await readFile('artifacts/production/_headers', 'utf8');
  assertPagesHeaders(declaration);
  assert.equal(responseHeaders(declaration, new URL('https://directory.example.test/'))['X-Robots-Tag'], undefined);
  for (const alias of ['https://directory.pages.dev/', 'https://review.directory.pages.dev/']) assert.equal(responseHeaders(declaration, new URL(alias))['X-Robots-Tag'], 'noindex');
});
