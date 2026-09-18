# p30 SCORE — V2.81.51-three-polish.30
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR55 stacked on PR54 `.29` / PR53 `.28` / PR52 `.27` / PR51 `.26`. Tesla off. Quiet James.

Local + live 390 stills in this folder. Fail-closed: idle CTA is **not** gold; zoom is **not** mustard; PLACE is **not** gold; mid has **zero** type parade; Confirm keeps exclusive gold; near/select/tray are molded minis not ring-discs or glyph-chits; map is not a charcoal slab; army is not mono-grey; sea lanes are **not** cyan neon.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Even parchment @ mid 390 | **PASS** | Every land is stained paper. Europe olive, Eastern/USSR tan-brown, Africa ochre. No Central/Eastern near-black void slabs. Mid land luma (p10/med): DE 140/157 · East Europe 79/154 · Ukraine 83/154 · Russia 136/146 vs `.29` med ~56 void. |
| Quiet sea lanes | **PASS** | Cyan Line2 / turquoise shelf glow gone. Dashed `#B8B09A` printed-ink paths on ocean. Rivers recessed print, not unlit teal neon. |
| Mountain hatch / forest / shelf / rivers / IPC | **PASS** | `.29` GEO kept and refined; shelf is printed slate, not neon reef. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + muted rim + N. No soldiers/tanks at mid idle. |
| Near / select / tray = faction plastic minis | **PASS** | DE field-grey infantry/tank/fighter. UK tan. SU green. Peek 60px same minis. 10=10 / 8=8 / 9=9. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select ring | **PASS** | `Confirm: Germany` is `rgb(196, 163, 90)`. Zoom/PLACE frost. Soft gold ring (emissive 0.16), not candy yellow flood. |
| Zoom / PLACE quiet frost | **PASS** | Zoom `0.62`, PLACE `0.42`. Not `#C4A35A`. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Continent identity kept; even stain end-to-end like printed A&A. |
| Ocean printed slate-teal + quiet lanes | **PASS** | Deep `#3D5A66` / printed dashed lanes / muted shelf. |
| Units mid pip / near minis | **PASS** | Mid cream pip+N. Near/select/tray faction plastic minis (3 factions). |
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
parchment:    luma floor 0.48; East/Ukraine/Russia med 146–154 (was ~56)
live version: V2.81.51-three-polish.30
```

## Stills
- `europe-mid-390.png` — even parchment Europe/USSR/Africa; quiet dashed lanes; pip+N; idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD; quiet zoom/PLACE
- `europe-mid-select-390.png` — select expands DE grey minis; neighbors stay stained paper
- `europe-near-select-390.png` — `Confirm: Germany` gold + field-grey minis + soft gold ring (not candy flood)
- `europe-near-units-390.png` — infantry / tank / fighter plastic closeup (DE grey)
- `europe-near-tray-390.png` — tray/peek same DE grey molded minis
- `uk-near-select-390.png` — second faction: UK tan plastic
- `russia-near-select-390.png` — third faction: SU green plastic on tan parchment (not void)
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.30`
- `computed.json` — machine-read CSS + luma proof

## How it was implemented
- **Even stain:** `bakeWorldLandAtlas` lightens multiply washes, then `floorParchmentLuminance` (Rec.709 floor 0.48) before hatch/rivers/IPC so ink stays dark but land cannot read as black fill. Hemi `0.78` warm ground + exposure `1.22` so ACES cannot recrush Europe.
- **Quiet lanes:** removed unlit cyan Line2 (`#2E6470` / shelf `#9ED4D4`). `addSeaLaneLines` draws dashed `#B8B09A` print paths between adjacent sea zones. Rivers/shelf are muted printed ink.
- **P1:** select emissive `0.16` + thinner gold ring. Roundels got a printed emblem ring.

**Vercel:** https://tactical-risk20-i916fhq8e-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/55 (stacked on PR54 / `.29`)
