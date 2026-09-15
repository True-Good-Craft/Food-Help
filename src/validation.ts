// SPDX-License-Identifier: MPL-2.0
import { validateSite, validateSource, validatePublic, validateUsage } from '../.generated/validators.js';
import type { Site, Dataset, PublicDataset, Resource, Usage } from './types.ts';
import { copy } from './copy/en.ts';

function requireValid(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function validDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function timeZone(value: string): void { new Intl.DateTimeFormat('en', { timeZone: value }).format(); }
function unique(values: string[], label: string): void { requireValid(new Set(values).size === values.length, `Duplicate ${label}`); }
function walk(value: unknown, key = ''): void {
  if (typeof value === 'string') {
    requireValid(value === value.trim(), `Whitespace around ${key}`);
    if (/^(?:\d{4}-\d{2}-\d{2})$/.test(value)) requireValid(validDate(value), `Invalid calendar date: ${key}`);
    if (['url', 'official_url', 'source_url', 'software_source_url', 'endpoint', 'namespace', 'canonical_origin'].includes(key)) {
      const url = new URL(value); requireValid(url.protocol === 'https:' && !url.username && !url.password, `Unsafe URL: ${key}`);
    }
    if (key === 'time_zone') timeZone(value);
  } else if (Array.isArray(value)) value.forEach(item => walk(item, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, item]) => walk(item, k));
}
export function assertSite(value: unknown): asserts value is Site {
  requireValid(validateSite(value), `Invalid site schema: ${JSON.stringify(validateSite.errors)}`);
  const site = value as Site; walk(site);
  requireValid(new URL(site.canonical_origin).origin === site.canonical_origin, 'canonical_origin must be an HTTPS origin without a path or trailing slash');
  requireValid(site.language === 'en' && site.text_direction === 'ltr', 'v1 ships English UI; add a reviewed copy pack before enabling another UI language');
  new Intl.DateTimeFormat(site.locale).format();
  if (site.presentation?.category_groups) {
    unique(site.presentation.category_groups.map(group => group.id), 'category group IDs');
    for (const group of site.presentation.category_groups) {
      requireValid(group.id !== 'all', 'The all category group is built in');
      requireValid(group.categories.every(category => Object.hasOwn(copy.categories, category)), 'Unknown category in presentation group');
    }
  }
  if (site.analytics?.enabled) {
    requireValid(site.analytics.endpoint && site.analytics.collection_mode && site.analytics.disclosure, 'Enabled analytics requires endpoint, collection_mode and disclosure');
    const endpoint = new URL(site.analytics.endpoint); requireValid(!endpoint.search && !endpoint.hash, 'Analytics endpoint cannot contain query or fragment');
    const analytics = site.analytics;
    if (analytics.event_payloads) {
      requireValid(!analytics.event_names, 'Choose static event payloads or event names, not both');
      requireValid(['page_start', 'call', 'help', 'directions', 'source', 'install'].every(event => Object.hasOwn(analytics.event_payloads!, event)), 'Static event payloads must explicitly cover every supported event');
      for (const payload of Object.values(analytics.event_payloads)) requireValid(!Object.keys(payload).some(key => Object.hasOwn(analytics.constants ?? {}, key)), 'Event payloads cannot override shared constants');
    } else requireValid(!Object.hasOwn(analytics.constants ?? {}, 'event'), 'Constants cannot override the event name');
    if (analytics.attribution) {
      const attribution = analytics.attribution;
      requireValid(attribution.sources.includes('direct_unknown') && attribution.sources.includes('other') && attribution.campaigns.includes('none') && attribution.contents.includes('none'), 'Attribution requires bounded fallback labels');
      unique(attribution.referrers.map(item => item.host), 'attribution referrer hosts');
      const hosts = [...attribution.internal_hosts, ...attribution.referrers.map(item => item.host)];
      requireValid(hosts.every(host => new URL(`https://${host}`).hostname === host && !host.includes('..')), 'Attribution requires normalized hostnames');
      requireValid(attribution.referrers.every(item => attribution.sources.includes(item.source)), 'Referrer source must be allowlisted');
      const reserved = ['source', 'campaign', 'content'];
      requireValid(!reserved.some(key => Object.hasOwn(analytics.constants ?? {}, key)) && Object.values(analytics.event_payloads ?? {}).every(payload => !reserved.some(key => Object.hasOwn(payload, key))), 'Static fields cannot override bounded attribution');
    }
  } else requireValid(Object.keys(site.analytics ?? {}).every(key => key === 'enabled'), 'Disabled analytics must not configure collection');
  if (site.public_usage?.enabled) requireValid(site.public_usage.file === 'usage.json', 'Public usage needs site/usage.json');
  const branding = site.branding;
  if (branding?.logo || branding?.icon_192 || branding?.icon_512) requireValid(branding.logo && branding.icon_192 && branding.icon_512, 'Branding requires logo and both sized icons');
  if (site.jurisdiction) {
    unique(site.jurisdiction.warning_dates.map(item => item.date), 'jurisdiction dates');
    site.jurisdiction.warning_dates.forEach(item => requireValid(item.date <= site.jurisdiction!.coverage_through, 'Jurisdiction date exceeds coverage'));
  }
}
export function isPublished(resource: Resource): boolean { return resource.publication_status === 'published' && resource.service_condition !== 'closed'; }
function intervals(items: Resource['schedule']['weekly'][number]['intervals'], label: string): void {
  let end = -1;
  for (const item of [...items].sort((a, b) => a.opens.localeCompare(b.opens))) {
    const minutes = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
    const start = minutes(item.opens), stop = minutes(item.closes) + (item.closes_next_day ? 1440 : 0);
    requireValid(stop > start && stop - start <= 1440 && start >= end, `Invalid or overlapping intervals: ${label}`); end = stop;
  }
}
export function assertDataset(value: unknown, mode: 'source' | 'public' = 'source'): asserts value is Dataset {
  const guard = mode === 'source' ? validateSource : validatePublic;
  requireValid(guard(value), `Invalid ${mode} dataset schema: ${JSON.stringify(guard.errors)}`);
  const data = value as Dataset; walk(data);
  if (mode === 'source') for (const key of ['deployment_id', 'dataset_version', 'compatibility_id', 'data_updated_on']) requireValid(!(key in data), `${key} is generated, not source data`);
  unique(data.organizations.map(item => item.id), 'organization IDs'); unique(data.resources.map(item => item.id), 'resource IDs');
  const organizations = new Set(data.organizations.map(item => item.id));
  for (const r of data.resources) {
    requireValid(organizations.has(r.organization_id), `Missing organization: ${r.id}`);
    unique(r.evidence.map(item => item.id), `evidence IDs for ${r.id}`);
    const evidence = new Set(r.evidence.map(item => item.id));
    const refs = (ids: string[]) => ids.forEach(id => requireValid(evidence.has(id), `Missing evidence ${id} for ${r.id}`));
    refs(r.schedule.evidence_ids);
    unique(r.schedule.weekly.map(item => String(item.day)), `weekdays for ${r.id}`);
    unique(r.schedule.exceptions.map(item => item.date), `exceptions for ${r.id}`);
    unique((r.notices ?? []).map(item => item.id), `notices for ${r.id}`);
    requireValid(r.schedule.kind === 'weekly' || !r.schedule.weekly.length, `Non-weekly schedule has weekdays: ${r.id}`);
    requireValid(!r.schedule.confirmed || ['weekly', 'dated'].includes(r.schedule.kind), `Cannot confirm unknown/arranged schedule: ${r.id}`);
    requireValid(!r.schedule.valid_from || !r.schedule.valid_to || r.schedule.valid_from <= r.schedule.valid_to, `Reversed schedule dates: ${r.id}`);
    for (const day of r.schedule.weekly) {
      requireValid(day.state === 'published' ? day.intervals.length > 0 : day.intervals.length === 0, `Inconsistent weekday: ${r.id}`); intervals(day.intervals, r.id);
      const next = r.schedule.weekly.find(item => item.day === day.day % 7 + 1);
      const overnight = day.intervals.find(item => item.closes_next_day);
      if (overnight && next?.intervals.length) requireValid(next.intervals.every(item => item.opens >= overnight.closes), `Overlapping overnight weekday: ${r.id}`);
    }
    for (const exception of r.schedule.exceptions) { intervals(exception.intervals, r.id); refs(exception.evidence_ids); if (exception.confirmed) requireValid(exception.evidence_ids.length, `Confirmed exception needs evidence: ${r.id}`); }
    for (const notice of r.notices ?? []) { refs(notice.evidence_ids); requireValid(notice.evidence_ids.length && (!notice.ends_on || notice.ends_on >= notice.starts_on), `Invalid notice: ${r.id}`); }
    for (const e of r.evidence) {
      requireValid(e.source_kind === 'direct_confirmation' || e.url, `Evidence requires URL: ${r.id}`);
      requireValid(e.checked_on <= r.verification.reviewed_on && r.verification.reviewed_on <= r.updated_on, `Inconsistent review chronology: ${r.id}`);
      for (const field of e.supports) requireValid(field.split('.').reduce<unknown>((object, part) => object && typeof object === 'object' ? (object as Record<string, unknown>)[part] : undefined, r) !== undefined, `Evidence references absent field ${field}: ${r.id}`);
    }
    if (isPublished(r)) {
      requireValid(r.evidence.length && r.evidence.some(e => e.supports.includes('name')) && r.evidence.some(e => e.supports.includes('food_access_purpose')), `Published resource needs identity and food-access evidence: ${r.id}`);
      if (r.schedule.confirmed) requireValid(r.schedule.evidence_ids.length, `Confirmed schedule needs evidence: ${r.id}`);
      for (const key of ['walk_in', 'appointment_required', 'registration_required', 'identification_required'] as const) if (r.access[key] !== 'unknown') requireValid(r.evidence.some(e => e.supports.includes(`access.${key}`)), `Known access needs evidence: ${r.id}/${key}`);
    }
    if (mode === 'public') requireValid(isPublished(r), `Unpublished record in public dataset: ${r.id}`);
  }
}
export function publicDataset(value: unknown, deployment: string, compatibility: string): PublicDataset {
  assertDataset(value, 'public'); const data = value as PublicDataset;
  requireValid(data.deployment_id === deployment && data.compatibility_id === compatibility, 'Dataset belongs to another deployment or incompatible configuration');
  return data;
}
export function assertUsage(value: unknown, site: Site): asserts value is Usage {
  requireValid(validateUsage(value), `Invalid public aggregate: ${JSON.stringify(validateUsage.errors)}`); walk(value);
  const usage = value as Usage; requireValid(usage.deployment_id === site.deployment_id && usage.period_start <= usage.period_end && usage.period_end <= usage.generated_at, 'Invalid aggregate deployment or period');
}
