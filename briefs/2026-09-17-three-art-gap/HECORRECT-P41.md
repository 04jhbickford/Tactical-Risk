# James he-correct · polish.41 (19 Sep)
Source: James t3058u after `.40b` — polygons do not match the background
image; style still isn’t as good as the grok imagine / Oceania STYLE REF.
Follow-up: James dropped the Grok Imagine WORLD hero plate. Fold in now.
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

## NEW PATH — silhouette-first + Imagine WORLD hero (fail-closed)
1. From live `territories.json` render a **coast/silhouette guide** at
   atlas resolution (exact game land geometry). Saved to refs + QA still
   `silhouette-guide.png`.
2. **STYLE REF = Grok Imagine WORLD hero** (topographic parchment, raised
   relief, hand-ripple seas). Oceania beautiful is secondary coastal
   language only.
3. Adapt THIS plate into the atlas: `wrap_standard_world_to_game` (Americas-left
   → game wrap UV) then `register_plate_to_silhouette` so live coasts own
   the paint. No political borders from the plate.
4. Bind as continuous hero basemap (`basemapUnderInk`). Territory ink
   from the SAME `territories.json` — coasts register **by construction**.
5. Sea: coastal hand-ripples following guide coasts; `oceanNoHatch` held.
6. Select outline-only held from `.40b`.
7. Held: unitCountOne, opaquePlastic, stack toggle, Cape even, Med,
   China outer-union, no labels/IPC, Confirm gold.

## Kill
- Free world paint without silhouette
- Per-territory color masks
- Select interior wash
- Ocean tile hatch
- Inventing a weaker GenerateImage world instead of this plate

## STYLE LOCK
Grok Imagine WORLD: topographic parchment, raised relief, hand-ripple seas.
Oceania beautiful: secondary coastal sage / tan language only.

## P0 gates
1. Coast registration — ink rings on painted coasts (zoom Aus, Med, UK).
   No floating borders.
2. Mid beauty ≥ THIS Imagine plate family and ≥ `.40b`.
   `mid-vs-style-ref.png` right-hand = Imagine WORLD plate.
3. Ocean coastal hand-ripples.
4. Select outline-only.

## Fail closed if
- Painted coasts are real-world Earth (alternate coastlines)
- Ink rings float off the paint
- Mid still reads flat GIS / worse than Imagine STYLE REF family
- Ocean is textureless or hatch-tiled
- Select re-tints the basemap
- Live Canvas touched
- Imagine plate soft-ignored / mid-vs-style-ref uses Oceania as STYLE REF
