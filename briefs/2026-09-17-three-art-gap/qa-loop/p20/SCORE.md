# polish.20 — FAIL (fail-closed)

**Build:** `V2.81.51-three-polish.20`  
**Stills:** `qa-p20/europe-mid-390.png` · `qa-p20/europe-near-select-390.png` · `qa-p20/europe-mid-hud-390.png` (copies in this folder)  
**Preview:** `?three=1` · PR44 · not love-gate  

Viz+Arc 390 score. Fold every P0 into polish.21. Do not wait for James.

## P0 — FAIL

| Gate | Verdict | 390 read |
|---|---|---|
| Cream plastic **chits** + faction rims | **FAIL** | Black pedestal minis (soldier / ship / plane silhouettes). Not cream molded discs. Not faction rims. |
| Mid = pip+N only | **FAIL** | Type parade at mid: infantry, tanks, fighters, subs all drawn. STACK-LOD mid must be one cream pip + N. |
| Kill land tile seams | **FAIL** | Parchment still tiles / GIS-flat in places. Wallpaper blotch + UV repeat readable. |
| Punch Risk continent washes | **FAIL** | One khaki planet. Europe olive / USSR brown-tan / Africa ochre / Asia sage / Americas do not split at 390. |

## P1 — FAIL

| Gate | Verdict | 390 read |
|---|---|---|
| Ocean shelf + print grain | FAIL | Slate-teal is closer, but shelf band + print tooth are quiet. |
| Stronger parchment | FAIL | Fiber is thin; land reads as a flat fill under the minis. |
| Real frost blur | FAIL | L0 is an opaque dark slab. Board does not show through. |
| Gold land select only | FAIL | Select ink exists; land body is not gold/amber. No blue glow (that part holds). |

## Fold into polish.21

1. Paint cream **chits** (disc + faction rim). Kill pedestal / Lucide / number-coin / black stamp paths at 390 mid **and** near.
2. Mid/far texture key is `pip\|owner\|total` — no type, no glyph. Near = typed cream discs from `units-*-cream.png`.
3. Rebake parchment tileable (wide blend) + per-continent UV shift. No GIS-flat, no wallpaper seam.
4. Punch continent washes (chroma + hex tint) so Europe / USSR / Africa / Asia / Americas split at 18–28% over parchment.
5. P1: ocean shelf+grain, stronger paper tooth, L0 frost (blur + isolation, not a 0.58 slab), gold land emissive only.

Next stills: `qa-loop/p21/` @ 390 mid / near / HUD.
