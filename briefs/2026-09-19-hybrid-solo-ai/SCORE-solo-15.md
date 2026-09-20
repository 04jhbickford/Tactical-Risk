# SCORE-solo-15 — real touch-pan on New Local Game

**Hold merge.** Tip only. PR76 hybrid `cursor/unit-sheet-clickthrough-d314`. Quiet James.

## Claim
Hard reload `?three=1&solo=1` @390×844 paints `V2.81.56-ux-solo.15`. Playwright **touch** finger-pan (not wheel, not `scrollTop=` assignment) scrolls MAIN so the last seat sits above sticky Teams+Start with a gap.

## Root cause (James REJECT .14)
`.14` A3 `scrollTop` / wheel PASS was not a finger-pan. Class: **touch scroll broken**.

1. `sealChromeControl` always used `{passive:false}` on lobby `touchstart`. iOS / Chrome-mobile then wait for `preventDefault` and often never start a native pan.
2. `bindSealedActivate` fired on `pointerdown`, so a finger-down on Human/Easy/Med/Hard immediately re-painted the lobby (`innerHTML`) and killed the scroll target.
3. Peek/chip `ontouchstart = activate` called `e.preventDefault()` when cancelable — same class of steal.
4. Map canvas `touch-action:none` + non-passive touch listeners could take the gesture if anything leaked through `#three-lobby`.

## Ship
- `GAME_VERSION` = `V2.81.56-ux-solo.15`
- `index.html` `__TR_GAME_VERSION` + `main.js?v=.15` + SW/Cache drop (keep `.14` no-store on `/`)
- Boot graph `?v=.15`
- `applyLiveStamp` still overwrites L0 + lobby every paint
- Lobby/tutorial: `{prevent:false}` + **click-only** activate + **passive** touch listeners
- No `ontouchstart = activate`; never `preventDefault` on `touchstart`/`touchmove` for lobby pan
- MAIN: `overflow-y:auto; touch-action:pan-y; -webkit-overflow-scrolling:touch; min-height:0; flex:1`
- Seat wrap/card/chip/button: `touch-action:pan-y`
- `html.three-spike.has-lobby #mapCanvas { pointer-events:none }`; canvas touch handlers return while lobby is open
- Footer stays `flex:none` sibling. Shell `100dvh`/`100svh`.

## QC @390 hard reload + Playwright touch (PASS)
Tip `?three=1&solo=1` after hard reload. CDP `Input.dispatchTouchEvent` (not wheel, not `scrollTop=`).

- L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.15`
- `/` response `Cache-Control: no-store`
- MAIN `overflow-y:auto; touch-action:pan-y`; seats/chips `pan-y`
- `scrollTop` 0 → 113 (mid, gesture) → 146 (end, gesture)
- First swipe started on a Human chip
- Americans last seat bottom 627.9 / footer top 723 / gap 95.1px
- Footer is a sibling outside MAIN; Human/Easy/Med/Hard unclipped

Stills: `/opt/cursor/artifacts/screenshots/lookpass15_a1_stamp_hard_reload_390.png`, `lookpass15_t1_setup_top_390.png`, `lookpass15_t4_mid_pan_390.png`, `lookpass15_t5_scroll_end_last_seat_390.png`.
