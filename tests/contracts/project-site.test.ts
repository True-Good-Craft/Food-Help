// SPDX-License-Identifier: MPL-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, access } from 'node:fs/promises';
import { parse } from 'parse5';
import { responseHeaders } from '../../scripts/lib/headers.ts';

type Node = { nodeName: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: Node[] };
const nodes = (node: Node): Node[] => [node, ...(node.childNodes ?? []).flatMap(nodes)];
const attr = (node: Node, name: string) => node.attrs?.find(attribute => attribute.name === name)?.value;
const targets = process.env.FOOD_HELP_TEST_PROJECT ? JSON.parse(process.env.FOOD_HELP_TEST_PROJECT) as { preview: string; production: string } : { preview: 'dist/project', production: 'dist/project' };

test('project output has crawlable community links, useful metadata and no client dependency', async () => {
  const source = JSON.parse(await readFile('project-site/communities.json', 'utf8')) as { communities: Array<{ canonical_url: string }> };
  const html = await readFile(path.join(targets.production, 'index.html'), 'utf8'), doc = nodes(parse(html) as unknown as Node);
  assert.equal(attr(doc.find(node => node.nodeName === 'link' && attr(node, 'rel') === 'canonical')!, 'href'), 'https://food-help.ca/');
  assert.equal(attr(doc.find(node => node.nodeName === 'meta' && attr(node, 'name') === 'description')!, 'content')?.includes('emergency and affordable food'), true);
  assert.equal(attr(doc.find(node => node.nodeName === 'meta' && attr(node, 'property') === 'og:url')!, 'content'), 'https://food-help.ca/');
  assert.equal(attr(doc.find(node => node.nodeName === 'meta' && attr(node, 'name') === 'twitter:card')!, 'content'), 'summary');
  for (const community of source.communities) assert.ok(doc.some(node => node.nodeName === 'a' && attr(node, 'href') === `${community.canonical_url}/`));
  assert.equal(doc.some(node => node.nodeName === 'script' && Boolean(attr(node, 'src'))), false);
  assert.deepEqual(JSON.parse(await readFile(path.join(targets.production, 'communities.json'), 'utf8')), JSON.parse(await readFile('project-site/communities.json', 'utf8')));
  await assert.rejects(access(path.join(targets.production, 'service-worker.js')));
});

test('preview and production discovery policies stay distinct and aliases remain noindex', async () => {
  const preview = await readFile(path.join(targets.preview, 'index.html'), 'utf8'), production = await readFile(path.join(targets.production, 'index.html'), 'utf8');
  assert.match(preview, /name="robots" content="noindex,follow"/);
  assert.match(production, /name="robots" content="index,follow"/);
  assert.doesNotMatch(preview, /analytics|metrics\/event|service-worker/i);
  assert.equal((await readFile(path.join(targets.preview, 'sitemap.xml'), 'utf8')).includes('<url>'), false);
  assert.equal((await readFile(path.join(targets.production, 'sitemap.xml'), 'utf8')).match(/<loc>/g)?.length, 1);
  const headers = await readFile(path.join(targets.production, '_headers'), 'utf8');
  assert.equal(responseHeaders(headers, new URL('https://food-help.ca/'))['Cache-Control'], 'no-cache, no-transform');
  assert.equal(responseHeaders(headers, new URL('https://food-help.ca/'))['X-Robots-Tag'], undefined);
  assert.equal(responseHeaders(headers, new URL('https://project.pages.dev/'))['X-Robots-Tag'], 'noindex');
  assert.equal(responseHeaders(headers, new URL('https://review.project.pages.dev/'))['X-Robots-Tag'], 'noindex');
  assert.equal(responseHeaders(headers, new URL('https://food-help.ca/404.html'))['X-Robots-Tag'], 'noindex, follow');
  assert.match(await readFile(path.join(targets.production, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/food-help\.ca\/sitemap\.xml/);
});
