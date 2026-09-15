# Deployment configuration

`schemas/site.schema.json` is the exact contract. Unknown fields are errors. This page explains the choices rather than maintaining a second schema.

Use `--site deployments/kingston` for Kingston or `--site deployments/<community>` for another community. The selected folder contains `site.json`, `resources.json`, optional `assets/`, optional `usage.json` and narrower `AGENTS.md` instructions. Setup requires the target; build/dev/preview without it use the fictional `examples/exampleville/` starter. Outputs default to `dist/<deployment_id>/`, and creating a configuration never creates hosting or publishes it.

| Field | Required | Meaning |
| --- | --- | --- |
| `schema_version` | Yes | `1` |
| `deployment_id` | Yes | Stable lowercase hyphenated slug; names storage and manifest identity |
| `community` | Yes | `name`, `locality`, `region`, two-letter `country` |
| `site_name`, `description` | Yes | Public branding and default metadata |
| `short_name` | No | Compact installed-app label |
| `language`, `locale`, `text_direction` | Yes | UI content language, formatting locale, text direction |
| `time_zone` | Yes | Valid IANA timezone, inherited by resources without an override |
| `canonical_origin` | Yes | HTTPS origin only, without a trailing slash, path, query or credentials |
| `operator` | Yes | Public `name`; optional `url` and `statement` |
| `corrections.email` | Yes | Public corrections address; do not use a private address inadvertently |
| `help_contact`, `emergency_contact` | Yes | Explicit `null`, or public label/phone with optional description, source URL and checked date |
| `review.interval_days` | Yes | Review target, 1–365 days; overdue wording does not auto-withdraw facts |
| `data_rights` | Yes | Operator’s rights statement; optional licence identifier and URL |
| `example_content` | Yes | True for fictional data; production builds refuse it |
| `indexing.enabled` | No | Explicitly true to allow indexing in a production build |
| `location.enabled` | No | Enable optional, in-memory approximate distance sorting |
| `branding` | No | Local logo, 192px/512px PNG icons, and small color-token overrides |
| `presentation` | No | Optional introduction text and category button groups; resource facts remain in the dataset |
| `jurisdiction` | No | Reviewed date warnings and the date through which that list has been reviewed |
| `analytics` | No | Explicit optional collection boundary, described below |
| `public_usage` | No | Enable a local sanitized aggregate file; independent of collection |
| `software_source_url` | Required for distribution | Public covered source location; production must identify the exact built revision, including deployed modifications |

V1 ships a reviewed English copy pack (`language: "en"`, `text_direction: "ltr"`); other language/direction combinations are represented in the schema but rejected by the runtime capability check until a copy pack exists. `locale` is not a claim that resource text has been translated. Resource and organization content can carry their own language. No English-only locality or country types exist.

For French, add `src/copy/fr.ts` against the English pack’s key contract, select copy by language, and add translated content keyed by the same organization/resource IDs. Reserve `/fr/resources/{id}/` and corresponding French directory routes. Keep the existing English root URLs stable. Do not clone application code, automatically translate provider facts, or add hreflang without actual translated pages. This is a documented additive path, not a complete translation framework in v1.

Branding files must live in the selected folder's `assets/` and are copied with content-hashed filenames. Supply all three overrides together. Icons must be actual 192×192 and 512×512 PNGs. SVG logos must be passive and self-contained. Optional colors are six-digit hex `primary`, `background`, and `text`; the operator deployment's accessibility test checks the result. Fonts remain local with their licence. Replace operator names and contacts as well as artwork when creating an independent community; the software does not imply TGC endorsement.

Jurisdiction configuration contains `coverage_through` and `warning_dates` entries with date, note, source URL and checked date. There is no automatic national holiday library. A local warning suppresses an inferred weekly status unless a provider has a confirmed exception for that date. Expired coverage yields uncertainty. Do not assume that a public holiday means a provider is closed.

The directory title derives from `community.name`. `presentation.introduction` overrides the generic introductory sentence. Optional `presentation.category_groups` entries have a unique `id`, a short `label`, and one or more existing taxonomy `categories`. For example, a “Take-home food” button can include both `groceries` and `food_banks_pantries`. Groups without published resources are hidden. Without configured groups, buttons are generated from the categories present. The built-in “All food help” option always includes all published resources, even categories outside the configured groups; do not define an `all` group yourself. Grouping changes discovery, never resource classification or evidence.

The compact header and help panel use `help_contact.label` and `help_contact.description`; keep the label brief. `operator.statement` supports plain-text line breaks in the footer. These are reviewed public deployment copy, not HTML templates.

For a production build, pass `--source-revision <full-40-character-commit>` with a configured GitHub `software_source_url`, or pass `--source-url <exact-corresponding-source-location>` for another source host/archive. `FOOD_HELP_SOURCE_REVISION` and the Cloudflare build's `CF_PAGES_COMMIT_SHA` are supported revision inputs. The source location must match the built covered code, including deployed modifications. A current repository homepage alone is not the corresponding source of every release. This is build provenance, not a provider verification date.

## Optional analytics

```json
{
  "analytics": {
    "enabled": true,
    "endpoint": "https://metrics.example.invalid/events",
    "collection_mode": "opt_in",
    "disclosure": "Describe the operator, purpose, retention and endpoint logging.",
    "constants": { "deployment": "example-community" },
    "event_names": { "page_start": "page_start" }
  }
}
```

The example is illustrative and is not shipped as an enabled default. The default JSON POST body contains only configured static constants and one fixed event name (`page_start`, `call`, `help`, `directions`, `source`, `install`, optionally renamed). Do not put credentials, visitor identifiers, personal information or provider identity in constants. An endpoint on another origin must permit the deployment’s CORS request. Collection requires a production build on the exact canonical origin.

The adapter sends no referrer, cookies, search/filter values, page path, selected provider, location or generated visitor ID. It respects GPC/DNT, a local opt-out or opt-in preference, canonical operator suppression, storage failure and offline/background status. Requests time out without retries, queuing, replay or unload beacons. The endpoint necessarily receives transport information such as an IP address; its logging and retention are the operator’s responsibility. Selecting `opt_out` is an explicit operator policy choice, not a legal-consent conclusion.

The generic adapter also supports static `event_payloads`, explicit `content_type`, a same-origin `preference_key`, optional `click_keepalive`, and finite public outreach `attribution` rules. See [the complete analytics contract](analytics.md) for validation, suppression and navigation semantics. Defaults remain independent of any collector. Compatibility and exclusion-safe production verification must be established before enabling a deployment; changing domains does not transfer old browser opt-outs. Keep historical receipts and credentials outside public source.

For public totals use `public_usage: {"enabled": true, "file": "usage.json"}`. The file contains `schema_version: 1`, matching `deployment_id`, `period_start`, `period_end`, `generated_at` (calendar dates), and `counts` with exactly `page_starts`, `call_actions`, `directions_actions`, `source_link_actions`, `installation_signals`. Counts are nonnegative safe integers or null. No extra fields, events, breakdowns or identifiers are accepted. An operator prepares and reviews the aggregate before building. The browser never fetches a remote report. `/usage/` stays noindex and out of the sitemap.
