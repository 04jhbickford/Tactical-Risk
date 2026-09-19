# p39 SCORE — V2.81.52-three-polish.39
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** stacked on PR63 / `.38`. Tesla off. Quiet James.
**STYLE LOCK:** Oceania beautiful parchment (James attached).
**Albedo rev:** `p39`.
**Inspect:** `styleRef=oceania-beautiful` · `oceanRipples` · `landInkGteSea` · `ringsDissolved` · `maskOnlyComposite`

Local 390 stills in this folder. Fail-closed: mid is STYLE REF family
(watercolor on aged parchment — sage coasts, tan interiors, peak hatching,
pale seas with hand-drawn ripple lines). No dest-grow stretch. No textureless
ocean. Land ink ≥ sea-zone ink. Mesh fill = live polys.

## How style was matched
1. **Lock plates** — Cursor GenerateImage (Tesla off) painted world, EU/AF,
   Asia, Oceania, Americas, Africa, and a hand-ripple ocean tile into
   `refs/p39-gen/` with the Oceania beautiful STYLE REF on every pass.
2. **Bake** — `paste_through_mask` dest UV = position only. Never grow dest
   to mask bbox. Continent Risk multiply ≤15% UNDER paint. Quiet Imhof.
   Australia last as a tight land crop from the STYLE REF family.
3. **Ocean** — authored ripple tile bound as sea albedo + emissive floor.
   Not cream vertex-only. `OCEAN_UV=48`.
4. **Ink** — dissolve/outer-union BEFORE stroke. Land 3.0/0.92 ≥ sea 2.8/0.88.
   Mesh fill uses live polygons (drop slivers only).
5. **Bind** — `world-land-albedo.png?v=p39` MeshStandard hero. Stain OFF.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| 1 Borders FIT | **PASS** | `aus-borders-fit.png`: Australia ring clean, no sliver ears, no dest-grow stretch. Mesh fill = live polys. |
| 2 Ocean ripples | **PASS** | `ocean-ripples.png`: hand-drawn ripple lines across parchment-sea. `oceanRipples: true`. Not cream vertex-only. |
| 3 Land borders readable | **PASS** | `land-borders-clear.png`: land partitions at mid 390 match sea-zone clarity. Land 3.0/0.92 ≥ sea 2.8/0.88. |
| 4 Mid = STYLE REF family | **PASS** | `mid-vs-style-ref.png`: parchment tooth, coastal sage, tan interiors, peak hatching, ripple sea. Same family as Oceania beautiful. |

## Held .38
| Gate | Verdict | Note |
|---|---|---|
| Unit count one | **PASS** | `unit-count-one.png` — peek shows one number per type. |
| Opaque plastic + tan | **PASS** | `near-opaque-plastic.png` |
| Stack toggle | **PASS** | `stack-expand.png` → minis; `stack-collapse.png` → pip+N. |
| Cape Africa even | **PASS** | `africa-even.png` — no L-band. |
| Med unclipped / China / Confirm gold / no labels | **PASS** | held. |

## Computed proof (390, local)
```
albedoBound:  true  4096×2340  albedoRev=p39  stainFallback=false
styleRef:     oceania-beautiful  watercolorParchment  maskOnlyComposite
oceanRipples  landInkGteSea  ringsDissolved  continentPunch=0.14
unitCountOne  opaquePlastic  stackToggle  seaInkClosedRings
```

## Stills
- `mid-vs-style-ref.png`
- `ocean-ripples.png` / `land-borders-clear.png` / `aus-borders-fit.png`
- `continents-subtle.png` / `unit-count-one.png` / `near-opaque-plastic.png`
- `africa-even.png` / `stack-expand.png` / `stack-collapse.png`
- `computed.json`

**Vercel:** https://tactical-risk20-89c8siwxu-james-projects-20d8de40.vercel.app/?three=1  
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/64 (stacked on PR63 / `.38`)
