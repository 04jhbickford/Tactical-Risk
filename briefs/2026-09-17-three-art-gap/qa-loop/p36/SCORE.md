# p36 SCORE — V2.81.51-three-polish.36
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR61 stacked on PR60 `.35`. Tesla off. Quiet James.
**Arc plan:** t3026u (James YES).

Local 390 stills in this folder. Fail-closed: mid is painted Imhof + landcover,
not a wash over polygons; land/sea readable; continents split; East Med ships
above Italy; China outer-union; no labels/IPC; mid pip+N; Japan multi-type;
Confirm exclusive gold; painted albedo bound.

## P0 HARD — Layer A
| Gate | Verdict | Note |
|---|---|---|
| Painted landscape (not wash) | **PENDING stills** | Authored p36 plates + Imhof hillshade + landcover masses + canvas tooth. Baker hero alpha=0.84. |
| Imhof relief | **PENDING stills** | Alps / Himalayas / Rockies / Andes / Urals as volume + NW shade. Optional `world-land-normal.png`. |
| Albedo bound | **PENDING live** | `WORLD_LAND_ALBEDO_REV = 'p36'`. Throw if PNG miss / under 4096. |
| Soft-light stain OFF | **PASS** | fillStain not hero. Residual tooth only. |
| Sea stays slate-teal | **PASS code** | `.35` ocean grain 0.14 + teal punch + sea-water meshes held. |

## Layer B — war (KEEP)
| Gate | Verdict | Note |
|---|---|---|
| Quiet continents / select gold | **PASS code** | Punch 0.22. Luma-preserving grade, not .31 flood. |
| China outer-union | **PASS code** | Unchanged dissolve. |
| No map labels / no baked IPC | **PASS** | Baker does not call draw_badges. |
| Mid pip+N / Japan multi-type | **PASS code** | Unchanged LOD. |
| Confirm exclusive gold | **PASS code** | `#C4A35A`. |
| East Med z-order | **PASS code** | deck 3.60 / Italy 1.82 / pin south. |

Stills + live Vercel proof land after capture.
