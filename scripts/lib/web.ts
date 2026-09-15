// SPDX-License-Identifier: MPL-2.0
import { createHash } from 'node:crypto';
import { copy as c } from '../../src/copy/en.ts';
import { card, escape as e, resourcePath, formatDate } from '../../src/presentation.ts';
import { categoryGroups } from '../../src/domain.ts';
import type { PublicDataset, Site, Usage } from '../../src/types.ts';
export const digest = (input: string | Uint8Array): string => createHash('sha256').update(input).digest('hex');
export type Page = { path: string; title: string; description: string; body: string; indexable: boolean; jsonld?: unknown };
export type Assets = { js: string; css: string[]; logo: string; icon192: string; icon512: string; font: string; brand: string };
export function pages(site: Site, data: PublicDataset, usage?: Usage): Page[] {
  const cta = `<p><a href="/directory/">${c.simple}</a> · <a href="/directory/download.html" download>${c.download}</a></p>`;
  const warning = `<p class="notice">${c.warning}</p>`;
  const resources = data.resources.map(r => card(r, data, site)).join('');
  const listData = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: site.site_name, url: `${site.canonical_origin}/`, description: site.description, mainEntity: { '@type': 'ItemList', itemListElement: data.resources.map((r, index) => ({ '@type': 'ListItem', position: index + 1, url: site.canonical_origin + resourcePath(r.id), name: r.name })) } };
  const groups = categoryGroups(site, data.resources);
  const output: Page[] = [{
    path: '/', title: site.site_name, description: site.description, indexable: true, jsonld: listData,
    body: `<section class="hero" aria-labelledby="page-title"><div class="hero-copy"><h1 id="page-title">${e(c.headline(site.community.name))}</h1><p class="hero-lead">${e(site.presentation?.introduction ?? c.introduction)}</p></div>
      ${site.help_contact ? `<aside class="help-panel" aria-label="${c.helpChoosing}"><h2>${c.helpChoosing}</h2><p>${e(site.help_contact.description ?? c.callBefore)}</p><a data-event="help" href="tel:${e(site.help_contact.phone)}">${e(site.help_contact.label)}</a></aside>` : ''}</section>
      <section class="directory-shell" aria-labelledby="directory-heading">
      <div class="section-heading"><h2 id="directory-heading">${c.directory}</h2><p class="dataset-status" id="data-status">${data.data_updated_on ? `${c.listingsUpdated} · ${formatDate(data.data_updated_on, site)}` : ''}</p></div>
      <div id="filters" hidden><fieldset class="category-control"><legend class="sr-only">${c.category}</legend><div class="segmented-control">
        <button type="button" data-category="all" aria-pressed="true">${c.all}</button>
        ${groups.map(group => `<button type="button" data-category="${e(group.id)}" aria-pressed="false">${e(site.presentation?.category_groups ? group.label : c.categories[group.id as keyof typeof c.categories])}</button>`).join('')}
      </div></fieldset><div class="filters">
        <label class="search-control"><span>${c.search}</span><input id="search" type="search" autocomplete="off" placeholder="${c.searchPlaceholder}"></label>
        <label class="check-control"><input id="scheduled" type="checkbox"><span>${c.scheduledFilter}</span></label>
        ${site.location?.enabled ? `<button id="locate" class="button button-secondary" type="button">${c.location}</button>` : ''}
      </div>${site.location?.enabled ? `<div class="location-feedback"><p class="quiet-status" id="location-status" role="status">${c.locationOptional}</p><button id="forget-location" class="text-button" type="button" hidden>${c.clearLocation}</button></div>` : ''}</div>
      <p class="estimate-note">${c.scheduleDisclaimer} <strong>${c.notLive}</strong> ${c.callBefore}</p>
      <div class="results-heading"><p class="result-status" id="result-status" role="status">${c.resourceCount(data.resources.length)}</p><button id="refresh" class="text-button" type="button" hidden>${c.refresh}</button></div>
      <div class="resource-list" id="resource-list">${resources}</div></section>
      ${aboutSection(site)}`
  }];
  for (const r of data.resources) {
    const organization = data.organizations.find(o => o.id === r.organization_id)!;
    const url = site.canonical_origin + resourcePath(r.id);
    const service = { '@type': 'Service', '@id': `${url}#service`, name: r.name, description: r.summary, url, serviceType: r.categories.map(cat => c.categories[cat]), provider: { '@type': 'Organization', name: organization.name, ...(organization.url ? { url: organization.url } : {}) }, ...(r.service_area ? { areaServed: r.service_area } : {}), ...(r.location?.address ? { availableChannel: { '@type': 'ServiceChannel', serviceLocation: { '@type': 'Place', name: r.location.description, address: { '@type': 'PostalAddress', streetAddress: r.location.address.street, addressLocality: r.location.address.locality, addressRegion: r.location.address.region, addressCountry: r.location.address.country, ...(r.location.address.postal_code ? { postalCode: r.location.address.postal_code } : {}) } } } } : {}) };
    output.push({ path: resourcePath(r.id), title: `${r.name} | ${site.site_name}`, description: r.summary, indexable: true, body: warning + card(r, data, site, true) + cta, jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: r.name, description: r.summary, url, inLanguage: r.content_language ?? data.content_language, dateModified: r.updated_on, mainEntity: service, citation: r.evidence.flatMap(item => item.url ? [item.url] : []) } });
  }
  output.push({ path: '/directory/', title: `${c.simple} | ${site.site_name}`, description: site.description, indexable: false, body: `<h1>${c.simple}</h1>${warning}${cta}<p>${c.downloadNote}</p>${data.resources.map(r => card(r, data, site, false, 2).replace(/<details(?=[ >])/, '<details open')).join('')}` });
  const page = (path: string, title: string, body: string, indexable = true) => output.push({ path, title: `${title} | ${site.site_name}`, description: `${title}. ${site.description}`, body: `<h1>${title}</h1>${body}`, indexable });
  page('/methodology/', c.methodology, `<p>${c.methodologyText}</p><p>${c.methodologyScope}</p><p>${c.reviewInterval(site.review.interval_days)}</p>${warning}<p>${c.holidayText}</p>${site.jurisdiction ? `<p>${c.holidayCoverage}: ${e(site.jurisdiction.coverage_through)}</p><ul>${site.jurisdiction.warning_dates.map(item => `<li>${e(item.date)}: ${e(item.note)} <a href="${e(item.source_url)}" rel="noreferrer">${c.source}</a> (${c.checked}: ${e(item.checked_on)})</li>`).join('')}</ul>` : ''}<p><a href="/data/v1/resources.json">${c.json}</a></p>`);
  page('/privacy/', c.privacy, `<p>${c.privacyText}</p><p>${c.privacyOffline}</p>${site.analytics?.enabled ? `<h2>${c.analyticsOn}</h2><p>${e(site.analytics.disclosure)}</p><p>${c.analyticsExplanation}</p><p>${e(new URL(site.analytics.endpoint!).origin)}</p>${analyticsChoice()}` : `<p>${c.analyticsOff}</p>`}`);
  page('/about/', c.about, `<p>${e(site.description)}</p><p>${c.maintained}: ${e(site.operator.name)}</p><p>${e(site.operator.statement ?? '')}</p><p><a href="mailto:${e(site.corrections.email)}">${c.report}</a></p><p>${c.software}</p>${site.software_source_url ? `<p><a href="${e(site.software_source_url)}">${e(site.software_source_url)}</a></p>` : ''}`);
  page('/licenses/', c.licenses, `<p>${c.softwareLicense} <a href="/licenses/MPL-2.0.txt">MPL-2.0</a></p>${sourceLink(site)}<p><a href="/licenses/NOTICE.txt">${c.attribution}</a></p><p>${c.fontLicense} <a href="/licenses/OFL.txt">OFL</a></p><h2>${c.dataLicense}</h2><p>${e(site.data_rights.statement)}</p>${site.data_rights.url ? `<a href="${e(site.data_rights.url)}">${e(site.data_rights.license ?? site.data_rights.url)}</a>` : ''}`);
  if (usage) page('/usage/', c.usage, `<p>${c.usageIntro}</p><p>${c.usagePeriod}: ${e(usage.period_start)} – ${e(usage.period_end)}</p><p>${c.usageGenerated}: ${e(usage.generated_at)}</p><dl>${Object.entries(usage.counts).map(([key, value]) => `<dt>${c.usageCounts[key as keyof typeof c.usageCounts]}</dt><dd>${value === null ? c.usageMissing : new Intl.NumberFormat(site.locale).format(value)}</dd>`).join('')}</dl>`, false);
  page('/404.html', c.notFound, `<p>${c.notFoundText}</p>`, false);
  return output;
}

