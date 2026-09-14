// SPDX-License-Identifier: MPL-2.0
import './styles.css';
import configuration from '../.generated/runtime-config.json';
import type { PublicDataset, RuntimeConfig } from './types.ts';
import { copy as c } from './copy/en.ts';
import { card } from './presentation.ts';
import { distanceKm, reviewOverdue, scheduledStatus, searchable } from './domain.ts';
import { loadData } from './data-loader.ts';
import { analytics, type EventKind } from './analytics.ts';
const config = configuration as RuntimeConfig, site = config.site;
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const status = (id: string, text: string) => { const element = byId(id); if (element) element.textContent = text; };
const collection = analytics(site);
let dataset: PublicDataset | null = null, position: { latitude: number; longitude: number } | null = null, loading = false;
const results = byId('resource-list'), search = byId<HTMLInputElement>('search'), category = byId<HTMLSelectElement>('category'), scheduled = byId<HTMLInputElement>('scheduled');
function render(): void {
  if (!dataset || !results) return;
  const now = new Date(), query = (search?.value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
  let resources = dataset.resources.filter(r => (!query || searchable(r, dataset!.organizations.find(o => o.id === r.organization_id)!.name).includes(query)) && (!category?.value || r.categories.includes(category.value as typeof r.categories[number])) && (!scheduled?.checked || scheduledStatus(r, site, now) === 'scheduled_now'));
  if (position) resources = [...resources].sort((a, b) => (a.location?.coordinates ? distanceKm(position!, a.location.coordinates) : Infinity) - (b.location?.coordinates ? distanceKm(position!, b.location.coordinates) : Infinity));
  const opened = new Set(Array.from(results.querySelectorAll('article:has(details[open])')).map(el => el.getAttribute('data-resource-id')));
  results.innerHTML = resources.map(r => card(r, dataset!, site)).join('') || `<p class="message-card">${c.noResults}</p>`;
  for (const resource of resources) {
    const element = results.querySelector(`[data-resource-id="${resource.id}"]`)!;
    const schedule = element.querySelector('[data-schedule-status]')!;
    schedule.textContent = c.scheduled[scheduledStatus(resource, site, now)];
    if (position && resource.location?.coordinates) schedule.textContent += ` · ${c.nearest}: ${new Intl.NumberFormat(site.locale, { maximumFractionDigits: 1 }).format(distanceKm(position, resource.location.coordinates))} km`;
    if (reviewOverdue(resource, site, now)) element.querySelector('[data-review-warning]')!.textContent = c.overdue;
    if (opened.has(resource.id)) element.querySelector('details')!.open = true;
  }
  status('result-status', c.resourceCount(resources.length));
}
async function refresh(): Promise<void> {
  if (loading) return; loading = true;
  const result = await loadData(config);
  if (result.data) { dataset = result.data; render(); byId('filters')?.removeAttribute('hidden'); }
  status('data-status', result.source === 'network' && !result.retained ? c.savingFailed : c[result.source]);
  loading = false;
}
search?.addEventListener('input', render); category?.addEventListener('change', render); scheduled?.addEventListener('change', render);
byId('refresh')?.addEventListener('click', () => void refresh());
byId('locate')?.addEventListener('click', () => {
  if (!site.location?.enabled || !navigator.geolocation) { status('location-status', c.locationFailed); return; }
  navigator.geolocation.getCurrentPosition(result => { position = { latitude: result.coords.latitude, longitude: result.coords.longitude }; render(); byId('forget-location')?.removeAttribute('hidden'); status('location-status', c.locationNotice); }, () => status('location-status', c.locationFailed), { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 });
});
byId('forget-location')?.addEventListener('click', () => { position = null; render(); byId('forget-location')?.setAttribute('hidden', ''); status('location-status', ''); });
if (site.analytics?.enabled) {
  const preference = byId<HTMLInputElement>('analytics-preference');
  if (preference) { preference.disabled = false; preference.checked = collection.allowed(); preference.addEventListener('change', () => { collection.setAllowed(preference.checked); preference.checked = collection.allowed(); }); }
}
document.addEventListener('click', event => { const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-event]') : null; const kind = target?.dataset.event; if (['call', 'directions', 'source'].includes(kind ?? '')) collection.emit(kind as EventKind); });
collection.emit('page_start');
window.addEventListener('online', () => { status('connection-status', ''); void refresh(); });
window.addEventListener('offline', () => status('connection-status', c.offline));
if (!navigator.onLine) status('connection-status', c.offline);
void refresh();
// Refresh schedule-derived wording while browsing, without collecting interactions or making network requests.
setInterval(() => { if (!document.hidden && !results?.contains(document.activeElement)) render(); }, 60_000);

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let installPrompt: InstallPrompt | null = null;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event as InstallPrompt; byId('install')?.removeAttribute('hidden'); });
byId('install')?.addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; byId('install')?.setAttribute('hidden', ''); } });
window.addEventListener('appinstalled', () => collection.emit('install'));
if ('serviceWorker' in navigator) {
  let reloadStarted = false;
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloadStarted) { reloadStarted = true; location.reload(); }
    else { hadController = true; status('app-status', c.appReady); }
  });
  void navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
    const offer = () => { if (registration.waiting && navigator.serviceWorker.controller) { byId('update-notice')?.removeAttribute('hidden'); } };
    offer();
    registration.addEventListener('updatefound', () => { registration.installing?.addEventListener('statechange', offer); });
    byId('apply-update')?.addEventListener('click', () => { registration.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' }); setTimeout(() => { if (!reloadStarted) status('app-status', c.updateFailed); }, 10_000); });
    void navigator.serviceWorker.ready.then(() => status('app-status', c.appReady));
    void registration.update().catch(() => {});
  }).catch(() => status('app-status', c.appFailed));
}
// Static pages have already rendered useful content before this module runs.
