# Lookpass — V2.81.56-ux-solo.13

**Hold merge.** Quiet James. Tesla off. Adaptive lobby MUST-PASS (SoT: `briefs/2026-09-20-main-art-three-ux/ADAPTIVE-LOBBY-CHECKLIST.md`).
Fail-closed **A1 / A3 / A4 / A5** — local QC @390 **PASS**. Tip URL + stills for Viz gate. Do not merge.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Vercel `src/version.js` already reads `V2.81.56-ux-solo.13`.

| # | Ask | QC @390 |
|---|---|---|
| **A1** | Stamp `.13` after hard reload | **PASS** — L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.13` after reload |
| **A2** | Canonical shell | **PASS** — header `flex:none` · MAIN `flex:1; min-height:0; overflow-y:auto` · footer `flex:none` sibling · lobby `100dvh` column |
| **A3** | Seats scroll with finger / trackpad | **PASS** — `scrollHeight` 803 > `clientHeight` 657; `scrollTop` 0 → 70 (mid) → 146 (end) |
| **A4** | Last seat (JP / US) fully above Teams+Start | **PASS** — at end, US bottom 627.8 / footer top 723.2 |
| **A5** | Gap above Teams+Start | **PASS** — 95.4px between Americans and Teams+Start |
| **A6** | Chips unclipped | **PASS** — Human/Easy/Med/Hard 36×81; wrap `overflow:visible` |
| **A7** | Footer outside scroll | **PASS** — `.three-lobby-footer` not a child of MAIN |

Do not merge.
