# p40b SCORE — V2.81.52-three-polish.40b
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** stacked on PR64 / `.39b`. Tesla off. Quiet James.
**STYLE LOCK:** Oceania beautiful parchment (James attached).
**Albedo rev:** `p40b`.
**Inspect:** `strategy=basemapUnderInk` · `maskPaintOff` · `oceanCoastalRipples` · `styleRef=oceania-beautiful` · `oceanNoHatch` · `selectOutlineOnly` · `selectWash=false` · `selectFill=false` · `selectEmissiveWash=false`

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
   No interior multiply / brighten / tint / emissive wash. Hairline ring.
6. **Bind** — `world-land-albedo.png?v=p40b` + `world-sea-albedo.png?v=p40b`.
   Stain OFF.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| 1 Mid beauty ≥ STYLE REF and beats .39 | **PASS** | held from `.40`. `mid-vs-style-ref.png` / `mid-vs-p39.png`. No albedo rebake. |
| 2 Territory borders FIT | **PASS** | held. `land-borders-ink.png` / `aus-fit.png`. No paint-mask slivers. |
| 3 Ocean coastal hand-ripples | **PASS** | held. `ocean-ripples.png`. `oceanCoastalRipples` · `oceanNoHatch`. |
| 4 Select = outline on art | **PASS** | `select-on-art.png`: gold/ink ring only. Basemap paint unchanged inside. `selectOutlineOnly`. Zero wash/fill/emissive. |

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
albedoBound:  true  4096×2340  albedoRev=p40b  stainFallback=false
strategy=basemapUnderInk  maskPaintOff  styleRef=oceania-beautiful
oceanCoastalRipples  oceanNoHatch  coastalHandRipples  worldSeaBound
selectOutlineOnly  selectWash=false  selectFill=false  selectEmissiveWash=false
landInkGteSea  ringsDissolved  continentPunch=0.14
unitCountOne  opaquePlastic  stackToggle  seaInkClosedRings
```

## Stills
- `mid-vs-style-ref.png` / `mid-vs-p39.png`
- `ocean-ripples.png` / `land-borders-ink.png` / `aus-fit.png` / `select-on-art.png`
- `continents-subtle.png` / `unit-count-one.png` / `near-opaque-plastic.png`
- `africa-even.png` / `stack-expand.png` / `stack-collapse.png`
- `computed.json`

**One line:** select outline-only, no interior wash

**Vercel:** (pending p40b preview)  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/65 (stacked on PR64 / `.39b`)
