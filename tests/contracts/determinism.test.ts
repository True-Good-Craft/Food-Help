// SPDX-License-Identifier: MPL-2.0
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build, files } from '../../scripts/build.ts';

it('complete LF and CRLF fictional source trees produce byte-identical deployment artifacts', async () => {
  const workspace = process.cwd();
  await mkdir('artifacts/eol-fixtures', { recursive: true });
  const fixture = await mkdtemp(path.resolve('artifacts/eol-fixtures/compare-'));
  const reports: { release: string; file_hashes: Record<string, string> }[] = [];
  for (const variant of ['lf', 'crlf']) {
    const root = path.join(fixture, variant); await mkdir(root);
    for (const folder of ['src', 'schemas', 'examples']) await cp(path.join(workspace, folder), path.join(root, folder), { recursive: true });
    for (const filename of ['LICENSE', 'NOTICE.md']) await cp(path.join(workspace, filename), path.join(root, filename));
    for (const filename of await files(root)) {
      if (!/\.(ts|css|svg|txt|md|json)$/.test(filename) && filename !== 'LICENSE') continue;
      const absolute = path.join(root, filename), text = (await readFile(absolute, 'utf8')).replace(/\r\n?/g, '\n');
      await writeFile(absolute, variant === 'crlf' ? text.replaceAll('\n', '\r\n') : text);
    }
    process.chdir(root);
    try { const result = await build({ siteDir: 'examples/exampleville' }); reports.push(JSON.parse(await readFile(result.reportPath, 'utf8'))); }
    finally { process.chdir(workspace); }
  }
  assert.deepEqual(reports[0]!.file_hashes, reports[1]!.file_hashes);
  assert.equal(reports[0]!.release, reports[1]!.release);
});
