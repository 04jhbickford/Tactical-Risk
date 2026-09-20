# SCORE-solo-16 — Combat as nested stages

**Hold merge.** Tip only. PR76 hybrid `cursor/unit-sheet-clickthrough-d314`. Quiet James.

## Claim
Hard reload `?three=1&solo=1` @390 paints `V2.81.56-ux-solo.16`. Combat-move + battle is an explicit nested stage machine on the tip solo path (`threeSoloPlay` / chrome), not ad-hoc flags. Confirm stays disabled until origin+units+dest are legal; casualty Confirm waits on YOU assign.

## Stage diagram (one-liner)

`IDLE → ORIGIN (pulse legal stacks) → UNITS (icon +/−) → DEST (pulse enemy/land) → CONFIRM → AA/combatReady (odds preview ≠ commit) → COMBAT_RESULT (YOU steppers) → WON → airLand → done`

## Steal vs invent

Catalog SoT cited by James: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A #2, GAPS P0 #2). Folder was not on this checkout; patterns named in the tip brief are the steal list.

| Piece | Steal / invent | Cite |
|---|---|---|
| Nested move stages origin → units → dest → Confirm | **STEAL** | `xstate-game-phases` / `bgio-moves-phases-stages` |
| Battle nest after Confirm (AA → roll → casualty → won → air land) | **STEAL** | same + existing `BATTLE_STEP` on tip |
| Round hits → YOU casualty steppers; THEY cheapest read-only | **STEAL** | `aa-combat-dice-calc-pattern` + `.11` Three locks |
| Odds preview on COMBAT_READY ≠ commit | **STEAL** | `aa-combat-dice-calc-pattern` via `phoneCombatAttackerWinPercent` / `formatPhoneCombatHeroOdds` (combatUI, UI only) |
| Disabled CTA copy “Tap units” / “Tap destination” in Confirm chrome | **STEAL** | bgio stage `move` restriction + existing exclusive Confirm gold |
| Horizontal icon +/− tiles, manual combat-move (no Try), YOU-only assign, no map click-through on steppers, plane-by-plane air land | **KEEP** | Three UX locks from `.11`–`.15` |
| Lobby touch-pan shell + stamp SoT | **KEEP** | `.15` T1–T5 + `.14` `no-store` `/` + drop SW |
| Seat card redesign | **OUT** | `.17` |

Nothing invented for the machine itself. Only glue: `playStage()` as the single derived SoT over existing `selected` / `selectedUnits` / `destPicked` / `battle.step` so chrome and guards cannot drift.

## Ship
- `GAME_VERSION` = `V2.81.56-ux-solo.16`
- `index.html` `__TR_GAME_VERSION` + `main.js?v=.16` + SW/Cache drop (keep `.14` no-store on `/`)
- Boot graph `?v=.16`
- `PLAY_STAGE` + `playStage()` in `threeSoloPlay.js`
- Confirm enabled only at IDLE (End Phase) or CONFIRM (legal origin+units+dest)
- `battleOpen` blocks all map hits while battle/casualty sheet is up
- `#three-battle` / `#three-peek` added to chrome hit closest()

## QC (unit + @390)
See `LOOKPASS.md`. Hold merge.
