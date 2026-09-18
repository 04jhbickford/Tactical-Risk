# p25 SCORE — V2.81.51-three-polish.25
**Preview only** `?three=1`. Live Canvas untouched. Do not merge.
**Lineage:** PR49 `.24` kept (mid pip+N, cream `#F0E6D2`, punched washes, idle quiet-dark, recessed glyphs). Tesla off. Quiet James.

Local + live 390 stills in this folder. Fail-closed: idle CTA is **not** gold; mid has **zero** type parade.

## P0 HARD
| Gate | Verdict | Note |
|---|---|---|
| Idle CTA quiet-dark when nothing staged | **PASS** | `#three-confirm.is-idle` computed `rgba(30, 36, 32, 0.88)` / copy `Select a territory`. Not `#C4A35A`. Live Vercel same. |
| Gold / `--cta-confirm` only on named Confirm | **PASS** | `Confirm: Germany` is `rgb(196, 163, 90)` / `#C4A35A` after select. `.is-ready:not(:disabled):not(.is-idle)` is the only gold path. |
| Mid = one cream pip + N ONLY | **PASS** | Cream tokens + N. No soldiers, ships, tanks, or type glyphs at mid. `paintPip` `glyph:null`. |
| Key/fill drama (warm key + cool fill) | **PASS** | Key `#FFE2B0` @ 1.68 raking NW; hemi `#C5D2DC`/`#24343C` @ 0.26; fill `#7E9AAB` @ 0.28. Mid Europe reads sculpted (cool west / warm east), not even slab. MeshStandard. No neon. |
| Parchment tooth @390 mid | **PASS** | Macro fiber + `TOOTH_STRENGTH 0.42` / `GRAIN 0.78` / `PAPER_UV 20` / normalScale 2.05. Mid land shows cardboard blotch; near is paper grain, not 1px speckle. |
| Glossy molded specular | **PASS** | Tight white lobe + streak on cream face; cylinder catch-light. Near tank closeup shows toy-plastic spec. Recessed glyphs + outline ≥2.5px + contact AO kept. Mid stays pip+N. |

## BAR-POLYTOPIA-ROOT-TTR
| Gate | Verdict | Note |
|---|---|---|
| Land parchment + Risk washes | **PASS** | Europe olive / USSR tan / Africa ochre still split at 390. Punch 0.42, LOD-invariant. Tooth + key/fill now readable at arm’s length. |
| Ocean printed slate-teal | **PASS** | `#3D5A66` / `#4F6E78` + grain; open-sea darken `0.58`; foam hairline 1.15px. |
| Units cream molded plastic | **PASS** | See P0. Kill grey figurines / number-coins. Mid pip+N. Near typed + glossy spec. |
| LOD mid pip+N / near typed | **PASS** | STACK-LOD mid=pip+N. Near typed + overflow. Peek roster total = map total (Germany 10=10). |
| Chrome frost + named Confirm | **PASS** | L0/peek `saturate(2.15) blur(14px)` thin vibrancy (not 24px slab). Idle dark; named Confirm gold. |
| Feel / depth | **PASS** | Pinch + gold select ring + 150ms lift/micro-settle + MeshStandard / warm-key+cool-fill + crease/coast AO. |

## THREE-IPHONE-UI
| Gate | Verdict | Note |
|---|---|---|
| 390 + safe-area + 44pt | **PASS** | Confirm 50pt; zoom 44pt; L0 48pt. |
| Idle ≠ amber | **PASS** | Fail-closed `.is-idle`. Computed not gold (local + live). |
| Named Confirm when staged | **PASS** | `Confirm: Germany`. |
| Frosted chrome, matte board | **PASS** | HUD thin frost; board parchment. |
| Dense Europe = pip+N | **PASS** | Types live in peek roster (`dataset.rosterTotal` = map total). |

## Stills
- `europe-mid-390.png` — pip+N, idle dark CTA, key/fill sculpt, parchment tooth
- `europe-mid-hud-390.png` — same 390 HUD; `Select a territory` not gold
- `europe-near-select-390.png` — `Confirm: Germany` gold + peek roster 10=10
- `europe-near-units-390.png` — glossy plastic closeup (tight spec, recessed glyph, outline, AO)
- `vercel-live-mid-390.png` — live `?three=1` = `V2.81.51-three-polish.25` (idle not gold, mid pip+N)

**Vercel:** https://tactical-risk20-git-cursor-three-f4e566-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/50 (stacked on PR49 / `.24`)
