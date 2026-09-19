# p41 SCORE — V2.81.52-three-polish.41
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** stacked on PR65 / `.40b`. Tesla off. Quiet James.
**STYLE LOCK:** Oceania beautiful parchment (James attached).
**Albedo rev:** `p41`.
**Inspect:** `strategy=silhouetteFirst` · `coastRegistered` · `basemapUnderInk` · `maskPaintOff` · `selectOutlineOnly` · `selectWash=false` · `oceanCoastalRipples` · `styleRef=oceania-beautiful` · `oceanNoHatch`

Local 390 stills in this folder. Fail-closed: painted coasts hug the live
`territories.json` silhouette. Continuous hero basemap under ink overlays.
No `paste_through_mask` color. No dest-grow stretch. No hatch tile.
Select = gold/ink outline on continuous art.

## How style was matched
1. **Silhouette guide** — live `territories.json` land union at atlas
   4096×2340. Exact game geometry. Saved to refs + `silhouette-guide.png`.
2. **GenerateImage** — STYLE REF (Oceania beautiful) + silhouette on every
   pass. Free world paint without the guide is killed.
3. **Bake** — `watercolor_into_silhouette` paints antique watercolor *into*
   the union land mask. Coasts = the guide. Theater gens with real-world
   Earth are not poured (IoU fail-closed). `maskPaintOff`.
4. **Polygons** — land + sea rings from the SAME `territories.json` are
   ink overlays only. Register by construction.
5. **Ocean** — same world-space painting + coastal hand-ripples following
   guide coasts. `oceanNoHatch`.
6. **Select** — gold/ink outline only. No wash fill.
7. **Bind** — `world-land-albedo.png?v=p41` + `world-sea-albedo.png?v=p41`.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| 1 Coast registration (Aus / Med / UK) | **PASS** | `coast-register-aus.png` / `coast-register-med.png` / `coast-register-uk.png`. Ink on painted coasts. No floating borders. |
| 2 Mid beauty ≥ STYLE REF family and ≥ .40b | **PASS** | `mid-vs-style-ref.png`. Parchment + coastal greens + tan inland. Geography is the board silhouette (not real-world Earth). |
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
styleRef=oceania-beautiful
oceanCoastalRipples  oceanNoHatch  coastalHandRipples  worldSeaBound
selectOutlineOnly  selectWash=false  selectFill=false  selectEmissiveWash=false
```

## Stills
- `silhouette-guide.png`
- `mid-vs-style-ref.png`
- `coast-register-aus.png` / `coast-register-med.png` / `coast-register-uk.png`
- `ocean-ripples.png` / `select-on-art.png` / `land-borders-ink.png`

**One line:** silhouette-first — paint into live coasts, ink registers by construction

**Vercel:** (preview URL after deploy)
**PR:** stacked on PR65 / `.40b`
