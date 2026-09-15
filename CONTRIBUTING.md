# Contributing

Read `AGENTS.md` and the selected `deployments/<community>/AGENTS.md`. Changes to platform behaviour belong in generic source; community facts and choices belong in that deployment folder. Never solve a community requirement with a locality branch in application code.

Use the supported Node version, `npm ci`, and install Playwright browsers. Run `npm run project:check` for a root project-site change, `npm run check -- --site deployments/<community>` for a local directory change, or `npm run check -- --all` for shared software before requesting review. Explain the problem, resulting behaviour, verification and any effects on public data, privacy, caches or deployment. Keep dependencies minimal; development-only tools still need a reason and a lockfile change. Validation does not deploy; publishing selects the project site or one community and an exact source revision.

Provider suggestions are review leads. Supply source links, what was checked and when, uncertainties and the proposed fact change. Do not submit private correspondence, personal contact details or credentials. A maintainer/operator must approve facts before publication. Automated checks never make that editorial decision.

Test changes through the Exampleville and second-community fixtures. Worker changes require the full offline/update/rollback suite. New UI copy belongs in the copy pack. New categories or schema meanings require a version/migration decision, not an unannounced enum expansion in an operator file.

Contributions use the applicable existing software/documentation licence, MPL-2.0. Submit only material you have the right to contribute, retain upstream notices, and identify copied material and its licence. Dataset contributions require separately stated rights and factual review; a public source link alone does not authorize relicensing. You retain your copyright. No CLA or copyright transfer is required; maintainers cannot promise alternative licensing of every contribution without the relevant rights. See [licensing](docs/licensing.md).

Keep review proportionate. A focused pull request and passing evidence are preferable to additional process files. Never place credentials, internal hosting receipts or private provider correspondence in a pull request or public repository.
