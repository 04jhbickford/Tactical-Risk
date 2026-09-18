# p28 SCORE — V2.81.51-three-polish.28
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR52 `.27` + PR51 `.26` chrome/gold locks kept. Tesla off. Quiet James.
**Addendum:** Civ clip is geography *mechanics* only — not low-poly / tilt-shift / ROMA art.

Local 390 stills land in this folder after the first preview pass. Fail-closed: idle CTA is **not** gold; zoom is **not** mustard; PLACE is **not** gold; mid has **zero** type parade; Confirm keeps exclusive gold; near/select/tray are molded minis not ring-discs or glyph-chits; map is not flat color blobs.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Mid geography readable (not flat blobs) | **WIP** | Atlas UVs un-mirrored; louder biome + hatch + stipple + shelf + rivers. Stills pending. |
| Mountain relief + shadow | **WIP** | Alps/Himalaya/Rockies/Andes hatch + tile stamps + taller sculpt. |
| Forest as clumps | **WIP** | Forest tile clumps + stipple dots. Not a green fill. |
| Coast shelf vs deep ocean | **WIP** | Wider turquoise `#8EC4C6` shelf vs `#3D5A66` deep. |
| Rivers / inland water | **WIP** | Thicker printed + Line2 drainage. |
| Land undulation | **WIP** | Louder `sculptLandRelief`. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + N. No soldiers/tanks at mid idle. |
| Near / select / tray = molded A&A minis | **WIP** | Select expands minis; peek 60px faction plastic; tint no longer crushes to black glyphs. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select ring | **PASS** | Confirm `#C4A35A`. Zoom/PLACE frost. |
| Zoom / PLACE quiet frost | **PASS** | Zoom `0.62`, PLACE `0.42`. Not `#C4A35A`. |

## How it was implemented
- **Geography:** Fixed world-atlas UVs (mesh X was mirrored). Louder ridge hatch/shade, forest stipple, coast shelf, rivers, IPC dots, capital roundels. Homage tiles, no copyright board scans.
- **Minis:** Same packed `units-land-minis.png` / `units-naval-minis.png`. Recolor keeps sculpt; near OR select shows minis; peek icons 60px. Mid `paintPip` stays cream + N.
