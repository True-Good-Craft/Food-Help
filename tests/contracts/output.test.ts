import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import { files } from '../../scripts/build.ts';
import { assertDataset } from '../../src/validation.ts';
import type { PublicDataset, Site } from '../../src/types.ts';
import { selectedBuilds } from '../selected.ts';
type Node = { nodeName: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: Node[] };
const nodes = (node: Node): Node[] => [node, ...(node.childNodes ?? []).flatMap(nodes)];
const attr = (node: Node, key: string) => node.attrs?.find(item => item.name === key)?.value;
const text = (node: Node): string => node.value ?? (node.childNodes ?? []).map(text).join('');
const resourceIds = (doc: Node[]) => doc.filter(node => node.nodeName === 'article').map(node => attr(node, 'data-resource-id')).filter((id): id is string => Boolean(id));
const viewResources = (data: PublicDataset, view: 'emergency' | 'affordable') => data.resources.filter(resource => view === 'emergency'
  ? resource.cost?.state === 'free' || resource.cost?.state === 'mixed'
  : resource.cost?.state === 'low_cost' || resource.cost?.state === 'subsidized' || resource.cost?.state === 'mixed');
for (const { directory, sourceDir, production } of [...selectedBuilds, { directory: 'artifacts/exampleville', sourceDir: 'examples/exampleville', production: false }, { directory: 'artifacts/kingston-like', sourceDir: 'tests/fixtures/kingston-like', production: false }, { directory: 'artifacts/production', sourceDir: 'artifacts/production-site', production: true }]) describe(directory, () => {
  it('derives public facts, resource pages, metadata, sitemap and internal links consistently', async () => {
    const data = JSON.parse(await readFile(`${directory}/data/v1/resources.json`, 'utf8')) as PublicDataset; assertDataset(data, 'public');
    const site = JSON.parse(await readFile(`${sourceDir}/site.json`, 'utf8')) as Site;
    const source = JSON.parse(await readFile(`${sourceDir}/resources.json`, 'utf8')) as PublicDataset;
    expect(data.resources).toEqual(source.resources.filter(r => r.publication_status === 'published' && r.service_condition !== 'closed'));
    expect(new Set(data.resources.map(resource => resource.id)).size).toBe(data.resources.length);
    const output = await files(directory), sitemap = await readFile(`${directory}/sitemap.xml`, 'utf8');
    const xmlURLs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(item => item[1]!);
    const htmlFiles = output.filter(file => file.endsWith('.html') && file !== 'directory/download.html');
    expect(output.filter(file => file.startsWith('resources/') && file.endsWith('index.html'))).toHaveLength(data.resources.length);
    for (const file of htmlFiles) {
      const html = await readFile(path.join(directory, file), 'utf8'), doc = nodes(parse(html) as unknown as Node);
      const canonical = doc.find(n => n.nodeName === 'link' && attr(n, 'rel') === 'canonical')!;
      const url = attr(canonical, 'href')!; expect(new URL(url).origin).toBe(site.canonical_origin);
      expect(doc.find(n => attr(n, 'property') === 'og:url')?.attrs).toContainEqual({ name: 'content', value: url });
      expect(doc.filter(n => n.nodeName === 'h1')).toHaveLength(1);
      let previousLevel = 0;
      for (const heading of doc.filter(n => /^h[1-6]$/.test(n.nodeName))) { const level = Number(heading.nodeName.slice(1)); expect(level, `${file} skips a heading level`).toBeLessThanOrEqual(previousLevel + 1); previousLevel = level; }
      const indexable = attr(doc.find(n => attr(n, 'name') === 'robots')!, 'content') === 'index,follow';
      expect(xmlURLs.includes(url)).toBe(indexable); if (!production) expect(indexable).toBe(false);
      for (const element of doc) {
        const link = attr(element, 'href') ?? attr(element, 'src'); if (!link?.startsWith('/')) continue;
        const pathname = new URL(link, site.canonical_origin).pathname;
        expect(output, `${file} has broken link ${link}`).toContain(pathname.slice(1) + (pathname.endsWith('/') ? 'index.html' : ''));
      }
      const record = data.resources.find(r => file === `resources/${r.id}/index.html`);
      if (record) {
        expect(text(doc.find(n => n.nodeName === 'h1')!)).toBe(record.name);
        const ld = JSON.parse(text(doc.find(n => attr(n, 'type') === 'application/ld+json')!));
        expect(ld.mainEntity.name).toBe(record.name); expect(ld.mainEntity.description).toBe(record.summary); expect(text(doc[0]!)).toContain(record.summary);
        expect(ld.mainEntity.provider.name).toBe(data.organizations.find(o => o.id === record.organization_id)!.name);
      }
      expect(html).not.toMatch(/PRIVATE DRAFT SENTINEL|CLOSED SENTINEL/);
    }
    for (const [view, route, file] of [['emergency', '/', 'index.html'], ['affordable', '/affordable-food/', 'affordable-food/index.html']] as const) {
      const expected = viewResources(data, view);
      const html = await readFile(path.join(directory, file), 'utf8'), doc = nodes(parse(html) as unknown as Node);
      expect(attr(doc.find(node => node.nodeName === 'link' && attr(node, 'rel') === 'canonical')!, 'href')).toBe(site.canonical_origin + route);
      expect(resourceIds(doc)).toEqual(expected.map(resource => resource.id));
      const jsonld = JSON.parse(text(doc.find(node => node.nodeName === 'script' && attr(node, 'type') === 'application/ld+json')!));
      expect(jsonld['@type']).toBe('CollectionPage');
      expect(jsonld.url).toBe(site.canonical_origin + route);
      expect(jsonld.mainEntity.itemListElement.map((item: { name: string }) => item.name)).toEqual(expected.map(resource => resource.name));
      expect(xmlURLs.includes(site.canonical_origin + route)).toBe(production);
    }
    for (const file of ['directory/index.html', 'directory/download.html']) {
      const doc = nodes(parse(await readFile(path.join(directory, file), 'utf8')) as unknown as Node);
      expect(resourceIds(doc)).toEqual(data.resources.map(resource => resource.id));
    }
    const manifest = JSON.parse(await readFile(`${directory}/manifest.webmanifest`, 'utf8'));
    expect(manifest.name).toBe(site.site_name); expect(manifest.lang).toBe(site.language); expect(manifest.scope).toBe('/'); expect(manifest.start_url).toBe('/');
    expect(await readFile(`${directory}/robots.txt`, 'utf8')).toContain(`Sitemap: ${site.canonical_origin}/sitemap.xml`);
    const llms = await readFile(`${directory}/llms.txt`, 'utf8');
    expect(llms).toContain(`Emergency food directory: ${site.canonical_origin}/`);
    expect(llms).toContain(`Affordable food directory: ${site.canonical_origin}/affordable-food/`);
    expect(llms).toContain(`${site.canonical_origin}/data/v1/resources.json`);
    const download = await readFile(`${directory}/directory/download.html`, 'utf8'); expect(download).toContain('data:font/woff2;base64,'); expect(download).not.toContain('type="module"');
    const downloadNodes = nodes(parse(download) as unknown as Node);
    expect(text(downloadNodes.find(n => n.nodeName === 'pre')!)).toBe((await readFile('src/assets/fonts/OFL.txt', 'utf8')).replace(/\r\n?/g, '\n'));
  });
});
it('Exampleville and generic source contain no reference deployment or private infrastructure strings', async () => {
  for (const directory of ['src', 'schemas', 'artifacts/exampleville']) for (const file of await files(directory)) {
    if (/\.(png|woff2)$/.test(file)) continue;
    // Source attribution must preserve the legacy work's names; it is not deployment data.
    if (directory === 'artifacts/exampleville' && file === 'licenses/NOTICE.txt') { expect(await readFile(path.join(directory, file), 'utf8')).toBe((await readFile('NOTICE.md', 'utf8')).replace(/\r\n?/g, '\n')); continue; }
    expect(await readFile(path.join(directory, file), 'utf8'), `${directory}/${file}`).not.toMatch(/kingston|kfh-|buscore|true good craft|lighthouse|agent smith/i);
  }
});
