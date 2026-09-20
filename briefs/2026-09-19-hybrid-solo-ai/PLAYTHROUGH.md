# PLAYTHROUGH — V2.81.56-ux-solo.18

**Hold merge.** Quiet James. Tip only. Do not merge tip→main. Do not touch live Canvas.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Stamp after hard reload: `V2.81.56-ux-solo.18` · `/` `Cache-Control: no-store`

Catalog SoT cited by James: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A + GAPS P1 #7 phase gates). Folder is not on this checkout; patterns named in the tip brief are the steal list.

Engine: real `GameState` + `AIController` behind Three chrome (`threeSoloPlay` / `threeSoloBoot`). Pocket `?three=1` / `?max=1` is still `uxPreviewScenario` and is not this path.

## How to start

1. Open `?three=1&solo=1` → Local Play → New Local Game.
2. Seat ≥1 **Human** + AI seats (Empty clears). Start stays dead until ≥2 seats and one Human.
3. Risk (default) lands on Place Capital → Deploy 6 / Pass. Classic 1942 skips to Develop Tech.
4. Skip lobby: `?three=1&solo=1&go=1`.

## Phase checklist

| Phase / gate | Status | What runs | Steal / cite |
|---|---|---|---|
| Lobby seats Human / AI / Empty | **DONE** `.17` | `threeSoloLobby` occupant chrome; Start gated | `aa-1942-seat-combatants`, `bgio-lobby-seat-picker` |
| Touch-pan New Local Game | **DONE** `.15` | MAIN `pan-y`; footer sibling; no lobby `preventDefault` | keep `.15` T1–T5 |
| Setup tutorial | **DONE** | First capital/deploy overlay; dismiss persists | main `phaseGuide` |
| Place Capital | **DONE** | Tap owned land → Confirm → `placeCapital` | main `GameState` |
| Deploy 6 / Pass | **DONE** | `placeInitialUnit` + wave budget; AI `finishPlacementRound` | main `placeQueue` / `AIController` |
| Develop Tech | **DONE** | DIE 5 IPC stepper; Confirm Roll; breakthrough pick → `unlockTech`; skip End Phase | main `purchaseTechDice` / `rollTechDice` |
| Purchase / IPC | **DONE** `.18` | Full `unitDefs` shop (INF…CV + TAC); live IPC; factory cap; industrial −1 | main `addToPendingPurchases` |
| Risk card trade | **DONE** `.18` | `SET +N` tile when `canTradeRiskCards` | main `tradeRiskCards` |
| Combat Move stages | **DONE** `.16` | origin → units → dest → Confirm; Confirm dead until legal | `bgio-moves-phases-stages` / `xstate-game-phases` |
| TRN cargo load/unload | **DONE** (partly `.9`) | Load friendly TRN; unload via `unloadTransport`; pick ship | main navy |
| Combat / AA / YOU | **DONE** `.16` | Nested AA → roll → YOU assign / THEY cheapest; AA wipe fail-close | `aa-combat-dice-calc-pattern` |
| Combat dice (tech + ART) | **DONE** `.18` | Jets / superSubs / heavyBombers + ART 1:1 support | steal `combatUI` calc, not toy `unitDefs` raw |
| Air land | **DONE** | Planes-only sheet; `applyAirLandings`; crash if no dest | main `airLanding.js` |
| NCM | **DONE** | Same stage machine; friendly dests; leftover air blocks Done | V2.81.53 Done-when-0 |
| Mobilize / Place | **DONE** | Pending tiles + factory / sea dests; End Phase only when queue empty | main `mobilizeUnit` |
| Collect Income | **DONE** `.18` | Explicit Income card (bgio onBegin/endIf); Confirm collects via `nextPhase` → `_collectIncome` + nextTurn | GAPS P1 #7 `bgio-moves-phases-stages` |
| AI seats | **DONE** | `AIController` subscribe; Confirm off; `gameOver` fail-closes AI | main controller |
| Win chrome | **DONE** | Victory card + gold **New Game vs AI** (no `/` reload) | main `_checkVictoryConditions` |
| Lose chrome | **DONE** `.18` | Defeat kicker when human side lost; same New Game | main alliance / capital victory |
| Undo boundaries | **DONE** | Capital / deploy / buy / move / place; income receipt backs out; combat / tech-after-roll locked | main histories |

## Residual stubs (honest, not playthrough blockers)

| Item | Status | Why it can wait |
|---|---|---|
| Retreat / bombard tiles | **STUB** | Combat still resolves; no dedicated Three tiles |
| Sub-only-hits-sea / first strike | **STUB** | Adapter does not split sub vs air the way CombatUI does |
| Casualty YOU steppers | **DEFERRED** | P1 Viz; Confirm still waits on YOU assign |
| Three diagnostics sheet (S11) | **STUB** | Last-40 dice persist on state; no Three menu log |
| Play Online / My Games / Firebase | **OUT** | Tip-only; no live rewrite |
| Pocket `?three=1` toy path | **KEEP** | Not the James solo eval |

## Fail-closed before READY

| # | Gate | Proof |
|---|---|---|
| **A1** | Stamp `.18` after hard reload | **PASS** local — L0 + lobby + `__TR_GAME_VERSION` = `.18` |
| Smoke | New Local Game ≥1 Human + AIs → Start → place 6 → Pass → Combat Move Confirm using stages | **PASS** — `test-three-solo-playthrough` + Playwright `qc-playthrough-smoke` @390: origin→units→dest→`Confirm: Attack Columbia` |
| Income | End Phase on NCM / Place opens Income card; second Confirm hands off | **PASS** unit |
| Win/Lose | Victory / Defeat + New Game vs AI | **PASS** unit |
| CDP | Lobby CSS **unchanged** this tip | `.17` T1–T5 still hold — not re-run |

Do not merge.
