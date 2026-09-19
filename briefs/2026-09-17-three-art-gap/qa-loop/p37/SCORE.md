# p37 SCORE — V2.81.51-three-polish.37
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR62 stacked on PR61 `.36`. Tesla off. Quiet James.
**STYLE LOCK:** Oceania watercolor parchment (James attached).

Local 390 stills in this folder. Fail-closed: mid is STYLE REF family
(watercolor on aged parchment — sage coasts, tan interiors, peak hatching,
pale washed seas). No rectangular tiles. No Australia color-change line.
No Africa blotches. Sea ink = closed water rings. Units bare plastic.
Med ships above Italy. China outer-union. No labels/IPC. Confirm gold.

## How style was matched
1. **Lock plate** — Cursor GenerateImage (Tesla off) painted the Oceania
   watercolor parchment lock plus Europe/Africa, Asia, world, and ocean-wash
   tiles into `refs/p37-gen/`. Not a copyright scan.
2. **Bake** — `tools/bake-world-land-albedo.py` composites those plates
   through live `territories.json` masks (`paste_through_mask`). Dest UV is
   positioning only — never a rectangular alpha (that was the Australia /
   Africa seam). Australia last as a tight land crop from the STYLE REF.
   Feathered joins. Luma-only void lift (no mix toward parchment). Sepia
   hand-inked coasts. Soft peak hatching. Stain OFF.
3. **Bind** — `loadWorldLandAlbedo` loads `world-land-albedo.png?v=p37` and
   throws if missing or <4096. MeshStandard samples it as hero (`color` white).
4. **Iterate vs mid still** — first capture washed the plates to pale cream
   (ACES 1.22 + continent multiply + IBL). Paper Linear tone-map, no
   RoomEnvironment, identity land tint, watercolor emissive floor, warm
   washed sea. Recaptured until `australia-vs-style-ref.png` and
   `mid-vs-style-ref.png` share the lock language.

## P0 HARD — Layer A
| Gate | Verdict | Note |
|---|---|---|
| Mid still = STYLE REF family | **PASS** | `mid-vs-style-ref.png` / `australia-vs-style-ref.png`: sage coastal ring, tan interior, peak hatching, aged paper. Same wash family as the lock (game a hair more ochre; lock creamier). |
| No rectangular tiles / plate seams | **PASS** | `australia-no-seam.png`: no artificial color-change line across Australia. Mask-only joins. |
| Even lighting (no Africa blotches) | **PASS** | `africa-even.png`: even ochre parchment, no brightness patches. |
| Albedo bound | **PASS** | `painted albedo bound 4096 2340 …?v=p37`. Inspect `albedoBound: true`, `stainFallback: false`, `albedoRev: p37`, `watercolorParchment`, `styleRef: oceania-watercolor`. |
| Soft-light stain OFF | **PASS** | fillStain not hero. Continent punch 0 on bound albedo. |
| Pale washed seas | **PASS** | `mid-land-sea.png`: Med / Atlantic are parchment-wash water, not stained land, not slate-teal candy. |

## Layer B — war (KEEP)
| Gate | Verdict | Note |
|---|---|---|
| Sea-zone ink = closed water rings | **PASS** | `sea-zones-ink.png` / Australia ocean: closed polygons from `territories.json`. No centroid dots. `waterInk` + `seaInkClosedRings`. |
| Unit backgrounds unified | **PASS** | `unit-bg-unified.png`: all bare plastic + contact shadow. No mixed black rectangular sheets. `unitBgUnified: true`. |
| Med ships above Italy / unclipped | **PASS** | `med-no-clip.png` / `east-med-select-no-clip.png`: ships in the basin, not under Italy, not clipped by the peek sheet. Select still works (gold outline + Confirm). `deck=3.60` / `italyHeight=1.82` / `shipsAboveItaly=true`. |
| China outer-union | **PASS** | `china-hold.png`: rings=1 polys=2. No internal seam. |
| No map labels / no baked IPC | **PASS** | Name sprites gone. Atlas has no +N pills. Counts in HUD/peek only. |
| Mid pip+N / Japan multi-type | **PASS** | Mid idle pip+N. `japan-near.png`: INF + tank + sea + peek fighter/FAC/AA. |
| Confirm exclusive gold / idle quiet-dark | **PASS** | Confirm `#C4A35A`. Idle `rgba(30, 36, 32, 0.88)` / Select a territory. |
| Stack toggle (t3034u) | **PASS** | `stack-expand.png` → molded troops. `stack-collapse.png` → same control collapses to pip+N. `stackToggle: true`. Not sticky. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Painted board, not GIS wash | **PASS** | Mid 390 is watercolor parchment under war overlay. |
| Ocean printed pale wash | **PASS** | Warm parchment-sea, quiet dashed lanes, closed sea ink. |
| Units mid pip / near minis | **PASS** | Mid pip+N. Near faction plastic. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
lod:          mid idle / near on East Med + Japan
china:        rings=1 polys=2
eastMed:      deck=3.60 italyHeight=1.82 shipsAboveItaly=true pin=(1262,878)
inspect:      paintedAlbedo · albedoBound · stainFallback=false · 4096×2340
              albedoRev=p37 · watercolorParchment · styleRef=oceania-watercolor
              featheredJoins · evenLighting · imhofRelief=false
              continentPunch=0 · seaDeckClear · eastMedPinSouth
              unitBgUnified · seaInkClosedRings · noMapLabels · noBakedIpc
              stackToggle
stackExpand:  pip=false minis=true selected
stackCollapse: pip=true minis=false selected (same land; not sticky)
continents:   7 (NA 24 / SA 12 / EU 30 / ME 18 / AF 27 / AS 33 / OC 39)
```

## Stills
- `mid-vs-style-ref.png` — required Layer A side-by-side
- `australia-vs-style-ref.png` / `australia-no-seam.png`
- `africa-even.png` / `sea-zones-ink.png`
- `med-no-clip.png` / `unit-bg-unified.png`
- `stack-expand.png` / `stack-collapse.png` — t3034u toggle proof
- `china-hold.png` / `japan-near.png`
- `computed.json` — machine-read CSS + inspect + eastMed deck
- `vercel-live-mid-390.png` — live preview `?three=1` = `V2.81.51-three-polish.37`
- `vercel-live-inspect.json` — `albedoBound` · `albedoRev=p37` · `styleRef=oceania-watercolor`

**Vercel:** https://tactical-risk20-en5nvy2y0-james-projects-20d8de40.vercel.app/?three=1  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/62 (stacked on PR61 / `.36`)
