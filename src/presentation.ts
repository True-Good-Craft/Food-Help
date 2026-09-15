// SPDX-License-Identifier: MPL-2.0
import { copy as c } from './copy/en.ts';
import { localTime, publishedSchedule, reviewOverdue } from './domain.ts';
import type { Resource, PublicDataset, Site } from './types.ts';
export const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export const resourcePath = (id: string): string => `/resources/${id}/`;
export const list = (items: readonly string[]): string => items.length ? `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : `<p>${c.noDetails}</p>`;
export function formatDate(value: string, site: Site): string {
  return new Intl.DateTimeFormat(site.locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}
export function formatTime(value: string, site: Site): string {
  return new Intl.DateTimeFormat(site.locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`2000-01-01T${value}:00Z`));
}
export function address(resource: Resource, compact = false): string {
  const a = resource.location?.address;
  if (!a) return resource.location?.description ?? resource.service_area ?? c.unknown;
  if (compact) return [a.street, a.neighbourhood && !a.street.includes(a.neighbourhood) ? a.neighbourhood : a.locality].join(', ');
  return [a.street, a.locality, a.region, a.postal_code, a.country].filter(Boolean).join(', ');
}
const times = (items: Resource['schedule']['weekly'][number]['intervals'], site: Site) => items.map(item => `${formatTime(item.opens, site)}–${formatTime(item.closes, site)}${item.closes_next_day ? ` ${c.nextDay}` : ''}`).join(', ');
export function schedule(resource: Resource, site: Site, headingLevel = 5): string {
  const s = resource.schedule;
  return `<p>${c.scheduleKinds[s.kind]}${s.confirmed ? '' : ` — ${c.unconfirmed}`}. ${escape(s.note)}</p><p>${c.timezone}: ${escape(resource.time_zone ?? site.time_zone)}</p>${s.valid_from || s.valid_to ? `<p>${c.validity}: ${s.valid_from ? formatDate(s.valid_from, site) : c.unknown} – ${s.valid_to ? formatDate(s.valid_to, site) : c.unknown}</p>` : ''}${s.weekly.length ? `<ul>${s.weekly.map(day => `<li>${c.weekdays[day.day - 1]}: ${day.state === 'unknown' ? c.unknown : day.state === 'closed' ? c.closed : times(day.intervals, site)}</li>`).join('')}</ul>` : ''}${s.exceptions.length ? `<h${headingLevel}>${c.exceptions}</h${headingLevel}><ul>${s.exceptions.map(item => `<li>${formatDate(item.date, site)}: ${item.confirmed ? (times(item.intervals, site) || c.closed) : c.unconfirmed}. ${escape(item.note)}</li>`).join('')}</ul>` : ''}`;
}
export function accessSummary(r: Resource): string {
  if (r.access.appointment_required === 'yes') return c.appointmentNeeded;
  if (r.access.registration_required === 'yes') return r.access.details[0] ?? c.registrationNeeded;
  if (r.access.walk_in === 'yes') return c.dropIn;
  return r.access.details[0] ?? c.accessUnknown;
}
export function scheduleSummary(r: Resource, site: Site, now?: Date): { kind: string; label: string; detail: string; today: string } {
  if (!now) return { kind: 'unknown', label: r.schedule.confirmed ? c.schedule : c.scheduleLabels.unknown, detail: c.callBefore, today: r.schedule.confirmed ? c.staticHours : r.schedule.note };
  const view = publishedSchedule(r, site, now), appointment = r.access.appointment_required === 'yes';
  const label = view.kind === 'now' && appointment ? c.appointmentHours : view.kind === 'later' && appointment ? c.appointmentLater : c.scheduleLabels[view.kind];
  const detail = view.current ? `${appointment ? `${c.bookingRequired} · ` : ''}${c.until} ${formatTime(view.current.closes, site)}${view.current.closes_next_day ? ` ${c.nextDay}` : ''} · ${c.callBefore}` : view.next ? `${c.publishedOpening} ${formatTime(view.next.opens, site)}${appointment ? ` · ${c.bookingRequired}` : ''}` : view.kind === 'unknown' ? (reviewOverdue(r, site, now) ? c.overdue : c.callBefore) : c.seeWeekly;
  const today = view.kind === 'unknown' ? (reviewOverdue(r, site, now) ? c.overdue : r.schedule.note) : view.kind === 'unavailable' ? c.conditions[r.service_condition] : `${times(view.intervals, site) || c.closed}${view.note ? ` · ${view.note}` : ''}`;
  return { kind: view.kind, label, detail, today };
}
function evidenceField(field: string): string {
  const labels: Record<string, string> = { name: 'Service name', summary: 'Service description', food_access_purpose: c.foodPurpose, official_url: c.source, location: 'Location', phone: c.phone, eligibility: c.eligibility, limitations: c.limitations, before_you_go: c.before, schedule: c.schedule, cost: c.cost, service_area: c.area, 'access.walk_in': c.walkIn, 'access.appointment_required': c.appointment, 'access.registration_required': c.registration, 'access.identification_required': c.identification };
  return labels[field] ?? field.replaceAll('_', ' ').replaceAll('.', ': ');
}
export function card(resource: Resource, data: PublicDataset, site: Site, full = false, headingLevel = full ? 1 : 3, now?: Date): string {
  const r = resource, org = data.organizations.find(item => item.id === r.organization_id)!;
  const field = (title: string, value: string) => `<section><h${headingLevel + 1}>${title}</h${headingLevel + 1}>${value}</section>`;
  const facts = `${field(c.address, `<p>${escape(address(r))}</p>${r.phone ? `<p>${c.phone}: ${escape(r.phone)}${r.phone_extension ? ` · ext ${escape(r.phone_extension)}` : ''}</p>` : ''}`)}${field(c.access, `<dl>${(['walk_in', 'appointment_required', 'registration_required', 'identification_required'] as const).map((key, i) => `<dt>${[c.walkIn, c.appointment, c.registration, c.identification][i]}</dt><dd>${c[r.access[key]]}</dd>`).join('')}</dl>${list(r.access.details)}`)}${field(c.eligibility, list(r.eligibility))}${field(c.limitations, list(r.limitations))}${field(c.before, list(r.before_you_go))}${field(c.schedule, schedule(r, site, headingLevel + 2))}`;
  const evidence = `<ul class="source-links">${r.evidence.map(item => `<li>${item.url ? `<a data-event="source" href="${escape(item.url)}" rel="noreferrer">${escape(new URL(item.url).hostname.replace(/^www\./, ''))}</a>` : escape(c.methods.direct_confirmation)}<p>${c.checked}: <time datetime="${item.checked_on}">${formatDate(item.checked_on, site)}</time>. ${escape(item.note)}</p>${full ? `<p>${c.supports}: ${escape(item.supports.map(evidenceField).join(', '))}</p>` : ''}</li>`).join('')}</ul><p>${c.methods[r.verification.method]}. ${c.verification[r.verification.state]}.</p>`;
  const detail = `${facts}${r.food_access_purpose !== r.summary ? field(c.foodPurpose, `<p>${escape(r.food_access_purpose)}</p>`) : ''}${r.cost ? field(c.cost, `<p>${escape(r.cost.description)}</p>`) : ''}${r.service_languages?.length ? field(c.languages, list(r.service_languages)) : ''}${r.notices?.length ? field(c.notices, list(r.notices.map(item => `${item.text} (${formatDate(item.starts_on, site)}${item.ends_on ? ` – ${formatDate(item.ends_on, site)}` : ''})`))) : ''}${field(c.sources, evidence)}`;
  const status = scheduleSummary(r, site, now), level = `h${headingLevel}`;
  const today = now ? localTime(now, r.time_zone ?? site.time_zone).date : undefined;
  const notices = (r.notices ?? []).filter(item => !today || (item.starts_on <= today && (!item.ends_on || item.ends_on >= today)));
  const quickFact = (name: string, value: string, attr = '') => `<div class="fact"><dt>${name}</dt><dd${attr}>${escape(value)}</dd></div>`;
  const link = (url: string, text: string, style: string, event: string) => `<a class="button ${style}" data-event="${event}" href="${escape(url)}"${url.startsWith('https:') ? ' rel="noreferrer"' : ''} aria-label="${escape(`${text}: ${r.name}`)}">${escape(text)}</a>`;
  return `<article class="resource-card" data-resource-id="${escape(r.id)}" lang="${escape(r.content_language ?? data.content_language)}">
    <div class="card-header"><div><div class="tags">${r.categories.map(cat => `<span class="tag">${c.categories[cat]}</span>`).join('')}</div><${level}>${full ? escape(r.name) : `<a href="${resourcePath(r.id)}">${escape(r.name)}</a>`}</${level}><p class="operator">${c.provider} ${escape(org.name)}</p></div>
    <div class="availability availability-${status.kind}" data-schedule-status><strong>${escape(status.label)}</strong><span>${escape(status.detail)}</span></div></div>
    ${r.service_condition !== 'active' ? `<p class="temporary-notice">${c.conditions[r.service_condition]}</p>` : ''}${notices.map(notice => `<p class="temporary-notice">${escape(notice.text)}</p>`).join('')}
    <p class="summary">${escape(r.summary)}</p><dl class="card-facts">${quickFact(c.address, address(r, !full), ' data-location')}${quickFact(c.today, status.today)}${quickFact(c.quickAccess, accessSummary(r))}</dl>
    ${full ? `<div class="detail-grid">${detail}</div>` : `<details id="details-${r.id}"><summary>${c.details}</summary><div class="detail-grid">${detail}</div></details>`}
    <div class="card-actions">${r.phone ? link(`tel:${r.phone}${r.phone_extension ? `;ext=${r.phone_extension}` : ''}`, `${c.call}${r.phone_extension ? ` · ext ${r.phone_extension}` : ''}`, 'button-primary', 'call') : ''}${r.location?.address ? link(`https://www.openstreetmap.org/search?query=${encodeURIComponent(address(r))}`, c.directions, 'button-secondary', 'directions') : ''}${r.official_url ? link(r.official_url, c.source, 'button-quiet', 'source') : ''}</div>
    <p class="verified">${c.sourcesChecked} <time datetime="${r.verification.reviewed_on}">${formatDate(r.verification.reviewed_on, site)}</time>${full && r.updated_on !== r.verification.reviewed_on ? ` · ${c.updated} ${formatDate(r.updated_on, site)}` : ''}</p><p class="review-warning" data-review-warning${!now || !reviewOverdue(r, site, now) ? ' hidden' : ''}>${now && reviewOverdue(r, site, now) ? c.overdue : ''}</p></article>`;
}
