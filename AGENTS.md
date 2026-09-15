# Food Help agent instructions

Inspection and planning are read-only until implementation is explicitly authorized. Work within the user's approved scope. Approval of implementation does not authorize Git initialization, GitHub writes, publication, deployment, DNS or account changes.

## Authority

- The selected `deployments/<community>/site.json` defines that deployment; its `resources.json` holds authoritative reviewed resource facts. `examples/exampleville/` is a fictional starter, not a real deployment.
- `schemas/` plus shared semantic validation define the contract. `src/` is generic application behaviour.
- `.generated/`, `artifacts/` and `dist/` are disposable output. Never maintain generated projections manually.
- Read the selected deployment's `AGENTS.md` for narrower rules. Independently configured `--site` folders may supply the same file. Keep private review material outside public source.

Never fix a deployment-specific requirement by adding community-specific logic to generic platform code.

## Information and privacy

- Never invent, scrape-and-publish, or auto-approve resource facts. Automated findings and contributions are review leads.
- Preserve evidence, source dates, qualifications and explicit unknowns. Schedule-derived status is not live availability.
- No accounts, backend, cookies, identifiers, fingerprinting, replay or externally hosted assets.
- Search/filter/provider identity and visitor location must never enter analytics. Location is voluntary and in memory only.
- Analytics is disabled unless explicitly configured and approved. Never queue or retry collection, including in a worker.
- Public usage accepts only sanitized deployment aggregates; it must not enable collection.

## Engineering and handoff

- Use locked, justified development dependencies and no runtime package dependencies. Review dependency changes.
- Preserve keyboard access, readable contrast, native controls, print and no-JavaScript access.
- Run `npm run check -- --site <folder>` for the affected deployment and `npm run check -- --all` for shared changes. Worker changes require first visit, offline cold restart, update, failed install, rollback and stale-cache cleanup evidence.
- Keep shared development on `main`; releases explicitly select one community and exact source revision. Adding a folder or merging shared code must not publish communities automatically. Retain the previous complete artifact and source availability for per-community rollback.
- Before consequential changes, report exact scope, visible/data/privacy/cache effects, tests and unresolved risks, artifact identity, and whether external publication would occur.
- Do not infer external authorization from credentials, prior unrelated work or passing tests.
