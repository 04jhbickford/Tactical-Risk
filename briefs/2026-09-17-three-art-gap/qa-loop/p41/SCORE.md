# p41 SCORE — V2.81.52-three-polish.41
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** stacked on PR65 / `.40b`. Tesla off. Quiet James.
**STYLE LOCK:** Grok Imagine WORLD hero (topographic parchment, raised relief, hand-ripple seas). Oceania beautiful = secondary coastal language only.
**Albedo rev:** `p41`.
**Inspect:** `strategy=silhouetteFirst` · `coastRegistered` · `basemapUnderInk` · `maskPaintOff` · `selectOutlineOnly` · `selectWash=false` · `oceanCoastalRipples` · `styleRef=grok-imagine-world` · `oceanNoHatch`

Local 390 stills in this folder. Fail-closed: painted coasts hug the live
`territories.json` silhouette. Continuous Imagine hero basemap under ink overlays.
No `paste_through_mask` color. No dest-grow stretch. No hatch tile.
Select = gold/ink outline on continuous art.

## How style was matched
1. **Silhouette guide** — live `territories.json` land union at atlas
   4096×2340. Exact game geometry. Saved to refs + `silhouette-guide.png`.
2. **Imagine WORLD hero** — James's Grok Imagine plate is the STYLE REF and
   the continuous hero. `wrap_standard_world_to_game` (Americas-left → wrap UV)
   then `register_plate_to_silhouette`. No political borders from the plate.
3. **Oceania beautiful** — secondary coastal sage / tan only. Not the hero.
4. **Bake** — construction watercolor underpaints far holes *into* the union
   mask. Coasts = the guide. `maskPaintOff`.
5. **Polygons** — land + sea rings from the SAME `territories.json` are
   ink overlays only. Register by construction.
6. **Ocean** — same world-space painting + coastal hand-ripples following
   guide coasts. `oceanNoHatch`. Isoline hatch from the plate is lifted.
7. **Select** — gold/ink outline only. No wash fill.
8. **Bind** — `world-land-albedo.png?v=p41` + `world-sea-albedo.png?v=p41`.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| 1 Coast registration (Aus / Med / UK) | **PASS** | `coast-register-aus.png` / `coast-register-med.png` / `coast-register-uk.png`. Ink on painted coasts. No floating borders. |
| 2 Mid beauty ≥ STYLE REF family and ≥ .40b | **PASS** | `mid-vs-style-ref.png` right-hand = Imagine WORLD plate. |
| 3 Ocean coastal hand-ripples | **PASS** | `ocean-ripples.png`. `oceanCoastalRipples` · `oceanNoHatch`. |
| 4 Select = outline on art | **PASS** | `select-on-art.png`. `selectOutlineOnly`. Zero wash/fill/emissive. |

## Held .38 / .39 / .40b
| Gate | Verdict | Note |
|---|---|---|
| Unit count one | **PASS** | held |
| Opaque plastic + tan | **PASS** | held |
| Stack toggle | **PASS** | held |
| Cape Africa even | **PASS** | held |
| Med unclipped / China / Confirm gold / no labels | **PASS** | held |

## Computed proof
```
albedoBound:  true  4096×2340  albedoRev=p41  stainFallback=false
strategy=silhouetteFirst  coastRegistered  basemapUnderInk  maskPaintOff
styleRef=grok-imagine-world
oceanCoastalRipples  oceanNoHatch  coastalHandRipples  worldSeaBound
selectOutlineOnly  selectWash=false  selectFill=false  selectEmissiveWash=false
```

## Stills
- `silhouette-guide.png`
- `mid-vs-style-ref.png` (right = Imagine WORLD plate)
- `coast-register-aus.png` / `coast-register-med.png` / `coast-register-uk.png`
- `ocean-ripples.png` / `select-on-art.png` / `land-borders-ink.png`

**One line:** Imagine WORLD hero wrap-registered to live coasts; ink sits on paint

**Vercel:** https://tactical-risk20-m19ionyab-james-projects-20d8de40.vercel.app/?three=1  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/66 (stacked on PR65 / `.40b`)
