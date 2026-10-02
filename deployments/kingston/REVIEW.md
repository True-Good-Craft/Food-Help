# Kingston editorial maintenance

This is an operator checklist, not a replacement dataset. Authoritative provider facts, evidence and verification dates remain in `resources.json`; site policy remains in `site.json`.

**Review owner:** Jamie Whelan, for True Good Craft. The public correction address is the address in `site.json`. Review sources sooner when a correction, closure or changed schedule is reported. Automation can flag a due review; it cannot approve a provider fact.

Four existing listings retain their **2026-09-04** verification date. Their next 30-day review target is **2026-10-04**. Martha’s Table (direct provider update, corroborated by the City food-supports page) and Lunch by George (provider homepage) were re-reviewed on **2026-09-29**, so their next target is **2026-10-29**. Brit Smith Social Market was newly checked against the current City food-support page on **2026-09-15** for the explicit no-fee classification only. Loretta Meal Program and Brit Smith Social Market were re-reviewed on **2026-10-02** after a St. Vincent de Paul email, so their next target is **2026-11-01**. These dates are maintenance deadlines, not claims of live availability. After an actual review, update the relevant evidence and resource dates and this checklist's derived deadline together; do not advance verification dates for formatting, schema migration or deployment alone.

The browsing classification is cost-derived: `free` appears under **Emergency food**; `low_cost` or `subsidized` appears under **Affordable food**; `mixed` appears in both; missing or `unknown` cost remains unresolved. All eight previously published Kingston resources now have a source-supported `free` cost. No record was duplicated to create a browsing view.

| Resource ID | Current review state | Next review by |
| --- | --- | --- |
| `marthas-table` | Confirmed; provider email update 2026-09-29 (daily takeout, weekday delivery by application) | 2026-10-29 |
| `loretta-meal-program` | Confirmed; organization-level holiday closures added 2026-10-02 (see below). Meal hours were not re-checked against the provider page | 2026-11-01 |
| `brit-smith-social-market` | Confirmed; cost source newly checked 2026-09-15; organization-level holiday closures added 2026-10-02 (see below). Appointment versus walk-in arrangements remain unresolved | 2026-11-01 |
| `partners-in-mission` | Confirmed; identification shown as conditional from 2026-10-02 (household ID requested, availability qualified by the provider) | 2026-10-04 |
| `st-marys-drop-in` | Confirmed; holiday arrangements unknown, and some 211-only access and cost details were not freshly verified in the October 2 audit | 2026-10-04 |
| `lunch-by-george` | Confirmed 2026-09-29: weekday takeaway from the van on Wellington Street near Johnson Street; breakfast 9–10:30, lunch noon–1. Phone 613-484-2984 now maps to the provider homepage, not the superseded 211 listing | 2026-10-29 |
| `salvation-army-pantry` | Partially confirmed; Community Choice Pantry collection hours and appointment rules still unconfirmed (see below) | 2026-10-04 |
| `storehouse-of-hope` | Confirmed; past September 14 restart wording removed 2026-10-02; holiday Mondays now map to the program page | 2026-10-04 |

## Trellis HIV & Community Care

Two records were prepared on **2026-09-29** from a direct provider email (September 24, 2026) relayed by Jamie Whelan, then checked against the provider's programs page and the City food-supports page. The operator approved them on 2026-09-29. A provider follow-up email (September 29, 2026) was applied on **2026-09-30**: breakfast is free, the stall opens by 1 p.m. on Tuesdays, and both services are open to anyone as drop-ins. Jamie Whelan confirmed the drop-in access and the stall's open-until-gone hours on **2026-09-30**. Both records are `published` with verification state `partially_confirmed`.

| Resource ID | Provider-stated schedule | Status and open questions |
| --- | --- | --- |
| `trellis-breakfast` | 844A Princess Street — Monday to Thursday, 9–11 a.m. (extended a little over a year ago; the City still lists 9–10:30) | Published; free, open to anyone, drop-in with no appointment or registration |
| `trellis-fresh-food-stall` | 844A Princess Street — Tuesdays from 1 p.m. until the food is gone | Published; free, open to anyone, drop-in, one bag per household or couple. No set closing time: since 2026-10-02 the weekly table shows the 1 p.m. start with no closing time, and the day is never shown as open now |

