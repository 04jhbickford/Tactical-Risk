# SCORE-solo-19 — Confirm Attack CTA hotfix

**Hold merge.** Tip only. PR76 hybrid `cursor/unit-sheet-clickthrough-d314`. Quiet James.

## Claim
Hard reload `?three=1&solo=1` @390 paints `V2.81.56-ux-solo.19`. Combat Move origin+units+dest legal (`playStage===CONFIRM`) shows a discoverable gold **Confirm Attack** that is visible, unclipped, and clickable/tappable. Disabled chrome still reads Tap units / Tap destination. No soft-lock. No Try combat-move coach.

`.18` Viz PARTIAL ~76%: ORIGIN→UNITS→DEST reached, Confirm Attack CTA **not reachable**. Casualty YOU was NOT-REACHED because this path was broken. Lobby/deploy/income stay PASS.

## Steal vs invent

| Piece | Steal / invent | Cite |
|---|---|---|
| Confirm enabled only at CONFIRM (or IDLE End Phase) | **KEEP** | `.16` `playStage()` |
| Gold exclusive Confirm | **KEEP** | Three chrome |
| Disabled copy Tap units / Tap destination | **KEEP** | `.16` / bgio stage restriction |
| Docked Confirm above peek/battle + safe-area | **STEAL** | app-shell footer `flex:none` (same as `.13` lobby) |
| Seats / touch-pan / income gate | **KEEP** | `.17` / `.15` / `.18` |

Invented: none of the rules. Adapter chrome only (`#three-sheet-stack` + hit-rect shrink so dest taps live).

## Files
- `GAME_VERSION` = `V2.81.56-ux-solo.19`
- `index.html` `__TR_GAME_VERSION` + `main.js?v=.19`
- `src/map/threeMapChrome.js` — reserved Confirm dock
- `src/map/threeChromeEvents.js` — do not hit-test the full bottom dock
- `src/map/threeSoloPlay.js` — gold label `Confirm Attack`

## Residual
Casualty YOU steppers still reachable after Confirm Attack. Retreat / bombard / S11 diagnostics unchanged.

Tip after hard reload: L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.19`. `/` `no-store`.
