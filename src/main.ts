// SPDX-License-Identifier: MPL-2.0
import './styles.css';
import configuration from '../.generated/runtime-config.json';
import type { PublicDataset, RuntimeConfig } from './types.ts';
import { copy as c } from './copy/en.ts';
import { card, formatDate } from './presentation.ts';
import { distanceKm, scheduledToday, searchable, categoryGroups } from './domain.ts';
import { loadData } from './data-loader.ts';
import { analytics, type EventKind } from './analytics.ts';
const config = configuration as RuntimeConfig, site = config.site;
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const status = (id: string, text: string) => { const element = byId(id); if (element) element.textContent = text; };
const collection = analytics(site);
let dataset: PublicDataset | null = null, position: { latitude: number; longitude: number } | null = null, loading = false, selectedCategory = 'all';
const results = byId('resource-list'), search = byId<HTMLInputElement>('search'), scheduled = byId<HTMLInputElement>('scheduled');
function render(): void {
  if (!dataset || !results) return;
  const now = new Date(), query = (search?.value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
  const groups = categoryGroups(site, dataset.resources);
  // Retained or refreshed data may add/remove categories; keep every resource reachable.
  const buttons = document.querySelector('.segmented-control');
  if (buttons) {
    const ids = ['all', ...groups.map(group => group.id)];
    if (!ids.includes(selectedCategory)) selectedCategory = 'all';
    if (Array.from(buttons.querySelectorAll<HTMLElement>('[data-category]')).map(button => button.dataset.category).join('|') !== ids.join('|')) {
      buttons.replaceChildren(...[{ id: 'all', label: c.all }, ...groups.map(group => ({ id: group.id, label: site.presentation?.category_groups ? group.label : c.categories[group.id as keyof typeof c.categories] }))].map(group => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.category = group.id; button.textContent = group.label; return button;
      }));
    }
    buttons.querySelectorAll<HTMLElement>('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === selectedCategory)));
  }
  const categories = groups.find(group => group.id === selectedCategory)?.categories;
  let resources = dataset.resources.filter(r => (!query || searchable(r, dataset!.organizations.find(o => o.id === r.organization_id)!.name).includes(query)) && (!categories || r.categories.some(category => categories.includes(category))) && (!scheduled?.checked || scheduledToday(r, site, now)));
  if (position) resources = [...resources].sort((a, b) => (a.location?.coordinates ? distanceKm(position!, a.location.coordinates) : Infinity) - (b.location?.coordinates ? distanceKm(position!, b.location.coordinates) : Infinity));
  const opened = new Set(Array.from(results.querySelectorAll('article:has(details[open])')).map(el => el.getAttribute('data-resource-id')));
  const focused = document.activeElement instanceof HTMLElement && results.contains(document.activeElement) ? { id: document.activeElement.closest('[data-resource-id]')?.getAttribute('data-resource-id'), index: Array.from(document.activeElement.closest('article')!.querySelectorAll('a,button,summary')).indexOf(document.activeElement) } : null;
  results.innerHTML = resources.map(r => card(r, dataset!, site, false, 3, now)).join('') || `<p class="message-card">${c.noResults}</p>`;
  for (const resource of resources) {
    const element = results.querySelector(`[data-resource-id="${resource.id}"]`)!;
    if (position && resource.location?.coordinates) {
      const location = element.querySelector('[data-location]')!;
      location.textContent = `${c.nearest}: ${new Intl.NumberFormat(site.locale, { maximumFractionDigits: 1 }).format(distanceKm(position, resource.location.coordinates))} km · ${location.textContent}`;
    }
    if (opened.has(resource.id)) element.querySelector('details')!.open = true;
  }
  if (focused) results.querySelector(`[data-resource-id="${focused.id}"]`)?.querySelectorAll<HTMLElement>('a,button,summary')[focused.index]?.focus({ preventScroll: true });
  status('result-status', c.resourceCount(resources.length));
}
async function refresh(): Promise<void> {
  if (loading) return; loading = true;
  const result = await loadData(config);
  if (result.data) {
    dataset = result.data; render(); byId('filters')?.removeAttribute('hidden'); byId('refresh')?.removeAttribute('hidden');
    status('data-status', dataset.data_updated_on ? `${result.source === 'cached' ? c.savedCopy : c.listingsUpdated} · ${formatDate(dataset.data_updated_on, site)}` : '');
  }
  status('data-retention-status', result.source === 'network' && result.retained ? '' : result.source === 'network' ? c.savingFailed : c[result.source]);
  loading = false;
}
search?.addEventListener('input', render); scheduled?.addEventListener('change', render);
document.querySelector('.segmented-control')?.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-category]') : null;
  if (button) { selectedCategory = button.dataset.category!; render(); }
});
byId('refresh')?.addEventListener('click', () => void refresh());
byId('refresh')?.removeAttribute('hidden');
byId('locate')?.addEventListener('click', () => {
  if (!site.location?.enabled || !navigator.geolocation) { status('location-status', c.locationFailed); return; }
  navigator.geolocation.getCurrentPosition(result => { position = { latitude: result.coords.latitude, longitude: result.coords.longitude }; render(); byId('forget-location')?.removeAttribute('hidden'); status('location-status', c.locationNotice); }, () => status('location-status', c.locationFailed), { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 });
});
byId('forget-location')?.addEventListener('click', () => { position = null; render(); byId('forget-location')?.setAttribute('hidden', ''); status('location-status', c.locationOptional); byId('locate')?.focus(); });
if (site.analytics?.enabled) {
  const preference = byId<HTMLInputElement>('analytics-preference');
  if (preference) { preference.disabled = false; preference.checked = collection.allowed(); preference.addEventListener('change', () => { collection.setAllowed(preference.checked); preference.checked = collection.allowed(); }); }
}
document.addEventListener('click', event => { const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-event]') : null; const kind = target?.dataset.event; if (['call', 'directions', 'source'].includes(kind ?? '')) collection.emit(kind as EventKind); });
collection.emit('page_start');
window.addEventListener('online', () => { status('connection-status', c.online); void refresh(); });
window.addEventListener('offline', () => status('connection-status', c.offline));
status('connection-status', navigator.onLine ? c.online : c.offline);
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
