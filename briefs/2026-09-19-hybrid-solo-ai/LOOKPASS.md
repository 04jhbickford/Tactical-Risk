# Lookpass — V2.81.56-ux-solo.14

**Hold merge.** Quiet James. Tesla off. Stamp-lag kill + keep `.13` adaptive lobby.
Fail-closed **A1 / A3 / A4 / A5** — local QC @390 **PASS**. Tip URL + stills for Viz gate. Do not merge.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Hard reload @390×844: L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.14` (not `.12` / `.13`). `/` is `Cache-Control: no-store`.

| # | Ask | QC @390 |
|---|---|---|
| **A1** | Stamp `.14` after hard reload | **PASS** — L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.14` |
| **A2** | Canonical shell | **PASS** — header `flex:none` (`0 0 auto`) · MAIN `flex:1; overflow-y:auto` · footer `flex:none` · lobby `844px` / `100dvh` |
| **A3** | Seats scroll with finger / trackpad | **PASS** — `scrollHeight` 743 > `clientHeight` 657; `scrollTop` 0 → 43 (mid) → 85 (end) |
| **A4** | Last seat (JP / US) fully above Teams+Start | **PASS** — at end, US bottom 628.8 / footer top 723.2 |
| **A5** | Gap above Teams+Start | **PASS** — 94.4px between Americans and Teams+Start |
| **A6** | Chips unclipped | **PASS** — Human/Easy/Med/Hard visible; wrap `overflow:visible` |
| **A7** | Footer outside scroll | **PASS** — `.three-lobby-footer` not a child of MAIN |

Stills: `/opt/cursor/artifacts/screenshots/lookpass14_a1_stamp_hard_reload_390.png` (lobby `.14`), `lookpass14_a1_l0_bar_hard_reload_390.png` (L0 `.14`), `lookpass14_a4_a5_setup_scroll_end_390.png`.

Do not merge.
