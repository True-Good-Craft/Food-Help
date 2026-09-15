# Kingston editorial maintenance

This is an operator checklist, not a replacement dataset. Authoritative provider facts, evidence and verification dates remain in `resources.json`; site policy remains in `site.json`.

**Review owner:** Jamie Whelan, for True Good Craft. The public correction address is the address in `site.json`. Review sources sooner when a correction, closure or changed schedule is reported. Automation can flag a due review; it cannot approve a provider fact.

All eight current listings retain their existing **2026-09-04** verification date. The configured review interval is **30 days**, so the next review target is **2026-10-04**. This calculation is a maintenance deadline, not a claim that the listings were rechecked during software consolidation. After an actual review, update the relevant evidence and resource dates and this checklist's derived deadline together; do not advance verification dates for formatting, schema migration or deployment alone.

| Resource ID | Current review state | Next review by |
| --- | --- | --- |
| `marthas-table` | Confirmed | 2026-10-04 |
| `loretta-meal-program` | Confirmed | 2026-10-04 |
| `brit-smith-social-market` | Confirmed | 2026-10-04 |
| `partners-in-mission` | Confirmed | 2026-10-04 |
| `st-marys-drop-in` | Confirmed | 2026-10-04 |
| `lunch-by-george` | Partially confirmed | 2026-10-04 |
| `salvation-army-pantry` | Partially confirmed | 2026-10-04 |
| `storehouse-of-hope` | Confirmed | 2026-10-04 |

Outstanding source questions remain open:

- **Lunch by George:** changed lunch hours conflict across published sources; the complete dated change notice was not inspected in the recorded review. Preserve the warning and unknown schedule until serving times are confirmed.
- **Community Choice Pantry:** confirm food collection times and intake arrangements. Office hours must not be repurposed as food-service hours. Preserve unknown access rules where the evidence is incomplete.
- **Every record:** keep provider qualifications, eligibility and intake details with their sources. Do not turn source-reviewed schedules into live availability. Check dated programme and holiday exceptions before carrying them forward.
- **Dataset rights:** no blanket open-data licence has been established for all provider/211/City-derived material. Follow the specific review in [licensing](../../docs/licensing.md#real-community-data); keep the current rights statement meanwhile.

Private correspondence and permission receipts belong outside this public repository. Public evidence notes should describe the finding without exposing private contact details. See [maintenance](../../docs/maintenance.md) for edit/check/release steps.
