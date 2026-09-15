# Maintaining a community

Configuration and facts belong in the folder selected by `--site`. For Kingston this is `deployments/kingston/`; independent operators can use their own folder. Generic source must not acquire community-specific branches or hardcoded locality values.

## Maintain the project homepage and community list

Root-site copy and integration choices live in `project-site/site.json`. Available community names, coverage and canonical directory URLs live only in `project-site/communities.json`; do not duplicate provider records or add fictional/coming-soon communities. Keep an ordinary HTTPS link from the root to each local directory, and set that directory's optional `project_home_url` when it should link back.

Adding a community requires two separately reviewed publication decisions: first publish and verify the community directory at its canonical origin, then add its record to `project-site/communities.json` and release the root site. Confirm the community's own sitemap and indexing configuration independently; the root sitemap does not include subdomain pages. Run `npm run project:check` for root-only work and `npm run check -- --all` when shared community rendering or contracts also change.

## Add or correct a food programme

1. Read the selected folder's `AGENTS.md` and review ownership instructions. Check the provider's current official sources and any supporting evidence. Treat submissions and automated findings as leads requiring human review.
2. Edit `resources.json`. For a new programme, use a stable unused resource ID and the appropriate organization ID; preserve IDs when renaming an existing service. Use a draft until facts are reviewed. Record category, food-access purpose, resolved cost classification, practical access, eligibility, limitations, schedules, explicit unknowns and evidence. See [data authoring](data.md).
3. Record actual source-check and verification dates. A migration or software release is not a new verification. Keep the date chronology valid, retain unresolved qualifications, and use a temporary notice when a consequential change is supported. Do not substitute office hours for food-service hours.
4. Review the right to publish contributed descriptions and any imported material. Keep private correspondence and permission receipts outside the repository; publish only appropriate evidence notes and rights statements.
5. Run `npm run check -- --site deployments/kingston` (substitute your folder). Build and preview the same selection. Inspect the affected card, static resource page, simple/print directory, download and JSON. Review practical wording with JavaScript disabled as well.
6. Have the operator approve publication of the reviewed facts. Commit the source changes, then explicitly release that community and revision using [deployment](deployment.md). A commit, a successful check or another community's release does not publish the change.

When one provider runs several physical locations, create one organization and one resource per venue. Reuse the organization ID, but give every venue a stable resource ID, address, schedule, practical guidance and evidence. Put repeated sessions at the same venue in one weekly or dated schedule; do not merge different venues into one card.

To inspect draft records without putting them in the public projection, run `npm run dev -- --site deployments/kingston --review-drafts` (substitute the selected folder). A review build defaults below `artifacts/reviews/<deployment_id>/`, visibly labels drafts, and cannot be combined with production. It uses a review-only data route, disables persistent offline installation, and sends noindex/no-store policy. This is a local editorial aid, not publication approval. Normal builds continue to exclude drafts.

Use `withdrawn` or `closed` according to the documented distinction when a service leaves the public directory. Generated pages are removed and unknown routes return a genuine 404. Offline/downloaded copies cannot be reliably recalled; issue a corrected release promptly and keep uncertainty visible.

For Kingston, [the current review checklist](../deployments/kingston/REVIEW.md) identifies the owner, carried-forward dates and unresolved questions. The review interval in configuration drives overdue warnings; it is not an automatic re-verification or publication schedule.

## Prepare a new community

```sh
npm ci
npm run setup -- --site deployments/my-community
npm run check -- --site deployments/my-community
npm run dev -- --site deployments/my-community
```

Setup starts from Exampleville. Choose a unique deployment ID and dataset UUID, an intended canonical origin, local timezone/locale, operator and public correction contact. Replace example contacts and records with reviewed local data; do not copy Kingston's facts as a starter. Set optional help numbers, jurisdiction warnings, branding and presentation from reviewed community choices. Keep analytics disabled unless its distinct policy and adapter have been approved. Replace names/assets where needed without implying TGC or another community endorses the deployment.

Create a concise local `AGENTS.md` with operator publication rules. Document review ownership and a review deadline derived from actual source dates. Establish the dataset's rights statement. Clear `example_content` only after fictional content has been replaced; enable indexing separately when production publication is appropriate.

Adding the folder creates no public site, DNS record or analytics integration. The production artifact is independent and must be explicitly selected. A synthetic second community is enough to test separation; it is not necessary to create another real public deployment.

## Build and inspect one artifact

```sh
npm run build -- --site deployments/my-community
npm run preview -- --site deployments/my-community
```

The default output is `dist/<deployment_id>/`. Preview uses that same folder; do not serve all of `dist/` as one website. A build prints the exact report path. Keep source revision, artifact identity, dataset identity, capability policy and test evidence together in a private release record. See [verification](verification.md) before a production release.

Use different origins/ports or fresh browser profiles when switching communities locally. Browser storage is origin-scoped in addition to deployment-prefixed cache names. A previously controlled local origin can otherwise show its previous worker until an update is accepted.

## Upgrade shared software without publishing everyone

Shared changes go through review on `main` and `npm run check -- --all`. Each operator chooses when to move their community's release pointer to an exact passing source commit. Do not automatically move other communities when one advances. Avoid maintaining divergent application code on community branches; put local choices in their folder and keep release branches as pointers to reviewed shared-source revisions.

Before each release, preserve the previous complete artifact and source commit. Rollback selects that community's previous complete release, including its worker and dataset; never mix old HTML with new assets. Test and verify the rollback at the deployed origin. It does not rewind another community. Keep the covered source of distributed older releases available.

Dependency changes require justification, a reviewed lockfile change and the applicable browser/offline checks. Schema or wire-contract changes require an explicit version/migration decision. The documented HSDS mapping is not a shipping exporter and must not be presented as formal interoperability.
