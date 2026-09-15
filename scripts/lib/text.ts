// SPDX-License-Identifier: MPL-2.0
import { readFile } from 'node:fs/promises';

/** Normalize source-text line endings so Windows and Linux emit identical bytes. */
export async function readText(file: string | URL): Promise<string> {
  return (await readFile(file, 'utf8')).replace(/\r\n?/g, '\n');
}
