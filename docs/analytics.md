# Optional aggregate reporting

Food Help and the fictional starter work with `"analytics": { "enabled": false }`. Disabled deployments contain no collector endpoint or collector CSP permission. Public aggregate files are independent of browser collection and never enable it.

Collection requires an explicitly reviewed deployment configuration, a production build and the exact configured HTTPS canonical origin. Preview URLs and preview builds suppress it. The emitter runs only on the interactive home directory: resource pages, the simple directory, downloads and other informational pages do not produce page-history events.

## Fixed events and wire formats

The application exposes six broad event kinds: `page_start`, `call`, `help`, `directions`, `source` and `install`. `call` means a resource call; `help` means the site's general help number. The emitter receives only the kind, never the clicked element, resource, destination, search, filter or location.

The default JSON body is the configured static `constants` plus `event`, optionally renamed with `event_names`. The default content type remains `application/json`.

For an existing collector with a different strict contract, configure `event_payloads` instead of `event_names`. Supply all six keys; each value is a small object of static scalar fields. Constants and event fields must not overlap. For example:

```json
{
  "constants": { "deployment": "example-community", "version": 1 },
  "event_payloads": {
    "page_start": { "event_name": "directory_start" },
    "call": { "event_name": "contact", "kind": "resource" },
    "help": { "event_name": "contact", "kind": "general_help" },
    "directions": { "event_name": "outbound", "kind": "directions" },
    "source": { "event_name": "outbound", "kind": "official_source" },
    "install": { "event_name": "installation_signal" }
  },
  "content_type": "text/plain;charset=UTF-8"
}
```

This fragment belongs within an enabled, separately reviewed `analytics` object with `endpoint`, `collection_mode` and `disclosure`. It does not enable collection by itself. No collector secret belongs in public configuration. Static fields must never contain personal information, identifiers, resource identities or private operational details. Schema checks cannot establish whether a constant is appropriate to publish.

## Optional finite outreach labels

The optional `attribution` policy defines `events`, `sources`, `campaigns`, `contents`, `referrers` and `internal_hosts`. It permits only fixed public campaign labels, with maximum list lengths. Installation is never attributed.

Source selection is `src`, then `utm_source`, then a configured referrer hostname rule, then `direct_unknown`. An unregistered explicit source or external host becomes `other`. Registered `utm_campaign` and `utm_content` labels are used; unknown values become `none`. Query strings, fragments and referrer URLs are never sent or stored by the adapter. Configured referrer rules have `{ "host": "search.example.test", "source": "search", "include_subdomains": true }`; hostname boundaries are checked. The canonical host and `internal_hosts` stay direct/unknown when no explicit source or matching rule exists.

`sources` must include `direct_unknown` and `other`; `campaigns` and `contents` must include `none`. Every referrer source must appear in `sources`. These labels remain only in page memory and clear when an opt-out or privacy/operator suppression is observed. Do not issue per-person, household, provider, private-group or sensitive-support campaign labels. Classification is a privacy boundary, not evidence that a visitor is a person or received food.

## Choice, suppression and delivery

`collection_mode` is an explicit operator policy choice: `opt_in` starts off; `opt_out` starts on without writing a preference on first visit. The home page's **Your privacy** section and `/privacy/` offer the same saved choice. This preference is not an identifier. `preference_key` can preserve an existing same-origin key; otherwise the key derives from the deployment ID.

GPC, navigator/window DNT, presence of the `dev_mode` cookie, `localStorage.noAnalytics === "1"`, or unreadable/unwritable preference storage suppress collection. The application creates no cookie. Signals are rechecked before every event. Changes in another tab recheck the choice and cancel pending requests. Disabled and preview builds do not read optional analytics storage.

The client attempts one startup and one supported installation signal per page lifetime. Broad clicks have a 750ms per-kind in-memory duplicate guard. Hidden/offline events are dropped and never replayed on return. Requests omit credentials and referrers, reject redirects and use a 1,500ms abort timer. No beacon, queue, retry, response dependency or navigation wait exists.

The optional `click_keepalive: true` allows only a previously started visible broad click to finish when the page hides or navigates. Other pending measurements abort. Opt-out, privacy/operator suppression and offline transitions still abort all pending requests. Timers cannot guarantee cancellation after a browser freezes or destroys a page realm; delivery is best effort. This capability needs explicit policy review and is off by default.

## Restoration and verification limits

A preference saved under an old domain cannot be read under a new domain. Reusing its key does not transfer an old opt-out. Before default-on collection on a replacement domain, resolve this explicitly; do not silently discard existing privacy choices or invent a cross-domain identifier.

Collector compatibility must include the deployed origin allowlist, exact payload version, privacy controls, retention and report semantics. Local tests use synthetic data and local collectors. A browser request or HTTP 204 is not proof of persistence, reporting continuity or a completed call/visit. Production verification must have an established exclusion mechanism that keeps synthetic activity out of genuine totals. If those requirements are unresolved, leave collection disabled and record the exact gap.

Operators are responsible for collector transport logging and retention. Ordinary hosting connection processing is separate from application analytics. Unrequested host-injected beacons remain unwanted even when this adapter is enabled.
