# p36 SCORE — V2.81.51-three-polish.36
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR61 stacked on PR60 `.35`. Tesla off. Quiet James.
**Arc plan:** t3026u (James YES).

Local 390 stills in this folder. Fail-closed: mid is painted Imhof + landcover,
not a wash over polygons; land/sea readable; continents split; East Med ships
above Italy; China outer-union; no labels/IPC; mid pip+N; Japan multi-type;
Confirm exclusive gold; painted albedo bound.

## P0 HARD — Layer A
| Gate | Verdict | Note |
|---|---|---|
| Painted landscape (not wash) | **PASS** | `mid-painted-relief.png` / `mid-vs-p35.png`: Alps volume, Central Europe forest masses, Sahara dune tooth, parchment grain. Left=.35 flat wash, right=.36 printed board. |
| Imhof relief | **PASS** | Alps ridge across Switzerland/N Italy; Himalayas in Asia crop; NW hillshade baked. Inspect `imhofRelief` + `normalBound`. |
| Landcover + canvas tooth | **PASS** | Forest canopy stain, arid grain, steppe khaki, tundra pale. Inspect `landcoverBound` + `canvasTooth`. |
| Albedo bound | **PASS** | Local + live Vercel: `painted albedo bound 4096 2340 …?v=p36`. Inspect `albedoBound: true`, `stainFallback: false`, `albedoRev: p36`. |
| Soft-light stain OFF | **PASS** | fillStain not hero. Residual tooth only. |
| Sea stays slate-teal | **PASS** | `mid-land-sea.png`: Med / Black Sea / Atlantic are water, not stained land. |

## Layer B — war (KEEP)
| Gate | Verdict | Note |
|---|---|---|
| Quiet continents / select gold | **PASS** | `mid-continents.png`: EU olive / AS khaki-tan / AF ochre. Punch 0.22. Select gold wins. |
| China outer-union | **PASS** | `china-select-hold.png`: rings=1 polys=2. No internal seam. |
| No map labels / no baked IPC | **PASS** | Name sprites gone. Atlas has no +N pills. Counts in HUD/peek. |
| Mid pip+N / Japan multi-type | **PASS** | Mid idle pip+N. `japan-near-hold.png`: INF + tank + fighter + sea. |
| Confirm exclusive gold / idle quiet-dark | **PASS** | Confirm `#C4A35A`. Idle `rgba(30, 36, 32, 0.88)` / Select a territory. |
| East Med z-order | **PASS** | `east-med-select-no-clip.png`: British sub above Italy edge. `deck=3.60` / `italyHeight=1.82` / `shipsAboveItaly=true`. Pin south (1262, 878). |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Painted board, not GIS wash | **PASS** | Mid 390 is a printed landscape under war overlay. |
| Ocean printed slate-teal | **PASS** | Teal basin, quiet dashed lanes. |
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
              albedoRev=p36 · imhofRelief · landcoverBound · canvasTooth
              paintedRelief · normalBound · continentPunch=0.22
              seaDeckClear · eastMedPinSouth · noBlotchAtlas
continents:   7 (NA 24 / SA 12 / EU 30 / ME 18 / AF 27 / AS 33 / OC 39)
```

## How Layer A was authored / bound
1. **Plates** — Cursor GenerateImage (Tesla off) painted Europe/Africa theater, Asia theater, world, and landcover tiles into `briefs/2026-09-17-three-art-gap/refs/p36-gen/`. Silhouette guides + prior homage plates as refs. Not a copyright scan.
2. **Bake** — `tools/bake-world-land-albedo.py` clips plates through live `territories.json` masks at hero alpha **0.84 / 0.82**. Quiet continent underpaint, luma-preserving `grade_chroma` (not a flatten). Imhof height + NW hillshade on Alps/Himalayas/Rockies/Andes/Urals. Forest-mass / arid / steppe / tundra tooth. Visible parchment canvas overlay. No badges, no oval stamps.
3. **Bind** — `loadWorldLandAlbedo` loads `world-land-albedo.png?v=p36` and throws if missing or <4096. MeshStandard samples it as hero. Optional `world-land-normal.png` at `IMHOF_NORMAL_SCALE=0.34`. Inspect computes `albedoBound` from the Germany top map === the painted texture.

## Stills
- `mid-painted-relief.png` — required Layer A proof
- `mid-vs-p35.png` — wash-family vs printed board
- `mid-land-sea.png` / `mid-continents.png`
- `east-med-select-no-clip.png` — required z-order proof
- `china-select-hold.png` / `japan-near-hold.png`
- `computed.json` — machine-read CSS + inspect + eastMed deck
- `vercel-live-mid-390.png` — live preview `?three=1` = `V2.81.51-three-polish.36`

**Vercel:** https://tactical-risk20-i9xfi3zbh-james-projects-20d8de40.vercel.app/?three=1  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/61 (stacked on PR60 / `.35`)
