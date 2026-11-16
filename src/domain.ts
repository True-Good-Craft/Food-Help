// SPDX-License-Identifier: MPL-2.0
import type { Resource, Site } from './types.ts';
export type BrowseView = 'emergency' | 'affordable';
export const browseViewPaths: Record<BrowseView, string> = { emergency: '/', affordable: '/affordable-food/' };
export function resourceBrowseViews(resource: Resource): BrowseView[] {
  switch (resource.cost?.state) {
    case 'free': return ['emergency'];
    case 'low_cost':
    case 'subsidized': return ['affordable'];
    case 'mixed': return ['emergency', 'affordable'];
    default: return [];
  }
}
export function inBrowseView(resource: Resource, view: BrowseView): boolean {
  return resourceBrowseViews(resource).includes(view);
}
export function browseViewFromPath(pathname: string): BrowseView {
  return pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') === '/affordable-food' ? 'affordable' : 'emergency';
}
export function localTime(now: Date, zone: string): { date: string; day: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (key: string) => parts.find(item => item.type === key)!.value;
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  return { date, day: new Date(`${date}T12:00:00Z`).getUTCDay() || 7, time: `${part('hour')}:${part('minute')}` };
}
export function reviewOverdue(resource: Resource, site: Site, now: Date): boolean {
  return (Date.parse(localTime(now, resource.time_zone ?? site.time_zone).date) - Date.parse(resource.verification.reviewed_on)) / 86400000 > site.review.interval_days;
}
type Interval = Resource['schedule']['weekly'][number]['intervals'][number];
export type NextOpening = { date: string; day: number; daysAway: number; opens: string; closes?: string; closes_next_day?: boolean };
export type ScheduleView = { kind: 'now' | 'later' | 'ended' | 'none' | 'unknown' | 'unavailable'; intervals: Interval[]; current?: Interval; next?: Interval; note?: string; startsAt?: string; upcoming?: NextOpening };
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
// Published intervals for one local date: [] means no service by the published schedule, null means unknown.
function dayIntervals(resource: Resource, site: Site, date: string): Interval[] | null {
  const s = resource.schedule, jurisdiction = site.jurisdiction;
  if ((s.valid_from && date < s.valid_from) || (s.valid_to && date > s.valid_to)) return null;
  const exception = s.exceptions.find(item => item.date === date);
  if (exception) return exception.confirmed ? exception.intervals : null;
  if (jurisdiction && (date > jurisdiction.coverage_through || jurisdiction.warning_dates.some(item => item.date === date))) return null;
  // A confirmed dated schedule lists every service date; other dates in its range have no published service.
  if (s.kind === 'dated') return [];
  if (s.kind !== 'weekly') return null;
  const weekly = s.weekly.find(item => item.day === weekday(date));
  return weekly && weekly.state !== 'unknown' ? weekly.intervals : null;
}
function scheduleUsable(resource: Resource, date: string): boolean {
  const s = resource.schedule;
  return s.confirmed && resource.verification.state !== 'needs_review' && !(s.valid_from && date < s.valid_from) && !(s.valid_to && date > s.valid_to);
}
// The next published opening after today, looking a few weeks ahead. Unknown days are skipped, never assumed.
export function nextOpening(resource: Resource, site: Site, now: Date, horizon = 35): NextOpening | undefined {
  if (resource.service_condition === 'temporarily_unavailable' || resource.service_condition === 'closed') return undefined;
  const today = localTime(now, resource.time_zone ?? site.time_zone).date;
  if (!resource.schedule.confirmed || resource.verification.state === 'needs_review') return undefined;
  for (let offset = 1; offset <= horizon; offset++) {
    const date = addDays(today, offset);
    if (resource.schedule.valid_to && date > resource.schedule.valid_to) return undefined;
    const intervals = dayIntervals(resource, site, date), day = weekday(date);
    if (intervals?.length) { const first = [...intervals].sort((a, b) => a.opens.localeCompare(b.opens))[0]!; return { date, day, daysAway: offset, ...first }; }
    const covered = !site.jurisdiction || (date <= site.jurisdiction.coverage_through && !site.jurisdiction.warning_dates.some(item => item.date === date));
    const startsAt = intervals === null && covered && resource.schedule.kind === 'weekly' && !resource.schedule.exceptions.some(item => item.date === date) ? resource.schedule.weekly.find(item => item.day === day && item.state === 'unknown')?.opens : undefined;
    if (startsAt) return { date, day, daysAway: offset, opens: startsAt };
  }
  return undefined;
}
export function publishedSchedule(resource: Resource, site: Site, now: Date): ScheduleView {
  const s = resource.schedule, today = localTime(now, resource.time_zone ?? site.time_zone);
  if (resource.service_condition === 'temporarily_unavailable' || resource.service_condition === 'closed') return { kind: 'unavailable', intervals: [] };
  if (!scheduleUsable(resource, today.date)) return { kind: 'unknown', intervals: [] };
  const jurisdiction = site.jurisdiction;
  const current = dayIntervals(resource, site, today.date), before = dayIntervals(resource, site, addDays(today.date, -1));
  // A date exception or jurisdiction warning applies to the whole local day, including overnight carry-in.
  const override = s.exceptions.some(item => item.date === today.date) || jurisdiction?.warning_dates.some(item => item.date === today.date);
  const carried = !override ? before?.find(item => item.closes_next_day && today.time < item.closes) : undefined;
  const ordered = [...(current ?? [])].sort((a, b) => a.opens.localeCompare(b.opens));
  const active = ordered.find(item => today.time >= item.opens && (item.closes_next_day || today.time < item.closes));
  const note = s.exceptions.find(item => item.date === today.date)?.note;
  // Carry-in ends today; display only its remaining part in today's hours.
  const intervals = carried ? [{ opens: '00:00', closes: carried.closes }, ...ordered] : ordered;
  if (active || carried) return { kind: 'now', intervals, current: active ?? { ...carried!, closes_next_day: false }, note };
  if (current === null) {
    // A reviewed start time without a published end (for example, "until the food is gone") is later today
    // before it starts. Once started it stays uncertain: there is no published closing time.
    const startsAt = !override && s.kind === 'weekly' ? s.weekly.find(item => item.day === today.day && item.state === 'unknown')?.opens : undefined;
    if (startsAt && today.time < startsAt) return { kind: 'later', intervals: [], startsAt, note };
    return { kind: 'unknown', intervals: [], note, startsAt };
  }
  const next = ordered.find(item => item.opens > today.time);
  if (next) return { kind: 'later', intervals, next, note };
  return { kind: ordered.length ? 'ended' : 'none', intervals, note, upcoming: nextOpening(resource, site, now) };
}
export function scheduledStatus(resource: Resource, site: Site, now: Date): 'scheduled_now' | 'not_scheduled_now' | 'unknown' {
  const view = publishedSchedule(resource, site, now);
  return view.kind === 'now' ? 'scheduled_now' : view.kind === 'unknown' ? 'unknown' : 'not_scheduled_now';
}
export function scheduledToday(resource: Resource, site: Site, now: Date): boolean {
  return ['now', 'later'].includes(publishedSchedule(resource, site, now).kind);
}
export type CategoryGroup = { id: string; label: string; categories: string[] };
export function resourceInCategoryGroup(site: Site, resource: Resource, group: CategoryGroup): boolean {
  if (!site.presentation?.category_groups) return resource.categories.some(category => group.categories.includes(category));
  return group.categories.includes(resource.categories[0]!);
}
export function categoryGroups(site: Site, resources: Resource[]): CategoryGroup[] {
  const present = new Set(resources.flatMap(resource => resource.categories));
  const configured = site.presentation?.category_groups;
  if (configured) return configured.filter(group => resources.some(resource => resourceInCategoryGroup(site, resource, group)));
  return [...present].map(category => ({ id: category, label: category, categories: [category] }));
}
export function categoryFilter(site: Site, resources: Resource[]): { groups: CategoryGroup[]; includeAll: boolean } {
  const groups = categoryGroups(site, resources);
  const allCovered = resources.every(resource => groups.some(group => resourceInCategoryGroup(site, resource, group)));
  return { groups, includeAll: resources.length > 0 && (groups.length > 1 || !allCovered) };
}
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (n: number) => n * Math.PI / 180, dlat = rad(b.latitude - a.latitude), dlon = rad(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function searchable(resource: Resource, organization: string): string {
  return [resource.name, organization, resource.summary, resource.food_access_purpose, resource.location?.description, ...Object.values(resource.location?.address ?? {}), resource.service_area, ...resource.eligibility, ...resource.categories].join(' ').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}
