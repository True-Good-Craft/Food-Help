# Static deployment and change control

The application artifact is `dist/`. Building is local and does not create a hosting project, push a repository, change DNS or contact Cloudflare. Deploy to a dedicated root HTTPS origin. No Cloudflare runtime service is required.

Before production, review all public facts, data rights, contacts, operator statement, optional analytics policy, source-code availability and canonical origin. Set `example_content: false` only after replacing the fictional dataset. Enable indexing explicitly if appropriate. Run `npm run check`, then `npm run build -- --production`. Review `artifacts/reports/{deployment_id}.json` and retain the complete artifact for rollback.

## Host requirements

- Serve normal directory index files and a real `404.html`; do not rewrite all resource paths to the application root.
- Preserve exact built bytes. Disable host HTML rewriting, script injection, automatic analytics and post-build minification: worker installation verifies content digests.
- Apply the generated security policy and correct MIME types. Revalidate HTML, manifest and worker; public JSON is `no-store`, public CORS `*` without credentials. Hashed assets can be cached immutably if the host is configured accordingly.
- Serve the worker as JavaScript at `/service-worker.js` with root scope and no stale CDN override. Keep data and all application files from the same complete release when deploying or rolling back.
- Check the actual HTTP response for canonical metadata, CSP, noindex status, MIME types, manifest, data and resource 404 behaviour. A file named `_headers` does nothing on a host that does not understand it.

`dist/_headers` and `_redirects` are convenient declarative adapters for hosts that support that syntax. The structured local build report provides the same exact per-route policies for other hosts. The CSP for each HTML route contains hashes for its generated inline JSON-LD, and the download’s embedded stylesheet; do not replace it with `unsafe-inline`. Do not concatenate a second restrictive CSP that silently blocks those hashes. `scripts/serve.ts` exercises the generated declarations locally.

## Hosting options

Cloudflare Pages is the primary later manual proof path: create or select an authorized static Pages project, upload the whole artifact, verify the temporary origin as noindex, and attach the approved custom hostname/DNS only after authorization. Avoid automatic script injection and conflicting Pages Functions. Check the host’s current `_headers` limits against the generated file, especially as resource counts grow; do not silently truncate policies. No Cloudflare account is accessed by Food Help’s setup/check/build commands.

Netlify can use the supplied declarations, subject to its current rule semantics. For nginx or Apache, translate the build report’s exact route policies into reviewed server configuration and use ordinary directory indexes and a real 404. For object/static hosting, set content types, response headers and index/error handling through that provider’s configuration. GitHub Pages can serve root-origin static content on a compatible custom domain or user/organization site, but it cannot supply all baseline response headers natively; use an explicitly configured header-capable front end or accept that it does not satisfy the strict-header production acceptance criterion. Repository subpath Pages hosting is outside v1.

Do not claim provider-neutral files mean every host has identical security capabilities. The application is portable; host policy remains a deployment obligation.

## Approval and later automation

Local mechanical generation and testing follow approved implementation scope. Provider publication decisions, changing public data rights/analytics policy, external publishing, GitHub creation/push, production deploys, DNS, hostnames and redirects require the operator’s applicable explicit approval. Passing tests is evidence for review, not authorization to act externally.

After the generic artifact is manually proven on an approved host, optional Cloudflare automation may reconcile desired state: find/create the named project, upload an approved artifact, attach a hostname, create or verify authorized DNS, verify HTTPS and run post-deployment smoke tests. It must read current state first, produce a reviewable diff, avoid unrelated records/projects, and record the artifact identity. Tokens remain outside repository files. This automation is deliberately not implemented in v1.

The later Kingston proof supplies the real verified dataset and deployment configuration, reuses the visual assets, and optionally enables its approved analytics boundary. Production verification must precede any permanent old-domain path-preserving redirect. There are no existing installed PWA copies requiring a complex migration, so a separate installed-app migration layer is unnecessary.
