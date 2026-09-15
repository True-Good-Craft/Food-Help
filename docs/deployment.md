# Static deployment and change control

The application artifact is the selected `dist/<deployment_id>/` folder. Building is local and does not create a hosting project, push a repository, change DNS or contact Cloudflare. Deploy to a dedicated root HTTPS origin. No Cloudflare runtime service is required by the directory application.

## Food Help project site

The root `https://food-help.ca/` project site is an independent target, not a community directory. Its source is `project-site/`, its output is `dist/project/`, and its release pointer is `release/project`. Build and check it locally with:

```sh
npm run project:check
npm run project:build
npm run project:preview
```

The normal build is a noindex review artifact. Production requires corresponding source for the exact revision:

```sh
npm run project:build -- --production --source-revision <full-commit-sha>
npm run project:release -- --ref <commit-or-tag>
```

After review and separate publication authorization, adding `--publish` to `project:release` advances only `release/project` using the same lease-protected release-plan policy as community releases. A dedicated root hosting project should watch only that branch, run `npm run project:build -- --production`, publish `dist/project`, and provide `CF_PAGES_COMMIT_SHA`. It must not watch `release/kingston`, build a `deployments/` folder, or combine root and community outputs. Retain the previous complete root artifact, source revision and hosting release identifier for rollback.

Before the first release, an authorized operator must create or select that distinct static hosting project, attach only the approved `food-help.ca` hostname, disable host-injected analytics/scripts/HTML rewriting, and verify the generated headers, canonical, 404 and sitemap on the actual origin. Preview and provider-generated aliases must remain noindex. The generated project artifact has no client JavaScript, service worker or analytics integration.

The intended redirect posture is one hop with path and query preserved:

- `http://food-help.ca/*` → `https://food-help.ca/*`;
- `http://www.food-help.ca/*` and `https://www.food-help.ca/*` → `https://food-help.ca/*`.

These redirects require the relevant DNS, certificate and hosting configuration and are not made by the repository build. Inspect current zone/project state before applying them; do not change mail or unrelated TGC records.

### Search Console and sitemap submission

Use one Google Search Console **Domain property** for `food-help.ca` so the root and current/future subdomains are covered for ownership. An authorized account owner must add the property and publish Google's supplied DNS TXT verification record. That external verification is distinct from having valid metadata in the build.

After the root and Kingston production origins are live and verified, submit both sitemaps separately within that property:

- `https://food-help.ca/sitemap.xml`
- `https://kingston.food-help.ca/sitemap.xml`

The root sitemap intentionally contains only root-site pages. Each community retains its own canonical URLs, robots policy and sitemap; do not canonicalize or copy subdomain pages into the root sitemap. Search Console verification and sitemap acceptance still do not guarantee crawling or indexing. Record actual submission responses, inspect representative canonical/indexing reports after discovery, and keep previews, fictional examples and provider aliases noindex.

Before production, review public facts, data rights, contacts, operator statement, optional analytics policy, source availability and canonical origin. Set `example_content: false` only after replacing the fictional dataset. Enable indexing explicitly if appropriate. For Kingston:

```sh
npm run check -- --site deployments/kingston
npm run build -- --site deployments/kingston --production --source-revision <full-commit-sha>
```

Use the exact checked-out revision, not an unrelated SHA. `FOOD_HELP_SOURCE_REVISION` or Cloudflare's `CF_PAGES_COMMIT_SHA` may supply it. A production build uses the configured source repository plus that revision, or an explicit `--source-url` for the corresponding covered source on another host/archive. Verify that recipients can obtain it. See [licensing](licensing.md).

The build prints a report path below `artifacts/reports/<deployment_id>/`, keyed by output location. Retain its identities and the complete artifact for rollback before replacing a release. `check` builds into isolated `artifacts/check/` outputs rather than overwriting production `dist/`. Optional `--out` selects a permitted isolated build location; never combine communities into one web root.

## Host requirements

- Serve normal directory index files and a real `404.html`; do not rewrite all resource paths to the application root.
- Preserve exact built bytes. Disable host HTML rewriting, script injection, automatic analytics and post-build minification: worker installation verifies content digests.
- Apply the generated security policy and correct MIME types. Revalidate HTML, manifest and worker; public JSON is `no-store`, public CORS `*` without credentials. Hashed assets can be cached immutably if the host is configured accordingly.
- Serve the worker as JavaScript at `/service-worker.js` with root scope and no stale CDN override. Keep data and all application files from the same complete release when deploying or rolling back.
- Check the actual HTTP response for canonical metadata, CSP, noindex status, MIME types, manifest, data and resource 404 behaviour. A file named `_headers` does nothing on a host that does not understand it.

The selected artifact's `_headers` and `_redirects` are declarative adapters for hosts that support that syntax. The structured local build report provides the same exact per-route policies for other hosts. The CSP for HTML contains hashes for generated inline JSON-LD and the download's embedded stylesheet; do not replace it with `unsafe-inline`. Do not concatenate another CSP that silently blocks those hashes. `scripts/serve.ts` exercises generated declarations locally; actual production responses still require separate verification.

