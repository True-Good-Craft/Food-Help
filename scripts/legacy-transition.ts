// SPDX-License-Identifier: MPL-2.0
// One-time static compatibility helper for the legacy directory contract, not application routing.
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const legacyFiles = ['/sw.js', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/fonts.css', '/simple.css'];
export const legacyPrefixes = ['/data/', '/assets/', '/fonts/', '/transition-licenses/'];
export function retainedLegacyPath(pathname: string): boolean {
  return legacyFiles.includes(pathname) || legacyPrefixes.some(prefix => pathname.startsWith(prefix));
}
export function transitionDestination(oldUrl: string, toOrigin: string): string | null {
  const source = new URL(oldUrl);
  if (retainedLegacyPath(source.pathname)) return null;
  const target = new URL(toOrigin);
  target.pathname = ['/directory', '/directory.html'].includes(source.pathname) ? '/directory/' : ['/index', '/index.html'].includes(source.pathname) ? '/' : source.pathname;
  target.search = source.search; target.hash = source.hash;
  return target.href;
}
export function retirementWorker(toOrigin: string): string {
  return `// SPDX-License-Identifier: MPL-2.0
// Source is this unminified worker; licence: /transition-licenses/MPL-2.0.txt.
// Retained compatibility bundle provenance: /transition-licenses/legacy-provenance.txt.
// Retires only the legacy application's caches. It creates no cache and collects nothing.
const TO_ORIGIN = ${JSON.stringify(toOrigin)};
const RETAINED_FILES = ${JSON.stringify(legacyFiles)};
const RETAINED_PREFIXES = ${JSON.stringify(legacyPrefixes)};
const retained = pathname => RETAINED_FILES.includes(pathname) || RETAINED_PREFIXES.some(prefix => pathname.startsWith(prefix));
function destination(url) {
  const next = new URL(TO_ORIGIN);
  next.pathname = ['/directory', '/directory.html'].includes(url.pathname) ? '/directory/' : ['/index', '/index.html'].includes(url.pathname) ? '/' : url.pathname;
  next.search = url.search; next.hash = url.hash;
  return next.href;
}
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(key => key.startsWith('kfh-app-') || key === 'kfh-data-v1').map(key => caches.delete(key)));
  await self.clients.claim();
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  // Navigate within the old origin first; the new active fetch handler supplies the redirect.
  // WindowClient.navigate must not rely on a direct cross-origin navigation succeeding.
  windows.filter(client => {
    const url = new URL(client.url);
    return url.origin === self.location.origin && !retained(url.pathname);
  }).forEach(client => { client.navigate(client.url).catch(() => {}); });
  // Do not await navigation in activate: fetch may wait for activation to finish.
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || retained(url.pathname)) return;
  event.respondWith(Promise.resolve(Response.redirect(destination(url), 308)));
});
`;
}

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const within = (child: string, parent: string) => child.startsWith(parent + path.sep);
async function noSymlinkPath(target: string, boundary: string) {
  let current = boundary;
  for (const segment of path.relative(boundary, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Transition paths must not contain symlinks'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}
export async function buildLegacyTransition(options: { fromDir: string; toOrigin: string; outDir: string }) {
  const target = new URL(options.toOrigin);
  if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/' || target.search || target.hash) throw new Error('Transition destination must be a dedicated HTTPS origin');
  const workspace = await realpath(process.cwd()), fromDir = path.resolve(options.fromDir), outDir = path.resolve(options.outDir);
  if (!['artifacts', 'dist'].some(parent => within(outDir, path.join(workspace, parent))) || outDir === fromDir || within(outDir, fromDir) || within(fromDir, outDir)) throw new Error('Transition output must be a separate child of artifacts/ or dist/');
  await noSymlinkPath(outDir, workspace);
  const sourceRoot = await realpath(fromDir);
  const worker = await readFile(path.join(sourceRoot, 'sw.js'), 'utf8');
  if (!worker.includes('kfh-app-') || !worker.includes('kfh-data-v1')) throw new Error('Source is not the recognized legacy worker/cache contract');
  const manifestMatch = worker.match(/const PRECACHE_URLS\s*=\s*(\[[\s\S]*?\]);/);
  if (!manifestMatch) throw new Error('The preserved legacy precache list is required');
  const precache: unknown = JSON.parse(manifestMatch[1]!);
  if (!Array.isArray(precache) || precache.some(value => typeof value !== 'string')) throw new Error('Invalid legacy precache list');
  const dataBytes = await readFile(path.join(sourceRoot, 'data/v1/resources.json'));
  const legacyData = JSON.parse(dataBytes.toString('utf8')) as { schema_version?: number; format?: string; resources?: unknown[] };
  if (legacyData.schema_version !== 1 || legacyData.format === 'food-help' || !Array.isArray(legacyData.resources)) throw new Error('Preserve the legacy JSON contract, not a Food Help projection');
  const copyPaths = [...new Set(['/data/v1/resources.json', ...legacyFiles.filter(file => file !== '/sw.js'), ...(precache as string[]).filter(retainedLegacyPath)])].sort();
  const content = new Map<string, Buffer>();
  for (const url of copyPaths) {
    if (url.includes('\\') || url.includes('?') || url.includes('#') || url.split('/').some(segment => segment === '..' || segment === '.')) throw new Error('Unsafe legacy asset path');
    const source = path.resolve(sourceRoot, `.${url}`);
    if (!within(source, sourceRoot)) throw new Error('Legacy asset escapes source artifact');
    await noSymlinkPath(source, sourceRoot);
    content.set(url, await readFile(source));
  }
  // Refuse a nonempty destination rather than deleting a baseline or mixing two releases.
  try { if ((await readdir(outDir)).length) throw new Error('Transition output must be empty; choose a new artifact directory'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await mkdir(outDir, { recursive: true });
  const write = async (url: string, bytes: string | Uint8Array) => { const file = path.join(outDir, url); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, bytes, { flag: 'wx' }); };
  for (const [url, bytes] of content) await write(url, bytes);
  await write('/sw.js', retirementWorker(target.origin));
  const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
  const fallback = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>Directory moved</title><h1>This directory has moved</h1><p><a href="${escape(target.origin)}/">Open the current food directory</a>.</p><p>The old JSON endpoint is a retained legacy snapshot with a different format. It is not a current availability feed.</p><p><a href="/transition-licenses/MPL-2.0.txt">Transition software licence</a> · <a href="/transition-licenses/legacy-provenance.txt">Retained legacy asset notices</a> · <a href="${escape(target.origin)}/licenses/">Current source and data notices</a></p></html>`;
  await write('/index.html', fallback); await write('/404.html', fallback);
  await write('/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${target.origin}/sitemap.xml\n`);
  for (const [source, destination] of [['LICENSE', 'MPL-2.0.txt'], ['NOTICE.md', 'NOTICE.txt'], ['src/assets/fonts/OFL.txt', 'OFL.txt']]) await write(`/transition-licenses/${destination}`, await readFile(source!));
  await write('/transition-licenses/legacy-provenance.txt', `Retained legacy asset provenance\n\nThe compatibility JavaScript, styles, icons, manifest and resource JSON are an\nunchanged historical snapshot retained for existing browser clients. The current\nFood Help MPL-2.0 licence does not relicense these historical assets or rewrite\ntheir original terms. Existing copyright and third-party rights remain applicable.\nThe original source and release provenance are retained privately by maintainers;\nthis notice makes no claim that the historical source is publicly available.\n\nThe unchanged bundled font remains covered by /transition-licenses/OFL.txt.\nNo general reuse licence is granted for provider material or the resource data.\nThe new retirement worker is separately served as unminified source at /sw.js\nunder MPL-2.0; its licence is /transition-licenses/MPL-2.0.txt. Current Food Help\nsource and data notices are available at ${target.origin}/licenses/.\n`);
  await write('/_headers', `/*\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  X-Robots-Tag: noindex, follow\n  Content-Security-Policy: default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n/sw.js\n  Service-Worker-Allowed: /\n/data/v1/resources.json\n  Access-Control-Allow-Origin: *\n  Link: <${target.origin}/data/v1/resources.json>; rel="successor-version"\n`);
  const artifactFiles: string[] = [];
  const walk = async (directory: string) => { for (const entry of await readdir(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) await walk(file); else artifactFiles.push(path.relative(outDir, file).split(path.sep).join('/')); } };
  await walk(outDir); artifactFiles.sort();
  const fileHashes = Object.fromEntries(await Promise.all(artifactFiles.map(async file => [file, hash(await readFile(path.join(outDir, file)))])));
  const report = { to_origin: target.origin, legacy_data_sha256: hash(dataBytes), legacy_resource_count: legacyData.resources.length, retained_paths: copyPaths, excluded_from_website_redirects: { exact: legacyFiles, prefixes: legacyPrefixes }, worker_cache_deletions: { prefixes: ['kfh-app-'], exact: ['kfh-data-v1'] }, file_hashes: fileHashes, artifact_sha256: hash(JSON.stringify(fileHashes)), requires_external_website_redirect: true };
  const reportPath = `${outDir}.report.json`;
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return { outDir, reportPath, ...report };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const value = (flag: string) => { const index = process.argv.indexOf(flag), result = index < 0 ? undefined : process.argv[index + 1]; if (!result || result.startsWith('--')) throw new Error(`Explicit ${flag} is required`); return result; };
  console.log(JSON.stringify(await buildLegacyTransition({ fromDir: value('--from'), toOrigin: value('--to'), outDir: value('--out') }), null, 2));
}
