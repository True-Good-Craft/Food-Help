# Kingston aggregate analytics

The Kingston configuration enables the existing Lighthouse ingestion v3 contract at `https://lighthouse.buscore.ca/metrics/event`, using `site_key=kingston_food_help`. This is a staged source change for operator review, not evidence of production activation. Publish the collector's new-origin support before this website configuration.

## Choice and scope

Collection defaults on with an off switch under **Your privacy** and on `/privacy/`. No popup or first-visit preference write is introduced. The same-origin `kfh-optional-analytics=yes|no` choice, GPC, DNT, `dev_mode`, `noAnalytics`, storage failure, preview-origin suppression and offline/background rules are preserved.

Preferences on the former `kingstonfoodhelp.ca` domain cannot be read by `kingston.food-help.ca`. The approved restoration uses default-on collection on the new domain, with this limitation disclosed beside the choice. Visitors can turn it off here; no cross-domain identifier or preference-transfer mechanism is introduced.

The existing adapter emits only from `/`, the interactive Emergency food directory. The Affordable food page, resource pages, simple directory and informational pages produce no measurements. The six kinds map to page loads, resource-call clicks, 211 clicks, directions clicks, official-source clicks and browser installation signals. The existing finite public outreach labels accompany page loads and the four broad clicks; installation is unattributed. No search/filter/location, provider identity, raw URL/referrer or visitor history is sent. Counts describe observed activity, not people or completed services.

Lighthouse stores daily totals and independent outreach margins for up to 400 UTC days and rotating abuse counters for about two days. There are no raw Kingston event rows. The adapter omits credentials and referrers, rejects redirects and makes one attempt with a 1,500 ms abort timer. Previously started visible clicks can finish during navigation; privacy revocation and offline transitions still abort them. No queue, retry, worker collection or replay exists.

## Release and verification

1. Run `npm run check -- --site deployments/kingston`. Test the actual configured payloads against Lighthouse's parser, local ingestion and aggregate report, plus browser choice and suppression controls. Keep synthetic traffic local.
2. Review Lighthouse's exact-origin addition for `https://kingston.food-help.ca`, keeping both legacy HTTPS origins for cached clients. Its strict payload/report contracts, storage and retention do not need to change. Confirm the deployed v3 storage and existing report consumer before promotion; source tests do not prove production state.
3. After operator commit/publication approval, promote Lighthouse through its governed release workflow, verify the new-origin CORS response, then publish an exact reviewed Kingston revision using the community release procedure. Retain both prior complete artifacts for rollback. The root project site remains a separate analytics-disabled target.
4. Verify actual website bytes, collector CSP permission and browser privacy suppression. A non-persisting CORS or privacy-suppressed check establishes transport/routing only. HTTP 204 never proves storage. The strict collector rejects test markers, so do not submit synthetic activity into real aggregates or delete shared daily buckets. Production persistence/reporting remains unverified until an exclusion-safe procedure and its required access are established.

Resource facts and review dates are unchanged. The source worker is unchanged; generated application assets and the cache release identity change as part of the complete site build. Roll back by restoring the previous complete Kingston artifact with analytics disabled before withdrawing collector support.