ID rules have not been stated and remain unknown. No coordinates were found in a reviewed source, so none are published. The phone number is the organization's public toll-free line; staff direct lines are not published. Next review by **2026-10-30**.

## October 2, 2026 audit

An audit of all 18 published listings was reviewed on **2026-10-02**. Core schedules and locations not listed below were supported. Finite schedules stay finite: St. Lawrence College keeps its seven Thursday dates through December 3 and W.J. Henderson its eight biweekly Friday dates through December 11. The YMCA Tuesday and Friday sessions remain one listing. A September 28 Lionhearts prepared-food stockout notice is not treated as a current stockout.

- **St. Vincent de Paul holiday closures.** A St. Vincent de Paul Society of Kingston email (October 1, 2026) says the organization is closed on all statutory holidays, closes on December 24, and this year will not open until January 4. It was added to `loretta-meal-program` and `brit-smith-social-market` as an attributed before-you-go line and a dated notice (December 24, 2026 to January 3, 2027; reopening January 4, 2027, with years inferred from the email date). The email is organization-level and does not name either program, so no closed-date schedule exceptions were added. Open question: confirm both programs follow the organization closures before adding exceptions for statutory holidays and the winter closure.
- **Partners in Mission identification.** The provider's intake instructions ask for household ID while its FAQ qualifies availability, so identification is `conditional` and the access details keep the qualification.
- **Storehouse of Hope.** Regular Monday hours are supported; the program page (not the fall restart notice) is now the official link and the holiday-Monday source. The contact-page phone mapping was not re-read in this change.
- **Community Choice Pantry** (`salvation-army-pantry`): Southeast Healthline lists Monday, Wednesday and Friday 1–4 p.m., and its Caregiver Exchange mirror adds appointments, but both were last updated October 30, 2025. Call-first wording stays, and office hours are not used as collection hours.
- **St. Mary’s:** weekday 1–3:30 p.m., the address and extension 3 were supported. Holiday arrangements remain unknown.
- **Student Food Box** remains an unlisted lead until public eligibility and permission to list are confirmed.

## Lionhearts publication review

One shared `lionhearts` organization and eight distinct physical market records were prepared on **2026-09-15**. Jamie Whelan reviewed and approved the browsing structure, classification, listings, wording, evidence and existing qualifications for publication on **2026-09-15**. The records are `published` with verification state `partially_confirmed`: publication approval does not convert the documented unknown or conflicting details into confirmed facts. The affordable-food wording is deliberately consistent across the cards:

- Eligibility: “Open to everyone — no income requirement.”
- Cost: “Affordable food, with prices kept as low as possible.”
- Payment: “All payment methods accepted, including debit, credit and mobile payments.”

| Published resource ID | Venue and current published schedule | Ongoing review focus |
| --- | --- | --- |
| `lionhearts-market-seniors-association` | Seniors Association Kingston Region, 56 Francis Street — Tuesdays 10 a.m.–1 p.m. | Venue, address, time, accessibility wording and public links |
| `lionhearts-market-ymca-wright-crescent` | YMCA Wright Crescent, 100 Wright Crescent — Fridays 10 a.m.–1 p.m.; Tuesdays 4:30–6:30 p.m. starting September 22 | Confirm transition wording; Monday September 14 was the final published Monday session |
| `lionhearts-market-kingston-east` | Kingston East Community Centre, 779 Highway 15 — Wednesdays 10–11:30 a.m. | Venue, address, time and facility accessibility wording |
| `lionhearts-market-rideau-heights` | Rideau Heights Community Centre, 85 MacCauley Street — Wednesdays 1:30–4:30 p.m. | Venue spelling, address, time and facility accessibility wording |
| `lionhearts-market-st-lawrence-college` | Main lobby, 100 Portsmouth Avenue — September 10/24, October 8/22, November 5/19 and December 3, 10 a.m.–noon | All seven dates, year, main-lobby directions and public eligibility |
| `lionhearts-market-isabel-turner` | Isabel Turner Branch, 935 Gardiners Road — Thursdays 2:30–5:30 p.m. through October 15; 2–4 p.m. from October 22 | Re-reviewed 2026-10-02. The 2:30–5:30 hours are kept as dated exceptions for October 8 and 15. The page prints no year beside the change; 2026 is inferred from the current fall schedule. Library holiday closures raise a question but do not confirm market cancellations |
| `lionhearts-market-wj-henderson` | Outside W.J. Henderson Community Centre’s main entrance, 322 Amherst Drive — September 4/18, October 2/16/30, November 13/27 and December 11, 4–6 p.m. | All eight dates, year, outdoor position and access needs |
| `lionhearts-market-artillery-park` | Artillery Park Aquatic Centre, 382 Bagot Street — Saturdays 10 a.m.–1 p.m. | Past September 19 cancellation kept only as a dated record (return instruction removed 2026-10-02); conflicting washroom information |

