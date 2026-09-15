# Verification and acceptance

`npm run check -- --site deployments/kingston` generates prerequisites, builds the selected deployment and independent fixtures, type-checks application/scripts and worker, runs Node unit/output tests, then Playwright. Substitute another folder to validate it. `npm run check -- --all` discovers configured communities for validation only; it never creates or releases sites. It fails if a required engine or assertion fails. Install engines with `npx playwright install chromium firefox webkit` (Linux CI additionally uses `--with-deps`).

The fixtures deliberately differ in community, country, address format, locale and timezone. Exampleville output and generic source are scanned for reference-locality and private-infrastructure leakage. Tests compare configuration and source relationships rather than freezing Kingston strings. Fictional production-mode tests use local generated directories and reserved example hostnames; they are never deployed.

GitHub checks run for pull requests, pushes to `main` and manual dispatch. Change selection limits community-data changes to the relevant configuration; shared changes validate configured communities alongside the neutral example. Checks have no publication step. A release pointer advances only through the explicit target/revision release action, not this validation workflow.

Coverage includes schema strictness, evidence/ID relationships, dates, schedules, DST, overnight intervals, jurisdiction uncertainty, public filtering, source-matched resource pages and JSON-LD, canonical/Open Graph/sitemap relationships, manifest, robots, discovery files, internal links, portable download and unpublished-data exclusion.

Browser checks cover no-JavaScript access, small screens, keyboard entry, automated WCAG A/AA checks, local search/category controls, absence of default telemetry/cookies/identifiers, optional aggregate/analytics separation, and the actual operator deployment with outbound test traffic blocked. Chromium, Firefox and WebKit exercise normal and offline navigation and corrupt-data fallback. Chromium additionally closes/reopens a persistent browser process offline and exercises failed release installation, user-approved activation in two tabs, cache cleanup and rollback. These lifecycle tests are intentionally listed once rather than repeated as empty claims for every engine.

The separate root project-site check builds both noindex preview and indexable production fixtures. It verifies the authoritative community projection, ordinary links, canonical/social metadata, sitemap and robots output, provider-alias noindex headers, absence of client analytics/service-worker code, real 404 responses, 320px layout, keyboard skip navigation and no-JavaScript use in Chromium, Firefox and WebKit. These checks establish implementation readiness only; they do not verify DNS, Search Console, hosting redirects or actual indexing.

Inspect generated screenshots in `artifacts/screenshots/`, Playwright's HTML report, retained failure traces and the exact report path printed by the selected build under `artifacts/reports/{deployment_id}/`. Browser profiles, reports and all generated output are private disposable artifacts and excluded from source control. A passing fixture is not evidence that the selected real deployment passed; retain the actual target and source/artifact identity with results.

Automated accessibility checks cannot establish complete accessibility. Before a real production proof, manually review keyboard/focus order, screen-reader announcements, zoom, print and supported phone installation. Verify Android and iOS standalone launch, first-visit offline readiness, reconnection and browser eviction behaviour on actual devices. Desktop WebKit is not proof of every iOS installed-app condition.

## Definition of done for the generic repository

- An operator can change only a selected community folder, run setup/check/build, and obtain the complete static deployment.
- A distinct community passes the same contracts without source edits or locality leakage.
- Independently built outputs and runtime configuration contain only their selected community. A synthetic second community proves that releasing one target does not advance another; no second real public site is needed.
- Public facts, resource pages and discovery outputs derive from one reviewed source; no draft/closed sentinel escapes.
- Useful HTML remains when JavaScript, network or persistent storage fails.
- Offline cold restart, safe updates and rollback have executable evidence.
- Default browsing has no third-party requests, accounts, cookies or visitor IDs; explicit analytics adds only the configured capability.
- Source and data rights are separated, font notices survive, and documentation explains review/deployment obligations.
- Public repository/hosting actions are separately approved and manual device/host checks are honestly recorded.

## Actual-origin release checks

Keep the exact production artifact and report made by the release command, then run:

```sh
npm run verify -- --site deployments/kingston
```

An explicit `--out` uses that output's report; `--report <file>` selects an independently retained report. The verifier compares the actual worker and its installation entries with the selected artifact, checks host policies, runs fresh and offline browser stages, and writes private evidence under `artifacts/verification/`. Set `FOOD_HELP_VERIFY_ALIASES` to comma-separated HTTPS Pages aliases when verifying their `noindex` headers. Optional collection is suppressed with browser privacy signals; any external request attempt is reported as a failure. Run this command with browser execution permitted on the operator machine.

After deployment, verify exact built HTML/assets/worker bytes and MIME types at the approved origin, fresh offline installation and validated last-good data. Test canonical and normalized routes, real 404 status, effective CSP/security headers, worker revalidation policy, crawler files, sitemap and source links. More than one CSP can combine restrictively; inspecting `_headers` alone cannot establish the actual response policy.

Distinguish host-injected code by purpose. Email obfuscation is an HTML transformation, not itself analytics. Separately observe whether collection code is injected, attempts a request, is blocked, or successfully persists a record. Use only identified, excluded synthetic records when a production collector test is authorized.

For domain transitions, verify HTTP/HTTPS and applicable `www` variants, useful final destinations, query preservation and no redirect loops. Inspect old worker/manifest/data/asset routes separately; identical JSON path names do not establish identical formats. Keep the old artifact recoverable before a permanent redirect, and record that cached permanent redirects cannot be instantly recalled.

## Physical-phone procedure

Physical-device evidence remains pending until an operator records actual results. Desktop mobile sizes and WebKit tests are not a phone installation test.

1. On an actual Android phone in Chrome, or iPhone in Safari, visit the production origin online in a fresh site context. Wait for the application offline-ready message and visible reviewed listings. Record phone/OS/browser version and date.
2. Install/Add to Home Screen. Open from the new icon, then close both the browser and app, enable airplane mode and launch from the icon again. Confirm the directory, resource detail and simple directory open; exercise a filter. Calls/maps/external sources can require connectivity.
3. Reconnect and refresh. Confirm the directory updates without losing navigation. When a new approved release is available, accept its update and repeat cold offline launch.
4. Inspect enlarged text, keyboard/focus where available and the device's screen-reader announcements. Report exactly what passed or failed; do not advance source-review dates as part of this test.

The implementation can meet local generic acceptance criteria before production/device proof. Do not describe an unperformed deployment, phone test or external collector reporting check as passed.
