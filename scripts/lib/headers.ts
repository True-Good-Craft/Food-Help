// SPDX-License-Identifier: MPL-2.0
// This file is the static-host adapter; application code has no provider dependency.
// Verified against https://developers.cloudflare.com/pages/configuration/headers/.
export const aliasRules = ['https://:project.pages.dev/*', 'https://:version.:project.pages.dev/*'] as const;

export function assertPagesHeaders(text: string): void {
  const lines = text.split(/\r?\n/);
  const rules = lines.filter(line => line.trim() && !/^\s|#/.test(line));
  if (rules.length > 100) throw new Error(`Cloudflare Pages _headers supports at most 100 rules; generated ${rules.length}. Review the host adapter rather than dropping resource facts or security policy.`);
  for (const [index, line] of lines.entries()) {
    if ([...line].length > 2000) throw new Error(`Cloudflare Pages _headers line ${index + 1} exceeds 2000 characters (${[...line].length}). Review the host adapter for this directory size; do not truncate CSP or omit resources.`);
  }
}

export function renderHeaders(common: Record<string, string>, headers: Record<string, Record<string, string>>): string {
  const lines = ['/*', ...Object.entries(common).map(([key, value]) => `  ${key}: ${value}`), ''];
  for (const [route, values] of Object.entries(headers)) {
    const specific = Object.entries(values).filter(([key, value]) => key !== 'Content-Security-Policy' && common[key] !== value);
    if (specific.length) lines.push(route, ...specific.map(([key, value]) => `  ${key}: ${value}`), '');
  }
  // Provider aliases must not compete with the configured canonical community origin.
  for (const pattern of aliasRules) lines.push(pattern, '  X-Robots-Tag: noindex', '');
  const text = lines.join('\n'); assertPagesHeaders(text); return text;
}

function partMatches(pattern: string, value: string, host: boolean): boolean {
  let expression = '';
  for (let index = 0; index < pattern.length;) {
    const character = pattern[index]!;
    if (character === '*') { expression += '.*'; index++; continue; }
    const placeholder = pattern.slice(index).match(/^:[A-Za-z]\w*/);
    if (placeholder) { expression += host ? '[^./]+' : '[^/]+'; index += placeholder[0].length; continue; }
    expression += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); index++;
  }
  return new RegExp(`^${expression}$`).test(value);
}

export function headerPatternMatches(pattern: string, url: URL): boolean {
  if (!pattern.startsWith('https://')) return partMatches(pattern, url.pathname, false);
  const authorityAndPath = pattern.slice('https://'.length), slash = authorityAndPath.indexOf('/');
  const host = slash < 0 ? authorityAndPath : authorityAndPath.slice(0, slash), pathname = slash < 0 ? '/' : authorityAndPath.slice(slash);
  // Pages absolute patterns deliberately ignore the incoming protocol and port.
  return partMatches(host, url.hostname, true) && partMatches(pathname, url.pathname, false);
}

export function responseHeaders(text: string, url: URL): Record<string, string> {
  const headers: Record<string, string> = {}; let active = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) { active = headerPatternMatches(line, url); continue; }
    if (!active) continue;
    if (line.trimStart().startsWith('! ')) { delete headers[line.trim().slice(2)]; continue; }
    const split = line.indexOf(':'); if (split < 0) continue;
    const key = line.slice(0, split).trim(), value = line.slice(split + 1).trim();
    headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  }
  return headers;
}
