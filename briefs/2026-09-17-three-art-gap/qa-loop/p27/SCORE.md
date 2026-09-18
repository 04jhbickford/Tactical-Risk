# p27 SCORE — V2.81.51-three-polish.27
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR51 `.26` chrome/gold locks kept. Tesla off. Quiet James.
**Addendum:** Civ clip is geography *mechanics* only — not low-poly / tilt-shift / ROMA art.

Local + live 390 stills in this folder. Fail-closed: idle CTA is **not** gold; zoom is **not** mustard; PLACE is **not** gold; mid has **zero** type parade; Confirm keeps exclusive gold; near units are molded minis not glyph-chits; map is not flat color blobs.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Mid geography readable (not flat blobs) | **PASS** | 390 mid: snow Scandinavia, lush olive Europe, arid ochre Africa, tan steppe east. Biome wash + printed parchment. |
| Mountain relief + shadow | **PASS** | Alps/Himalaya/Rockies/Andes ridges baked + vertex sculpt. Soft SE shade on world atlas. South Europe reads browner/higher. |
| Forest as clumps | **PASS** | Forest tile stamped as massed vegetation (Karelia / Congo / Brazil / Indo-China), not a green fill. |
| Coast shelf vs deep ocean | **PASS** | Turquoise `#7AADB0` shelf band + foam hairline; open sea still `#3D5A66`. |
| Rivers / inland water | **PASS** | Nile / Rhine / Danube / Volga / Amazon et al. printed + Line2. |
| Land undulation | **PASS** | `sculptLandRelief` on extrude tops. Mountains 1.8+, plains ~0.7. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + N. No soldiers/tanks at mid. |
| Near / tray = molded A&A minis | **PASS** | Germany near: grey plastic infantry, tank, fighter. Peek roster same minis. 10=10. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select ring | **PASS** | `Confirm: Germany` is `rgb(196, 163, 90)`. Zoom/PLACE frost. |
| Zoom / PLACE quiet frost | **PASS** | Zoom `0.62`, PLACE `0.42`. Not `#C4A35A`. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Continent identity kept; climate literacy added. |
| Ocean printed slate-teal + shelf | **PASS** | Deep `#3D5A66` / shelf `#4F6E78` / reef fringe. |
| Units mid pip / near minis | **PASS** | Mid cream pip+N. Near faction plastic minis. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local + live)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm: Germany / .is-ready
lod mid/near: mid + clean near
roster:       10 = 10
live version: V2.81.51-three-polish.27
```

## Stills
- `europe-mid-390.png` — biome literacy (snow / lush / arid); pip+N; idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD; quiet zoom/PLACE
- `europe-near-select-390.png` — `Confirm: Germany` gold + molded minis + peek 10=10
- `europe-near-units-390.png` — infantry / tank / fighter plastic closeup
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.27`
- `computed.json` — machine-read CSS proof

## How it was implemented
- **Geography:** `src/map/threeMapTerrain.js` bakes a world-space land atlas (parchment + Risk continent + biome tiles + forest clump stamps + ridge hatch/shadow + rivers + IPC dots). Land meshes get `sculptLandRelief` undulation. Coast shelf meshes + thicker river Line2. Homage tiles, no copyright board scans.
- **Minis:** packed `units-land-minis.png` / `units-naval-minis.png` (molded grey plastic). Near/tray/peek tint to faction plastic. Mid `paintPip` stays cream + N.

**Vercel:** https://tactical-risk20-git-cursor-three-27dcda-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/52 (stacked on PR51 / `.26`)