Jamie’s September 15 provider meeting is recorded only as a public-safe direct-confirmation summary: information was relayed by Jamie and was not an interview conducted by the implementation agent. It supports public availability, affordability, payment methods, food range, and Lionhearts’ qualified accessibility/dignity approach. Private correspondence, meeting notes and personal contact details remain outside the repository.

Online evidence was checked on **2026-09-15**. The current Lionhearts schedule page is undated; dated official market posts establish 2026 for the YMCA change and the St. Lawrence College and W.J. Henderson date lists. The market’s official Instagram account is used as the update/contact link, and a published market post supplies `info@freshfoodmkt.ca`. No general cancellation policy was found.

Source qualifications and conflicts to keep visible during review:

- The City food-support page has older Lionhearts venues and hours, including different Rideau Heights, YMCA and Artillery times. It tells visitors that times vary and links to Lionhearts, so the current provider page and dated market posts control.
- The 211 Lionhearts agency roster contains older locations such as CANEX, Queen’s, BGC and Amherstview Community Hall. They were not carried into the current published set.
- Artillery Park accessibility sources conflict: the City lists accessible change-room features; 211 lists accessible parking and entrance but a non-accessible washroom. The listing reports the conflict and asks visitors to confirm the specific feature needed.
- W.J. Henderson was advertised outside the main entrance. The outdoor market setup’s specific accessibility features are not published. The exact within-venue market position is also unpublished for the other sites except St. Lawrence College.
- Market-specific walk-in, appointment, registration and identification details were not found for YMCA Wright Crescent, Kingston East, Rideau Heights, Isabel Turner or W.J. Henderson. Those access flags remain explicitly unknown; this does not alter the meeting-confirmed eligibility wording that the markets are open to everyone with no income requirement.
- An August 24 official update named Ontario peaches, corn, strawberries and blackberries for that week only. The cards do not claim that all products are Canadian, local or Ontario-grown.
- A past August 23 Portsmouth District Community BBQ pop-up at 56 Francis Street was found, but it was not turned into a current recurring location or future date.
- The additional program names referenced after the meeting were not available in a review packet or other recorded source, so no names or records were invented.
- Reviewed coordinates were not found in the selected official sources and are intentionally absent rather than guessed.

Outstanding source questions remain open:

- **Lunch by George:** resolved 2026-09-29. The provider homepage now gives one consistent weekday schedule and the Wellington Street near Johnson Street distribution site; 211 and the City food-supports page still show the old 129 Wellington Street details and are superseded.
- **Community Choice Pantry:** confirm food collection times and intake arrangements. Office hours must not be repurposed as food-service hours. Preserve unknown access rules where the evidence is incomplete.
- **Every record:** keep provider qualifications, eligibility and intake details with their sources. Do not turn source-reviewed schedules into live availability. Check dated programme and holiday exceptions before carrying them forward.
- **Dataset rights:** no blanket open-data licence has been established for all provider/211/City-derived material. Follow the specific review in [licensing](../../docs/licensing.md#real-community-data); keep the current rights statement meanwhile.

Private correspondence and permission receipts belong outside this public repository. Public evidence notes should describe the finding without exposing private contact details. See [maintenance](../../docs/maintenance.md) for edit/check/release steps.
