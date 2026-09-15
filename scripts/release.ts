// SPDX-License-Identifier: MPL-2.0
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from './build.ts';
import { releasePlan } from './lib/release-plan.ts';

const value = (name: string) => { const i = process.argv.indexOf(name); if (i < 0) return undefined; const next = process.argv[i + 1]; if (!next || next.startsWith('--')) throw new Error(`${name} needs a value`); return next; };
const siteDir = value('--site'), ref = value('--ref'), remote = value('--remote') ?? 'origin';
if (!siteDir || !ref) throw new Error('Explicit target and revision required: npm run release -- --site deployments/<community> --ref <commit-or-tag> [--publish]');
if (ref.startsWith('-')) throw new Error('Invalid source reference');
const relative = path.relative(process.cwd(), path.resolve(siteDir)).split(path.sep).join('/');
if (!/^deployments\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(relative)) throw new Error('Release a direct deployments/<community> folder; examples are never production targets');
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const revision = git('rev-parse', '--verify', `${ref}^{commit}`), currentRevision = git('rev-parse', 'HEAD');
if (git('status', '--porcelain')) throw new Error('Commit or preserve working-tree changes before releasing an exact source revision');
const site = JSON.parse(await readFile(path.join(siteDir, 'site.json'), 'utf8')) as { deployment_id: string; example_content: boolean; canonical_origin: string };
if (site.example_content || path.basename(relative) !== site.deployment_id) throw new Error('Release folder and deployment ID must agree, and fictional content cannot be published');
releasePlan({ deployment: site.deployment_id, revision, currentRevision, remote });
const verifiedHead = () => {
  const head = git('rev-parse', 'HEAD');
  if (head !== revision || git('status', '--porcelain')) throw new Error('Source revision or working tree changed during verification; nothing was published');
  return head;
};
const run = (script: string, args: string[]) => { const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' }); if (r.error) throw r.error; if (r.status !== 0) throw new Error(`${script} failed; nothing was published`); };
run('scripts/check.ts', ['--site', siteDir]);
verifiedHead();
const output = await build({ siteDir, production: true, sourceRevision: revision, sourceUrl: value('--source-url') });
verifiedHead();
const previousRevision = git('ls-remote', remote, `refs/heads/release/${site.deployment_id}`).split(/\s+/)[0] || undefined;
const plan = releasePlan({ deployment: site.deployment_id, revision, currentRevision: verifiedHead(), previousRevision, remote });
const receipt = { ...plan, artifact: output.outDir, report: output.reportPath, release: output.release, canonical_origin: site.canonical_origin, publication_requested: process.argv.includes('--publish') };
await mkdir('artifacts/releases', { recursive: true });
await writeFile(`artifacts/releases/${site.deployment_id}-${revision}.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!process.argv.includes('--publish')) console.log('Validated local release plan only. Add --publish to advance this community release pointer and trigger its configured host.');
else if (!plan.changed) console.log('The selected community already points to this revision; no push or deployment triggered.');
else {
  verifiedHead();
  execFileSync('git', plan.pushArguments, { stdio: 'inherit' });
  console.log(`Published only ${plan.branch}. Verify the host reports ${revision} and run the production verifier before declaring the release complete.`);
}
