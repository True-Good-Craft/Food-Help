import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releasePlan } from '../../scripts/lib/release-plan.ts';
import { selectedChecks } from '../../scripts/select-checks.ts';
const revision = 'a'.repeat(40), previousRevision = 'b'.repeat(40);
test('publication selects exactly one independent community pointer and uses a lease', () => {
  const first = releasePlan({ deployment: 'one-community', revision, currentRevision: revision, previousRevision });
  const second = releasePlan({ deployment: 'other-community', revision, currentRevision: revision });
  assert.deepEqual(first.pushArguments, ['push', `--force-with-lease=refs/heads/release/one-community:${previousRevision}`, 'origin', `${revision}:refs/heads/release/one-community`]);
  assert.equal(second.branch, 'release/other-community');
  assert.ok(!first.pushArguments.join(' ').includes(second.branch));
  assert.equal(releasePlan({ deployment: 'one-community', revision, currentRevision: revision, previousRevision: revision }).changed, false);
  assert.throws(() => releasePlan({ deployment: 'one-community', revision, currentRevision: previousRevision }), /currently checked-out/);
  assert.throws(() => releasePlan({ deployment: '../other', revision, currentRevision: revision }), /deployment ID/);
});
test('shared changes validate communities; a data change selects only its community', () => {
  const folders = ['deployments/one-community', 'deployments/other-community'];
  assert.deepEqual(selectedChecks(['deployments/one-community/resources.json'], folders), ['deployments/one-community']);
  assert.deepEqual(selectedChecks(['src/main.ts'], folders), [...folders, 'examples/exampleville']);
  assert.deepEqual(selectedChecks(['deployments/other-community/site.json'], folders), ['deployments/other-community']);
});
