// SPDX-License-Identifier: MPL-2.0
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { files } from './build.ts';
import { renderHeaders } from './lib/headers.ts';
import { loadProjectSite, type ProjectSite, type CommunityList } from './lib/project-site.ts';
import { readText } from './lib/text.ts';
import { escape as e } from '../src/presentation.ts';

export type ProjectBuildOptions = { sourceDir?: string; outDir?: string; production?: boolean; sourceRevision?: string; sourceUrl?: string };
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const argument = (name: string) => { const index = process.argv.indexOf(name); if (index < 0) return undefined; const next = process.argv[index + 1]; if (!next || next.startsWith('--')) throw new Error(`${name} requires a value`); return next; };

function sourceLink(site: ProjectSite, revision?: string, explicit?: string): string {
  if (explicit) { const url = new URL(explicit); if (url.protocol !== 'https:') throw new Error('Covered source URL must use HTTPS'); return explicit; }
  if (!revision) return site.repository_url;
  const repository = new URL(site.repository_url);
  if (repository.hostname !== 'github.com' || !/^\/[^/]+\/[^/]+\/?$/.test(repository.pathname)) throw new Error('Production source revision requires a GitHub repository URL or explicit --source-url');
  return `${repository.origin}${repository.pathname.replace(/\/$/, '')}/tree/${revision}`;
}

function projectHeaders(html: string, production: boolean): Record<string, string> {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(Boolean);
  const hashes = scripts.map(value => `'sha256-${createHash('sha256').update(value!).digest('base64')}'`).join(' ');
  return {
    'Content-Security-Policy': `default-src 'none'; script-src ${hashes || "'none'"}; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), payment=()',
    ...(production ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
    'Cache-Control': 'no-cache'
  };
}

function head(site: ProjectSite, pathName: string, title: string, description: string, index: boolean, css: string, logo: string, jsonld?: unknown): string {
  const canonical = pathName === '/' ? `<link rel="canonical" href="${e(site.canonical_origin)}/">` : '';
  const json = jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : '';
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="robots" content="${index ? 'index,follow' : 'noindex,follow'}">${canonical}<meta property="og:type" content="website"><meta property="og:site_name" content="${e(site.site_name)}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(site.canonical_origin + pathName)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(description)}"><meta name="theme-color" content="#173f4c"><link rel="icon" href="${logo}"><link rel="preload" href="${css}" as="style"><link rel="stylesheet" href="${css}">${json}`;
}

function header(site: ProjectSite, logo: string): string {
  return `<a class="skip-link" href="#main" tabindex="0">Skip to main content</a><header class="site-header"><div class="header-inner"><a class="brand" href="/"><img src="${logo}" width="40" height="40" alt=""><span>${e(site.site_name)}</span></a><nav class="site-nav" aria-label="Main navigation"><a href="/#communities">Communities</a><a href="/#about">About</a><a href="/#start">Start a directory</a></nav></div></header>`;
}

function footer(site: ProjectSite): string {
  return `<footer class="site-footer"><div class="page-width footer-inner"><div><strong>${e(site.site_name)}</strong><p>An independent community project maintained by <a href="${e(site.operator.url)}">${e(site.operator.name)}</a>.</p></div><nav class="footer-links" aria-label="Project links"><a href="mailto:${e(site.contact.email)}">Contact</a><a href="${e(site.repository_url)}">Source</a><a href="${e(site.contribution_url)}">Contribute</a></nav></div></footer>`;
}

function home(site: ProjectSite, communities: CommunityList, production: boolean, css: string, logo: string, coveredSource: string): string {
  const index = production && site.indexing.enabled;
  const communityCards = communities.communities.map((community, index) => `<article class="community-card${index === 0 ? ' community-card-featured' : ''}"><div><span class="community-meta">Available directory · ${e(community.coverage)}</span><h3>${e(community.name)}</h3><p>${e(community.description)}</p></div><a class="button button-light" href="${e(community.canonical_url)}/">Open ${e(community.name)} directory</a></article>`).join('');
  const mail = `mailto:${e(site.contact.email)}?subject=${encodeURIComponent('Food Help community inquiry')}`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', name: site.site_name, url: `${site.canonical_origin}/`, description: site.description, inLanguage: site.language, publisher: { '@id': `${site.canonical_origin}/#operator` } },
    { '@type': 'Organization', '@id': `${site.canonical_origin}/#operator`, name: site.operator.name, url: site.operator.url },
    { '@type': 'ItemList', name: 'Food Help community directories', itemListElement: communities.communities.map((community, index) => ({ '@type': 'ListItem', position: index + 1, name: `${community.name} Food Help`, url: `${community.canonical_url}/` })) }
  ] };
  return `<!doctype html><html lang="${e(site.language)}" dir="${e(site.text_direction)}"><head>${head(site, '/', site.site_name, site.description, index, css, logo, jsonld)}</head><body>${header(site, logo)}<main id="main" tabindex="-1">
    <section class="page-width hero" aria-labelledby="page-title"><div><p class="eyebrow">Emergency and affordable food directories</p><h1 id="page-title">${e(site.headline)}</h1><p class="hero-lead">${e(site.introduction)}</p></div><aside class="hero-note" aria-label="Project scope"><strong>Local information, reviewed locally</strong><p>${e(site.scope)}</p></aside></section>
    <section class="page-width section" id="communities" aria-labelledby="communities-heading"><div class="section-heading"><h2 id="communities-heading">Choose a community</h2><p>Community directories are the place to find food programs. This project homepage does not duplicate their listings.</p></div><div class="community-list">${communityCards}</div></section>
    <section class="page-width section" id="about" aria-labelledby="about-heading"><div class="section-heading"><h2 id="about-heading">Information people can check</h2><p>${e(site.maintenance)}</p></div><ol class="principles"><li><strong>Public sources</strong><p>Published program pages and trusted public directories provide an evidence trail.</p></li><li><strong>Provider input</strong><p>Provider details can clarify what is offered and what people should know before travelling.</p></li><li><strong>Corrections</strong><p>Community feedback is reviewed before it changes a public listing.</p></li></ol></section>
    <section class="page-width section split"><article class="info-card"><h2>Built in Kingston</h2><p>${e(site.operator.statement)}</p><a class="text-link" href="${e(site.operator.url)}">About ${e(site.operator.name)}</a></article><article class="info-card" id="start"><h2>Built for other communities</h2><p>The software and setup guidance are public. Community operators keep control of their own reviewed information and publication.</p><div class="link-list"><a class="text-link" href="${e(site.repository_url)}">View the repository</a><a class="text-link" href="${e(site.setup_url)}">Setup guide</a><a class="text-link" href="${e(site.contribution_url)}">Contribution guide</a><a class="text-link" href="${e(site.community_guide_url)}">Add a community</a></div></article></section>
    <section class="page-width section"><div class="contact-panel"><div><h2>Bring a program or community forward</h2><p>${e(site.contact.description)} A short note is enough; do not include private client or service-user information.</p></div><a class="button button-primary" href="${mail}">${e(site.contact.label)}</a></div></section>
    <p class="page-width"><small>Covered source for this build: <a href="${e(coveredSource)}">Food Help repository</a>.</small></p>
  </main>${footer(site)}</body></html>`;
}

