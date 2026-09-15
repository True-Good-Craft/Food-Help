// SPDX-License-Identifier: MPL-2.0
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const starterSite = 'examples/exampleville';
export function argumentsFor(args = process.argv.slice(2)) {
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    const result = args[index + 1];
    if (!result || result.startsWith('--')) throw new Error(`${name} requires a value`);
    return result;
  };
  return { siteDir: value('--site'), outDir: value('--out'), production: args.includes('--production'), reviewDrafts: args.includes('--review-drafts'), sourceRevision: value('--source-revision'), sourceUrl: value('--source-url'), port: value('--port') };
}
export async function selection(options: { siteDir?: string; outDir?: string; reviewDrafts?: boolean } = {}) {
  const siteDir = path.resolve(options.siteDir ?? starterSite);
  const site = JSON.parse(await readFile(path.join(siteDir, 'site.json'), 'utf8')) as { deployment_id?: unknown };
  if (typeof site.deployment_id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.deployment_id)) throw new Error('Select a site with a valid deployment_id');
  if (path.dirname(siteDir) === path.resolve('deployments') && path.basename(siteDir) !== site.deployment_id) throw new Error('deployment_id must match its deployments/<slug> folder name so default outputs remain independent');
  const defaultOutput = options.reviewDrafts ? path.join('artifacts', 'reviews', site.deployment_id) : path.join('dist', site.deployment_id);
  return { siteDir, outDir: path.resolve(options.outDir ?? defaultOutput), deploymentId: site.deployment_id };
}
