// SPDX-License-Identifier: MPL-2.0
import type { Resource, Site } from './types.ts';
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
export type ScheduleView = { kind: 'now' | 'later' | 'ended' | 'none' | 'unknown' | 'unavailable'; intervals: Interval[]; current?: Interval; next?: Interval; note?: string };
export function publishedSchedule(resource: Resource, site: Site, now: Date): ScheduleView {
  const s = resource.schedule, today = localTime(now, resource.time_zone ?? site.time_zone);
  if (resource.service_condition === 'temporarily_unavailable' || resource.service_condition === 'closed') return { kind: 'unavailable', intervals: [] };
  if (!s.confirmed || reviewOverdue(resource, site, now) || resource.verification.state === 'needs_review' || (s.valid_from && today.date < s.valid_from) || (s.valid_to && today.date > s.valid_to)) return { kind: 'unknown', intervals: [] };
  const jurisdiction = site.jurisdiction;
  const previous = new Date(Date.parse(today.date) - 86400000).toISOString().slice(0, 10);
  const select = (date: string, day: number) => {
    if ((s.valid_from && date < s.valid_from) || (s.valid_to && date > s.valid_to)) return null;
    const exception = s.exceptions.find(item => item.date === date);
    if (exception) return exception.confirmed ? exception.intervals : null;
    if (jurisdiction && (date > jurisdiction.coverage_through || jurisdiction.warning_dates.some(item => item.date === date))) return null;
    if (s.kind !== 'weekly') return null;
    const weekly = s.weekly.find(item => item.day === day);
    return weekly && weekly.state !== 'unknown' ? weekly.intervals : null;
  };
  const current = select(today.date, today.day), before = select(previous, (today.day + 5) % 7 + 1);
  // A date exception or jurisdiction warning applies to the whole local day, including overnight carry-in.
  const override = s.exceptions.some(item => item.date === today.date) || jurisdiction?.warning_dates.some(item => item.date === today.date);
  const carried = !override ? before?.find(item => item.closes_next_day && today.time < item.closes) : undefined;
  const ordered = [...(current ?? [])].sort((a, b) => a.opens.localeCompare(b.opens));
  const active = ordered.find(item => today.time >= item.opens && (item.closes_next_day || today.time < item.closes));
  const note = s.exceptions.find(item => item.date === today.date)?.note;
  // Carry-in ends today; display only its remaining part in today's hours.
  const intervals = carried ? [{ opens: '00:00', closes: carried.closes }, ...ordered] : ordered;
  if (active || carried) return { kind: 'now', intervals, current: active ?? { ...carried!, closes_next_day: false }, note };
  if (current === null) return { kind: 'unknown', intervals: [], note };
  const next = ordered.find(item => item.opens > today.time);
  return { kind: next ? 'later' : ordered.length ? 'ended' : 'none', intervals, next, note };
}
export function scheduledStatus(resource: Resource, site: Site, now: Date): 'scheduled_now' | 'not_scheduled_now' | 'unknown' {
  const view = publishedSchedule(resource, site, now);
  return view.kind === 'now' ? 'scheduled_now' : view.kind === 'unknown' ? 'unknown' : 'not_scheduled_now';
}
export function scheduledToday(resource: Resource, site: Site, now: Date): boolean {
  return ['now', 'later'].includes(publishedSchedule(resource, site, now).kind);
}
export function categoryGroups(site: Site, resources: Resource[]): { id: string; label: string; categories: string[] }[] {
  const present = new Set(resources.flatMap(resource => resource.categories));
  const configured = site.presentation?.category_groups;
  if (configured) return configured.filter(group => group.categories.some(category => present.has(category as Resource['categories'][number])));
  return [...present].map(category => ({ id: category, label: category, categories: [category] }));
}
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (n: number) => n * Math.PI / 180, dlat = rad(b.latitude - a.latitude), dlon = rad(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function searchable(resource: Resource, organization: string): string {
  return [resource.name, organization, resource.summary, resource.food_access_purpose, resource.location?.description, ...Object.values(resource.location?.address ?? {}), resource.service_area, ...resource.eligibility, ...resource.categories].join(' ').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}
