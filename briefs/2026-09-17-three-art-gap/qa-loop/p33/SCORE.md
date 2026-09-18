# p33 SCORE — V2.81.51-three-polish.33
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR58 stacked on PR57 `.32`. Tesla off. Quiet James. James YES on strategy.

Local 390 stills in this folder. Fail-closed: land hero is the painted albedo (not
runtime fillStain); China select is **one** outer ring; no name/IPC text on the
board; mid stays pip+N; Japan near multi-type held; Confirm keeps exclusive gold.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Painted world albedo | **PASS** | `world-land-albedo.png` 4096×2340. Image-gen world + Europe/Asia theaters, clipped to live polygons. MeshStandard samples it (`loadWorldLandAlbedo`). fillStain is fallback only. Idle parchment emissive killed so the painting is not washed back to GIS. Mid 390: olive Europe / ochre Africa / +30 chip / paper tooth. Not Civ candy. |
| Dissolve China select | **PASS** | `territoryOutlineRings(China)` = **1** ring from 2 polys. `china-select-390.png`: one gold outline, no internal seam. Peek `China · 2 IPC`. |
| No permanent map labels | **PASS** | Name sprites gone. IPC `fillText` not baked. Mid stills show pip N only — no Germany/UK/China type on paper. Counts live in HUD/peek (`Germans · 10 IPC`). Continent +N chips stay. |
| Mid = one cream pip + N ONLY | **PASS** | Europe mid + Japan theater mid stay pip+N. |
| Japan multi-type LOD | **PASS** | `near-japan-multitype-390.png`: JP infantry + tank + fighter + sea BB. Mid Japan pip `8`. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select | **PASS** | `Confirm: China` / `Confirm: Germany` / `Confirm: Japan` are `#C4A35A`. Zoom/PLACE frost. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Painted albedo + live 7 bonus groups + quiet +N. Relief is illustrated in the atlas (Alps/Himalaya/forest masses), not a hatch stack. |
| Ocean printed slate-teal + quiet lanes | **PASS** | Dashed `#B8B09A` print paths. |
| Units mid pip / near minis | **PASS** | Mid pip+N. Near faction plastic. Japan 8=8. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm: Japan / .is-ready
lod:          near after Japan frame (lift 90)
roster:       DE 10 · UK 8 · SU 9 · JP 8
continents:   7 (NA 24 / SA 12 / EU 30 / ME 18 / AF 27 / AS 33 / OC 39)
china:        rings=1 polys=2
inspect:      paintedAlbedo · dissolveSelect · noMapLabels · noBakedIpc · japanHome · quietContinentWash
```

## Stills
- `europe-mid-390.png` — painted parchment board; +30; pip+N; no name/IPC type
- `europe-mid-hud-390.png` — same 390 HUD; idle dark CTA
- `europe-mid-select-390.png` — Germany gold ring; neighbors pip+N
- `europe-near-select-390.png` — Confirm gold + DE grey minis, peek 10 IPC
- `europe-near-units-390.png` / `europe-near-tray-390.png`
- `uk-near-select-390.png` / `russia-near-select-390.png`
- `china-select-390.png` — **required** outer-union select, no internal border
- `near-japan-multitype-390.png` — Japan near multi-type held
- `japan-mid-390.png` — pip+N only
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.33`
- `computed.json` — machine-read CSS + inspect

## How each P0 was solved
1. **Albedo** — silhouette guide from `territories.json` (same 3500×2000 UV space). Image-gen painted world + Europe/Asia theaters + biome plates (homage, not a board scan). `tools/bake-world-land-albedo.py` composites through land masks → `assets/three/board/world-land-albedo.png`. `bakeWorldLandAtlas` loads that texture; stain bake is fallback only. Land color is white; idle emissive is 0 so ACES cannot wash the print back to a slight GIS stain.
2. **Dissolve** — `src/map/threeMapOutline.js` raster-unions multipolygons. `addTerritoryInk` / `makeSelectWashMeshes` / `drawSelectInk` stroke those rings only. China 2 polys → 1 outline. Archipelagos keep multiple outer rings.
3. **Labels** — `makeLabelTexture` / name sprites deleted. `drawIpcDot` is never called from the bake. Peek shows `{printIpc} IPC`.

**Vercel:** https://tactical-risk20-lm4y0wt0n-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/58 (stacked on PR57 / `.32`)
