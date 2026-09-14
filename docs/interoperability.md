# Standards and reuse decisions

Focused review completed before the v1 data contract, checked September 2026. Food Help keeps a small authoring model and documents an interoperability mapping. It does **not** claim HSDS conformance, ship an HSDS API, or reproduce a subscription taxonomy.

| Standard or project | Decision | Applied lesson and boundary |
| --- | --- | --- |
| [Open Referral / HSDS](https://docs.openreferral.org/en/latest/hsds/hsds_faqs.html) | Map/interoperate | Organization, service, location, contact, eligibility, identifiers and metadata are separate concepts. Food Help groups organizations but keeps service locations inline for simpler authoring. |
| [HSDS 3.3 release](https://github.com/openreferral/specification/releases/tag/v3.3) | Pin mapping target | Review the versioned schemas, not a moving “latest” example. The current service schema includes `operating_hours`/`events`; legacy `schedules` is deprecated. Food Help’s own contract remains v1. |
| [Open Referral UK](https://openreferraluk.org/developers/overview) and [compliance guidance](https://openreferraluk.org/developers/compliance) | Map where needed | Consumer profiles add requirements; a deterministic conversion alone is not evidence of UK API/profile compliance. No API is added to satisfy an unneeded profile. |
| [Inform USA standards](https://www.informusa.org/standards) (AIRS lineage) | Borrow governance pattern | Clear inclusion rules, maintained records, trained review and service quality matter beyond schema validity. Do not imply accreditation. |
| [211 Ontario data](https://211ontario.ca/211-data/) and [211 HSIS](https://211hsis.org/) | Potential separately licensed interoperability | Reuse reviewed concepts and establish permission for actual datasets/taxonomies. Public visibility does not grant bulk redistribution rights. |
| [Integreat](https://integreat-app.de/en/) / [app source](https://github.com/digitalfabrik/integreat-app) | Borrow design pattern | Offline civic information, community publishing, explicit language content and stable identity. Do not copy its CMS/backend or complete multilingual app architecture. |
| [Karrot](https://foodsaving.world/karrot) | Borrow governance pattern | Local group stewardship and explicit community rules. Volunteer coordination, membership, pickup scheduling and social features are outside a public directory. |
| [foodsharing developer documentation](https://devdocs.foodsharing.network/intro) and [glossary](https://devdocs.foodsharing.network/glossary/foodsharing) | Borrow scope distinction | Public sharing points and fridges differ from private volunteer pickups. Do not expose private collection arrangements as public food-access resources. |
| [Open Food Network](https://openfoodnetwork.org/about-us/) | Borrow service/community distinctions | Decentralized operators and explicit model boundaries. Shops, checkout, transactions and logistics do not belong in Food Help. |
| [Data Food Consortium](https://www.datafoodconsortium.org/standard/) | Future interoperability only | Useful food-system interoperability work; catalogue/commerce semantics do not replace human-service eligibility or evidence. |
| [Soliguide/Solinum freshness practice](https://solinum.org/en/blog/pourquoi-et-comment-mettre-a-jour-les-informations-sur-soliguide) and [data sharing](https://solinum.org/en/blog/le-partage-des-donnees-chez-solinum-comment-ca-marche) | Borrow design pattern | Make verification and freshness visible, keep publication review distinct from automatic data processing, and establish data-sharing terms. |

No code from these large systems is incorporated. Licences differ across their components and cannot be generalized from a project’s name. The direct reused implementation assets are listed in `NOTICE.md`.

## Deterministic mapping design

Target HSDS **3.3**, with a separately declared consumer profile if one is later needed. This table is an implementation specification for a future converter, not a shipping exporter.

| Food Help | HSDS mapping and caveat |
| --- | --- |
| `dataset_id` + organization/resource slug | UUIDv5 using dataset UUID as namespace and `organization:{id}`, `service:{id}`, `location:{resource-id}`, etc. as stable names; never randomize IDs each export |
| `organizations[]` | Organizations with mapped stable UUID, name, description and official URL |
| Resource identity/name/summary | Service with organization link and description; preserve original Food Help ID in a clearly namespaced identifier/extension |
| Inline address/coordinates | Location and address objects plus service-at-location link; do not invent a physical location for delivery/support-only resources |
| Phone/extension | Phone record linked at the correct service/location level |
| `eligibility`, access details, limitations, guidance | Supported service eligibility/application/description fields; Food Help’s yes/no/unknown access rules need a documented extension where a consumer has no exact field |
| Categories and taxonomy version | Food Help-owned taxonomy/term records with stable IDs; no automatic crosswalk to licensed 211 terms |
| `service_languages` | Service language records; keep `content_language` separate |
| Weekly schedule/date exceptions | Reviewed conversion to the target version’s operating-hours/event structure. Preserve uncertainty and exceptional closures; do not silently discard unsupported intervals |
| Publication/service/review states | Explicit mapped service status plus retained extensions. “Published” does not mean “active”, and “confirmed” does not mean “available now” |
| Evidence/source review dates | Provenance extension plus appropriate metadata-change records; HSDS modification metadata is not equivalent to evidence supporting a provider claim |
| External identifiers | Preserve namespace and value; map only to a consumer field with compatible semantics |

Timezone conversion needs particular care. The [versioned schedule schema](https://raw.githubusercontent.com/openreferral/specification/v3.3/schema/schedule.json) describes an offset-oriented timezone field. Food Help uses IANA zones because daylight-saving offsets change. Never replace `America/Toronto` with one permanent `-05:00` value. A future converter must specify its date horizon/target representation and retain the IANA zone or explicitly report a lossy mapping. Unknown schedules are not invented hours.

## Worked mappings

For fictional `community-table`, the organization UUID derives from `organization:example-community`, the service UUID from `service:community-table`, and its linked location UUID from `location:community-table`. Its weekday 09:00–17:00 hours use `Europe/London`; Saturday/Sunday are unknown, not closed. The `example-source` review and its supported claims travel in the provenance extension, not as a claim of HSDS-certified verification.

For `delivery-support`, export an organization-linked service and its described service area. There is no location or invented coordinate record. “By arrangement” remains application/contact guidance, with no fabricated operating-hours entries. The same stable Food Help service ID can later acquire translated names without creating a second service identity.

An exporter becomes warranted only when an actual consumer/profile needs it. At that point add target-schema validation, deterministic UUID tests, explicit loss reporting, and consumer interoperability tests. Do not inflate everyday authoring to match a much larger standard before that need exists.
