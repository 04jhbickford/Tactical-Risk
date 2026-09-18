# p28 SCORE — V2.81.51-three-polish.28
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR53 stacked on PR52 `.27` / PR51 `.26`. Tesla off. Quiet James.
**Addendum:** Civ clip is geography *mechanics* only — not low-poly / tilt-shift / ROMA art.

Local + live 390 stills in this folder. Fail-closed: idle CTA is **not** gold; zoom is **not** mustard; PLACE is **not** gold; mid has **zero** type parade; Confirm keeps exclusive gold; near/select/tray are molded minis not ring-discs or glyph-chits; map is not flat color blobs.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Mid geography readable (not flat blobs) | **PASS** | 390 mid: snow Scandinavia, olive Europe, ochre Africa, tan steppe east. Alps hatch reads south of Germany. |
| Mountain relief + shadow | **PASS** | Alps/Himalaya/Rockies/Andes hatch + tile stamps + taller sculpt. South Europe browner/higher. |
| Forest as clumps | **PASS** | Forest tile + stipple dots (Karelia / Congo / Brazil / lush Europe edges), not a green fill. |
| Coast shelf vs deep ocean | **PASS** | Turquoise `#8EC4C6` shelf band vs open sea `#3D5A66`. |
| Rivers / inland water | **PASS** | Nile / Rhine / Danube / Volga / Amazon et al. printed + thicker Line2. |
| Land undulation | **PASS** | Louder `sculptLandRelief`. Mountains 2.2+, plains ~0.8. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + N. No soldiers/tanks at mid idle. |
| Near / select / tray = molded A&A minis | **PASS** | Germany select/near: grey plastic infantry, tank, fighter. Peek 60px same minis. 10=10. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select ring | **PASS** | `Confirm: Germany` is `rgb(196, 163, 90)`. Zoom/PLACE frost. |
| Zoom / PLACE quiet frost | **PASS** | Zoom `0.62`, PLACE `0.42`. Not `#C4A35A`. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Continent identity kept; climate + relief literacy added. |
| Ocean printed slate-teal + shelf | **PASS** | Deep `#3D5A66` / shelf `#4F6E78` / reef fringe. |
| Units mid pip / near minis | **PASS** | Mid cream pip+N. Near/select/tray faction plastic minis. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local + live)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm: Germany / .is-ready
lod mid/near: mid + clean near
roster:       10 = 10
peek icons:   60px molded minis
live version: V2.81.51-three-polish.28
```

## Stills
- `europe-mid-390.png` — biome + Alps hatch + IPC; pip+N; idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD; quiet zoom/PLACE
- `europe-mid-select-390.png` — select at mid expands minis; peek is plastic not Lucide
- `europe-near-select-390.png` — `Confirm: Germany` gold + molded minis + peek 10=10
- `europe-near-units-390.png` — infantry / tank / fighter plastic closeup
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.28`
- `computed.json` — machine-read CSS proof

## How it was implemented
- **Geography:** World-atlas UVs were X-mirrored (mesh X is `MAP_WIDTH - origX`). Un-mirrored so ridges/forests/rivers/IPC land on the right territories. Louder ridge hatch/shade, forest stipple, wide turquoise shelf, thicker rivers, IPC dots, capital roundels. Homage tiles, no copyright board scans.
- **Minis:** packed `units-land-minis.png` / `units-naval-minis.png`. Recolor keeps sculpt (no black crush). Near **or select** shows minis; peek 60px. Mid `paintPip` stays cream + N.

**Vercel:** https://tactical-risk20-git-cursor-three-cf924c-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/53 (stacked on PR52 / `.27`)
