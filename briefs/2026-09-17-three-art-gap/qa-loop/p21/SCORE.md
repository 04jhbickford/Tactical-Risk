# polish.21 — 390 score (fail-closed)

**Build:** `V2.81.51-three-polish.21`  
**Stills:** `europe-mid-390.png` · `europe-near-select-390.png` · `europe-mid-hud-390.png` (also `qa-p21/`)  
**Preview:** `?three=1` · not love-gate  
**Folded from:** `qa-loop/p20/SCORE.md` (FAIL)

## Ladder

Bake (seamless parchment + punched washes + ocean shelf) → MeshStandard + hemi/key → cream chits / pip+N → frost + gold select → 390 stills.

## P0

| Gate | 390 still | Verdict |
|---|---|---|
| Cream plastic chits + faction rims | Mid/near are cream discs with dark outline + faction rim (DE grey / SU green / UK gold). Near glyphs from `units-*-cream.png` (INF/TNK/FTR). No black pedestal minis. | **PASS** |
| Mid = pip+N only | One cream pip + N per territory. No soldier/ship/plane parade. Near = 3 typed + `+K`. | **PASS** |
| Kill land tile seams | No wallpaper seam / GIS-flat in the Europe frame. `make_tileable(120)` + `PAPER_UV = 32` + per-continent UV shift. | **PASS** |
| Punch Risk continent washes | Europe olive `(146,156,128)` vs USSR tan `(195,174,125)` vs Africa ochre. Screen Δ EU–USSR 52 / EU–AF 54. Asia sage + Americas in the bake. Not a khaki planet. Not candy Risk red/green. | **PASS** |

## P1

| Gate | 390 still | Verdict |
|---|---|---|
| Ocean shelf + print grain | Slate-teal `(92,116,124)` with tooth. Deep `#3D5A66` + shelf `#4F6E78`. | **PASS** |
| Stronger parchment | Fiber reads at near; land is paper not a hex fill. | **PASS** |
| Real frost blur | L0 samples `(78,101,106)` — ocean shows through (not `#1E2420` slab). `blur(40px)` + `isolation` + bg 0.34. | **PASS** |
| Gold land select only | Germany gold/amber edge + warm land. No blue glow. Confirm `#C4A35A`. | **PASS** |

## Wash bake (tiles)

| Block | mean RGB | read |
|---|---|---|
| Europe | 171, 173, 93 | olive |
| USSR | 197, 160, 99 | brown-tan |
| Africa | 207, 162, 91 | ochre |
| Asia | 160, 175, 110 | sage |
| North America | 159, 177, 118 | green |
| South America | 147, 181, 126 | teal |
| Ocean | 51, 71, 77 | slate-teal |

Bake Δ EU–USSR 29 / EU–AF 37 / EU–AS 21 / EU–NA 29. Ownership is a 18% tint on top — continent wash stays the geography read.

`node tools/test-three-art-gap.mjs` — all ok.
