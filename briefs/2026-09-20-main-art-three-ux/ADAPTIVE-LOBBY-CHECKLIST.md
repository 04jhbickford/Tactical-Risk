# Adaptive lobby MUST-PASS — V2.81.56-ux-solo.16

**Hold merge.** Quiet James. Tesla off. Fail-closed on **A1** + **T1–T5** (touch pan).
Do not ship / do not ping until stills @390 prove every row.

Canonical shell (implement exactly; mapped onto `#three-lobby` / setup):

```
.app-shell { height:100dvh; display:flex; flex-direction:column; overflow:hidden }
.shell-scroll { flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch }
.shell-footer { flex:none }  /* Teams+Start — NOT inside scroll */
```

Map: header `.three-lobby-setup-head` `flex:none` · MAIN `.three-lobby-main` scroll `flex:1; min-height:0; overflow-y:auto; touch-action:pan-y` · footer `.three-lobby-footer` `flex:none` sibling.

| # | Gate | Fail-closed | Proof @390 |
|---|---|---|---|
| **A1** | Stamp `V2.81.56-ux-solo.16` after hard reload (L0 + lobby) | yes | still: L0 chip |
| **A2** | Canonical shell: header `flex:none` / MAIN scroll / footer `flex:none` sibling | no | computed style |
| **A3** | Seats scroll with finger / trackpad (MAIN receives touch + wheel) | yes | still: scroll mid; `scrollTop` moved **as a result of a touch gesture** |
| **A4** | Last seat (Japanese / Americans) fully above Teams+Start | yes | still: scroll end |
| **A5** | Gap between last seat and Teams+Start | yes | same still as A4 |
| **A6** | Occupant chips + color dots unclipped (`overflow:visible` on seat wrap) | no | still: 3+ Humans |
| **A7** | Footer outside scroll (Teams+Start not a child of MAIN) | no | DOM + still |

Blockers that must stay off the lobby: `touch-action:none` on lobby ancestors that receive the gesture; `preventDefault` on lobby `touchstart` / `touchmove` / `pointerdown`; non-passive `touchstart` on `#three-lobby`; nested scrollers; parent `overflow:hidden` without a bounded height; canvas listeners receiving touches over `#three-lobby`.

## Touch-pan fail-closed (James REJECT .14)

`.14` A3 `scrollTop` / wheel PASS is **not** enough. Class: **touch scroll broken**.
Real finger-pan on New Local Game below-fold must move MAIN.

| # | Gate | Fail-closed | Proof @390 |
|---|---|---|---|
| **T1** | No `preventDefault` on `touchstart`/`touchmove` that blocks MAIN pan while lobby is open. Chip/seat `ontouchstart = activate` is gone. Lobby `bindSealedActivate({prevent:false})` is click-only + passive. | yes | source + gesture |
| **T2** | MAIN has `overflow-y:auto; touch-action:pan-y; -webkit-overflow-scrolling:touch; min-height:0; flex:1`. Seat cards/wraps/buttons are `touch-action:pan-y` (not `none` / not `manipulation`). | yes | computed style |
| **T3** | Playwright / CDP **touch** finger-pan scrolls MAIN. Not mouse wheel. Not `scrollTop=` assignment in test setup. | yes | `scrollTop` rose after the gesture |
| **T4** | Vertical drag **starting on a seat card / Human/Easy/Med/Hard chip** still pans MAIN. | yes | mid-pan still |
| **T5** | Teams+Start footer is a `flex:none` sibling **outside** MAIN. Last seat fully visible above footer with a gap after the touch pan. | yes | scroll-end still |

Canvas: `html.three-spike.has-lobby #mapCanvas { pointer-events:none }` and canvas touch handlers return (no `preventDefault`) while lobby/tutorial is open.
