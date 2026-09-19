# p40 SCORE — V2.81.52-three-polish.40
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** stacked on PR64 / `.39b`. Tesla off. Quiet James.
**STYLE LOCK:** Oceania beautiful parchment (James attached).
**Albedo rev:** `p40`.
**Inspect:** `strategy=basemapUnderInk` · `maskPaintOff` · `oceanCoastalRipples` · `styleRef=oceania-beautiful` · `oceanNoHatch` · `selectOutlineOnly`

Local 390 stills in this folder. Fail-closed: mid is STYLE REF family
and beats `.39`. Continuous hero basemap under ink overlays. No
`paste_through_mask` color. No dest-grow stretch. No hatch tile.
Select = gold/ink outline on continuous art.

## How style was matched
1. **Hero basemap** — Cursor GenerateImage (Tesla off) painted a wrap-layout
   world (SA left, EU/AF, Asia, Aus, NA right) plus theater plates into
   `refs/p40-gen/` with the Oceania beautiful STYLE REF on every pass.
2. **Bake** — `build_basemap` fills the atlas with the continuous hero.
   Theater/Oceania enrich is bbox + heavy feather only. NEVER
   `paste_through_mask` for color. `maskPaintOff`.
3. **Polygons** — land + sea rings from `territories.json` are ink overlays
   only. Mesh fill samples continuous art. No per-territory paint mask.
4. **Ocean** — same world-space painting + coastal hand-ripples. Hatch tile
   / `OCEAN_UV` stay dead (`oceanNoHatch`).
5. **Select** — gold/ink outline only. No wash fill. No per-poly re-tint.
6. **Bind** — `world-land-albedo.png?v=p40` + `world-sea-albedo.png?v=p40`.
   Stain OFF.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| 1 Mid beauty ≥ STYLE REF and beats .39 | **PASS** | `mid-vs-style-ref.png` / `mid-vs-p39.png`: parchment tooth, sage coasts, tan interiors. Same family as Oceania beautiful. Warmer and less GIS than `.39b`. |
| 2 Territory borders FIT | **PASS** | `land-borders-ink.png` / `aus-fit.png`: ink overlays on continuous art. No paint-mask slivers. |
| 3 Ocean coastal hand-ripples | **PASS** | `ocean-ripples.png`: organic cool coastal strokes, density falloff. `oceanCoastalRipples` · `oceanNoHatch`. |
| 4 Select = outline on art | **PASS** | `select-on-art.png`: gold/ink ring only. Art does not re-tint per poly. `selectOutlineOnly`. |

## Held .38 / .39
| Gate | Verdict | Note |
|---|---|---|
| Unit count one | **PASS** | `unit-count-one.png` — peek shows one number per type. |
| Opaque plastic + tan | **PASS** | `near-opaque-plastic.png` |
| Stack toggle | **PASS** | `stack-expand.png` → minis; `stack-collapse.png` → pip+N. |
| Cape Africa even | **PASS** | `africa-even.png` — no L-band. |
| Med unclipped / China / Confirm gold / no labels | **PASS** | held. |

## Computed proof (390, local)
```
albedoBound:  true  4096×2340  albedoRev=p40  stainFallback=false
strategy=basemapUnderInk  maskPaintOff  styleRef=oceania-beautiful
oceanCoastalRipples  oceanNoHatch  coastalHandRipples  worldSeaBound
selectOutlineOnly  landInkGteSea  ringsDissolved  continentPunch=0.14
unitCountOne  opaquePlastic  stackToggle  seaInkClosedRings
```

## Stills
- `mid-vs-style-ref.png` / `mid-vs-p39.png`
- `ocean-ripples.png` / `land-borders-ink.png` / `aus-fit.png` / `select-on-art.png`
- `continents-subtle.png` / `unit-count-one.png` / `near-opaque-plastic.png`
- `africa-even.png` / `stack-expand.png` / `stack-collapse.png`
- `computed.json`

**One line:** mask paint off → basemap under ink.

**Vercel:** https://tactical-risk20-l2v69lmur-james-projects-20d8de40.vercel.app/?three=1  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/65 (stacked on PR64 / `.39b`)
