# Adaptive lobby MUST-PASS — V2.81.56-ux-solo.14

**Hold merge.** Quiet James. Tesla off. Fail-closed on **A1 / A3 / A4 / A5**.
Do not ship / do not ping until stills @390 prove every row.

Canonical shell (implement exactly; mapped onto `#three-lobby` / setup):

```
.app-shell { height:100dvh; display:flex; flex-direction:column; overflow:hidden }
.shell-scroll { flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch }
.shell-footer { flex:none }  /* Teams+Start — NOT inside scroll */
```

Map: header `.three-lobby-setup-head` `flex:none` · MAIN `.three-lobby-main` scroll `flex:1; min-height:0; overflow-y:auto` · footer `.three-lobby-footer` `flex:none` sibling.

| # | Gate | Fail-closed | Proof @390 |
|---|---|---|---|
| **A1** | Stamp `V2.81.56-ux-solo.14` after hard reload (L0 + lobby) | yes | still: L0 chip |
| **A2** | Canonical shell: header `flex:none` / MAIN scroll / footer `flex:none` sibling | no | computed style |
| **A3** | Seats scroll with finger / trackpad (MAIN receives touch + wheel) | yes | still: scroll mid; `scrollTop` moved |
| **A4** | Last seat (Japanese / Americans) fully above Teams+Start | yes | still: scroll end |
| **A5** | Gap between last seat and Teams+Start | yes | same still as A4 |
| **A6** | Occupant chips + color dots unclipped (`overflow:visible` on seat wrap) | no | still: 3+ Humans |
| **A7** | Footer outside scroll (Teams+Start not a child of MAIN) | no | DOM + still |

Blockers that must stay off the lobby: `touch-action:none` on lobby ancestors that receive the gesture; `preventDefault` on lobby `touchstart` / `pointerdown`; nested scrollers; parent `overflow:hidden` without a bounded height.
