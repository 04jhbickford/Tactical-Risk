# READY — V2.81.56-ux-solo.18

**Hold merge.** Quiet James. Tip only. Do not merge to main.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Stamp after hard reload: `V2.81.56-ux-solo.18` · `/` `Cache-Control: no-store`

Playthrough SoT: `briefs/2026-09-19-hybrid-solo-ai/PLAYTHROUGH.md`

## Steal vs invent

Catalog SoT: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A + GAPS P1 #7). Not in this checkout; James named the list.

| Piece | Steal / invent | Cite |
|---|---|---|
| Collect Income Confirm gate | **STEAL** | `bgio-moves-phases-stages` |
| Combat tech + ART dice | **STEAL** | `aa-combat-dice-calc-pattern` |
| Full purchase catalog + card trade | **STEAL** | main `GameState` / `playerPanel` |
| Seats / touch-pan / combat stages | **KEEP** | `.17` / `.15` / `.16` |

## Fail-closed QC

| # | Gate | Result |
|---|---|---|
| **A1** | Stamp `.18` after hard reload | **PASS** local L0 + lobby + `__TR_GAME_VERSION` |
| Smoke | 1 Human + AIs → Start → place 6 → Combat Move stages → YOU casualty | **PASS** Playwright @390 gold `Confirm: Take hits` |
| Income | NCM/Place End Phase → Income card → handoff | **PASS** unit |
| Win/Lose | Victory / Defeat + New Game | **PASS** unit |
| CDP | Lobby CSS **unchanged** — do not re-READY on CSS | `.17` T1–T5 still hold |

Unit: `test-three-solo-playthrough`, `test-three-solo-play`, `test-three-solo-econ`, `test-three-solo-lobby`.

Do not merge.
