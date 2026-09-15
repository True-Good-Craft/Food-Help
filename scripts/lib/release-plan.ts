// SPDX-License-Identifier: MPL-2.0
export function releasePlan(input: { deployment: string; revision: string; currentRevision: string; previousRevision?: string; remote?: string }) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.deployment)) throw new Error('Invalid deployment ID');
  if (!/^[a-f0-9]{40}$/.test(input.revision) || input.revision !== input.currentRevision) throw new Error('Release the exact currently checked-out commit; checkout the chosen revision first');
  if (input.previousRevision && !/^[a-f0-9]{40}$/.test(input.previousRevision)) throw new Error('Invalid previous release revision');
  const remote = input.remote ?? 'origin';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(remote)) throw new Error('Use a configured Git remote name, not a URL');
  const branch = `release/${input.deployment}`, ref = `refs/heads/${branch}`;
  return { deployment: input.deployment, revision: input.revision, previousRevision: input.previousRevision ?? null, remote, branch, changed: input.revision !== input.previousRevision,
    pushArguments: ['push', `--force-with-lease=${ref}:${input.previousRevision ?? ''}`, remote, `${input.revision}:${ref}`] };
}
