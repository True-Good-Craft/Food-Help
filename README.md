# Food Help

Food Help builds an accessible, installable, offline-capable food-resource directory from reviewed local data. It is a static Vite + TypeScript application with no runtime package dependencies, accounts, database or server application.

The project homepage at [food-help.ca](https://food-help.ca) is a separate static target and community hub. Its public copy lives in `project-site/site.json`; `project-site/communities.json` is the single authoritative list of available directories. The root links people to local directories and does not duplicate their food-provider records.

**A new community requires no changes to generic application source.** Shared software lives on `main`; each community supplies a folder containing `site.json`, `resources.json`, optional `assets/` and optional sanitized `usage.json`. Building and releasing one community does not update another.

The real Kingston configuration and eight reviewed listings are in `deployments/kingston/`, for [kingston.food-help.ca](https://kingston.food-help.ca). The neutral starter in `examples/exampleville/` is fictional and excluded from indexing. It must not be used to find real services.

## Work on the project homepage

```sh
npm run project:check
npm run project:dev
```

Open `http://127.0.0.1:4175`. The normal local build is a noindex preview at `dist/project/`; build it without starting a server with `npm run project:build`, or serve an existing build with `npm run project:preview`. A production build and `release/project` pointer are explicitly separate from every community build and release. See [deployment](docs/deployment.md#food-help-project-site) before publication.

## Start independently

Download, clone, fork or use this repository as a template. No TGC account, hosting purchase or analytics service is required. Use Node **24.12 or later in the Node 24 line** (see `.node-version`).

```sh
npm ci
npx playwright install chromium firefox webkit
npm run setup -- --site deployments/my-community
npm run check -- --site deployments/my-community
npm run dev -- --site deployments/my-community
```

Setup requires an explicit folder and creates a fictional starting configuration without inventing local facts. Finish [configuration](docs/configuration.md), replace example data with reviewed local resources, and establish your data rights before publication. In a noninteractive terminal, setup creates/validates the fictional starter rather than guessing answers. `--validate-only` leaves configuration and data unchanged; generated schema tooling may be refreshed. Existing resource data is preserved.

Open `http://127.0.0.1:4173`. Development rebuilds the selected community; reload or accept its waiting application update. To inspect only the neutral example, use `npm run dev` without `--site`. A fresh browser profile avoids an earlier deployment's worker when comparing artifacts locally.

## Work on Kingston

```sh
npm run check -- --site deployments/kingston
npm run build -- --site deployments/kingston
npm run preview -- --site deployments/kingston
```

The build above is a noindex preview at `dist/kingston/`. After editorial review, build production explicitly:

```sh
npm run build -- --site deployments/kingston --production --source-revision <full-commit-sha>
```

Production requires corresponding source availability for the exact built revision. Follow [release and hosting instructions](docs/deployment.md) before publishing. Upload the complete selected output, not the parent `dist/` folder. Builds do not deploy, create hosting, change DNS or publish other communities. Dedicated root HTTPS origins are supported; arbitrary subdirectory hosting is outside v1.

For local editorial review of draft listings, use `npm run dev -- --site deployments/kingston --review-drafts`. It uses `http://127.0.0.1:4174` by default so a normal preview's worker cannot mask review content. The isolated review output lives below `artifacts/reviews/`, visibly marks drafts, is noindex/no-store, and has no offline installation. Review mode cannot be used for a production build and does not approve or publish facts.

`npm run check -- --site <folder>` means **structurally safe and internally consistent enough to be reviewed for publication**. It builds the selected deployment and independent fixtures, validates output relationships, and exercises supported browsers. `npm run check -- --all` discovers community folders for validation only. Neither command certifies provider facts, rights or live availability. Missing required test engines are failures, not silent substitutions.

## Generated surfaces

- Emergency food at `/` and directly linkable Affordable food at `/affordable-food/`, with local search, category buttons and optional in-memory distance sorting within either view.
- Useful `/resources/{stable-id}/` HTML with source evidence and review dates.
- `/directory/`, a printable no-JavaScript directory, and a self-contained HTML download.
- `/data/v1/resources.json`, filtered from the selected authoritative dataset.
- Methodology, privacy, about and licensing pages; optional sanitized `/usage/`.
- Canonicals, Open Graph, truthful JSON-LD, sitemap, robots and `llms.txt`.
- A manifest, self-hosted icons/font, native service worker and generated host policies.

Published schedules are never a live availability feed. Location is optional and not stored. Analytics is disabled in the starter and requires explicit deployment configuration and policy approval. Host-injected scripts are a separate responsibility; production verification checks actual responses.

## Source map

| Location | Role |
| --- | --- |
| `deployments/<community>/site.json`, `resources.json` | Community configuration and reviewed fact authority |
| `project-site/site.json`, `communities.json`, `styles.css` | Root project-site copy, available-community authority and presentation |
| Selected folder's `assets/`, optional `usage.json`, `AGENTS.md` | Branding, reviewed aggregates and local rules |
| `examples/exampleville/` | Neutral fictional starter and test fixture |
| `src/`, `schemas/`, `scripts/` | Shared application, data contracts and tooling |
| `src/copy/en.ts` | Application copy and documented additive language path |
| `tests/` | Unit, contract, browser, offline and synthetic-community checks |
| `.github/workflows/` | Repeatable validation, separate from explicit publication |
| `.generated/`, `artifacts/`, `dist/project/`, `dist/<deployment_id>/` | Disposable generated output; never hand-maintained authority |

Read [maintenance](docs/maintenance.md) for adding listings, communities and shared upgrades; [architecture](docs/architecture.md) for generation/offline behaviour; [interoperability](docs/interoperability.md) for the preserved v1/HSDS mapping; [verification](docs/verification.md) for automated versus physical-device evidence; and the [changelog](CHANGELOG.md) for unreleased user-visible changes.

Software and supporting documentation use [MPL-2.0](LICENSE). The font retains [OFL-1.1](src/assets/fonts/OFL.txt), fictional datasets retain CC0-1.0, and real Kingston data has no asserted blanket open-data licence. [NOTICE](NOTICE.md) and [licensing](docs/licensing.md) explain coverage, attribution and source availability. Self-hosting and commercial software use do not require buying TGC services.

`main` is the shared development source. Community release pointers select exact reviewed commits; adding a folder or merging shared software is not an instruction to deploy every community. Validation and publication remain separate. Hosting success alone is not proof of offline readiness, analytics delivery or physical-phone reliability.

For a configured host, `npm run release -- --site deployments/kingston --ref <commit-or-tag>` checks/builds an exact local release plan. Adding `--publish` explicitly advances only `release/kingston` and triggers its configured hosting build. The checkout must be clean and already at the selected revision. See [deployment](docs/deployment.md) for prerequisites and rollback.
