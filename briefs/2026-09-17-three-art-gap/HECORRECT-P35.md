# James he-correct · polish.35 (18 Sep)
Source: love-gate PASS on `.34`, then James reopen. Preview `?three=1` only.
Do not merge. Live Canvas untouched. Tesla off. Quiet James.

James (exact): “It is prettier but it’s still got weird color markings over
the map, it’s hard to make out land and sea territories, i can’t tell what
is one continent vs another. Pieces in certain territories (like east
Mediterranean Sea zone) fold under territories (like Italy) when selecting
the tile.”

`.34` painted albedo is bound (keep). Theater plates at high alpha + biome
multiply + oval ridges + baked +N pills left blotches/seams. Ocean grain
muddied sea toward parchment. Runtime continent tint was 0 on the hero
atlas. East Med pin sat too far north; sea decks sat under Italy’s lid.

## KEEP (PASS — fail-closed)
- Painted world albedo stays bound (improve, don’t revert to stain wash)
- China select: outer union only, no internal seam
- No permanent name sprites; no IPC baked into land atlas
- Mid pip+N; Japan multi-type; Confirm exclusive gold; quiet lanes; idle quiet-dark

## P0 HARD — four James bars
1. **Kill weird color markings/blotches** — no stray chroma stamps, gen blotch,
   theater-join seams, loud biome blotches. Clean coherent printed board.
2. **Land vs sea readable at mid 390** — land parchment/painted; sea clearly
   water (slate-teal printed ocean). Sea zones must not look like stained land.
3. **Continents distinguishable** — quiet Risk-style continent color washes so
   Europe/Asia/Africa/NA/etc readable for continent bonus. Quiet enough select
   gold still wins (not .31 loud wash).
4. **Piece z-order** — East Mediterranean (and similar sea) units must NOT fold
   under adjacent land (Italy) on select or idle. Fix renderOrder / depth /
   polygonOffset / Y-lift. Prove with still: East Med select, ships above
   Italy edge.

## Fail closed if
- Land/sea muddy
- Continents unreadable
- E.Med pieces still under Italy
- China seam returns
- Labels/IPC return
- Confirm loses exclusive gold
