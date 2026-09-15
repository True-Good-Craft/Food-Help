// SPDX-License-Identifier: MPL-2.0
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type ProjectSite = {
  schema_version: 1;
  site_name: string;
  short_name: string;
  canonical_origin: string;
  language: string;
  locale: string;
  text_direction: 'ltr' | 'rtl';
  description: string;
  headline: string;
  introduction: string;
  scope: string;
  maintenance: string;
  operator: { name: string; url: string; lead: string; statement: string };
  contact: { email: string; label: string; description: string };
  repository_url: string;
  setup_url: string;
  contribution_url: string;
  community_guide_url: string;
  analytics: { enabled: false };
  indexing: { enabled: boolean };
};

export type Community = { id: string; name: string; coverage: string; canonical_url: string; description: string };
export type CommunityList = { schema_version: 1; communities: Community[] };

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
};
const exactKeys = (value: Record<string, unknown>, keys: string[], label: string) => {
  const extras = Object.keys(value).filter(key => !keys.includes(key));
  if (extras.length) throw new Error(`${label} has unknown fields: ${extras.join(', ')}`);
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > 1_000) throw new Error(`${label} must be non-empty text`);
  return value;
};
const https = (value: unknown, label: string, originOnly = false): string => {
  const input = text(value, label); const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || (originOnly && (url.hash || url.pathname !== '/' || input.endsWith('/')))) throw new Error(`${label} must be a clean HTTPS ${originOnly ? 'origin' : 'URL'}`);
  return input;
};

export function assertProjectSite(value: unknown): asserts value is ProjectSite {
  const site = object(value, 'project-site/site.json');
  exactKeys(site, ['schema_version', 'site_name', 'short_name', 'canonical_origin', 'language', 'locale', 'text_direction', 'description', 'headline', 'introduction', 'scope', 'maintenance', 'operator', 'contact', 'repository_url', 'setup_url', 'contribution_url', 'community_guide_url', 'analytics', 'indexing'], 'project-site/site.json');
  if (site.schema_version !== 1) throw new Error('Unsupported project site schema version');
  for (const field of ['site_name', 'short_name', 'language', 'locale', 'description', 'headline', 'introduction', 'scope', 'maintenance'] as const) text(site[field], field);
  if (!['ltr', 'rtl'].includes(String(site.text_direction))) throw new Error('text_direction must be ltr or rtl');
  https(site.canonical_origin, 'canonical_origin', true);
  for (const field of ['repository_url', 'setup_url', 'contribution_url', 'community_guide_url'] as const) https(site[field], field);
  const operator = object(site.operator, 'operator'); exactKeys(operator, ['name', 'url', 'lead', 'statement'], 'operator');
  for (const field of ['name', 'lead', 'statement'] as const) text(operator[field], `operator.${field}`); https(operator.url, 'operator.url');
  const contact = object(site.contact, 'contact'); exactKeys(contact, ['email', 'label', 'description'], 'contact');
  for (const field of ['email', 'label', 'description'] as const) text(contact[field], `contact.${field}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.email))) throw new Error('contact.email must be a public email address');
  const analytics = object(site.analytics, 'analytics'); exactKeys(analytics, ['enabled'], 'analytics');
  if (analytics.enabled !== false) throw new Error('The project site has no approved analytics integration; enabled must remain false');
  const indexing = object(site.indexing, 'indexing'); exactKeys(indexing, ['enabled'], 'indexing');
  if (typeof indexing.enabled !== 'boolean') throw new Error('indexing.enabled must be boolean');
}

export function assertCommunityList(value: unknown): asserts value is CommunityList {
  const list = object(value, 'project-site/communities.json'); exactKeys(list, ['schema_version', 'communities'], 'project-site/communities.json');
  if (list.schema_version !== 1 || !Array.isArray(list.communities) || list.communities.length === 0) throw new Error('Community list must contain at least one available community');
  const ids = new Set<string>(), origins = new Set<string>();
  for (const [index, entry] of list.communities.entries()) {
    const community = object(entry, `communities[${index}]`); exactKeys(community, ['id', 'name', 'coverage', 'canonical_url', 'description'], `communities[${index}]`);
    const id = text(community.id, `communities[${index}].id`), origin = https(community.canonical_url, `communities[${index}].canonical_url`, true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid community id: ${id}`);
    if (ids.has(id) || origins.has(origin)) throw new Error(`Duplicate community id or canonical URL: ${id}`);
    ids.add(id); origins.add(origin);
    for (const field of ['name', 'coverage', 'description'] as const) text(community[field], `communities[${index}].${field}`);
  }
}

export async function loadProjectSite(sourceDir = 'project-site'): Promise<{ site: ProjectSite; communities: CommunityList }> {
  const site: unknown = JSON.parse(await readFile(path.join(sourceDir, 'site.json'), 'utf8'));
  const communities: unknown = JSON.parse(await readFile(path.join(sourceDir, 'communities.json'), 'utf8'));
  assertProjectSite(site); assertCommunityList(communities);
  return { site, communities };
}
