# SCORE-solo-14 — stamp lag kill

**Hold merge.** Tip only. PR76 hybrid `cursor/unit-sheet-clickthrough-d314`.

## Claim
Hard reload `?three=1&solo=1` @390 paints L0 + lobby `V2.81.56-ux-solo.14` (not `.12` / `.13`). `.13` scroll shell still holds.

## Root cause (verified)
`/` was not `no-store` (only `/index.html` was). A cached document pinned `window.__TR_GAME_VERSION` to `.12` while `/src/version.js` listed `.13`. Painted chrome followed the HTML SoT / bake, not the module.

## Ship
- `GAME_VERSION` = `V2.81.56-ux-solo.14`
- `index.html` sets `__TR_GAME_VERSION` + cache-busts `main.js?v=.14`
- Boot graph `?v=.14` (main → threeSoloBoot/uxPreview → chrome/version/lobby/play)
- `applyLiveStamp` overwrites `.three-l0-ver` / `.three-lobby-ver` every inject from `liveGameVersion()` (HTML SoT; later ux-solo.N wins if they disagree)
- `/` + catch-all `Cache-Control: no-store`
- Tip boot unregisters Service Worker and deletes Cache Storage

## QC
See `LOOKPASS.md`. Fail-closed A1 + keep A3–A5 stills.
