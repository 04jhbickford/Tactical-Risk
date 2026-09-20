# Lookpass — V2.81.56-ux-solo.15

**Hold merge.** Quiet James. Tesla off. Touch-pan kill + keep `.13`/`.14` adaptive shell + stamp SoT.
Fail-closed **A1 / T1–T5**. METHOD mirrored from `briefs/2026-09-20-main-art-three-ux/ADAPTIVE-LOBBY-CHECKLIST.md` (SoT). Do not merge.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Hard reload @390×844: L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.15` (not `.12` / `.13` / `.14`). `/` is `Cache-Control: no-store`.

## Touch-pan fail-closed (James REJECT .14) — METHOD

`.14` A3 `scrollTop` / wheel PASS is **not** enough. Class: **touch scroll broken**.
Real finger-pan on New Local Game below-fold must move MAIN.

| # | Gate | Fail-closed | Proof @390 |
|---|---|---|---|
| **T1** | No `preventDefault` on `touchstart`/`touchmove` that blocks MAIN pan while lobby is open. Chip/seat `ontouchstart = activate` is gone. Lobby `bindSealedActivate({prevent:false})` is click-only + passive. | yes | source + gesture |
| **T2** | MAIN has `overflow-y:auto; touch-action:pan-y; -webkit-overflow-scrolling:touch; min-height:0; flex:1`. Seat cards/wraps/buttons are `touch-action:pan-y` (not `none` / not `manipulation`). | yes | computed style |
| **T3** | Playwright / CDP **touch** finger-pan scrolls MAIN. Not mouse wheel. Not `scrollTop=` assignment in test setup. | yes | `scrollTop` rose after the gesture |
| **T4** | Vertical drag **starting on a seat card / Human/Easy/Med/Hard chip** still pans MAIN. | yes | mid-pan still |
| **T5** | Teams+Start footer is a `flex:none` sibling **outside** MAIN. Last seat fully visible above footer with a gap after the touch pan. | yes | scroll-end still |

Also **A1**: stamp exact `V2.81.56-ux-solo.15` after hard reload (L0 + lobby).

## QC @390 tip (PASS)

| # | Ask | QC @390 |
|---|---|---|
| **A1** | Stamp `.15` after hard reload | **PASS** — L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.15` |
| **T1** | No preventDefault on lobby touchstart/touchmove | **PASS** — click-only + passive; gesture `defaultPrevented === false` |
| **T2** | MAIN + seats `touch-action:pan-y` | **PASS** — MAIN `overflow-y:auto; touch-action:pan-y; -webkit-overflow-scrolling:touch; flex-grow:1; min-height:0`; wrap/chip `pan-y` |
| **T3** | CDP/Playwright **touch** finger-pan moves `scrollTop` | **PASS** — `scrollTop` 0 → 105 → 146 from `Input.dispatchTouchEvent` (not wheel, not `scrollTop=` assignment) |
| **T4** | Pan starting on a seat card still scrolls | **PASS** — first swipe started on a seat card; `scrollTop` rose |
| **T5** | Last seat clear of Teams+Start footer sibling | **PASS** — Americans 627.9 / footer 723 / gap 95.1px; footer not a child of MAIN; Human/Easy/Med/Hard unclipped |

Stills: `/opt/cursor/artifacts/screenshots/lookpass15_a1_stamp_hard_reload_390.png`, `lookpass15_a1_l0_bar_hard_reload_390.png`, `lookpass15_t1_setup_top_390.png`, `lookpass15_t4_mid_pan_390.png`, `lookpass15_t5_scroll_end_last_seat_390.png`.

Do not merge.
