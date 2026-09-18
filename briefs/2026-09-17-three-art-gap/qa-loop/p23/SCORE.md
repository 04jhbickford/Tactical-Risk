# p23 SCORE — V2.81.51-three-polish.23
**Worker lock:** `bc-835c2dca-ffe8-5d75-bc22-729251e7ac1c` is the only .23 worker.
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR47 `.22` kept (mid pip+N, cream `#F0E6D2`, punched washes). Tesla off. Quiet James.

Local 390 stills in this folder. Fail-closed: idle CTA is **not** gold; mid has **zero** type parade.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Idle CTA quiet-dark when nothing staged | **PASS** | `#three-confirm.is-idle` is `rgba(30,36,32,0.88)` / `#1E2420`. Copy `Select a territory`. Computed style on live preview: not `#C4A35A`. |
| Gold / `--cta-confirm` only on named Confirm | **PASS** | `Confirm: Germany` is `rgb(196,163,90)` / `#C4A35A` after select. `.is-ready:not(:disabled):not(.is-idle)` is the only gold path. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + N. No soldiers, ships, tanks, or type glyphs at mid. `paintPip` `glyph:null`. |
| Molded cream plastic (not flat discs) | **PASS** | Emboss/bevel NW highlight + SE undercut, outline ≥2px screen (`outlineW ≥ 11` @256), faction rim, contact shadow. Face `#F0E6D2`. |
| Glyphs embossed INTO cream | **PASS** | Recessed cream stamp (highlight + shadow). Not flat `#2C2820` Lucide fills. Near ≤3–4 typed + `+K`. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes | **PASS** | Europe olive / USSR tan / Africa ochre still split at 390. Punch 0.42, LOD-invariant. |
| Ocean printed slate-teal | **PASS** | `#3D5A66` / `#4F6E78` + grain held. |
| Units cream molded plastic | **PASS** | See P0. Kill grey figurines / number-coins. |
| LOD mid pip+N / near typed | **PASS** | STACK-LOD mid=pip+N. Near typed + overflow. |
| Chrome frost + named Confirm | **PASS** | L0/peek `blur(28px)`. Idle dark; named Confirm gold. |
| Feel / depth | **PASS** | Pinch + gold select ring + MeshStandard / hemi+key. |

## THREE-IPHONE-UI
| Gate | Verdict | Note |
|---|---|---|
| 390 + safe-area + 44pt | **PASS** | Confirm 50pt; zoom 44pt; L0 48pt. |
| Idle ≠ amber | **PASS** | Fail-closed `.is-idle`. |
| Named Confirm when staged | **PASS** | `Confirm: Germany`. |
| Frosted chrome, matte board | **PASS** | HUD `#1E2420`; board parchment. |
| Dense Europe = pip+N | **PASS** | Types live in peek roster (`dataset.rosterTotal` = map total). |

## Stills
- `europe-mid-390.png` — pip+N, idle dark CTA
- `europe-mid-hud-390.png` — same 390 HUD; `Select a territory` not gold
- `europe-near-select-390.png` — `Confirm: Germany` gold + peek roster
- `europe-near-units-390.png` — molded cream closeup (bevel, outline, embossed glyphs)
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.23`, idle not gold, zero type parade

**Vercel:** https://tactical-risk20-git-cursor-three-07f1cf-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/48 (stacked on PR47 / `.22`)
