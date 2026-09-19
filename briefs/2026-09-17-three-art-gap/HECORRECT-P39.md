# James he-correct · polish.39 (19 Sep)
Source: James STYLE REF lock after `.38` Viz PASS (polygon overlaps worse,
ocean textureless, land ink weaker than sea, art not STYLE REF family).
Preview `?three=1` only. Do not merge. Live Canvas untouched. Tesla off.
Quiet James.

Stacked on PR63 / `.38`. Hold `.38` wins: unitCountOne, opaquePlastic,
tan contrast, stack toggle, Cape even, Med unclipped, China outer-union,
no labels/IPC, Confirm gold.

## WHY .38 FAILED (do not repeat)
1. Mask composite + heal stretched plates → worse overlaps.
2. oceanNoStipple killed dots but never authored hand-ripple sea.
3. Land ink weaker than sea rings in practice.
4. Risk washes + procedural Imhof diluted GenerateImage plate beauty.

## STYLE LOCK
Oceania beautiful: aged parchment tooth, soft coastal greens → tan inland,
hand-inked peak hatching, pale sea with FINE HAND-DRAWN RIPPLE LINES.

## P0 gates
1. Borders FIT — no worse overlaps/slivers. Dest UV = position only.
   Land rings dissolve/outer-union BEFORE stroke. Mesh fill = live polys.
2. Ocean has visible hand-ripple texture like STYLE REF (sea albedo, not
   cream vertex-only).
3. Land territory borders easy to read (land ink weight/alpha ≥ sea).
4. Mid board obviously same family as STYLE REF (side-by-side still).

## Fail closed if
- Mid still reads flat/GIS
- Ocean is textureless
- Borders don't fit
- Live Canvas touched
