// SPDX-License-Identifier: MPL-2.0
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readText } from '../../scripts/lib/text.ts';
import { digest } from '../../scripts/lib/web.ts';

it('LF, CRLF and CR source files generate the same text bytes and digest without changing Unicode', async () => {
  await mkdir('artifacts/text-fixtures', { recursive: true });
  const directory = await mkdtemp(path.resolve('artifacts/text-fixtures/newlines-'));
  const source = 'First line: café.\nSecond line: Ω.\n';
  for (const [name, newline] of [['lf', '\n'], ['crlf', '\r\n'], ['cr', '\r']] as const) {
    const file = path.join(directory, `${name}.txt`); await writeFile(file, source.replaceAll('\n', newline));
    assert.equal(await readText(file), source);
    assert.equal(digest(await readText(file)), digest(source));
  }
});
