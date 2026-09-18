# James he-correct · polish.36 (18 Sep)
Source: James YES on Arc plan (t3026u) after `.35` readability PASS.
Preview `?three=1` only. Do not merge. Live Canvas untouched. Tesla off.
Quiet James.

`.35` fixed blotches / land-sea / continents / East Med z-order, but mid 390
still reads as a **soft wash over polygons**. Painted world albedo must leap
to board-textured, artistic, game-board status.

Painted landscape FIRST. War overlay SECOND.

## Steal method (homage, not clones)
War of the Ring / GoT 2e / Scythe / Inis / Francesca Baerald + Eduard Imhof /
Civ VI antique basemap / A&A Anniversary layering (painted ground under
sea-zone grammar). NOT a copyright scan.

## Layer A — painting (P0 NEW)
1. Image-gen / paint authored world land albedo — brushwork, ink ranges,
   forest/desert/steppe/tundra/jungle masses, parchment tooth.
   NOT a procedural stain stack.
2. Imhof relief: dominant ranges only (Alps / Himalayas / Rockies / Andes /
   Urals) as volume + NW hillshade. Optional normal/height companion if
   phone-cheap.
3. Composite through live territory masks →
   `assets/three/board/world-land-albedo.png` (4096+). MeshStandard samples
   as hero. Soft-light stain OFF or invisible residual.
4. Coasts with weight; sea stays the separate printed slate-teal deck from
   `.35` (improve, don’t muddy).
5. Prove `albedoBound` + `stainFallback:false` on live Vercel. Throw if PNG
   miss / under 4096.

## Layer B — war (KEEP fail-closed from .35)
- Quiet continent washes; select gold wins
- China outer union only
- No name sprites / no IPC on map
- Mid pip+N; Japan multi-type; Confirm exclusive gold; quiet lanes
- East Med ships ABOVE Italy (deck > land lid; pin south)

## Fail closed if
- Mid still wash-family
- Land/sea muddy
- Continents unreadable
- China seam
- Labels/IPC return
- Confirm loses gold
- E.Med under Italy
- Live Canvas touched
