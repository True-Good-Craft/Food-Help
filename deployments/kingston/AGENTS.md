# Kingston deployment instructions

This directory defines the Kingston, Ontario deployment at https://kingston.food-help.ca.

Only publish resource facts that have completed human review. Preserve each source URL, checked date, verification state, qualification and unresolved uncertainty. A published schedule describes reviewed information and never establishes live availability.

Changes to resource facts, analytics policy, public usage data, the canonical domain, production hosting, DNS or redirects require the operator's explicit approval. Keep private correspondence, internal operational records, deployment receipts and submitter details outside this public repository.

Kingston requirements belong in `deployments/kingston/`. Never add Kingston-specific behaviour to generic platform source. Run `npm run check -- --site deployments/kingston` before release. A release selects Kingston explicitly; neither another community's publication nor a shared-source merge is a Kingston release approval.

The public operator is True Good Craft; Jamie Whelan is the operator's review owner for the current listings. The existing 2026-09-04 source-review dates and 30-day interval make the next review due 2026-10-04. These are carried-forward review dates, not new verification during migration. Follow `REVIEW.md`; unresolved hours and access details must remain visible until reviewed evidence resolves them.

No separate open-data licence is asserted for this dataset. Preserve source attribution and the configured rights statement until the operator establishes and approves a material-specific grant. Software MPL licensing does not supply provider or 211 data rights.
