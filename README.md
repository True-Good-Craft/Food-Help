# Food Help

Food Help builds one community’s accessible, installable, offline-capable food-resource directory from reviewed local data. It is a static Vite + TypeScript application with no runtime package dependencies, accounts, database or server application.

**A new deployment requires no changes to generic application source.** Configure `site/site.json`, author `site/resources.json`, and optionally supply `site/assets/` and sanitized `site/usage.json`.

The included Exampleville directory is fictional and deliberately excluded from indexing. It must not be used to find real services.

## Start locally

Use Node **24.12 or later in the Node 24 line** (the tested version is in `.node-version`).

```sh
npm ci
npm run setup
npx playwright install chromium firefox webkit
npm run check
npm run dev
```

Open `http://127.0.0.1:4173`. Development rebuilds on changes to `src/`, `site/` and `schemas/`; reload the page or accept a waiting application update. Use a fresh browser profile when checking a particular artifact without an older worker.

`setup` prompts for deployment basics without inventing resource facts. Without an interactive terminal, or with `--validate-only`, it validates the configuration. It preserves existing resource data. Finish the remaining settings in the documented configuration file and replace fictional data with reviewed resources.

`npm run check` means **structurally safe and internally consistent enough to be reviewed for publication**. It validates the actual deployment, builds two community fixtures, checks generated relationships, runs unit tests, and exercises Chromium, Firefox and WebKit. It does not certify provider facts, licensing, medical suitability or live availability. First install the test browsers; no test silently substitutes a missing engine.

```sh
npm run build                  # preview, noindex
npm run preview                # serve dist/ with generated response headers
npm run build -- --production  # after human review; refuses example content
```

Builds do not deploy. Upload the complete `dist/` artifact to an approved static host at a dedicated HTTPS origin. Arbitrary subdirectory hosting is outside v1.

## What the build produces

- A static directory with optional local search, categories and in-memory distance sorting.
- Useful `/resources/{stable-id}/` HTML pages, including evidence and review dates.
- `/directory/`, a printable no-JavaScript directory, and a self-contained downloadable HTML copy.
- `/data/v1/resources.json`, the current public dataset, filtered from authoritative source.
- Methodology, privacy, about and licensing pages; optional sanitized `/usage/`.
- Canonicals, Open Graph, truthful JSON-LD, sitemap, robots and `llms.txt`.
- A generated manifest, self-hosted icons/font, native service worker and security headers.

Published schedules are never a live availability feed. Optional location is not stored. Analytics is disabled by default and requires explicit configuration; no external infrastructure is required.

## Source map

| Location | Role |
| --- | --- |
| `site/site.json`, `site/resources.json` | Deployment and reviewed fact authority |
| `site/assets/`, optional `site/usage.json` | Optional local branding and reviewed aggregates |
| `schemas/` | Two versioned schema contracts |
| `src/` | Generic domain, validation, presentation and browser behaviour |
| `src/copy/en.ts` | Centralized application copy; additive French path |
| `scripts/` | Setup, one build pipeline, preview and canonical check |
| `examples/exampleville/` | Fictional authoring example, not an authority for your deployment |
| `tests/` | Unit, output contracts, browser and offline tests; synthetic second community |
| `.generated/`, `artifacts/`, `dist/` | Disposable generated output; never hand-maintained |

Read [configuration](docs/configuration.md), [resource authoring](docs/data.md), [architecture and offline behaviour](docs/architecture.md), [standards/reuse decisions](docs/interoperability.md), [deployment](docs/deployment.md), and [verification](docs/verification.md).

Application source and repository documentation use [MPL-2.0](LICENSE). The font retains its [OFL](src/assets/fonts/OFL.txt). Dataset rights are separate; see [NOTICE](NOTICE.md). No real provider dataset or production infrastructure is included.

The GitHub check workflow is manual-only (`workflow_dispatch`). Repository Actions are disabled for the initial publication; a maintainer must explicitly enable and run them. There are no deployment or scheduled workflows.

## Current inspection snapshot

This initial repository is available for local inspection, not production sign-off. The latest local run passed type checks, 18 unit/output-contract tests and 21 browser tests. Two WebKit checks remain unresolved: optional analytics consent/event collection and corrupt-response last-good-data retention. Four browser cases are intentionally Chromium-only. Run `npm run check` to reproduce the outstanding results. Real-device installation and production-host checks are still pending. No website is deployed by publishing this repository.
