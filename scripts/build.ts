// SPDX-License-Identifier: MPL-2.0
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build as viteBuild } from 'vite';
import { stripTypeScriptTypes } from 'node:module';
import { generateContracts } from './lib/contracts.ts';
import { digest, pages, document, securityHeaders, type Assets } from './lib/web.ts';
import type { Site, Dataset, PublicDataset, Usage } from '../src/types.ts';
import { escape as escapeHTML } from '../src/presentation.ts';
import { argumentsFor, selection } from './lib/selection.ts';
import { renderHeaders } from './lib/headers.ts';
import { readText } from './lib/text.ts';

export type BuildOptions = { siteDir?: string; outDir?: string; production?: boolean; sourceRevision?: string; sourceUrl?: string };
export async function files(directory: string): Promise<string[]> {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => entry.isDirectory() ? (await files(path.join(directory, entry.name))).map(file => `${entry.name}/${file}`) : [entry.name]))).flat().sort();
}
export async function build(options: BuildOptions = {}) {
  await mkdir('.generated', { recursive: true });
  const lock = path.resolve('.generated/build.lock');
  try { await mkdir(lock); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Another Food Help build is active. Builds are explicitly serialized. If a process crashed, confirm no build is running before removing .generated/build.lock.'); throw error; }
  try { return await buildSelected(options); } finally { await rm(lock, { recursive: true, force: true }); }
}
async function buildSelected(options: BuildOptions): Promise<{ release: string; outDir: string; reportPath: string; data: PublicDataset }> {
  const root = process.cwd(), { siteDir, outDir } = await selection(options), production = options.production ?? false;
  // Destructive work is restricted to known generated directories inside this workspace.
  if (!['dist', 'artifacts', '.generated'].some(directory => outDir.startsWith(path.join(root, directory) + path.sep)) || outDir === siteDir || siteDir.startsWith(outDir + path.sep) || outDir === path.join(root, '.generated/build.lock')) throw new Error('Output must be a child of dist/, artifacts/ or .generated/ and must not contain source configuration');
  await generateContracts();
  const validation: typeof import('../src/validation.ts') = await import('../src/validation.ts');
  const site: unknown = JSON.parse(await readFile(path.join(siteDir, 'site.json'), 'utf8'));
  const source: unknown = JSON.parse(await readFile(path.join(siteDir, 'resources.json'), 'utf8'));
  validation.assertSite(site); validation.assertDataset(source);
  if (production && (site.example_content || new URL(site.canonical_origin).hostname.endsWith('.invalid'))) throw new Error('Production build refuses fictional example content or an .invalid origin');
  const sourceRevision = options.sourceRevision ?? process.env.FOOD_HELP_SOURCE_REVISION ?? process.env.CF_PAGES_COMMIT_SHA;
  if (sourceRevision && !/^[0-9a-f]{40}$/i.test(sourceRevision)) throw new Error('Source revision must be an exact 40-character Git commit SHA');
  let sourceUrl = options.sourceUrl;
  if (!sourceUrl && sourceRevision && site.software_source_url) {
    const repository = new URL(site.software_source_url);
    if (repository.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/?$/.test(repository.pathname)) sourceUrl = `${repository.origin}${repository.pathname.replace(/\/$/, '')}/tree/${sourceRevision}`;
  }
  if (production && !sourceUrl) throw new Error('Production requires --source-url for the corresponding covered source, or --source-revision with a configured GitHub repository URL');
  if (sourceUrl) { if (new URL(sourceUrl).protocol !== 'https:') throw new Error('Covered source URL must use HTTPS'); site.software_source_url = sourceUrl; }
  const resources = source.resources.filter(validation.isPublished);
  const compatibility = digest(JSON.stringify({ deployment_id: site.deployment_id, dataset_id: source.dataset_id, contract: 1, taxonomy: 1, language: site.language, time_zone: site.time_zone, review: site.review, jurisdiction: site.jurisdiction ?? null }));
  const data: PublicDataset = { ...source, organizations: source.organizations.filter(org => resources.some(r => r.organization_id === org.id)), resources, deployment_id: site.deployment_id, compatibility_id: compatibility, dataset_version: '', data_updated_on: resources.map(r => r.updated_on).sort().at(-1) ?? null };
  data.dataset_version = digest(JSON.stringify(data)); validation.assertDataset(data, 'public');
  if (JSON.stringify(data).length > 5_000_000) throw new Error('v1 supports at most 5 MB of public resource JSON');
  let usage: Usage | undefined;
  if (site.public_usage?.enabled) { const value: unknown = JSON.parse(await readFile(path.join(siteDir, 'usage.json'), 'utf8')); validation.assertUsage(value, site); usage = value; }
  const runtimeConfig = JSON.stringify({ site, compatibility_id: compatibility, data_url: '/data/v1/resources.json', production });
  await rm(outDir, { recursive: true, force: true }); await mkdir(outDir, { recursive: true });
  await viteBuild({ configFile: false, publicDir: false, logLevel: 'warn', plugins: [{ name: 'food-help-selected-config', resolveId(id) { if (id === 'virtual:food-help-config') return '\0food-help-config'; }, load(id) { if (id === '\0food-help-config') return `export default ${runtimeConfig};`; } }], build: { outDir, emptyOutDir: false, manifest: true, sourcemap: false, rollupOptions: { input: path.join(root, 'src/main.ts'), output: { entryFileNames: 'assets/app-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } } } });
  const manifest = JSON.parse(await readFile(path.join(outDir, '.vite/manifest.json'), 'utf8')) as Record<string, { isEntry?: boolean; file: string; css?: string[] }>;
  const entry = Object.values(manifest).find(item => item.isEntry)!;
  const asset = async (sourceFile: string, name: string): Promise<string> => { const content = sourceFile.endsWith('.svg') ? Buffer.from(await readText(sourceFile)) : await readFile(sourceFile); const file = `/assets/${name}-${digest(content).slice(0, 16)}${path.extname(sourceFile)}`; await writeFile(path.join(outDir, file), content); return file; };
  const branding = site.branding;
  if (branding?.logo) {
    for (const [file, size] of [[branding.icon_192!, 192], [branding.icon_512!, 512]] as const) {
      const png = await readFile(path.join(siteDir, file)); if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) throw new Error(`Brand icon must be a ${size}×${size} PNG`);
    }
    if (branding.logo.endsWith('.svg')) { const svg = await readFile(path.join(siteDir, branding.logo), 'utf8'); if (/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=|url\(|<!ENTITY|<!DOCTYPE/i.test(svg)) throw new Error('SVG logo must be a self-contained passive image'); }
  }
  const assets: Assets = { js: `/${entry.file}`, css: (entry.css ?? []).map(file => `/${file}`), logo: await asset(branding?.logo ? path.join(siteDir, branding.logo) : 'src/assets/brand/logo.svg', 'logo'), icon192: await asset(branding?.icon_192 ? path.join(siteDir, branding.icon_192) : 'src/assets/brand/icon-192.png', 'icon-192'), icon512: await asset(branding?.icon_512 ? path.join(siteDir, branding.icon_512) : 'src/assets/brand/icon-512.png', 'icon-512'), font: await asset('src/assets/fonts/atkinson-hyperlegible-next.woff2', 'atkinson'), brand: '' };
  const brandCSS = `@font-face{font-family:"Atkinson Hyperlegible Next";src:url("${assets.font}") format("woff2");font-style:normal;font-weight:200 800;font-display:swap}:root{${branding?.colors?.primary ? `--navy:${branding.colors.primary};--teal:${branding.colors.primary};` : ''}${branding?.colors?.background ? `--paper:${branding.colors.background};background:${branding.colors.background};` : ''}${branding?.colors?.text ? `color:${branding.colors.text};` : ''}}`;
  assets.brand = `/assets/brand-${digest(brandCSS).slice(0, 16)}.css`; await writeFile(path.join(outDir, assets.brand), brandCSS);
  const write = async (file: string, text: string) => { const target = path.join(outDir, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, text); };
  const headers: Record<string, Record<string, string>> = {}, routes: Record<string, string> = {};
  const outputPages = pages(site, data, usage);
  for (const page of outputPages) {
    const file = page.path.endsWith('/') ? `${page.path}index.html` : page.path;
    const html = document(page, site, assets, production); await write(file, html);
    headers[page.path] = securityHeaders(html, site, production);
    if (!(production && !site.example_content && site.indexing?.enabled && page.indexable)) headers[page.path]!['X-Robots-Tag'] = 'noindex, follow';
    routes[page.path] = file; routes[file] = file;
    headers[file] = headers[page.path]!;
    if (page.path !== '/' && page.path.endsWith('/')) { routes[page.path.slice(0, -1)] = file; headers[page.path.slice(0, -1)] = headers[page.path]!; }
    if (page.path.endsWith('.html')) { routes[page.path.slice(0, -5)] = file; headers[page.path.slice(0, -5)] = headers[page.path]!; }
  }
  const simple = outputPages.find(page => page.path === '/directory/')!;
  const standaloneCSS = (await readText('src/simple.css')) + `\n@font-face{font-family:"Atkinson Hyperlegible Next";src:url(data:font/woff2;base64,${(await readFile('src/assets/fonts/atkinson-hyperlegible-next.woff2')).toString('base64')}) format("woff2");font-weight:200 800;font-display:swap}.site-footer{margin-top:2rem}.skip-link{display:none}[hidden]{display:none}.font-license pre{white-space:pre-wrap;overflow-wrap:anywhere}@media print{.font-license{display:none}}`;
  const licenseAppendix = `<details class="font-license"><summary>Embedded font licence</summary><pre>${escapeHTML(await readText('src/assets/fonts/OFL.txt'))}</pre></details>`;
  const download = document(simple, site, assets, false, standaloneCSS).replace('</main>', `${licenseAppendix}</main>`).replace(/href="\/(?!\/)/g, `href="${site.canonical_origin}/`).replace(/<img[^>]*>/g, '');
  await write('/directory/download.html', download); headers['/directory/download.html'] = { ...securityHeaders(download, site, production), 'X-Robots-Tag': 'noindex, follow' }; routes['/directory/download.html'] = '/directory/download.html';
  headers['/directory/download'] = headers['/directory/download.html']!; routes['/directory/download'] = '/directory/download.html';
  await write('/data/v1/resources.json', JSON.stringify(data, null, 2) + '\n');
  headers['/data/v1/resources.json'] = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' };
  await write('/manifest.webmanifest', JSON.stringify({ id: `/?app=${site.deployment_id}`, name: site.site_name, short_name: site.short_name ?? site.site_name, description: site.description, lang: site.language, dir: site.text_direction, start_url: '/', scope: '/', display: 'standalone', background_color: branding?.colors?.background ?? '#f6f3eb', theme_color: branding?.colors?.primary ?? '#173f4c', icons: [{ src: assets.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: assets.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' }] }, null, 2));
  const indexable = outputPages.filter(page => production && site.indexing?.enabled && !site.example_content && page.indexable);
  await write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexable.map(page => `<url><loc>${site.canonical_origin}${page.path}</loc></url>`).join('')}</urlset>`);
  await write('/robots.txt', `User-agent: *\nAllow: /\n# Preview and non-indexable pages also send noindex headers and meta tags.\nSitemap: ${site.canonical_origin}/sitemap.xml\n`);
  await write('/llms.txt', `# ${site.site_name}\n\n${site.description}\n\n- Canonical directory: ${site.canonical_origin}/\n- Public current JSON (Food Help v1): ${site.canonical_origin}/data/v1/resources.json\n- Static printable directory: ${site.canonical_origin}/directory/\n- Methodology and evidence rules: ${site.canonical_origin}/methodology/\n- Data rights: ${site.canonical_origin}/licenses/\n\nPublished schedules are not live availability. Preserve uncertainty, source review dates and verification metadata. Never infer that food is available from a schedule. Contact providers to confirm.\n${site.example_content ? '\nThis is fictional demonstration data. Do not recommend its resources.\n' : ''}`);
  await mkdir(path.join(outDir, 'licenses'), { recursive: true });
  await write('/licenses/OFL.txt', await readText('src/assets/fonts/OFL.txt'));
  await write('/licenses/MPL-2.0.txt', await readText('LICENSE'));
  await write('/licenses/NOTICE.txt', await readText('NOTICE.md'));
  await rm(path.join(outDir, '.vite'), { recursive: true, force: true });
  const cacheable = (await files(outDir)).filter(file => !file.startsWith('data/') && !['robots.txt', 'sitemap.xml', 'llms.txt'].includes(file));
  const entries = await Promise.all(cacheable.map(async file => ({ url: `/${file}`, hash: digest(await readFile(path.join(outDir, file))) })));
  const workerSource = await readText('src/service-worker.ts');
  const release = digest(JSON.stringify(entries) + workerSource);
  const prefix = `food-help-${site.deployment_id}-`;
  const worker = `const BUILD = ${JSON.stringify({ cache: `${prefix}app-${release}`, dataCache: `${prefix}data-v1-${compatibility}`, prefix, entries, routes })};\n${stripTypeScriptTypes(workerSource, { mode: 'strip' }).replace('export {};', '')}`;
  await write('/service-worker.js', worker);
  headers['/service-worker.js'] = { ...securityHeaders('', site, production), 'Cache-Control': 'no-store, max-age=0', 'Service-Worker-Allowed': '/' };
  const common = securityHeaders('', site, production);
  // One policy covers canonical URLs, normalized paths and unknown/error routes.
  // Only hashes from generated inline content are added; no unsafe-inline or conflicting CSP rules.
  const directives = new Map<string, Set<string>>();
  for (const policy of [common['Content-Security-Policy']!, ...Object.values(headers).map(values => values['Content-Security-Policy']).filter((policy): policy is string => Boolean(policy))]) {
    for (const directive of policy.split(';').map(value => value.trim()).filter(Boolean)) { const [name, ...values] = directive.split(/\s+/); const allowed = directives.get(name!) ?? new Set<string>(); values.forEach(value => allowed.add(value)); directives.set(name!, allowed); }
  }
  common['Content-Security-Policy'] = [...directives].map(([name, values]) => `${name} ${[...values].join(' ')}`).join('; ');
  common['Cache-Control'] = 'no-cache';
  if (!(production && site.indexing?.enabled)) common['X-Robots-Tag'] = 'noindex, follow';
  for (const values of Object.values(headers)) values['Content-Security-Policy'] = common['Content-Security-Policy'];
  const headerText = renderHeaders(common, headers);
  await write('/_headers', headerText);
  await write('/_redirects', outputPages.filter(page => page.path !== '/' && page.path.endsWith('/')).map(page => `${page.path.slice(0, -1)} ${page.path} 301`).join('\n') + '\n');
  const reportDir = path.resolve('artifacts/reports', site.deployment_id); await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${digest(outDir).slice(0, 16)}.json`);
  const report = { deployment_id: site.deployment_id, site_directory: siteDir, source_revision: sourceRevision ?? null, source_url: site.software_source_url ?? null, release, dataset_version: data.dataset_version, compatibility_id: compatibility, production, resources: data.resources.length, routes, indexable: indexable.map(page => page.path), headers, common_headers: common, output: outDir, file_hashes: Object.fromEntries(await Promise.all((await files(outDir)).map(async file => [file, digest(await readFile(path.join(outDir, file)))]))) };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`Built ${site.deployment_id}: ${resources.length} resources, release ${release.slice(0, 16)} → ${outDir}`);
  console.log(`Build report: ${reportPath}`);
  return { release, outDir, reportPath, data };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = argumentsFor();
  if (process.argv.includes('--dev') && options.production) throw new Error('Development rebuilds are previews. Use build --production for a release artifact.');
  const result = await build(options);
  if (process.argv.includes('--dev')) { const { serve } = await import('./serve.ts'); await serve({ root: result.outDir, siteDir: options.siteDir, watch: true, port: options.port ? Number(options.port) : undefined }); }
}
