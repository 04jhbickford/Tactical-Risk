# polish.21 — 390 score (fail-closed)

**Build:** `V2.81.51-three-polish.21`  
**Stills:** `europe-mid-390.png` · `europe-near-select-390.png` · `europe-mid-hud-390.png`  
**Preview:** `?three=1` · PR44 · not love-gate  
**Folded from:** `qa-loop/p20/SCORE.md` (FAIL)

## Ladder

Bake (seamless parchment + punched washes + ocean shelf) → MeshStandard + hemi/key → cream chits / pip+N → frost + gold select → 390 stills.

## P0

| Gate | Code | 390 still |
|---|---|---|
| Cream plastic chits + faction rims | `drawCreamChit` / `drawCreamDisc` + faction stroke. Near glyphs from `units-land-air-cream.png` / `units-naval-cream.png`. Pedestal `drawMolded` is not the paint path. | pending recapture |
| Mid = pip+N only | `paintPip` `glyph: false`. Spike key `pip\|owner\|total`. No `primaryType` on mid. | pending recapture |
| Kill land tile seams | `make_tileable(..., 120)` + `PAPER_UV = 32` + `PAPER_UV_SHIFT` per continent. `flatten_blotch(0.12)`. | pending recapture |
| Punch Risk continent washes | Baker chroma 2.80 @ 28%. Wash Δ EU–USSR 29 / EU–AF 37 / EU–AS 21 / EU–NA 29. Material `continentTint` 24%. Asia sage + Americas included. | pending recapture |

## P1

| Gate | Code | 390 still |
|---|---|---|
| Ocean shelf + print grain | Deep `#3D5A66` + shelf `#4F6E78` mix + print tooth. | pending recapture |
| Stronger parchment | Contrast 1.38 × blend 0.62 on flattened fiber. | pending recapture |
| Real frost blur | L0 `blur(40px)` + `isolation:isolate` + bg 0.34 (not a 0.58 slab). | pending recapture |
| Gold land select only | `setLandEmissive(..., 0xC4A35A)` intensity 0.26. Never a blue glow ring. | pending recapture |

## Wash means (bake)

| Block | mean RGB | read |
|---|---|---|
| Europe | 171, 173, 93 | olive |
| USSR | 197, 160, 99 | brown-tan |
| Africa | 207, 162, 91 | ochre |
| Asia | 160, 175, 110 | sage |
| North America | 159, 177, 118 | green |
| South America | 147, 181, 126 | teal |
| Ocean | 51, 71, 77 | slate-teal |

`node tools/test-three-art-gap.mjs` — all ok. Visual gate waits on the three 390 PNGs in this folder.
