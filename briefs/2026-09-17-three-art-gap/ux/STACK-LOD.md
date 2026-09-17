# Unit stack / zoom LOD — UX lock (James 17 Sep)
Icons washed out + placement fails across zoom and mix of counts/types. Research-backed rules for Three preview.

## Bar (steal patterns, not art)
- **Supreme Commander / Homeworld:** zoom-out → strategic icons with distinct shape by type; silhouette exaggeration
- **Civ 5/6:** unit flag / banner above stack; count badge; don’t scale labels with world
- **HoMM:** tiny count chip on stack corner — primary = silhouette, secondary = number
- **Stellaris:** cluster/stack when overcrowded; inspect expands
- **Polytopia:** city mark → name → meta; one clear mark per tile at mid zoom
- **A&A physical:** colored plastic by faction; stack by overlapping pieces slightly; density → pile + count

## Non-negotiables
1. **Contrast first** — units must punch off parchment/ocean. Dark faction plastic OR cream body + **thick dark outline** (≥2px screen) + drop shadow. Washed/low-contrast = fail.
2. **Screen-space sizing** — chit pixel size stays roughly constant across zoom (clamp min/max). Never shrink to ant-size; never blow past territory.
3. **LOD ladder (Europe @390 must pass)**
   | Zoom | Territory read |
   |---|---|
   | Far | One faction pip + **total N** badge only |
   | Mid | Pip + N; if multi-type, small type dots or single “mixed” mark — **no full type parade** |
   | Near | Up to 3–4 typed plastic silhouettes + “+K” overflow chip |
   | Select / peek | Full type×count list in L1 peek card (not all on map) |
4. **Collision / layout** — spiral or arc around territory centroid; min gap ≥4px screen; if overflow → collapse to pip+N+badge. Never overlapping illegible piles.
5. **One owner color** — faction plastic color is the stack identity; don’t rely on cream-on-sand.
6. **Count badge** — always high-contrast (dark pill / white numeral); corner of mark; readable at mid.
7. **Map vs chrome** — type names live in peek, not under every chit.

## Fail if
- Cream-on-parchment washout
- All unit types drawn at mid zoom in dense Europe
- Chits scale 1:1 with camera to illegible ants
- No overflow strategy for 10+ mixed units

## Refs on disk
- `../refs/aa-board-continents-texture.png` — continent washes + cardboard grain
- `../refs/aa-plastic-units-photo.png` — faction-colored molded plastic
