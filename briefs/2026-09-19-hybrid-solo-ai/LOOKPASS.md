# Lookpass — V2.81.56-ux-solo.14

**Hold merge.** Quiet James. Tesla off. Stamp-lag kill + keep `.13` adaptive lobby.
Fail-closed **A1** is the ship. A3–A5 must still hold from `.13`.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1

| # | Ask | QC @390 |
|---|---|---|
| **A1** | Stamp `.14` after hard reload | PENDING — L0 + lobby must read `V2.81.56-ux-solo.14` (not .12/.13) |
| **A2** | Canonical shell | KEEP — header `flex:none` · MAIN `flex:1; min-height:0; overflow-y:auto` · footer `flex:none` sibling · lobby `100dvh` column |
| **A3** | Seats scroll | KEEP from `.13` |
| **A4** | Last seat (JP / US) fully above Teams+Start | KEEP from `.13` |
| **A5** | Gap above Teams+Start | KEEP from `.13` |
| **A6** | Chips unclipped | KEEP from `.13` |
| **A7** | Footer outside scroll | KEEP from `.13` |

Paint path: `window.__TR_GAME_VERSION` in `index.html` is SoT; `applyLiveStamp` overwrites stamp `textContent` every inject; later `ux-solo.N` wins if HTML and module disagree; `/` is `Cache-Control: no-store`; tip boot unregisters SW / Cache Storage.

Do not merge.
