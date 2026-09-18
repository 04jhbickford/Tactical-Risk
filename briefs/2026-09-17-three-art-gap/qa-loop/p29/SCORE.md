# p29 SCORE — V2.81.51-three-polish.29
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR54 stacked on PR53 `.28` / PR52 `.27` / PR51 `.26`. Tesla off. Quiet James.
**Addendum:** Civ clip is geography *mechanics* only — not low-poly / tilt-shift / ROMA art.

Local + live 390 stills in this folder. Fail-closed: idle CTA is **not** gold; zoom is **not** mustard; PLACE is **not** gold; mid has **zero** type parade; Confirm keeps exclusive gold; near/select/tray are molded minis not ring-discs or glyph-chits; map is not a charcoal slab; army is not mono-grey.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Mid geography readable (not charcoal slab) | **PASS** | 390 mid: olive parchment Europe, ochre Africa, tan steppe east, lighter snow Scandinavia. Paper tooth shows through. Not the .28 digital charcoal low-poly slab. |
| Mountain relief + hatch | **PASS** | Alps / South Europe browner + printed hatch/shade south of Germany. Himalaya / Rockies / Andes hatch + tile stamps + taller sculpt. |
| Forest as clumps | **PASS** | Forest tile + louder stipple clumps (Karelia / Congo / lush Europe edges), not a green fill. |
| Coast shelf vs deep ocean | **PASS** | Wide turquoise shelf `#9ED4D4` vs open sea `#3D5A66`. Pale near-shore vs darker Atlantic. |
| Rivers / inland water | **PASS** | Nile / Rhine / Danube / Volga et al. printed + thicker Line2. Blue drainage readable at mid. |
| Land undulation | **PASS** | `sculptLandRelief` kept; mountains louder. Hemi lift so faces read paper, not charcoal facets. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + muted rim + N. No soldiers/tanks at mid idle. |
| Near / select / tray = faction plastic minis | **PASS** | DE field-grey infantry/tank/fighter. UK tan. SU green. Peek 60px same minis. 10=10 / 8=8 / 9=9. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select ring | **PASS** | `Confirm: Germany` is `rgb(196, 163, 90)`. Zoom/PLACE frost. |
| Zoom / PLACE quiet frost | **PASS** | Zoom `0.62`, PLACE `0.42`. Not `#C4A35A`. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Continent identity kept; climate + relief literacy on paper, not GIS charcoal. |
| Ocean printed slate-teal + shelf | **PASS** | Deep `#3D5A66` / shelf `#4F6E78` / louder reef fringe. |
| Units mid pip / near minis | **PASS** | Mid cream pip+N. Near/select/tray faction plastic minis (2+ factions). |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local + live)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm: Germany / .is-ready
lod mid/near: mid + clean near
roster:       DE 10=10 · UK 8=8 · SU 9=9
peek icons:   60px molded minis
live version: V2.81.51-three-polish.29
```

## Stills
- `europe-mid-390.png` — parchment Europe / ochre Africa; Alps brown; rivers; IPC; pip+N; idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD; quiet zoom/PLACE
- `europe-mid-select-390.png` — select at mid expands DE grey minis; peek is plastic not Lucide
- `europe-near-select-390.png` — `Confirm: Germany` gold + field-grey minis + peek 10=10
- `europe-near-units-390.png` — infantry / tank / fighter / bomber plastic closeup (DE grey)
- `europe-near-tray-390.png` — tray/peek same DE grey molded minis
- `uk-near-select-390.png` — second faction: UK tan plastic (not Confirm gold)
- `russia-near-select-390.png` — third faction: SU green plastic
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.29`
- `computed.json` — machine-read CSS proof

## How it was implemented
- **GEO:** `bakeWorldLandAtlas` no longer solid-fills biome hexes (that crushed to charcoal under ACES). Continent + biome are multiply/soft-light **ink washes on parchment**, then a paper-tooth restore. Louder ridge hatch, forest stipple, IPC/roundels, turquoise shelf, thicker rivers. Hemi `0.58` + exposure `1.16` so unlit faces stay printed board, not a dark low-poly slab.
- **Minis:** grey atlas sculpt is **luminance-colorized** to tabletop plastic (`#6A6C68` DE · `#2F7A2A` SU · `#B89050` UK · `#4E6828` US · `#D24A1C` JP). Same paint on-map and tray/peek. Mid `paintPip` rim is `mutePipRim` so faction metal cannot outshine Confirm gold.

**Vercel:** https://tactical-risk20-git-cursor-three-681f88-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/54 (stacked on PR53 / `.28`)
