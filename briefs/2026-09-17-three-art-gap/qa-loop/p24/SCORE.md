# p24 SCORE — V2.81.51-three-polish.24
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR48 `.23` kept (mid pip+N, cream `#F0E6D2`, punched washes, idle quiet-dark). Tesla off. Quiet James.

Local 390 stills in this folder. Fail-closed: idle CTA is **not** gold; mid has **zero** type parade.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Idle CTA quiet-dark when nothing staged | **PASS** | `#three-confirm.is-idle` computed `rgba(30, 36, 32, 0.88)` / copy `Select a territory`. Not `#C4A35A`. |
| Gold / `--cta-confirm` only on named Confirm | **PASS** | `Confirm: Germany` is `rgb(196, 163, 90)` / `#C4A35A` after select. `.is-ready:not(:disabled):not(.is-idle)` is the only gold path. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + N. No soldiers, ships, tanks, or type glyphs at mid. `paintPip` `glyph:null`. |
| Deeper molded cream (≥2.5px outline) | **PASS** | `outlineW ≥ 14` @256 ≈ 3.5px on 64px glass. Taller cylinder wall, stronger NW/SE bevel, faction rim, soft contact AO. Face `#F0E6D2` (not bleached white). |
| Glyphs recessed INTO cream | **PASS** | Carved cavity (SE shade + NW lip). Not flat `#2C2820` Lucide / stamp-on-disc. Near ≤3–4 typed + `+K`. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes | **PASS** | Europe olive / USSR tan / Africa ochre still split at 390. Punch 0.42, LOD-invariant. Grain + normal/AO + hemi/key punch. |
| Ocean printed slate-teal | **PASS** | `#3D5A66` / `#4F6E78` + grain; vertex darken toward open sea (`OCEAN_OPEN_DARKEN`). |
| Units cream molded plastic | **PASS** | See P0. Kill grey figurines / number-coins. Mid pip+N. |
| LOD mid pip+N / near typed | **PASS** | STACK-LOD mid=pip+N. Near typed + overflow. Peek roster total = map total (Germany 10=10). |
| Chrome frost + named Confirm | **PASS** | L0/peek `saturate(1.8) blur(24px)` + hairline. Idle dark; named Confirm gold. |
| Feel / depth | **PASS** | Pinch + continuous gold select ring + 120ms 2–4px stack lift + MeshStandard / hemi+key + crease/coast AO. |

## THREE-IPHONE-UI
| Gate | Verdict | Note |
|---|---|---|
| 390 + safe-area + 44pt | **PASS** | Confirm 50pt; zoom 44pt; L0 48pt. |
| Idle ≠ amber | **PASS** | Fail-closed `.is-idle`. Computed not gold. |
| Named Confirm when staged | **PASS** | `Confirm: Germany`. |
| Frosted chrome, matte board | **PASS** | HUD `#1E2420` glass; board parchment. |
| Dense Europe = pip+N | **PASS** | Types live in peek roster (`dataset.rosterTotal` = map total). |

## Stills
- `europe-mid-390.png` — pip+N, idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD; `Select a territory` not gold
- `europe-near-select-390.png` — `Confirm: Germany` gold + peek roster
- `europe-near-units-390.png` — molded cream closeup (bevel, outline, recessed glyphs)
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.24` (captured after deploy)

**Vercel:** https://tactical-risk20-git-cursor-three-60226f-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/49 (stacked on PR48 / `.23`)
