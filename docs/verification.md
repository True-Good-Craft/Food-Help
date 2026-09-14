# Verification and acceptance

`npm run check` generates every prerequisite, builds the actual `site/` deployment and independent fixtures, type-checks application/scripts and worker, runs Node unit/output tests, then Playwright. It fails if a required engine or assertion fails. Install engines with `npx playwright install chromium firefox webkit` (Linux CI additionally uses `--with-deps`).

The fixtures deliberately differ in community, country, address format, locale and timezone. Exampleville output and generic source are scanned for reference-locality and private-infrastructure leakage. Tests compare configuration and source relationships rather than freezing Kingston strings. Fictional production-mode tests use local generated directories and reserved example hostnames; they are never deployed.

Coverage includes schema strictness, evidence/ID relationships, dates, schedules, DST, overnight intervals, jurisdiction uncertainty, public filtering, source-matched resource pages and JSON-LD, canonical/Open Graph/sitemap relationships, manifest, robots, discovery files, internal links, portable download and unpublished-data exclusion.

Browser checks cover no-JavaScript access, small screens, keyboard entry, automated WCAG A/AA checks, local search/category controls, absence of default telemetry/cookies/identifiers, optional aggregate/analytics separation, and the actual operator deployment with outbound test traffic blocked. Chromium, Firefox and WebKit exercise normal and offline navigation and corrupt-data fallback. Chromium additionally closes/reopens a persistent browser process offline and exercises failed release installation, user-approved activation in two tabs, cache cleanup and rollback. These lifecycle tests are intentionally listed once rather than repeated as empty claims for every engine.

Inspect generated screenshots in `artifacts/screenshots/`, Playwright’s HTML report, retained failure traces and `artifacts/reports/{deployment_id}.json`. Browser profiles, reports and all generated output are private disposable artifacts and excluded from source control.

Automated accessibility checks cannot establish complete accessibility. Before a real production proof, manually review keyboard/focus order, screen-reader announcements, zoom, print and supported phone installation. Verify Android and iOS standalone launch, first-visit offline readiness, reconnection and browser eviction behaviour on actual devices. Desktop WebKit is not proof of every iOS installed-app condition.

## Definition of done for the generic repository

- An operator can change only `site/`, run setup/check/build, and obtain the complete static deployment.
- A distinct community passes the same contracts without source edits or locality leakage.
- Public facts, resource pages and discovery outputs derive from one reviewed source; no draft/closed sentinel escapes.
- Useful HTML remains when JavaScript, network or persistent storage fails.
- Offline cold restart, safe updates and rollback have executable evidence.
- Default browsing has no third-party requests, accounts, cookies or visitor IDs; explicit analytics adds only the configured capability.
- Source and data rights are separated, font notices survive, and documentation explains review/deployment obligations.
- Public repository/hosting actions are separately approved and manual device/host checks are honestly recorded.

The implementation can meet the local generic acceptance criteria before the separate Kingston production proof. Do not describe an unperformed deployment, phone test or external collector compatibility check as passed.
