# p34 SCORE — V2.81.51-three-polish.34
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR59 stacked on PR58 `.33`. Tesla off. Quiet James. James YES on strategy.

Local + live 390 stills in this folder. Fail-closed: mid painted albedo leaps vs `.32`
(not wash-family); China select is **one** outer ring; no name/IPC text on the board;
mid stays pip+N; Japan near multi-type held; Confirm keeps exclusive gold; albedo
texture is actually bound.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Painted world albedo leap vs .32 | **PASS** | `world-land-albedo.png` 4096×2340. Printed-board Europe/Asia theaters + biome plates, clipped to live polygons. Mid 390: olive-drab Europe / ochre Africa / Alps brown / paper tooth. Side-by-side `mid-vs-p32.png` is an obvious human leap. Europe absdiff mean **28.97** / p95 **98** (`.33` vs `.32` was wash-family / near-black). Asia `asia-mid-vs-p32.png` mean **12.96**. Not Civ candy. |
| Albedo actually bound | **PASS** | Console: `painted albedo bound 4096 2340 …?v=p34`. Inspect: `albedoBound: true`, `albedoSrc: assets/three/board/world-land-albedo.png`, `albedoSize: [4096,2340]`, `stainFallback: false`. Same proof on live Vercel. `loadWorldLandAlbedo` throws if the PNG misses — stain bake is OFF. |
| Dissolve China select | **PASS** | `territoryOutlineRings(China)` = **1** ring from 2 polys. `china-select-390.png`: one gold outline, no internal seam. Peek `China · 2 IPC`. |
| No permanent map labels | **PASS** | Name sprites gone. IPC `fillText` not baked. Mid stills show pip N only — no Germany/UK/China type on paper. Counts live in HUD/peek. Continent +N chips stay. |
| Mid = one cream pip + N ONLY | **PASS** | Europe mid + Japan theater mid stay pip+N. |
| Japan multi-type LOD | **PASS** | `near-japan-multitype-390.png`: JP infantry + tank + fighter + sea BB. Mid Japan pip `8`. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select | **PASS** | `Confirm: China` / `Confirm: Germany` / `Confirm: Japan` are `#C4A35A`. Zoom/PLACE frost. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Printed albedo + live 7 bonus groups + quiet +N. Relief is illustrated in the atlas (Alps/Himalaya/forest masses), not a hatch stack. |
| Ocean printed slate-teal + quiet lanes | **PASS** | Dashed `#B8B09A` print paths. |
| Units mid pip / near minis | **PASS** | Mid pip+N. Near faction plastic. Japan 8=8. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local + live)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm: Japan / .is-ready
lod:          near after Japan frame (lift 90)
roster:       DE 10 · UK 8 · SU 9 · JP 8
continents:   7 (NA 24 / SA 12 / EU 30 / ME 18 / AF 27 / AS 33 / OC 39)
china:        rings=1 polys=2
inspect:      paintedAlbedo · albedoBound · stainFallback=false · 4096×2340
              dissolveSelect · noMapLabels · noBakedIpc · japanHome
europe absdiff vs p32: mean 28.97 / p95 98
asia absdiff vs p32:   mean 12.96 / p95 50
```

## Stills
- `mid-painted.png` / `europe-mid-390.png` — olive Europe, ochre Africa, +30, pip+N
- `mid-vs-p32.png` + `mid-vs-p32-absdiff.png` — required leap proof
- `asia-mid-vs-p32.png` + `asia-mid-vs-p32-absdiff.png`
- `europe-mid-hud-390.png` / `europe-mid-select-390.png`
- `europe-near-select-390.png` — Confirm gold + DE grey minis, peek 10 IPC
- `china-select-390.png` — outer-union select, no internal border
- `near-japan-multitype-390.png` — Japan near multi-type held
- `japan-mid-390.png` — pip+N only
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.34`
- `computed.json` — machine-read CSS + inspect + absdiff

## How each P0 was solved
1. **Albedo** — image-gen printed-board plates (homage, not a board scan) from the live silhouette guide: Europe/Africa theater, Asia theater, world, forest/mountain/arid/snow tiles in `refs/p34-gen/`. `tools/bake-world-land-albedo.py` composites them through `territories.json` masks at theater alpha 0.90 / 0.86. Residual paper tooth only. No oval forest stamps. Soft-light stain stack is OFF.
2. **Bind** — `loadWorldLandAlbedo` loads `world-land-albedo.png?v=p34` and throws if missing or <4096. `bakeWorldLandAtlas` no longer falls back to fillStain. Inspect computes `albedoBound` from the Germany MeshStandard map === the painted texture.
3. **Keep** — dissolve / labels / Confirm gold / Japan LOD unchanged from `.33`.

**Vercel:** https://tactical-risk20-g0oh7hzzm-james-projects-20d8de40.vercel.app/?three=1  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/59 (stacked on PR58 / `.33`)
