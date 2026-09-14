// SPDX-License-Identifier: MPL-2.0
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export async function serve(options: { root?: string | (() => string); port?: number; watch?: boolean; fail?: (route: string) => boolean } = {}) {
  const port = options.port ?? 4173;
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://localhost:${port}`); let route = decodeURIComponent(url.pathname);
      const root = path.resolve(typeof options.root === 'function' ? options.root() : options.root ?? 'dist');
      if (options.fail?.(route)) { response.writeHead(503).end(); return; }
      if (route.includes('\\') || route.split('/').includes('..') || route.includes('\0') || route.split('/').some(part => part.startsWith('_') || part.startsWith('.'))) { response.writeHead(404).end(); return; }
      let target = path.resolve(root, `.${route}`); if (!(target === root || target.startsWith(root + path.sep))) { response.writeHead(404).end(); return; }
      let code = 200;
      try { if ((await stat(target)).isDirectory()) { if (!route.endsWith('/')) { response.writeHead(301, { Location: `${route}/${url.search}` }).end(); return; } target = path.join(target, 'index.html'); } } catch { target = path.join(root, '404.html'); code = 404; }
      const headerFile = await readFile(path.join(root, '_headers'), 'utf8');
      const headers: Record<string, string> = {}; let active = false;
      for (const line of headerFile.split('\n')) {
        if (!line.trim()) continue;
        if (!line.startsWith(' ')) { active = line === '/*' || line === route || line === route.replace(/index\.html$/, ''); continue; }
        if (active) { const split = line.indexOf(':'); headers[line.slice(0, split).trim()] = line.slice(split + 1).trim(); }
      }
      response.writeHead(code, { ...headers, 'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream' }); response.end(await readFile(target));
    } catch { response.writeHead(500).end('Static preview error'); }
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve)); console.log(`Food Help static preview: http://127.0.0.1:${port}`);
  if (options.watch) {
    let timer: ReturnType<typeof setTimeout>, rebuilding = false;
    for (const directory of ['src', 'site', 'schemas']) watch(directory, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(async () => { if (rebuilding) return; rebuilding = true; try { const { build } = await import('./build.ts'); await build(); } catch (error) { console.error(error); } finally { rebuilding = false; } }, 300); });
  }
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await serve({ root: process.env.FOOD_HELP_PREVIEW_ROOT, port: Number(process.env.FOOD_HELP_PORT ?? 4173) });
