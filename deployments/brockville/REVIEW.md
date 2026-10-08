# Brockville editorial maintenance

This is an operator checklist, not a replacement dataset. Authoritative provider facts, evidence and verification dates remain in `resources.json`; site policy remains in `site.json`.

**Review owner:** Jamie Whelan, for True Good Craft. The public correction address is the address in `site.json`. Review sources sooner when a correction, closure or changed schedule is reported. Automation can flag a due review; it cannot approve a provider fact.

All records were first reviewed on **2026-10-08** as a scraped MVP from public sources. Nobody has been contacted yet, so every record is `partially_confirmed` until a provider confirms directly. The next 30-day review target is **2026-11-07** for all records. The church meal dates come from the FoodcoreLGL September–December 2026 Brockville calendar; when the January–April 2027 edition appears, replace the dated schedules and re-check.

| Resource ID | Current review state | Next review by |
| --- | --- | --- |
| `brockville-and-area-food-bank` | Provider-confirmed weekday hours (10 a.m.–2:45 p.m.) and appointment-by-voicemail intake; eligibility, screening and document details from referral listings only | 2026-11-07 |
| `salvation-army-food-bank` | Provider Facebook video states Mon–Fri 9 a.m.–4 p.m. by appointment; the video is undated, so treat hours as not recently re-confirmed | 2026-11-07 |
| `salvation-army-sandwich-program` | Two agreeing sources (FoodcoreLGL calendar, Wall Street page) | 2026-11-07 |
| `salvation-army-kids-club` | Two agreeing sources; a 211 North result gives a 6 p.m. end and a school-year qualification, both unresolved | 2026-11-07 |
| `loaves-and-fishes` | Three agreeing sources for 11:30 a.m.–1 p.m.; Wall Street page's 1–3 p.m. treated as outdated | 2026-11-07 |
| `wall-street-friday-breakfast` | Provider page plus FoodcoreLGL calendar agree | 2026-11-07 |
| `wall-street-sunday-supper` | Provider page plus FoodcoreLGL calendar agree; dates listed through December 13, 2026 | 2026-11-07 |
| `brockville-wesleyan-sunday-supper` | Calendar controls dine-in-or-pick-up and 613-342-4566; Wall Street page's take-out-only wording and 613-498-7729 (The Pier Church's number) recorded as conflicts | 2026-11-07 |
| `st-lawrence-sunday-dinner` | Calendar and Wall Street page agree on 3:30–5:30 p.m.; an EEC page's 3–5 p.m. unresolved | 2026-11-07 |
| `first-presbyterian-sunday-supper` | Calendar controls phone 613-345-5014; Wall Street page prints the Salvation Army's number by mistake | 2026-11-07 |
| `bread-and-blessing` | Calendar plus provider Facebook page; summer pause (July–August) from local event listings | 2026-11-07 |

## Known conflicts kept visible in the data

- **Loaves and Fishes hours:** 11:30 a.m.–1 p.m. (FoodcoreLGL Sept–Dec 2026 calendar, southeasthealthline updated 2026-09-09, Brockville Daily) vs 1–3 p.m. (Wall Street United page). Published as 11:30–1:00.
- **Brockville Wesleyan supper:** dine in or pick up with delivery by prior arrangement and phone 613-342-4566 (calendar) vs take-out only and 613-498-7729 (Wall Street page; that number belongs to The Pier Church). Published per the calendar.
- **First Presbyterian phone:** 613-345-5014 (calendar, matches tourism listings) vs 613-342-5211 on the Wall Street page (the Salvation Army's number). Published as 613-345-5014.
- **Kids Club end time:** 6:30 p.m. (calendar, Wall Street page) vs 6 p.m. with a school-year qualification (211 North result). Published as 6:30 p.m. without the school-year claim.
- **Food bank service area:** referral listings name Brockville, Front of Yonge, Elizabethtown and Augusta; a March 2026 report names Brockville, Lyn, Mallorytown and North Augusta. Kept general.
- **Food bank hours fragment:** southeasthealthline shows "Open the 2nd & 4th Monday of the Month" alongside weekday hours; the provider's own site controls.

## Leads not yet listed (do not publish without reviewed evidence)

- **Helping Hands Good Food Box** (Salvation Army): pay at a thrift store, pick up third Tuesday. Sources disagree on which thrift store (King St, Brockville vs Prescott) and the southeasthealthline record was last fully updated 2024-09-27.
- **Brockville Wesleyan community breakfast** (southeasthealthline community meals list) and **St. John's United monthly breakfast** (EEC page, "call for dates"): not in the current FoodcoreLGL calendar; confirm before listing.
- **The Pier Church / 3M Harvest Lunch** at 806 Chelsea St: an after-school program for RNJ students (grades 7–12), not a public meal; an older EEC listing describes a weekday public lunch that could not be confirmed.
- **School nutrition programs** (Upper Canada DSB, CDSBEO): no reviewed public contacts yet.
- **Mona's Meals** (Loaves and Fishes take-home meals, per a 2024 community foundation post): current status unknown.
- **Brockville Cooperative Care Centre** (1804 County Road 2): closed in late 2025 despite older resource pages; do not list.

## Source notes

- The FoodcoreLGL Brockville calendar (`https://www.foodcorelgl.ca/_resources/calendars/Food_Calendar_Brockville.pdf`) was the September–December 2026 edition when checked on 2026-10-08. It is the backbone source for the church meals and Bread and Blessing; FoodcoreLGL is the natural maintenance partner for this directory.
- No coordinates are published: none were found in the reviewed sources, so they are intentionally absent rather than guessed.
- No analytics and no search indexing for this deployment until the operator enables them.
- Private correspondence and permission receipts belong outside this public repository. Public evidence notes should describe the finding without exposing private contact details. See [maintenance](../../docs/maintenance.md) for edit/check/release steps.
