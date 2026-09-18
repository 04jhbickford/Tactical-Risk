# p31 SCORE — V2.81.51-three-polish.31
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR56 stacked on PR55 `.30` / PR54 `.29`. Tesla off. Quiet James.

Local 390 stills in this folder. Fail-closed: idle CTA is **not** gold; zoom is **not** mustard; PLACE is **not** gold; mid has **zero** type parade; Confirm keeps exclusive gold; near/select/tray are molded minis; map is not a charcoal slab; sea lanes are **not** cyan neon; mountains are **not** hatch-tick spines; continents match `data/continents.json` (7).

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Hand-drawn board caliber | **PASS** | Hatch-tick ridges gone (`paintMountainMass` + illustrated tile corridor). Feathered fills + Chaikin lids. Paper tooth + IPC stay. Scandinavia no longer a line-with-hatches. |
| No unit clipping | **PASS** | Sprites `depthTest: false`, feet-on-board `center (0.5, 0.16)`, land `polygonOffsetFactor 1.5`. Near DE/UK/SU/JP minis sit cleanly on parchment. |
| Japan multi-type LOD | **PASS** | Japan Sea Zone anchored in water (was centroid-on-island). Near: infantry + tank + fighter + `+3`. Mid idle pip+N. JP orange-red. Cluster stays on the home islands. |
| Crystal-clear select | **PASS** | Gold wash + dark halo + 6.4px `#C4A35A` ring; land emissive 0.30. Germany/UK/Japan obvious at a glance. Not candy 0.58 flood. |
| Live Risk continents | **PASS** | 7 bonus groups from `continents.json`. No USSR remap (Russia/Ukraine = Asia). Printed `+30` Europe badge. Continent-colored outlines. Africa ochre vs Europe steel vs Asia olive. |
| Mid = one cream pip + N ONLY | **PASS** | Neighbors stay pip+N while Germany/Japan expand. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select | **PASS** | Confirm `rgb(196, 163, 90)`. Zoom/PLACE frost. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Live bonus language + painted ranges. Even stain held. |
| Ocean printed slate-teal + quiet lanes | **PASS** | Dashed `#B8B09A` print paths. |
| Units mid pip / near minis | **PASS** | Mid pip+N. Near faction plastic. Japan 8=8. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm inspect · Japan / .is-ready
lod:          near after Japan frame
roster:       DE 10 · UK 8 · SU 9 · JP 8
continents:   7 (NA 24 / SA 12 / EU 30 / ME 18 / AF 27 / AS 33 / OC 39)
inspect:      paintedMountains · unitNoClip · japanLod · selectClear · liveContinents
```

## Stills
- `europe-mid-390.png` — continents + terrain; `+30` Europe; pip+N; idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD
- `europe-mid-select-390.png` — Germany gold wash+ring; neighbors pip+N
- `europe-near-select-390.png` — Confirm gold + DE grey minis, no clip
- `europe-near-units-390.png` — infantry / tank / fighter on parchment
- `europe-near-tray-390.png` — peek molded minis
- `uk-near-select-390.png` — UK tan plastic
- `russia-near-select-390.png` — SU green plastic (Asia bonus land)
- `japan-near-select-390.png` — JP orange-red 3+K, no sea-ship overlap
- `japan-near-units-390.png` — Japan closeup
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.31`
- `computed.json` — machine-read CSS + inspect

## How each P0 was solved
1. **Board** — killed `drawRidgeHatch`. Painted ridge masses + large mountain-tile corridor. Feathered continent fills, coast tooth, Chaikin-smoothed extrusions.
2. **Clip** — unit sprites never depth-test; land pushed back with polygonOffset; sprite center at the feet.
3. **Japan LOD** — footprint-capped piece size + `clusterPack`; per-territory separation; `Japan Sea Zone` water anchor so battleship/transport stay at sea.
4. **Select** — wash mesh + ink halo + thicker gold ring + emissive 0.30.
5. **Continents** — `bonusContinent()` = `data/continents.json`. Hue-preserving luma floor so chroma survives. `+N` badges + continent outlines.

**Vercel:** https://tactical-risk20-rkwvn8kaf-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/56 (stacked on PR55 / `.30`)
