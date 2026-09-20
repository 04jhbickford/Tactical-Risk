# Lookpass — V2.81.56-ux-solo.15

**Hold merge.** Quiet James. Tesla off. Touch-pan kill + keep `.13`/`.14` adaptive shell + stamp SoT.
Fail-closed **A1 / T1–T5** — tip QC @390 **PASS**. Do not merge.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Hard reload @390×844: L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.15` (not `.12` / `.13` / `.14`). `/` is `Cache-Control: no-store`.

| # | Ask | QC @390 |
|---|---|---|
| **A1** | Stamp `.15` after hard reload | **PASS** — L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.15` |
| **T1** | No preventDefault on lobby touchstart/touchmove | **PASS** — click-only + passive lobby listeners; no `ontouchstart=activate` |
| **T2** | MAIN + seats `touch-action:pan-y` | **PASS** — MAIN `overflow-y:auto; touch-action:pan-y; flex-grow:1; min-height:0`; wrap/chip `pan-y` |
| **T3** | CDP/Playwright **touch** finger-pan moves `scrollTop` | **PASS** — `scrollTop` 0 → 113 (mid) → 146 (end) from `Input.dispatchTouchEvent` (not wheel, not `scrollTop=` assignment) |
| **T4** | Pan starting on a seat / Human chip still scrolls | **PASS** — first swipe started on a Human chip |
| **T5** | Last seat clear of Teams+Start footer sibling | **PASS** — Americans bottom 627.9 / footer top 723 / gap 95.1px; footer not a child of MAIN; Human/Easy/Med/Hard unclipped |

Stills: `/opt/cursor/artifacts/screenshots/lookpass15_a1_stamp_hard_reload_390.png`, `lookpass15_t1_setup_top_390.png`, `lookpass15_t4_mid_pan_390.png`, `lookpass15_t5_scroll_end_last_seat_390.png`.

Do not merge.
