// SPDX-License-Identifier: MPL-2.0
import { it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { argumentsFor, selection } from '../../scripts/lib/selection.ts';

it('default selection is fictional and each deployment owns its own output', async () => {
  const neutral = await selection(), second = await selection({ siteDir: 'tests/fixtures/kingston-like' });
  assert.equal(neutral.siteDir, path.resolve('examples/exampleville'));
  assert.equal(neutral.outDir, path.resolve('dist/exampleville'));
  assert.equal(second.outDir, path.resolve('dist/kingston-like'));
  assert.notEqual(neutral.outDir, second.outDir);
  assert.equal((await selection({ siteDir: 'tests/fixtures/kingston-like', outDir: 'artifacts/my-review' })).outDir, path.resolve('artifacts/my-review'));
});
it('selection flags require values rather than silently selecting another deployment', () => {
  assert.throws(() => argumentsFor(['--site', '--production']), /requires a value/);
  assert.throws(() => argumentsFor(['--out']), /requires a value/);
  assert.equal(argumentsFor(['--site', 'deployments/example', '--production']).siteDir, 'deployments/example');
});
