# Architecture and offline behaviour

Food Help produces one static community artifact per selected configuration. There is no tenant router, server API, database, account system or admin portal. `deployments/<community>/` contains that community's authority; `schemas/` and shared semantic validation define the contract. `src/`, `schemas/` and `scripts/` are shared on `main`. Generated files are never authoring authority.

Setup requires an explicit `--site` folder. Development, build and preview select the same folder, with `examples/exampleville/` as the neutral default when omitted. `check --all` may discover community folders for validation; publication never discovers targets implicitly. Each community release chooses an exact shared-source revision and can retain its prior artifact while another advances.

## Build order

`scripts/build.ts` owns the pipeline; `scripts/lib/web.ts` renders the related web/discovery surfaces together.

1. Generate TypeScript declarations and self-contained Ajv validators from the two schemas into `.generated/`. These validators are also bundled into the browser, so an untrusted network response receives the same structural and semantic checks.
2. Read and validate source configuration, data, optional branding and optional local aggregates. Reject generated-only fields in source, bad identities/references, contradictory schedules and incomplete evidence relationships.
3. Filter published, non-closed resources and referenced organizations once. Calculate dataset and configuration-compatibility digests. Supply the selected runtime configuration to that build without a shared community-specific generated module.
4. Bundle generic TypeScript/CSS with Vite. Copy/hash reviewed local assets, preserve the font licence, and generate a small branding stylesheet.
5. Generate static pages from the public projection, then the portable HTML download, public JSON, manifest, actual indexable sitemap, robots and machine-discovery document. Public metadata uses the configured canonical origin even in previews.
6. Hash the complete cacheable application surface and worker source. Generate the worker with that release identity, exact cache entries and route map. Current data is deliberately outside the application precache. Crawler-only metadata is also outside installation; it is generated and verified independently and is not needed for offline browsing.
7. Generate host header/redirect declarations and an ignored handoff report below `artifacts/reports/{deployment_id}/`, keyed by output path. It contains output hashes, routes, public resource count, dataset identity, security policies and release identity. The build prints the exact report path.

The report is for this local build, not a historical public dataset snapshot. Keep a whole approved artifact privately for deployment rollback. Default output is `dist/{deployment_id}/`; an explicit `--out` must be an approved output location. Different communities must use unique deployment IDs and separate output locations. `dist/`, `.generated/`, `artifacts/`, browser profiles and reports are ignored by Git. The pipeline never empties source community folders. Shared schema declarations are generic; checks serialize shared generation rather than letting concurrent checks rewrite it unpredictably.

Source text copied or embedded in output is normalized to LF before hashing, including worker source, SVG branding, standalone CSS and licence/notice text. Font and icon binary bytes remain unchanged. A contract test builds isolated fictional source trees with LF and CRLF endings and compares every output file hash, so Windows checkout settings cannot silently change the deployable artifact.

## Offline lifecycle

The first connected page view shows complete static HTML immediately. JavaScript fetches the current public JSON with a bounded 3.5-second deadline. It validates all fields and semantic relationships, checks deployment/configuration compatibility and retains only a valid public dataset. Cache operations have bounded waits; failed or blocked storage cannot block browsing.

On network failure or an invalid response, the loader validates the retained last-good data again. If none is usable, the useful static page remains visible and dynamic filters remain hidden. No corrupt response overwrites last-good data. Online data may refresh independently of the app shell; this is why it must maintain its own compatibility discriminator. Configuration changes affecting timezone, jurisdiction, review rules or dataset identity change that discriminator.

The native worker fetches and verifies the digest of every application asset and static page before its installation succeeds. A partial/changed deployment fails installation and deletes the partial cache. The old release continues to work. Browser HTTP caches are revalidated during installation; hosts must serve the exact built bytes and avoid HTML rewriting/minification after build.

First installation activates normally. Later workers wait and display an update button; activation reloads each controlled tab once. The new worker deletes only this deployment’s superseded app caches and incompatible data caches, leaving unrelated applications alone. All pages belong to one complete app release. Unknown routes go to the network and receive an actual host 404, rather than an SPA catch-all.

Offline navigation uses the cached root, resource pages, methodology and simple directory. Search/filtering uses retained validated data; visiting any enhanced page initializes data retention. Reconnection requests current data. Neither the worker nor analytics queues external events. Cache names begin `food-help-{deployment_id}-` and never contain a reference locality by convention.

Rollback means serving the previous complete artifact for one selected community, including its worker and JSON. Its worker becomes a waiting update and follows the same explicit activation path. A compatible last-good dataset remains usable; incompatible data falls back to the artifact's static content until connected validation succeeds. A domain transition separately accounts for workers already registered on the legacy origin; absence of home-screen installs is not evidence that no worker exists.

Browser eviction, unavailable storage, private browsing restrictions and device-specific installed-app lifecycle policies remain practical limits. A self-contained HTML download is an independent offline copy. A newly downloaded directory is still a dated publication, never a live feed.

## Discovery and privacy

Every useful published resource gets one stable, crawlable HTML URL. It has a title, description, canonical, Open Graph data, visible evidence, internal links and conservative `Service`/`WebPage` JSON-LD. JSON-LD repeats supported visible facts and does not advertise live hours, inventory, ratings or invented accessibility. There are no generated thin category/locality SEO pages.

Only actual indexable pages enter the sitemap. Simple duplicates, downloads, usage and 404 pages are noindex. Preview builds default to noindex at both HTML and response-header levels. Robots allows crawling so crawlers can discover those noindex directives; `Disallow: /` would prevent that. Preview noindex is not confidentiality or access control. `llms.txt` points to the canonical directory, current JSON, methodology and data rights and explicitly warns about schedule uncertainty; it is a discovery hint, not an enforceable AI-use policy.

The default CSP has no third-party connection origins. Enabling the explicit analytics capability adds only its endpoint origin to `connect-src`; location permission is generated separately. External provider/directions links transmit information only when a person follows them. Browser tests block unintended outbound test traffic. Hosting providers can still log requests independently of this application.

`software_source_url` and the exact release revision make the deployed covered source discoverable. Browser source availability, dataset rights and font licensing are separate generated notices. A folder move does not change Food Help data v1 or imply implemented HSDS conformance; see [interoperability](interoperability.md).
