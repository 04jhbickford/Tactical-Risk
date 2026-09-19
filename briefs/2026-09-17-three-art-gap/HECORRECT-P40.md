# James he-correct · polish.40 (19 Sep)
Source: James strategy invert after `.39` art looked worse than prior
(t3053u): generate an artistic HD map, then draw polygons on top.
Preview `?three=1` only. Do not merge. Live Canvas untouched. Tesla off.
Quiet James.

Stacked on PR64 / `.39b`. Hold `.38`/`.39` wins: unitCountOne, opaquePlastic,
tan contrast, stack toggle, Cape even, Med unclipped, China outer-union,
no labels/IPC, Confirm gold, oceanNoHatch.

## WHY .39 FAILED (do not repeat)
1. GenerateImage theater plates → `paste_through_mask` through territory
   polygons shredded beauty and worsened borders.
2. Per-territory color paint created slivers at joins.
3. Select wash re-tinted continuous art per polygon.

## NEW PATH (fail-closed)
1. **Hero basemap** — continuous artistic HD world land + sea albedo
   matching STYLE REF (Oceania beautiful parchment). Unbroken paint.
2. **Polygons on top** — land + sea rings from `territories.json` as
   INK OVERLAYS only (borders + select highlight). No fill-by-mask.
3. Image-gen: Cursor GenerateImage with STYLE REF on every plate.
   Fewer larger theater paintings composited by geographic bbox + heavy
   feather. NEVER `paste_through_mask` per territory for color.
4. Sea = world-space atlas; coastal-following hand-ripples; no tile hatch.
5. Select = gold/ink outline on continuous art.

## STYLE LOCK
Oceania beautiful: aged parchment tooth, soft coastal greens → tan inland,
hand-inked peak hatching, pale sea with FINE HAND-DRAWN RIPPLE LINES.

## P0 gates
1. Mid beauty ≥ STYLE REF family and BEATS `.39` (side-by-side still).
2. Territory borders = readable ink overlays that FIT (no paint-mask slivers).
3. Ocean organic coastal hand-ripples.
4. Select = gold/ink outline on continuous art (art does not re-tint).

## Fail closed if
- Mid still reads flat/GIS or worse than `.39`
- Ocean is textureless or hatch-tiled
- Borders don't fit / paint-mask slivers return
- Select re-tints the basemap
- Live Canvas touched
