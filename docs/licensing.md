# Licensing and source availability

The coverage in [NOTICE](../NOTICE.md) and the standard [MPL-2.0](../LICENSE) applies to Food Help software and supporting project material. It does not silently license community datasets or third-party assets.

## Using and distributing Food Help

MPL permits use, modification, self-hosting and commercial use. Private use does not itself require public release of every modification. When covered executable code is distributed, recipients must be able to obtain its corresponding covered source and notices. Separately authored files in a larger work do not automatically acquire MPL obligations merely because they accompany covered files; copied covered code requires separate consideration. An operator's data does not become public under the software licence. See [Mozilla's licence](https://www.mozilla.org/en-US/MPL/2.0/) and [FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) for the terms and file-level explanation.

A website serves executable JavaScript to its visitors. Its source-availability link must identify that deployed version, including modifications. Pointing to a moving default branch or an older unrelated release is insufficient. Set `software_source_url` to the public source repository, preserve the release's exact commit, and verify the generated licence page links to that commit. If your covered source is not in a public Git repository, provide a corresponding source archive by reasonable means and use the supported source-link configuration. Keep private records and credentials out of that archive; the relevant covered source and build instructions still need to be available.

Retain `LICENSE`, `NOTICE.md`, applicable SPDX identifiers, font notices and any additional upstream notices in source redistributions. Check the generated `/licenses/`, downloadable directory and distributed licence files before publishing. `package.json` and the lockfile's project metadata identify the software as `MPL-2.0`; `private: true` prevents accidental npm package publication and does not change the licence.

There is no compulsory CLA, copyright transfer or requirement to buy TGC hosting. Contributors retain rights to their work. Future alternative licensing would require sufficient rights from affected contributors; project maintainership alone does not supply those rights. Names, branding, official domains and commercial services are separate from the software grant.

## Real community data

The eight Kingston listings in `deployments/kingston/resources.json` contain reviewed material referencing provider websites, the City of Kingston and 211 Ontario. The available source and local legacy records do not establish a blanket open-data grant covering all imported material. Keep the current statement: no separate open-data licence is asserted for this deployment. Publication of a directory is not a representation that every field can be relicensed.

The outstanding rights review covers summaries, access/eligibility wording, schedule notes, evidence notes and any extracted third-party compilation material in the records below. Source URLs remain in the authoritative JSON; they are evidence references, not licence receipts.

| Resource ID | Referenced source publishers |
| --- | --- |
| `marthas-table` | Martha's Table; 211 Ontario |
| `loretta-meal-program` | St. Vincent de Paul Society of Kingston |
| `brit-smith-social-market` | St. Vincent de Paul Society of Kingston; City of Kingston |
| `partners-in-mission` | Partners in Mission Food Bank; 211 Ontario |
| `st-marys-drop-in` | St. Mary's Cathedral; 211 Ontario |
| `lunch-by-george` | Lunch by George; 211 Ontario |
| `salvation-army-pantry` | 211 Ontario; City of Kingston |
| `storehouse-of-hope` | Kingston Alliance; 211 Ontario |

Recommended next decision: identify operator-authored descriptions and factual arrangements separately from copied expression or licensed compilations; record permissions and applicable terms by affected material; use CC0-1.0 for material the operator can actually dedicate if they approve that grant. If imported material cannot support that grant, retain its separate terms or replace it with independently authored, provider-confirmed wording. Do not add `CC0-1.0` to the whole Kingston configuration before that review. Do not imply that facts, copyrightable descriptions and database rights have identical treatment.

This consolidation preserves the existing publication and rights statement; it does not conduct a new provider verification or resolve the missing grant. Private permissions/correspondence should stay outside public source, with only an appropriate public attribution or rights statement included.

## Fictional datasets

Exampleville (`examples/exampleville`) and the synthetic Kingston-like fixture (`tests/fixtures/kingston-like`) retain their existing [CC0-1.0 dedication](https://creativecommons.org/publicdomain/zero/1.0/). Their contacts and services are fictional and must not be published as real assistance. Copying their shape is encouraged; copying their fictional facts into a real deployment is not a valid source review.

## Font and artwork provenance

Atkinson Hyperlegible Next is Copyright 2020–2024 The Atkinson Hyperlegible Next Project Authors. The upright variable WOFF2 (weights 200–800) is 48,188 bytes, unchanged and not subsetted. The reference project records download on 2026-09-04 from the [upstream webfont](https://github.com/googlefonts/atkinson-hyperlegible-next/blob/main/fonts/webfonts/AtkinsonHyperlegibleNext%5Bwght%5D.woff2), Git blob `626791adce3ab62b0a8deb7d778d91a069a65ccc`.

The local consolidation audit confirmed that the Food Help and legacy font bytes match SHA-256 `abde1ad5cf78b9ac575ef90d991f2e9101eb0b3b6668bde9a00e2e1e27d99afd`, and both full OFL notices match SHA-256 `b5b7a8bc1e0e92be9b64abd8abd92659488733aa5be8d982bc872c36dac73f08`. The [OFL](../src/assets/fonts/OFL.txt) remains separate from MPL and accompanies font distribution.

The included 192px and 512px bowl/spoon PNGs are byte-identical to the local reference assets. The SVG and base CSS carry forward the owner's design with generic identity and subsequent visual fixes. Available legacy design documentation identifies first-party artwork and the font as the third-party asset. The legacy README reserved application rights; no separate legacy application `LICENSE` or `NOTICE` was present. The owner's Food Help approval supplies the current MPL direction for their material, rather than rewriting an earlier release or assuming rights to third-party contributions. No municipal marks or photography are incorporated.

The audit examined the present repository, available local reference README/design/font documentation and source assets. It does not claim access to unavailable conversations, private rights contracts or every historical distribution. Preserve any applicable prior grants or notices discovered later.

## Dependencies and release review

Locked development tools retain their own licences; do not relabel them MPL. No runtime package dependency is required. Re-check bundled output and upstream notices when adding a dependency or copying code. The [interoperability review](interoperability.md) records design influences; it is not permission to copy those projects' code or data.

Release review checks the exact source revision, covered source availability, MPL/OFL notices, deployment data-rights statement and absence of private files. A successful schema/build check cannot determine ownership or grant redistribution permission.
