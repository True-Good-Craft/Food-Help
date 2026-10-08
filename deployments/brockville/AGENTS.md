# Brockville deployment instructions

This directory defines the Brockville, Ontario deployment. The intended origin is https://brockville.food-help.ca; the deployment is not live yet and `indexing` stays disabled until the operator approves a launch.

Only publish resource facts that have completed human review. Preserve each source URL, checked date, verification state, qualification and unresolved uncertainty. A published schedule describes reviewed information and never establishes live availability.

The first dataset (2026-10-08) is a scraped MVP built from public sources, following the same model as the first Kingston version: publish from primary sources where possible, keep conflicts visible, and rely on provider and partner corrections to amend. Every record is `partially_confirmed` until a provider confirms it directly. The key regional source is the FoodcoreLGL Brockville community meal calendar (September–December 2026 edition when first reviewed); when a new edition appears, re-check every church meal date against it.

Changes to resource facts, analytics policy, public usage data, the canonical domain, production hosting, DNS or redirects require the operator's explicit approval. Analytics and indexing stay disabled until the operator explicitly enables them. Keep private correspondence, internal operational records, deployment receipts and submitter details outside this public repository.

Brockville requirements belong in `deployments/brockville/`. Never add Brockville-specific behaviour to generic platform source. Run `npm run check -- --site deployments/brockville` before release. A release selects Brockville explicitly; neither another community's publication nor a shared-source merge is a Brockville release approval.

The public operator is True Good Craft; Jamie Whelan is the operator's review owner for the current listings. All records carry a 2026-10-08 review date and a 30-day interval, making the next review due 2026-11-07. Follow `REVIEW.md`; unresolved hours and access details must remain visible until reviewed evidence resolves them.

Do not list the Brockville Cooperative Care Centre: it closed in late 2025 even though some older resource pages still mention it.

No separate open-data licence is asserted for this dataset. Preserve source attribution and the configured rights statement until the operator establishes and approves a material-specific grant. Software MPL licensing does not supply provider or 211 data rights.
