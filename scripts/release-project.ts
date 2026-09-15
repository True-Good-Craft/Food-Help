// SPDX-License-Identifier: MPL-2.0
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildProject } from './build-project.ts';
import { releasePlan } from './lib/release-plan.ts';

const value = (name: string) => { const index = process.argv.indexOf(name); if (index < 0) return undefined; const next = process.argv[index + 1]; if (!next || next.startsWith('--')) throw new Error(`${name} needs a value`); return next; };
const ref = value('--ref'), remote = value('--remote') ?? 'origin';
if (!ref || ref.startsWith('-')) throw new Error('Explicit revision required: npm run project:release -- --ref <commit-or-tag> [--publish]');
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const revision = git('rev-parse', '--verify', `${ref}^{commit}`), currentRevision = git('rev-parse', 'HEAD');
if (git('status', '--porcelain')) throw new Error('Commit or preserve working-tree changes before releasing an exact source revision');
releasePlan({ deployment: 'project', revision, currentRevision, remote });
const verifiedHead = () => {
  const head = git('rev-parse', 'HEAD');
  if (head !== revision || git('status', '--porcelain')) throw new Error('Source revision or working tree changed during verification; nothing was published');
  return head;
};
const run = (script: string, args: string[]) => { const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' }); if (result.error) throw result.error; if (result.status !== 0) throw new Error(`${script} failed; nothing was published`); };
run('scripts/check-project.ts', []); verifiedHead();
const output = await buildProject({ production: true, sourceRevision: revision, sourceUrl: value('--source-url') }); verifiedHead();
const previousRevision = git('ls-remote', remote, 'refs/heads/release/project').split(/\s+/)[0] || undefined;
const plan = releasePlan({ deployment: 'project', revision, currentRevision: verifiedHead(), previousRevision, remote });
const receipt = { ...plan, artifact: output.outDir, report: output.reportPath, release: output.release, canonical_origin: output.site.canonical_origin, publication_requested: process.argv.includes('--publish') };
await mkdir('artifacts/releases', { recursive: true }); await writeFile(`artifacts/releases/project-${revision}.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!process.argv.includes('--publish')) console.log('Validated local project-site release plan only. Add --publish to advance release/project and trigger only its configured host.');
else if (!plan.changed) console.log('The project site already points to this revision; no push or deployment triggered.');
else { verifiedHead(); execFileSync('git', plan.pushArguments, { stdio: 'inherit' }); console.log(`Published only ${plan.branch}. Verify the root host reports ${revision} before declaring the project site live.`); }
