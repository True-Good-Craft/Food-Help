# Reviewed resource data

The selected deployment's `resources.json` is authoritative (for Kingston, `deployments/kingston/resources.json`). Generated `/data/v1/resources.json` must never be edited. Food Help's `format: "food-help"`, `schema_version: 1` distinguishes it from other projects' version numbering. Moving a dataset between source folders does not change this contract.

The dataset has a stable UUID `dataset_id`, `content_language`, `taxonomy_version: 1`, organizations and resources. Organizations have stable slug IDs, names and optional descriptions, official URLs and content language. A resource references `organization_id`; locations are inline to keep small-directory authoring manageable. Preserve IDs through name changes. Do not recycle withdrawn IDs for unrelated services. V1 URLs use the stable resource ID directly.

One organization can operate several resources. Give each distinct physical venue its own resource ID, inline location and applicable schedule while reusing the organization ID. Keep repeated sessions at one venue in that resource's schedule unless they are genuinely different services. This preserves one provider identity without merging addresses or hours.

Use the example as a shape guide. Replace it with reviewed facts and a new dataset UUID. Empty arrays are allowed for an initially empty directory. Never publish synthetic contacts, coordinates or fictional records under a real community’s identity.

## Taxonomy and scope

The fixed v1 categories are `prepared_meals`, `food_banks_pantries`, `groceries`, `community_fridges`, `community_markets`, `community_gardens`, `food_delivery`, `food_access_support`, and `other_food_access`. A service can have several categories. `cost` independently describes free, low-cost, subsidized, mixed or unknown pricing, with useful public wording.

Top-level browsing derives from reviewed cost instead of changing category meanings: `free` appears under **Emergency food**; `low_cost` and `subsidized` appear under **Affordable food**; and `mixed` appears in both views without duplicating the resource or its stable URL. Missing or `unknown` cost is unresolved. A published, non-closed resource must have a resolved cost and evidence supporting `cost`; keep an unresolved candidate in draft. Category filters continue to describe what the service offers within either view. This uses existing v1 cost values, so it adds neither a grouping field nor a category-taxonomy version.

Every resource needs an evidence-supported `food_access_purpose`. Ordinary commercial retail does not qualify merely because it sells food. A retailer’s independently reviewed subsidized programme may qualify as a service. This is a human editorial decision; a validator cannot prove public benefit.

## Facts and uncertainty

Each resource carries name, summary, category, food-access purpose, eligibility, limitations, before-you-go guidance, evidence, verification, publication status, service condition and updated date. Optional facts include address/coordinates, service area, phone/extension, official URL, timezone, service languages, cost and temporary notices. `content_language` describes the text; `service_languages` describes service provision, not translations.

Access rules are exactly `yes`, `no`, or `unknown` for walk-ins, appointments, registration and identification. Known access rules need supporting evidence. An empty guidance list means unspecified, not “no restrictions.” Do not infer eligibility or identification requirements from missing information.

Keep these states separate:

- `publication_status`: `draft`, `published`, `withdrawn` (editorial decision).
- `service_condition`: `active`, `temporarily_changed`, `temporarily_unavailable`, `closed` (service condition).
- `verification.state`: `confirmed`, `partially_confirmed`, `needs_review` (review confidence).

Only published, non-closed records enter public JSON, HTML or discovery output. Temporarily unavailable services remain useful published pages with clear wording. Closed and withdrawn records do not become hidden historical public snapshots; preserve private operator records outside this repository if necessary. Removing a service creates a real 404, not a misleading directory redirect.

## Schedules and evidence

Schedule kind is weekly, dated, by-arrangement or unknown. Weekly weekdays use ISO 1=Monday through 7=Sunday. Each day is published, closed or unknown; a missing day is unknown. Intervals use local `HH:MM`, an exclusive closing time and explicit `closes_next_day` for overnight service. Optional valid date ranges, explicit date exceptions, confirmation and evidence references are preserved. Represent a dated event with its actual date and intervals in `exceptions`; a validity range alone does not establish that the service is scheduled on a particular day. A confirmed empty exception means closed for that whole date and overrides overnight carry-in. Unconfirmed exceptions remain unknown. Never infer live availability, stock or guaranteed access.

