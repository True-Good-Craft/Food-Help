// SPDX-License-Identifier: MPL-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertCommunityList, assertProjectSite, loadProjectSite } from '../../scripts/lib/project-site.ts';

test('the project source has one authoritative available-community list connected to Kingston', async () => {
  const { site, communities } = await loadProjectSite();
  const kingston = JSON.parse(await readFile('deployments/kingston/site.json', 'utf8')) as { canonical_origin: string; project_home_url?: string };
  assert.equal(communities.communities[0]?.id, 'kingston');
  assert.equal(communities.communities[0]?.canonical_url, kingston.canonical_origin);
  assert.equal(kingston.project_home_url, site.canonical_origin);
  assert.equal(site.analytics.enabled, false);
});

test('project source validation rejects unsafe integration and ambiguous community records', () => {
  const base = {
    schema_version: 1, site_name: 'Food Help', short_name: 'Food Help', canonical_origin: 'https://food-help.ca', language: 'en', locale: 'en-CA', text_direction: 'ltr', description: 'Description', headline: 'Headline', introduction: 'Introduction', scope: 'Scope', maintenance: 'Maintenance',
    operator: { name: 'Operator', url: 'https://operator.example', lead: 'Owner', statement: 'Statement' }, contact: { email: 'owner@example.com', label: 'Email owner', description: 'Contact description' }, repository_url: 'https://github.com/example/project', setup_url: 'https://github.com/example/project#setup', contribution_url: 'https://github.com/example/project/blob/main/CONTRIBUTING.md', community_guide_url: 'https://github.com/example/project/blob/main/docs/maintenance.md#community', analytics: { enabled: false }, indexing: { enabled: true }
  };
  assert.doesNotThrow(() => assertProjectSite(base));
  assert.throws(() => assertProjectSite({ ...base, analytics: { enabled: true } }), /no approved analytics/);
  assert.throws(() => assertProjectSite({ ...base, canonical_origin: 'http://food-help.ca' }), /HTTPS origin/);
  const community = { id: 'one', name: 'One', coverage: 'One, Ontario', canonical_url: 'https://one.food-help.ca', description: 'Directory one' };
  assert.doesNotThrow(() => assertCommunityList({ schema_version: 1, communities: [community] }));
  assert.throws(() => assertCommunityList({ schema_version: 1, communities: [community, community] }), /Duplicate/);
});
