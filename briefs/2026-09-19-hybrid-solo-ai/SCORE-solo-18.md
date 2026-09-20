# SCORE-solo-18 — full playthrough holes

Hard reload `?three=1&solo=1` @390 paints `V2.81.56-ux-solo.18`. Lobby → setup → deploy → all `TURN_PHASES` → win/lose vs AI uses MAIN `GameState` / `AIController` (not toy stubs). Collect Income is an explicit Confirm gate. Shop is the full unit catalog. Combat dice steal CombatUI tech + artillery. AI stops on `gameOver`. Defeat chrome on a human loss.

Catalog SoT cited by James: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A, GAPS P1 #7). Folder was not on this checkout; patterns named in the tip brief are the steal list.

## Steal vs invent

| Piece | Steal / invent | Cite |
|---|---|---|
| Income as onBegin/endIf gate (Confirm, then `nextPhase`) | **STEAL** | `bgio-moves-phases-stages` P1 #7 |
| Combat dice jets / superSubs / heavyBombers / ART 1:1 | **STEAL** | `aa-combat-dice-calc-pattern` / `combatUI` |
| Full shop + Risk card trade | **STEAL** | main `playerPanel` purchasable + `tradeRiskCards` |
| AI halt on `gameOver` | **STEAL** | main authority fail-close |
| Combat-move stages / seats / touch-pan | **KEEP** | `.16` / `.17` / `.15` |

Invented: none of the rules. Adapter glue only (`play.income`, `BUY_TYPES` complete list, Defeat kicker).

## Files

- `GAME_VERSION` = `V2.81.56-ux-solo.18`
- `src/map/threeSoloPlay.js` — income gate, full shop, tech dice, Defeat
- `src/state/gameState.js` — `getCollectIncomeAmount` / `lastIncome` (tip only)
- `src/ai/aiController.js` — skip when `gameOver`
- `briefs/2026-09-19-hybrid-solo-ai/PLAYTHROUGH.md`

## Residual

Retreat / bombard tiles, sub-vs-air split, S11 diagnostics. Casualty YOU steppers **REACHED** this tip: tap-assign + 28px +/−; THEY inert; Confirm gold Take hits.

Tip after hard reload: L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.18`. `/` `no-store`.