function analyticsChoice(): string {
  return `<label><input id="analytics-preference" type="checkbox" disabled>${c.analyticsPreference}</label><p id="analytics-status" role="status"></p><p>${c.analyticsPreferenceNote}</p>`;
}
function sourceLink(site: Site): string { return site.software_source_url ? `<p><a href="${e(site.software_source_url)}" rel="noreferrer">${c.coveredSource}</a></p>` : ''; }
function aboutSection(site: Site): string {
  return `<section class="about-directory" aria-label="${c.about}">
    <div class="about-intro"><h2>${c.about}</h2><p>${c.aboutShort}</p><a href="mailto:${e(site.corrections.email)}">${c.report}</a></div>
    <div class="about-details">
      <details><summary>${c.saveDirectory}</summary><p>${c.installHelp}</p><p>${c.privacyOffline}</p><p><a href="/directory/">${c.simple}</a> · <a href="/directory/download.html" download>${c.download}</a></p><button class="button button-primary" id="install" type="button" hidden>${c.install}</button></details>
      <details><summary>${c.yourPrivacy}</summary><p>${c.privacyText}</p><p>${site.analytics?.enabled ? e(site.analytics.disclosure) : c.analyticsOff}</p>${site.analytics?.enabled ? analyticsChoice() : ''}<p><a href="/privacy/">${c.privacy}</a></p></details>
      <details><summary>${c.sourcesData}</summary><p>${c.methodologyText}</p><p><a href="/methodology/">${c.methodology}</a> · <a href="/data/v1/resources.json">${c.json}</a> · <a href="/licenses/">${c.licenses}</a></p></details>
    </div></section>`;
}
export function document(page: Page, site: Site, assets: Assets, production: boolean, standaloneCSS?: string): string {
  const index = production && !site.example_content && site.indexing?.enabled === true && page.indexable;
  const json = page.jsonld ? JSON.stringify(page.jsonld).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') : '';
  const standalone = standaloneCSS !== undefined, home = page.path === '/';
  const links = [['/', c.home], ['/directory/', c.simple], ['/methodology/', c.methodology], ['/privacy/', c.privacy], ['/about/', c.about], ['/licenses/', c.licenses], ['/data/v1/resources.json', c.json], ...(site.public_usage?.enabled ? [['/usage/', c.usage]] : [])];
  return `<!doctype html><html lang="${e(site.language)}" dir="${e(site.text_direction)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(page.title)}</title><meta name="description" content="${e(page.description)}"><meta name="robots" content="${index ? 'index,follow' : 'noindex,follow'}"><link rel="canonical" href="${e(site.canonical_origin + page.path)}"><meta property="og:type" content="website"><meta property="og:title" content="${e(page.title)}"><meta property="og:description" content="${e(page.description)}"><meta property="og:url" content="${e(site.canonical_origin + page.path)}"><meta property="og:image" content="${e(site.canonical_origin + assets.icon512)}"><meta name="theme-color" content="${e(site.branding?.colors?.primary ?? '#173f4c')}">${standalone ? `<style>${standaloneCSS}</style>` : `<link rel="icon" href="${assets.logo}"><link rel="manifest" href="/manifest.webmanifest"><link rel="preload" href="${assets.font}" as="font" type="font/woff2" crossorigin>${[...assets.css, assets.brand].map(css => `<link rel="stylesheet" href="${css}">`).join('')}<script type="module" src="${assets.js}"></script>`}${json ? `<script type="application/ld+json">${json}</script>` : ''}</head>
    <body><a class="skip-link" href="#main" tabindex="0">${c.skip}</a>
    <header class="site-header"><div class="header-inner"><a class="brand" href="/"><img src="${standalone ? '' : assets.logo}" ${standalone ? 'hidden' : ''} width="40" height="40" alt=""><span>${e(site.site_name)}</span></a>${site.help_contact ? `<a class="header-help" data-event="help" href="tel:${e(site.help_contact.phone)}"><span>${c.needHelp}</span><strong>${e(site.help_contact.label)}</strong></a>` : ''}</div></header>
    <main id="main" tabindex="-1" class="${home ? 'home-page' : 'content-page'}">${!home ? `<nav class="page-navigation" aria-label="${c.home}"><a href="/">← ${c.home}</a></nav>` : ''}${site.example_content ? `<p class="notice example-notice">${c.example}</p>` : ''}${page.body}${standalone ? `<section class="download-licensing"><h2>${c.licenses}</h2><p>${e(site.data_rights.statement)}</p><p>${c.softwareLicense} <a href="/licenses/MPL-2.0.txt">MPL-2.0</a> · <a href="/licenses/NOTICE.txt">${c.attribution}</a></p>${sourceLink(site)}</section>` : ''}
    ${standalone ? '' : `${!home ? `<p class="page-install"><button class="button button-secondary" id="install" type="button" hidden>${c.install}</button></p>` : ''}<div class="offline-status"><span id="connection-status" role="status"></span><span id="data-retention-status" role="status"></span><span id="app-status" role="status"></span></div>`}</main>
    <footer class="site-footer"><div class="footer-inner"><div><strong>${e(site.site_name)}</strong><p class="operator-statement">${e(site.operator.statement ?? `${c.maintained}: ${site.operator.name}`)}</p></div>${site.emergency_contact ? `<p class="emergency-contact"><a href="tel:${e(site.emergency_contact.phone)}">${e(site.emergency_contact.label)}</a>.</p>` : ''}</div>${!home ? `<nav class="footer-navigation" aria-label="${c.about}">${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>` : ''}</footer>
    ${standalone ? '' : `<aside id="update-notice" class="update-notice" role="status" hidden><p>${c.updateReady}</p><button id="apply-update" type="button" class="button button-primary">${c.update}</button></aside>`}</body></html>`;
}
export function securityHeaders(html: string, site: Site, production: boolean): Record<string, string> {
  const blocks = [...html.matchAll(/<(script|style)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)].filter(item => item[2]);
  const hashes = (tag: string) => blocks.filter(item => item[1] === tag).map(item => `'sha256-${createHash('sha256').update(item[2]!).digest('base64')}'`).join(' ');
  const endpoint = site.analytics?.enabled ? ` ${new URL(site.analytics.endpoint!).origin}` : '';
  const policy = `default-src 'none'; script-src 'self' ${hashes('script')}; style-src 'self' ${hashes('style')}; img-src 'self' data:; font-src 'self'${html.includes('data:font/woff2;base64,') ? ' data:' : ''}; connect-src 'self'${endpoint}; manifest-src 'self'; worker-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'`;
  return { 'Content-Security-Policy': policy, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Permissions-Policy': `geolocation=${site.location?.enabled ? '(self)' : '()'}, camera=(), microphone=(), payment=()`, ...(production ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}), 'Cache-Control': 'no-cache' };
}