Evidence has a stable ID, source kind, checked date, public note, supported field paths and a source URL (direct confirmation may omit a URL). Describe direct-confirmation provenance accurately—for example, provider information relayed by the review owner is not an interview performed by an automated agent. Keep private names, correspondence and personal details out of public evidence notes. Verification records give the review date, method and state. Evidence review dates cannot be after verification, and verification cannot be after the resource’s updated date. Referenced sources must exist. Automation validates these relationships; it does not validate the truth of claims or automatically contact providers.

Temporary notices include text, start/end dates and evidence references. Dates remain visible in static/offline copies, including notices that have since expired. Do not silently portray an old notice as a current alert. Correct and rebuild when facts change. A public copy can remain in a visitor’s offline storage after withdrawal; removing it from the server cannot erase downloaded copies.

Generated public fields are `deployment_id`, `dataset_version` (content digest), `compatibility_id` (deployment/configuration compatibility digest) and `data_updated_on` (latest published resource update). They are forbidden in source. Unreferenced organizations and unpublished resources never enter the public projection. The public dataset carries evidence; it is not an assertion of live availability. V1 limits its serialized size to 5 MB.

## Kingston conversion and public-contract boundary

Treat the verified Kingston source dataset, not a stale generated public file, as the input. Map legacy meals to `prepared_meals`; review grocery records individually for pantry versus groceries. Preserve stable IDs and evidence, group provider identity into organizations, convert known/unknown access explicitly, and split editorial/service/review status. Retain IANA timezones and explicit schedule uncertainty. Do not increase confidence during conversion. The Food Help format discriminator and new dataset ID make the public-contract transition explicit.

The reviewed eight-record Kingston conversion is now included in `deployments/kingston/`; the separate synthetic Kingston-like test fixture remains fictional. Original review dates and uncertainties are preserved. The real dataset has no asserted blanket open-data licence; see [licensing](licensing.md). Setup does not invent or verify provider facts.

The legacy and Food Help `/data/v1/resources.json` schemas are different despite sharing a path suffix. A website redirect must not silently claim wire compatibility for these machine endpoints. Treat any legacy data retention or contract retirement explicitly in the release's transition record. The [HSDS 3.3 mapping](interoperability.md) is unchanged and remains a design for a future converter, not an implemented export.

The consolidation comparison of the retained legacy publication and the Kingston source confirmed all eight stable IDs at the September 4, 2026 migration baseline. Names, summaries, operator names, locations/coordinates, phone/extensions, official URLs, timezones, guidance, eligibility, limitations, evidence URLs/check dates/notes, review methods/dates, schedule notes/exceptions and temporary notices were preserved through explicit mappings. A later targeted September 15 review added evidence-backed cost information to the published records; Brit Smith Social Market also received that date as its updated verification date because its City cost source was checked then.

The deliberate representation differences are:

- Legacy `meals` becomes `prepared_meals`; pantry services move from broad `groceries` to `food_banks_pantries`, while Brit Smith Social Market remains `groceries`.
- Provider identity becomes an organization reference; locations, schedules and evidence become structured records with stable evidence references.
- Legacy `unconfirmed_fields` takes precedence over placeholder booleans and becomes explicit `unknown` access values. Missing information is not promoted to a confirmed yes/no.
- Unconfirmed empty weekly-hour placeholders for Lunch by George and Community Choice Pantry become an unknown schedule, not a claim of seven closed days. Their temporary warnings remain.
- Legacy `verification_due` splits into published editorial status and partially confirmed review state. It is not upgraded to confirmed information.
- The new public dataset adds the `food-help` discriminator, dataset UUID, taxonomy/compatibility identifiers and content digests. The old timestamp-style dataset version and JSON shape remain at the preserved legacy endpoint.

The comparison is migration evidence, not a new source review or a universal converter. See [legacy transition](legacy-transition.md) for endpoint and worker treatment.