function notFound(site: ProjectSite, css: string, logo: string): string {
  return `<!doctype html><html lang="${e(site.language)}" dir="${e(site.text_direction)}"><head>${head(site, '/404.html', `Page not found | ${site.site_name}`, 'That Food Help page could not be found.', false, css, logo)}</head><body>${header(site, logo)}<main id="main" tabindex="-1" class="page-width not-found"><p class="eyebrow">404 · Page not found</p><h1>That page isn’t here.</h1><p>Return to the Food Help project homepage or open an available community directory.</p><p><a class="button button-primary" href="/">Food Help homepage</a></p></main>${footer(site)}</body></html>`;
}

export async function buildProject(options: ProjectBuildOptions = {}) {
  const root = process.cwd(), sourceDir = path.resolve(options.sourceDir ?? 'project-site'), outDir = path.resolve(options.outDir ?? 'dist/project'), production = options.production ?? false;
  if (!['dist', 'artifacts', '.generated'].some(directory => outDir.startsWith(path.join(root, directory) + path.sep)) || outDir === sourceDir || sourceDir.startsWith(outDir + path.sep)) throw new Error('Project output must be a child of dist/, artifacts/ or .generated/ and must not contain source');
  const revision = options.sourceRevision ?? process.env.FOOD_HELP_SOURCE_REVISION ?? process.env.CF_PAGES_COMMIT_SHA;
  if (revision && !/^[0-9a-f]{40}$/i.test(revision)) throw new Error('Source revision must be an exact 40-character Git commit SHA');
  const { site, communities } = await loadProjectSite(sourceDir);
  if (new URL(site.canonical_origin).hostname.endsWith('.invalid')) throw new Error('Project canonical origin cannot use .invalid');
  const coveredSource = sourceLink(site, revision, options.sourceUrl);
  if (production && !revision && !options.sourceUrl) throw new Error('Production requires --source-revision or --source-url for the corresponding covered source');
  await rm(outDir, { recursive: true, force: true }); await mkdir(path.join(outDir, 'assets'), { recursive: true });
  const write = async (name: string, value: string | Uint8Array) => { const target = path.join(outDir, name); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, value); };
  const font = await readFile('src/assets/fonts/atkinson-hyperlegible-next.woff2'), fontPath = `/assets/atkinson-${digest(font).slice(0, 16)}.woff2`; await write(fontPath.slice(1), font);
  const logo = Buffer.from(await readText('src/assets/brand/logo.svg')), logoPath = `/assets/logo-${digest(logo).slice(0, 16)}.svg`; await write(logoPath.slice(1), logo);
  const cssText = `@font-face{font-family:"Atkinson Hyperlegible Next";src:url("${fontPath}") format("woff2");font-style:normal;font-weight:200 800;font-display:swap}\n${await readText(path.join(sourceDir, 'styles.css'))}`;
  const cssPath = `/assets/project-${digest(cssText).slice(0, 16)}.css`; await write(cssPath.slice(1), cssText);
  const html = home(site, communities, production, cssPath, logoPath, coveredSource), missing = notFound(site, cssPath, logoPath);
  await write('index.html', html); await write('404.html', missing);
  await write('communities.json', JSON.stringify(communities, null, 2) + '\n');
  await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${production && site.indexing.enabled ? `<url><loc>${site.canonical_origin}/</loc></url>` : ''}</urlset>`);
  await write('robots.txt', `User-agent: *\nAllow: /\n# Preview builds and hosting aliases also send noindex headers.\nSitemap: ${site.canonical_origin}/sitemap.xml\n`);
  await write('llms.txt', `# ${site.site_name}\n\n${site.description}\n\nCommunity directories:\n${communities.communities.map(community => `- ${community.name} (${community.coverage}): ${community.canonical_url}/`).join('\n')}\n\nProject source and setup: ${site.repository_url}\n`);
  const common = projectHeaders(html, production); if (!(production && site.indexing.enabled)) common['X-Robots-Tag'] = 'noindex, follow';
  const headers = renderHeaders(common, {
    '/404.html': { 'X-Robots-Tag': 'noindex, follow' },
    '/communities.json': { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' },
    '/assets/*': { 'Cache-Control': 'public, max-age=31536000, immutable' }
  });
  await write('_headers', headers); await write('_redirects', '/index.html / 301\n');
  const fileHashes = Object.fromEntries(await Promise.all((await files(outDir)).map(async file => [file, digest(await readFile(path.join(outDir, file)))])));
  const release = digest(JSON.stringify(fileHashes));
  const reportDir = path.resolve('artifacts/reports/project'); await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${digest(outDir).slice(0, 16)}.json`);
  await writeFile(reportPath, JSON.stringify({ target: 'project', source_directory: sourceDir, canonical_origin: site.canonical_origin, source_revision: revision ?? null, source_url: coveredSource, production, indexing: production && site.indexing.enabled, analytics: false, communities: communities.communities.map(community => community.id), output: outDir, release, file_hashes: fileHashes }, null, 2) + '\n');
  console.log(`Built Food Help project site: ${communities.communities.length} ${communities.communities.length === 1 ? 'community' : 'communities'}, release ${release.slice(0, 16)} → ${outDir}`);
  console.log(`Build report: ${reportPath}`);
  return { site, communities, outDir, release, reportPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = { sourceDir: argument('--source') ?? 'project-site', outDir: argument('--out'), production: process.argv.includes('--production'), sourceRevision: argument('--source-revision'), sourceUrl: argument('--source-url') };
  const result = await buildProject(options);
  if (process.argv.includes('--dev')) {
    if (options.production) throw new Error('Development serves a noindex preview; do not combine --dev and --production');
    const { serve } = await import('./serve.ts'); await serve({ root: result.outDir, port: Number(argument('--port') ?? 4175) });
    let timer: ReturnType<typeof setTimeout>, rebuilding = false;
    const rebuild = () => { clearTimeout(timer); timer = setTimeout(async () => { if (rebuilding) return; rebuilding = true; try { await buildProject(options); } catch (error) { console.error(error); } finally { rebuilding = false; } }, 250); };
    for (const directory of [options.sourceDir, 'src/assets/brand', 'src/assets/fonts']) watch(directory, { recursive: true }, rebuild);
  }
}
