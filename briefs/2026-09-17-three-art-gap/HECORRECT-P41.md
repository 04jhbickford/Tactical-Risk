# James he-correct · polish.41 (19 Sep)
Source: James t3058u after `.40b` — polygons do not match the background
image; style still isn’t as good as the grok imagine / Oceania STYLE REF.
Preview `?three=1` only. Do not merge. Live Canvas untouched. Tesla off.
Quiet James.

Stacked on PR65 / `.40b`. Hold `.38`/`.39`/`.40b` wins: unitCountOne,
opaquePlastic, tan contrast, stack toggle, Cape even, Med unclipped,
China outer-union, no labels/IPC, Confirm gold, oceanNoHatch,
selectOutlineOnly (`selectWash=false`).

## WHY .40 FAILED (do not repeat)
1. Free-painted a real-world Earth basemap, then overlaid
   `territories.json` rings → coast registration miss (floating borders).
2. GenerateImage quality still below the Oceania / Imagine STYLE REF
   when used as an unconstrained world paint.

## NEW PATH — silhouette-first (fail-closed)
1. From live `territories.json` render a **coast/silhouette guide** at
   atlas resolution (exact game land geometry). Saved to refs + QA still
   `silhouette-guide.png`.
2. Cursor GenerateImage with BOTH STYLE REF (Oceania beautiful) AND the
   silhouette guide. Paint antique watercolor *into* the silhouette.
3. Bind as continuous hero basemap (`basemapUnderInk`). Territory ink
   from the SAME `territories.json` — coasts register **by construction**.
4. Sea: coastal hand-ripples following guide coasts; `oceanNoHatch` held.
5. Select outline-only held from `.40b`.
6. Held: unitCountOne, opaquePlastic, stack toggle, Cape even, Med,
   China outer-union, no labels/IPC, Confirm gold.

## Kill
- Free world paint without silhouette
- Per-territory color masks
- Select interior wash
- Ocean tile hatch

## STYLE LOCK
Oceania beautiful: aged parchment tooth, soft coastal greens → tan inland,
hand-inked peak hatching, pale sea with FINE HAND-DRAWN RIPPLE LINES.

## P0 gates
1. Coast registration — ink rings on painted coasts (zoom Aus, Med, UK).
   No floating borders.
2. Mid beauty ≥ STYLE REF family and ≥ `.40b`.
3. Ocean coastal hand-ripples.
4. Select outline-only.

## Fail closed if
- Painted coasts are real-world Earth (alternate coastlines)
- Ink rings float off the paint
- Mid still reads flat GIS / worse than STYLE REF family
- Ocean is textureless or hatch-tiled
- Select re-tints the basemap
- Live Canvas touched
