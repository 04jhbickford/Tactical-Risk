# p32 SCORE — V2.81.51-three-polish.32
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR57 stacked on PR56 `.31` / PR55 `.30`. Tesla off. Quiet James.

Local 390 stills in this folder. Fail-closed: Japan near is **not** pip-only; continent
wash does **not** rival select gold; mountains stay painted (not hatch-lines);
minis do not clip; mid stays pip+N; Confirm keeps exclusive gold.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Japan multi-type LOD | **PASS** | Home-island pin `(2594, 736)` — not Japan Sea Zone. `frameNearJapan` lift 90 stays `near`. Required still `near-japan-multitype-390.png`: JP orange-red infantry + fighter + tank + `+3` on the home islands, battleship stays at sea. `japan-mid-390.png`: pip `8` + ocean context, **zero** type parade. |
| Quiet continent wash | **PASS** | Europe `+30` is a parchment stain + outline + chip. Chocolate flood gone (no stacked 32px multiply feathers; Alps mass no longer a continent oval). Select gold on Germany sits above the wash. |
| Mid = one cream pip + N ONLY | **PASS** | Europe mid + Japan theater mid stay pip+N. |
| Idle CTA quiet-dark | **PASS** | `rgba(30, 36, 32, 0.88)` / `Select a territory`. |
| Gold only Confirm + select | **PASS** | `Confirm: Japan` / `Confirm: Germany` are `rgb(196, 163, 90)`. Zoom/PLACE frost. |
| Painted mountains + no-clip | **PASS** | `paintMountainMass` (not `drawRidgeHatch`). DE/SU/JP minis sit on parchment. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes + geography | **PASS** | Live 7 bonus groups. Quiet tint + outline + `+N`. |
| Ocean printed slate-teal + quiet lanes | **PASS** | Dashed `#B8B09A` print paths. |
| Units mid pip / near minis | **PASS** | Mid pip+N. Near faction plastic. Japan 8=8. |
| Chrome frost + named Confirm | **PASS** | .26 locks held. |

## Computed proof (390, local)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm: Japan / .is-ready
lod:          near after Japan frame (lift 90)
roster:       DE 10 · UK 8 · SU 9 · JP 8
continents:   7 (NA 24 / SA 12 / EU 30 / ME 18 / AF 27 / AS 33 / OC 39)
inspect:      paintedMountains · unitNoClip · japanLod · japanHome · quietContinentWash · selectClear · liveContinents
```

## Stills
- `europe-mid-390.png` — quiet continent wash; `+30` Europe; pip+N; idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD
- `europe-mid-select-390.png` — Germany gold sits above quiet wash; neighbors pip+N
- `europe-near-select-390.png` — Confirm gold + DE grey minis, no clip
- `europe-near-units-390.png` — infantry / tank / fighter on parchment
- `europe-near-tray-390.png` — peek molded minis
- `uk-near-select-390.png` — UK tan plastic
- `russia-near-select-390.png` — SU green plastic, no clip
- `near-japan-multitype-390.png` — **required** Japan near multi-type LOD
- `japan-near-select-390.png` / `japan-near-units-390.png` — same frame
- `japan-mid-390.png` — Japan theater mid = pip+N only
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.32`
- `computed.json` — machine-read CSS + inspect

## How each P0 was solved
1. **Japan LOD** — `JAPAN_HOME_CENTER` + `LAND_ANCHORS.Japan` so camera/units sit on the home islands. `frameNearJapan` lift 90 (still `near`, island + ocean). Japan Sea Zone stays `(2695, 750)`. Dense footprint cap + tighter `clusterPack` so INF/TNK/FTR/+K fit without soup. Mid idle never expands.
2. **Quiet wash** — `fillStain` (no 16/32px feathers that stacked across Europe). Soft-light 0.11 + multiply 0.08 toward parchment. Punch 0.12. Alps painted mass shrunk so it is a range, not a chocolate continent oval. Identity = tint + outline + `+N`.

**Vercel:** https://tactical-risk20-g8459pwvc-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/57 (stacked on PR56 / `.31`)
