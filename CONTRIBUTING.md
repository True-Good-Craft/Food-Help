# Contributing

Read `AGENTS.md` and `site/AGENTS.md`. Changes to platform behaviour belong in generic source; community facts and choices belong in `site/`. Never solve a community requirement with a locality branch in application code.

Use the supported Node version, `npm ci`, and install Playwright browsers. Run `npm run check` before requesting review. Explain the problem, resulting behaviour, verification and any effects on public data, privacy, caches or deployment. Keep dependencies minimal; development-only tools still need a reason and a lockfile change.

Provider suggestions are review leads. Supply source links, what was checked and when, uncertainties and the proposed fact change. Do not submit private correspondence, personal contact details or credentials. A maintainer/operator must approve facts before publication. Automated checks never make that editorial decision.

Test changes through the Exampleville and second-community fixtures. Worker changes require the full offline/update/rollback suite. New UI copy belongs in the copy pack. New categories or schema meanings require a version/migration decision, not an unannounced enum expansion in an operator file.

Contributions use the applicable existing software/documentation licence; dataset contributions require a separately stated right to redistribute. Keep review proportionate. A focused pull request and passing evidence are preferable to additional process files.
