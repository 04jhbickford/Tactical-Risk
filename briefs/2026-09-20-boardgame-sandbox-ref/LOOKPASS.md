# Catalog lookpass — V2.81.56-ux-solo.16

Catalog folder was not in the PR76 checkout. This note logs **steal vs invent** for the combat nested-stage tip against the patterns James named (SANDBOX-RECS §A #2, GAPS P0 #2).

## Steal

- `xstate-game-phases` / `bgio-moves-phases-stages` — phase owns nested stages. Combat-move: origin → units → dest → Confirm. Battle/casualty stages nest after commit. Guards: a move is illegal outside its stage.
- `aa-combat-dice-calc-pattern` — calculator / odds are preview; dice commit is a later Confirm; hits then open casualty steppers (YOU assign, THEY cheapest).

## Invent

None. Tip glue is `playStage()` over existing Three flags (`selected`, `selectedUnits`, `destPicked`, `battle.step`).

Full SCORE: `briefs/2026-09-19-hybrid-solo-ai/SCORE-solo-16.md`.
