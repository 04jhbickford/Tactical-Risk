# p26 SCORE — V2.81.51-three-polish.26
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR50 `.25` kept (mid pip+N, cream `#F0E6D2`, punched washes, idle quiet-dark, recessed glyphs, glossy spec). Tesla off. Quiet James.

Local + live 390 stills in this folder. Fail-closed: idle CTA is **not** gold; zoom is **not** mustard; PLACE is **not** gold; mid has **zero** type parade; Confirm keeps exclusive gold.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Idle CTA quiet-dark when nothing staged | **PASS** | `#three-confirm.is-idle` computed `rgba(30, 36, 32, 0.88)` / copy `Select a territory`. Not `#C4A35A`. Live Vercel same. |
| Gold / `--cta-confirm` only on named Confirm | **PASS** | `Confirm: Germany` is `rgb(196, 163, 90)` / `#C4A35A` after select. `.is-ready:not(:disabled):not(.is-idle)` is the only gold fill. Select land ring stays gold. |
| Zoom chrome quiet frost, never mustard | **PASS** | `+` `−` `Fit` computed `rgba(30, 36, 32, 0.62)` local + live. No white→parchment gradient. Not `#C4A35A`. |
| PLACE chip quiet frost, never Confirm gold | **PASS** | `#three-phase` computed `rgba(30, 36, 32, 0.42)`. Same L0-family frost as seat/IPC. Viz fold-in. |
| All other chrome quiet (no mustard leak) | **PASS** | Zoom + PLACE + L0 chips + L2 sheet hairline are frost/neutral. `#C4A35A` fill lives only on `.is-ready` Confirm. Select ring stays gold on the board. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + N. No soldiers, ships, tanks, or type glyphs at mid. `paintPip` `glyph:null`. |
| App Store glance @390 | **PASS** | Board dominates; L0 is a fade, not a slab; zoom recedes; idle CTA dark; Confirm exclusive gold when staged. Density/safe-area tightened (10–14px). No new chrome. |

## P1
| Gate | Verdict | Note |
|---|---|---|
| Thinner native L0 frost | **PASS** | saturate 1.35 / blur 22 / fill `0.12 → 0`. Hairline `rgba(255,255,255,0.08)`. |
| Mid tooth loud / near clean | **PASS** | Bake `TOOTH_STRENGTH 0.42` + `TOOTH_NORMAL_MID 2.05` at mid. Near `applyLodTooth` → `1.08` / roughness `0.86`. `inspect().lodTooth` = `clean` at near Germany. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes | **PASS** | Europe olive / USSR tan / Africa ochre still split at 390. Punch 0.42, LOD-invariant. |
| Ocean printed slate-teal | **PASS** | `#3D5A66` / `#4F6E78` + grain; open-sea darken `0.58`; foam hairline 1.15px. |
| Units cream molded plastic | **PASS** | Mid pip+N. Near typed + glossy spec. No grey figurines. |
| LOD mid pip+N / near typed | **PASS** | STACK-LOD mid=pip+N. Near typed + overflow. Peek roster total = map total (Germany 10=10). |
| Chrome frost + named Confirm | **PASS** | Quiet dark frost on L0 / zoom / PLACE / idle CTA. Gold only on named Confirm + select ring. |
| Feel / depth | **PASS** | Pinch + gold select ring + 150ms lift/micro-settle + MeshStandard / warm-key+cool-fill. |

## THREE-IPHONE-UI
| Gate | Verdict | Note |
|---|---|---|
| 390 + safe-area + 44pt | **PASS** | Confirm 50pt; zoom 44pt; L0 48pt. Bottom 16px + safe-area. |
| Idle ≠ amber | **PASS** | Fail-closed `.is-idle`. Computed not gold (local + live). |
| Named Confirm when staged | **PASS** | `Confirm: Germany`. |
| Frosted chrome, matte board | **PASS** | HUD thin vibrancy; board parchment. |
| Dense Europe = pip+N | **PASS** | Types live in peek roster (`dataset.rosterTotal` = map total). |

## Computed proof (390, local + live)
```
idle confirm: rgba(30, 36, 32, 0.88) / Select a territory / .is-idle
zoom +/−/Fit: rgba(30, 36, 32, 0.62)
PLACE:        rgba(30, 36, 32, 0.42)
Confirm:      rgb(196, 163, 90) / Confirm: Germany / .is-ready
lod mid/near: mid + clean near
roster:       10 = 10
```

## Stills
- `europe-mid-390.png` — pip+N, idle dark CTA, quiet zoom, quiet PLACE
- `europe-mid-hud-390.png` — same 390 HUD; `Select a territory` not gold; zoom not mustard
- `europe-near-select-390.png` — `Confirm: Germany` gold + peek roster 10=10; zoom still dark
- `europe-near-units-390.png` — typed cream closeup (recessed glyph, outline, AO)
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.26` (idle not gold, zoom not mustard)
- `computed.json` — machine-read CSS proof

**Vercel:** https://tactical-risk20-git-cursor-three-7b5472-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/51 (stacked on PR50 / `.25`)
