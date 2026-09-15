// SPDX-License-Identifier: MPL-2.0
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertPagesHeaders, headerPatternMatches, responseHeaders, renderHeaders } from '../../scripts/lib/headers.ts';
import { securityHeaders } from '../../scripts/lib/web.ts';
import siteJSON from '../../examples/exampleville/site.json' with { type: 'json' };
import type { Site } from '../../src/types.ts';

it('the Pages adapter rejects oversized lines and excess rules at the documented boundaries', () => {
  assert.doesNotThrow(() => assertPagesHeaders(`/*\n  X: ${'a'.repeat(1995)}`));
  assert.throws(() => assertPagesHeaders(`/*\n  X: ${'a'.repeat(1996)}`), /exceeds 2000/);
  const rules = Array.from({ length: 100 }, (_, index) => `/page-${index}\n  X-Test: value\n`).join('\n');
  assert.doesNotThrow(() => assertPagesHeaders(rules));
  assert.throws(() => assertPagesHeaders(rules + '/one-too-many\n  X-Test: value'), /at most 100/);
});

it('provider host patterns suppress aliases without matching a custom domain or a deceptive suffix', () => {
  const text = renderHeaders({ 'Content-Security-Policy': "default-src 'none'" }, {});
  for (const origin of ['https://directory.pages.dev', 'https://abc123.directory.pages.dev', 'http://staging.directory.pages.dev:4173']) {
    assert.equal(responseHeaders(text, new URL(`${origin}/resources/a/`))['X-Robots-Tag'], 'noindex');
  }
  for (const origin of ['https://directory.example.test', 'https://directory.pages.dev.example.test', 'https://too.many.parts.pages.dev']) assert.equal(responseHeaders(text, new URL(`${origin}/`))['X-Robots-Tag'], undefined);
  assert.equal(headerPatternMatches('/resources/:id/', new URL('https://example.test/resources/one/')), true);
  assert.equal(headerPatternMatches('/resources/:id/', new URL('https://example.test/resources/one/two/')), false);
});

it('the local adapter models repeated headers by joining them, exposing conflicting policy rules', () => {
  const text = '/*\n  Content-Security-Policy: first\n/\n  Content-Security-Policy: second';
  assert.equal(responseHeaders(text, new URL('https://example.test/'))['Content-Security-Policy'], 'first, second');
});

it('script and style hashes remain in their own CSP directives without duplicating allowed content', () => {
  const script = '{"@type":"WebPage"}', style = 'body{color:#173f4c}';
  const hash = (value: string) => `'sha256-${createHash('sha256').update(value).digest('base64')}'`;
  const policy = securityHeaders(`<script type="application/ld+json">${script}</script><style>${style}</style>`, siteJSON as Site, false)['Content-Security-Policy']!;
  const scripts = policy.split(';').find(value => value.trim().startsWith('script-src'))!, styles = policy.split(';').find(value => value.trim().startsWith('style-src'))!;
  assert.ok(scripts.includes(hash(script))); assert.ok(!scripts.includes(hash(style)));
  assert.ok(styles.includes(hash(style))); assert.ok(!styles.includes(hash(script)));
});
