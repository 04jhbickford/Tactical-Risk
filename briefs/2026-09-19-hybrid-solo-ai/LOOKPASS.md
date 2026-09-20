# Lookpass — V2.81.56-ux-solo.13

**Hold merge.** Quiet James. Tesla off. Adaptive lobby MUST-PASS (SoT: `briefs/2026-09-20-main-art-three-ux/ADAPTIVE-LOBBY-CHECKLIST.md`).
Fail-closed on **A1 / A3 / A4 / A5**. Do not READY until stills @390 prove the table.

| # | Ask | Result |
|---|---|---|
| **A1** | Stamp `V2.81.56-ux-solo.13` after hard reload | Live stamp + cache-bust (`?v=.13`) |
| **A2** | Canonical shell on `#three-lobby` / setup | header `flex:none` · MAIN `flex:1; min-height:0; overflow-y:auto` · footer `flex:none` sibling |
| **A3** | Seats scroll with finger / trackpad | Lobby `bindSealedActivate(..., { prevent: false })`; canvas does not `preventDefault` while lobby open; `touch-action:pan-y` |
| **A4** | Last seat (JP / US) fully above Teams+Start | MAIN-only scroller; footer sibling |
| **A5** | Gap above Teams+Start | MAIN `padding-bottom:12px` |
| **A6** | Chips unclipped | Seat wrap `overflow:visible`; cards `flex:0 0 auto` |
| **A7** | Footer outside scroll | `.three-lobby-footer` is not inside `.three-lobby-main` |

Do not merge.
