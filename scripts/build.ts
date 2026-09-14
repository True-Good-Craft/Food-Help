// SPDX-License-Identifier: MPL-2.0
import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build as viteBuild } from 'vite';
import { stripTypeScriptTypes } from 'node:module';
import { generateContracts } from './lib/contracts.ts';
import { digest, pages, document, securityHeaders, type Assets } from './lib/web.ts';
import type { Site, Dataset, PublicDataset, Usage } from '../src/types.ts';

export type BuildOptions = { siteDir?: string; outDir?: string; production?: boolean };
export async function files(directory: string): Promise<string[]> {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => entry.isDirectory() ? (await files(path.join(directory, entry.name))).map(file => `${entry.name}/${file}`) : [entry.name]))).flat().sort();
}
export async function build(options: BuildOptions = {}): Promise<{ release: string; outDir: string; data: PublicDataset }> {
  const root = process.cwd(), siteDir = path.resolve(options.siteDir ?? 'site'), outDir = path.resolve(options.outDir ?? 'dist'), production = options.production ?? false;
  // Destructive work is restricted to known generated directories inside this workspace.
  if (!(outDir === path.join(root, 'dist') || outDir.startsWith(path.join(root, 'artifacts') + path.sep) || outDir.startsWith(path.join(root, '.generated') + path.sep))) throw new Error('Output must be dist/ or a child of artifacts/ or .generated/');
  await generateContracts();
  const validation: typeof import('../src/validation.ts') = await import('../src/validation.ts');
  const site: unknown = JSON.parse(await readFile(path.join(siteDir, 'site.json'), 'utf8'));
  const source: unknown = JSON.parse(await readFile(path.join(siteDir, 'resources.json'), 'utf8'));
  validation.assertSite(site); validation.assertDataset(source);
  if (production && (site.example_content || new URL(site.canonical_origin).hostname.endsWith('.invalid'))) throw new Error('Production build refuses fictional example content or an .invalid origin');
  const resources = source.resources.filter(validation.isPublished);
  const compatibility = digest(JSON.stringify({ deployment_id: site.deployment_id, dataset_id: source.dataset_id, contract: 1, taxonomy: 1, language: site.language, time_zone: site.time_zone, review: site.review, jurisdiction: site.jurisdiction ?? null }));
  const data: PublicDataset = { ...source, organizations: source.organizations.filter(org => resources.some(r => r.organization_id === org.id)), resources, deployment_id: site.deployment_id, compatibility_id: compatibility, dataset_version: '', data_updated_on: resources.map(r => r.updated_on).sort().at(-1) ?? null };
  data.dataset_version = digest(JSON.stringify(data)); validation.assertDataset(data, 'public');
  if (JSON.stringify(data).length > 5_000_000) throw new Error('v1 supports at most 5 MB of public resource JSON');
  let usage: Usage | undefined;
  if (site.public_usage?.enabled) { const value: unknown = JSON.parse(await readFile(path.join(siteDir, 'usage.json'), 'utf8')); validation.assertUsage(value, site); usage = value; }
  await mkdir('.generated', { recursive: true });
  await writeFile('.generated/runtime-config.json', JSON.stringify({ site, compatibility_id: compatibility, data_url: '/data/v1/resources.json' }));
  await rm(outDir, { recursive: true, force: true }); await mkdir(outDir, { recursive: true });
  await viteBuild({ configFile: false, publicDir: false, logLevel: 'warn', build: { outDir, emptyOutDir: false, manifest: true, sourcemap: false, rollupOptions: { input: path.join(root, 'src/main.ts'), output: { entryFileNames: 'assets/app-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } } } });
  const manifest = JSON.parse(await readFile(path.join(outDir, '.vite/manifest.json'), 'utf8')) as Record<string, { isEntry?: boolean; file: string; css?: string[] }>;
  const entry = Object.values(manifest).find(item => item.isEntry)!;
  const asset = async (sourceFile: string, name: string): Promise<string> => { const content = await readFile(sourceFile); const file = `/assets/${name}-${digest(content).slice(0, 16)}${path.extname(sourceFile)}`; await writeFile(path.join(outDir, file), content); return file; };
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
    if (page.path !== '/' && page.path.endsWith('/')) routes[page.path.slice(0, -1)] = file;
  }
  const simple = outputPages.find(page => page.path === '/directory/')!;
  const standaloneCSS = (await readFile('src/simple.css', 'utf8')) + `\n@font-face{font-family:"Atkinson Hyperlegible Next";src:url(data:font/woff2;base64,${(await readFile('src/assets/fonts/atkinson-hyperlegible-next.woff2')).toString('base64')}) format("woff2");font-weight:200 800;font-display:swap}.site-footer{margin-top:2rem}.skip-link{display:none}[hidden]{display:none}`;
  const download = document(simple, site, assets, false, standaloneCSS).replace(/href="\/(?!\/)/g, `href="${site.canonical_origin}/`).replace(/<img[^>]*>/g, '');
  await write('/directory/download.html', download); headers['/directory/download.html'] = { ...securityHeaders(download, site, production), 'X-Robots-Tag': 'noindex, follow' }; routes['/directory/download.html'] = '/directory/download.html';
  await write('/data/v1/resources.json', JSON.stringify(data, null, 2) + '\n');
  headers['/data/v1/resources.json'] = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' };
  await write('/manifest.webmanifest', JSON.stringify({ id: `/?app=${site.deployment_id}`, name: site.site_name, short_name: site.short_name ?? site.site_name, description: site.description, lang: site.language, dir: site.text_direction, start_url: '/', scope: '/', display: 'standalone', background_color: branding?.colors?.background ?? '#f6f3eb', theme_color: branding?.colors?.primary ?? '#173f4c', icons: [{ src: assets.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: assets.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' }] }, null, 2));
  const indexable = outputPages.filter(page => production && site.indexing?.enabled && !site.example_content && page.indexable);
  await write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexable.map(page => `<url><loc>${site.canonical_origin}${page.path}</loc></url>`).join('')}</urlset>`);
  await write('/robots.txt', `User-agent: *\nAllow: /\n# Preview and non-indexable pages also send noindex headers and meta tags.\nSitemap: ${site.canonical_origin}/sitemap.xml\n`);
  await write('/llms.txt', `# ${site.site_name}\n\n${site.description}\n\n- Canonical directory: ${site.canonical_origin}/\n- Public current JSON (Food Help v1): ${site.canonical_origin}/data/v1/resources.json\n- Static printable directory: ${site.canonical_origin}/directory/\n- Methodology and evidence rules: ${site.canonical_origin}/methodology/\n- Data rights: ${site.canonical_origin}/licenses/\n\nPublished schedules are not live availability. Preserve uncertainty, source review dates and verification metadata. Never infer that food is available from a schedule. Contact providers to confirm.\n${site.example_content ? '\nThis is fictional demonstration data. Do not recommend its resources.\n' : ''}`);
  await mkdir(path.join(outDir, 'licenses'), { recursive: true });
  await copyFile('src/assets/fonts/OFL.txt', path.join(outDir, 'licenses/OFL.txt'));
  await copyFile('LICENSE', path.join(outDir, 'licenses/MPL-2.0.txt'));
  await rm(path.join(outDir, '.vite'), { recursive: true, force: true });
  const cacheable = (await files(outDir)).filter(file => !file.startsWith('data/'));
  const entries = await Promise.all(cacheable.map(async file => ({ url: `/${file}`, hash: digest(await readFile(path.join(outDir, file))) })));
  const workerSource = await readFile('src/service-worker.ts', 'utf8');
  const release = digest(JSON.stringify(entries) + workerSource);
  const prefix = `food-help-${site.deployment_id}-`;
  const worker = `const BUILD = ${JSON.stringify({ cache: `${prefix}app-${release}`, dataCache: `${prefix}data-v1-${compatibility}`, prefix, entries, routes })};\n${stripTypeScriptTypes(workerSource, { mode: 'strip' }).replace('export {};', '')}`;
  await write('/service-worker.js', worker);
  headers['/service-worker.js'] = { ...securityHeaders('', site, production), 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' };
  const common = securityHeaders('', site, production);
  const headerText = ['/*', ...Object.entries(common).filter(([k]) => k !== 'Content-Security-Policy').map(([k, v]) => `  ${k}: ${v}`), ...(production && site.indexing?.enabled ? [] : ['  X-Robots-Tag: noindex, follow']), '', ...Object.entries(headers).flatMap(([route, values]) => [route, ...Object.entries(values).filter(([key, value]) => key === 'Content-Security-Policy' || common[key] !== value).map(([key, value]) => `  ${key}: ${value}`), ''])].join('\n');
  // Exact HTML routes own CSP; host adapters must replace, never concatenate policy values.
  await write('/_headers', headerText);
  await write('/_redirects', outputPages.filter(page => page.path !== '/' && page.path.endsWith('/')).map(page => `${page.path.slice(0, -1)} ${page.path} 301`).join('\n') + '\n');
  const reportDir = path.resolve('artifacts/reports'); await mkdir(reportDir, { recursive: true });
  const report = { deployment_id: site.deployment_id, release, dataset_version: data.dataset_version, compatibility_id: compatibility, production, resources: data.resources.length, routes, indexable: indexable.map(page => page.path), headers, common_headers: common, output: outDir, file_hashes: Object.fromEntries(await Promise.all((await files(outDir)).map(async file => [file, digest(await readFile(path.join(outDir, file)))]))) };
  await writeFile(path.join(reportDir, `${site.deployment_id}.json`), JSON.stringify(report, null, 2));
  console.log(`Built ${site.deployment_id}: ${resources.length} resources, release ${release.slice(0, 16)} → ${outDir}`);
  return { release, outDir, data };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
  await build({ siteDir: arg('--site'), outDir: arg('--out'), production: process.argv.includes('--production') });
  if (process.argv.includes('--dev')) { const { serve } = await import('./serve.ts'); await serve({ watch: true }); }
}
