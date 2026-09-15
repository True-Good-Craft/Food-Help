# Retiring a legacy website

The directory application remains ordinary static software. `scripts/legacy-transition.ts` is a separate, one-time compatibility helper for the inspected legacy `sw.js`/`kfh-app-*`/`kfh-data-v1` contract. It does not configure hosting, enable redirects, publish data or create a migration service.

## Prepare without changing production

Preserve the exact current legacy artifact and its source/hosting identities outside public source before proceeding. Verify the new production origin first, including fresh offline installation, hashes, headers, data and source availability. Then generate a separate candidate:

```sh
node scripts/legacy-transition.ts --from artifacts/baselines/legacy-before-redirect --to https://kingston.food-help.ca --out artifacts/legacy-transition-candidate
```

All three arguments are explicit. The target must be an HTTPS root origin. The output must be a separate, empty child of `artifacts/` or `dist/`; the helper refuses to delete/overwrite an existing release. Use a new candidate directory when regenerating. It reads the old precache manifest and copies only compatibility files, preserving their bytes. It never copies the private receipt, previous application HTML, correspondence or source history into the new artifact.

The generated `/transition-licenses/legacy-provenance.txt` identifies unchanged historical assets and distinguishes their original terms from the new retirement worker's MPL licence. Maintainers preserve original source and release provenance privately. Do not claim that an inaccessible historical repository is public, publish private history, or retroactively apply the current Food Help licence to historical assets. The unchanged font keeps its OFL, and no general data reuse grant is added. The new worker is itself distributed as unminified source; current Food Help's exact covered source is linked from its own licence page.

The adjacent `.report.json` records retained paths, every output hash, artifact identity and exact legacy-data SHA-256. It is a private handoff report outside the upload directory. Publish only the candidate directory after the new site passes its production gate and the applicable transition authorization is in place.

## Upload to an existing Pages project

Use an available, reviewed Wrangler v4 installation; it is an operator deployment tool, not an application dependency. Confirm its version and use account credentials already scoped for editing the existing Pages project. Do not put credentials in commands, source files or the uploaded artifact. The authenticated account must be the one that owns the old domain's project.

After inspecting the project's current production branch and disabling unintended Git-triggered rebuilds, the upload command is:

```sh
wrangler pages deploy artifacts/legacy-transition-candidate --project-name <existing-legacy-project> --branch <current-production-branch> --commit-hash <transition-generator-commit> --commit-message "Legacy compatibility transition"
```

This command changes production when the selected branch is that project's production branch. It does not create a project or alter DNS. Preserve both the original legacy source commit and the transition generator commit in the private release record; the upload's commit label is not proof that the modified worker came from the old baseline commit. Verify the new deployment URL and artifact hashes before attaching/enabling the conditional website redirect rules.

Cloudflare documents using Wrangler uploads with an existing Git-integrated Pages project after disabling automatic deployments; there is no need to convert the project or create another one. See [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) and [Pages deploy command](https://developers.cloudflare.com/workers/wrangler/commands/pages/#pages-deploy). Keep unrelated projects and existing hostname/mail configuration untouched.

## Machine contracts and retained routes

The original `/data/v1/resources.json` is copied byte for byte as a dated legacy snapshot. It is **not redirected** to Food Help's incompatible v1 representation. The response exposes a `successor-version` link to the new dataset; this is discovery, not a claim of wire compatibility. Retained old assets, fonts, icons and manifest keep their original bytes and paths so cached documents and old clients are not broken unnecessarily. The legacy manifest's old-origin start URL reaches the website redirect after reconnection.

The host's website redirect must exclude these paths:

- Exact: `/sw.js`, `/manifest.webmanifest`, `/favicon.svg`, `/icon-192.png`, `/icon-512.png`, `/fonts.css`, `/simple.css`.
- Prefixes: `/data/`, `/assets/`, `/fonts/`, `/transition-licenses/`.

An absent file under an excluded prefix must return a real 404, not the new directory or an incompatible dataset. Retain the old domain and HTTPS. Do not touch unrelated DNS or mail records.

Redirect website URLs permanently to the new origin, preserving query strings. Explicitly map `/directory` and `/directory.html` to `/directory/`; normalize `/index` and `/index.html` to `/`. Verify the relevant HTTP/HTTPS and `www` variants at the host. The generated fallback `index.html` is a simple link with no old application scripts; the external host rule supplies the actual website redirect and query preservation. It is not a copy of the old application.

## Existing browser workers

The new `/sw.js` is an unminified retirement worker, distributed in source form with its MPL licence. It installs immediately, claims the old origin's clients, and deletes only `kfh-app-*` plus the exact `kfh-data-v1` cache. It creates no cache and does not delete local storage, unrelated caches or another application's worker registration. Existing privacy preferences are left intact on the old origin; they do not magically transfer across origins.

For controlled website windows it requests navigation to the same old-origin URL. The active retirement fetch handler returns a 308 to the fixed new origin, including the directory-path mapping and query. It does not depend on a direct cross-origin `WindowClient.navigate()` succeeding, and does not await the navigation inside activation because that navigation's fetch can wait for activation to finish. See the browser's [navigate API](https://developer.mozilla.org/en-US/docs/Web/API/WindowClient/navigate) and [claim API](https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim).

Navigations to retained machine/asset paths and non-navigation requests are passed through. The retirement worker does not unregister itself: it must remain obtainable on the old URL for returning registered browsers. Keep `/sw.js` served as JavaScript with root worker scope and `Cache-Control: no-store`, without redirects or HTML transformation. A browser returning entirely offline may still show its old cached release until it reconnects and checks for an update; the domain transition cannot remotely update an offline browser.

No tracking is introduced. Historical compatibility JavaScript is retained as an original asset, but the transition page does not load it. Preserve its applicable historical licensing/source provenance separately from the retirement worker's MPL notice. The supplied OFL continues to cover the unchanged font.

## Verification and recovery

Unit tests exercise path/query mapping, reserved routes, narrow cache deletion, retained bytes and refusal to overwrite an artifact. The browser test installs a synthetic legacy worker, opens two controlled tabs, updates to retirement, and verifies the new origin, unchanged old JSON, compatibility routes and preservation of unrelated caches/local storage in Chromium, Firefox and WebKit. Synthetic browser evidence does not replace checking the actual deployed legacy worker and redirect rules.

After publishing, verify `/sw.js` status/MIME/cache headers and hash, old JSON status/bytes, manifest and representative old assets. Fetch `/transition-licenses/legacy-provenance.txt` and the retirement worker's source and MPL licence without authentication. Check fresh visitors and previously controlled browsers, useful destinations, queries and absence of loops. Confirm that the new origin can again complete fresh offline installation. Record actual results and release identities in the private transition handoff; these instructions alone are not a declaration that redirects are live.

Retain the previous immutable hosting deployment and full legacy artifact. Reverting hosting and redirect settings can restore server behaviour, but permanent redirects cached by browsers cannot be instantly recalled. Never discard the old-domain certificate or baseline as part of this transition.
