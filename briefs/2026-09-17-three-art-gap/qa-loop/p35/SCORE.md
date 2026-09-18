# p35 SCORE — V2.81.51-three-polish.35
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR60 stacked on PR59 `.34`. Tesla off. Quiet James.

Local 390 stills in this folder. Fail-closed: land/sea readable; continents
split; East Med ships above Italy; China outer-union; no labels/IPC; mid pip+N;
Japan multi-type; Confirm exclusive gold; painted albedo still bound.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Kill blotches / weird markings | **PASS** | Theater joins feathered. Oval ridge stamps gone. No baked +N pills. Luma/chroma clamp. Mid stills are one printed paper, not gen blotch / seam tiles. |
| Land vs sea at mid 390 | **PASS** | `mid-land-sea.png`: olive/ochre parchment land vs slate-teal Med / Black Sea / Atlantic. Sea-zone water meshes + teal punch. Not stained land. |
| Continents distinguishable | **PASS** | `mid-continents.png` / `europe-mid-select-390.png`: Europe olive, Asia khaki-tan (Ukraine/Russia), Africa ochre. +30 chip. Quiet 0.22 punch — select gold still wins. |
| East Med z-order | **PASS** | `east-med-select-no-clip.png`: British sub sits in the Med, gold ring, **above** Italy’s edge. Inspect `deck=3.60` / `italyHeight=1.82` / `shipsAboveItaly=true`. Pin south (1262, 878). |
| Painted albedo stays bound | **PASS** | Console: `painted albedo bound 4096 2340 …?v=p35`. Inspect `albedoBound: true`, `stainFallback: false`. |
| China outer-union | **PASS** | `china-select-hold.png`: 1 ring / 2 polys. No internal seam. |
| No map labels / no baked IPC | **PASS** | Name sprites gone. Atlas has no +N pills. Counts in HUD/peek. |
| Mid pip+N / Japan multi-type | **PASS** | Mid idle pip+N. `japan-near-hold.png`: INF + tank + fighter + sea. |
| Confirm exclusive gold / idle quiet-dark | **PASS** | Confirm `#C4A35A`. Idle `rgba(30, 36, 32, 0.88)` / Select a territory. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes | **PASS** | Painted albedo + live 7 bonus groups + quiet +N. |
| Ocean printed slate-teal | **PASS** | Teal basin, not parchment grain. Quiet dashed lanes. |
| Units mid pip / near minis | **PASS** | Mid pip+N. Near faction plastic. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      #C4A35A / Confirm: Japan|Germany|China
lod:          mid idle / near on East Med + Japan
china:        rings=1 polys=2
eastMed:      deck=3.60 italyHeight=1.82 shipsAboveItaly=true pin=(1262,878)
inspect:      paintedAlbedo · albedoBound · stainFallback=false · 4096×2340
              continentPunch=0.22 · seaDeckClear · eastMedPinSouth · noBlotchAtlas
continents:   7 (NA 24 / SA 12 / EU 30 / ME 18 / AF 27 / AS 33 / OC 39)
```

## Stills
- `mid-land-sea.png` / `europe-mid-390.png` — teal sea vs parchment land
- `mid-continents.png` / `europe-mid-select-390.png` — EU olive / AS tan / AF ochre
- `east-med-select-no-clip.png` — required z-order proof
- `china-select-hold.png` — outer-union select held
- `japan-near-hold.png` — multi-type LOD held
- `computed.json` — machine-read CSS + inspect + eastMed deck

## How each P0 was solved
1. **Blotches** — `bake-world-land-albedo.py` feathers theater boxes, drops oval stamps and baked badges, clamps crushed/loud chroma. Plates stay bound at ~0.36 alpha under continent identity.
2. **Land/sea** — ocean grain 0.14 + teal multiply; sea-zone water meshes; coast shelf shrink 26.5→8.2 so Med is water.
3. **Continents** — AA-PALETTE Europe olive / Asia khaki / Africa ochre baked + 0.22 runtime punch on the painted albedo (not .31 flood).
4. **Z-order** — `deckHeightForSea` = nearby land + 1.55 (East Med 3.60 > Italy 1.82); pin south of Italy; land `polygonOffset` 4.5; sea sprites `renderOrder` 32 + depthTest.

**Vercel:** https://tactical-risk20-git-cursor-three-49424b-james-projects-20d8de40.vercel.app/?three=1  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/60 (stacked on PR59 / `.34`)