The Pages adapter in `scripts/lib/headers.ts` emits one common CSP and adds `noindex` for both project and version/branch `pages.dev` aliases. It validates the emitted file against the documented 100-rule and 2,000-character-per-line limits, including indentation and header names. Script and style hashes are kept separate to avoid needless policy growth. A capacity failure requires a reviewed host-adapter change; it must never be worked around by dropping resources or truncating CSP. These limits and hostname patterns belong to the host adapter, not the resource schema or browser application. See [Cloudflare's header syntax and limits](https://developers.cloudflare.com/pages/configuration/headers/).

## Hosting options

Cloudflare Pages is the primary documented host. Select an authorized static project, use one community's explicit build command/output, and verify the approved custom hostname and actual response policies. Suppress preview collection and indexing; do not expose an indexable production artifact on a competing preview origin. Avoid automatic script injection and conflicting Pages Functions. Check the host's current `_headers` limits as resource counts grow; do not silently truncate policies. No Cloudflare account is accessed by setup/check/build.

Netlify can use the supplied declarations, subject to its current rule semantics. For nginx or Apache, translate the build report’s exact route policies into reviewed server configuration and use ordinary directory indexes and a real 404. For object/static hosting, set content types, response headers and index/error handling through that provider’s configuration. GitHub Pages can serve root-origin static content on a compatible custom domain or user/organization site, but it cannot supply all baseline response headers natively; use an explicitly configured header-capable front end or accept that it does not satisfy the strict-header production acceptance criterion. Repository subpath Pages hosting is outside v1.

Do not claim provider-neutral files mean every host has identical security capabilities. The application is portable; host policy remains a deployment obligation.

## Independent release arrangement

`main` contains shared source and community folders. Each participating hosting project follows only its own explicit `release/<community>` pointer to a reviewed exact commit, with a fixed `--site deployments/<community>` build command and `dist/<deployment_id>` output. Release pointers are not forks for application development. Disable automatic builds from ordinary development branches and unrelated preview branches before merging shared changes into a Git-connected repository.

Validation workflows can discover configured communities. A release must name one community and one exact revision; it must not iterate over all folders. Editing Kingston data, adding a folder, or merging shared software does not authorize or trigger another community's release. Hosting setup and custom hostname creation remain separate explicit operations.

For the consolidation, retain historical `kingston` and the previous complete artifact until the replacement arrangement is deployed and production-verified. Then retire `kingston` as the active release branch without deleting its history. Record actual hosting state and deployed artifact identity in the private release evidence; this operating document is not a receipt asserting an unperformed transition.

The release command requires a clean checkout at the specified commit or tag. Preserve any local work before switching revisions. The target must be a direct `deployments/<community>` folder with matching deployment ID and real, reviewed data.

```sh
npm run release -- --site deployments/kingston --ref <commit-or-tag>
```

This runs selected-community checks and a production build, reads the existing remote release pointer, and writes an ignored local release plan under `artifacts/releases/`. It does not publish. Review the printed target, source commit, artifact/report identity and prior release. With applicable publication authorization:

```sh
npm run release -- --site deployments/kingston --ref <commit-or-tag> --publish
```

`--publish` pushes only the selected `release/kingston` pointer using `--force-with-lease`, refusing to overwrite an unexpected remote change. An already matching pointer is a no-op. It does not create a hosting project, configure another community, change DNS or perform a Git merge. The relevant existing Pages project must watch `release/kingston`, run `npm run build -- --site deployments/kingston --production`, and publish `dist/kingston`. The build host supplies `CF_PAGES_COMMIT_SHA` so the generated source link identifies the deployed commit. Verify the resulting host revision and production responses; the push is not proof of successful deployment.

## Rollback

Retain one recoverable complete artifact, exact source revision, selected configuration and hosting release identifier per community. Reactivating that community's previous immutable Pages deployment is the fastest recovery when available. Alternatively, preserve local work, check out the former shared-source commit/tag, and run the explicit release command for that target/revision again. Pre-consolidation commits do not contain the new CLI or folder layout; use the retained hosting deployment/artifact for those. Never mix files from separate releases. Keep old covered source available for recipients.

After rollback, verify actual hashes/headers, HTML, public JSON and offline installation. Existing workers detect the restored release as a controlled update; users may need to accept it. Other communities stay on their own approved releases. A domain redirect is a separate rollback concern: browser-cached permanent redirects cannot be instantly recalled.

## Approval and hosting changes

Local mechanical generation and testing follow approved implementation scope. Provider publication decisions, changing public data rights/analytics policy, external publishing, GitHub creation/push, production deploys, DNS, hostnames and redirects require the operator’s applicable explicit approval. Passing tests is evidence for review, not authorization to act externally.

Authorized hosting changes reconcile current state with a named project's desired state. Read the existing settings, report the intended effect, touch only the selected project/hostname, and retain recovery information. Use the narrowest supported rule scope for disabling HTML rewriting, host-managed crawler changes and unwanted analytics injection. Email-obfuscation code is a transformation, not itself analytics; identify scripts before reporting collection. Avoid unrelated zone policies, DNS/mail records and TGC services. Keep tokens and receipts outside repository files.

## Legacy website transition

Production verification of the new origin must precede permanent website redirects. Map legacy `/directory` and `/directory.html` to `/directory/`, preserve query strings, and verify applicable HTTP/HTTPS and `www` entry points. Other old links need useful equivalent destinations with no loops or avoidable chains. Retain the old domain and HTTPS and a recoverable legacy release.

Inspect machine endpoints separately: the two projects' `/data/v1/resources.json` formats differ. Do not redirect the old contract to an incompatible schema while claiming continuity. Inspect existing browser worker registrations even when no one clicked a home-screen install. Give legacy worker, manifest, data and asset routes an explicit compatibility/retirement treatment; preserve old machine data where that is the approved smallest solution. Record the implemented rules and tested exceptions in the transition handoff. A general migration backend is unnecessary.

For local and actual-origin checks, including phone procedures and analytics evidence, see [verification](verification.md). Do not call a migration complete on the strength of a successful hosting build or homepage screenshot.

The [legacy transition helper](legacy-transition.md) prepares a separate static compatibility artifact and retirement worker from an inspected baseline. It does not enable the permanent host redirect; publication remains conditional on the new production verification.
