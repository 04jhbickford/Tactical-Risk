# Catalog lookpass — V2.81.56-ux-solo.17

Catalog folder was not in the PR76 checkout (same as `.16`). This note logs **steal vs invent** for the seat-card occupant tip against the patterns James named (SANDBOX-RECS §A #3, GAPS P0 #4).

## Steal

- `aa-1942-seat-combatants` — each nation is a seat card; occupant is **Human / AI / Empty**; Start stays dead until the config is legal (local: ≥2 seats and at least one Human).
- `bgio-lobby-seat-picker` / `bgio-local-pass-and-play` — explicit seat list (all 5 factions always listed); Empty clears; two Humans is legal local pass-and-play.
- `root-digital-lobby-hud` — faction card is seat identity (name + color pip); home already has Local / Online (Online stays off this tip).

Easy / Med / Hard are **AI tiers under the AI occupant**, not a fourth occupant kind. Empty is the clear.

## Invent

None of the grammar. Tip glue is `seatOccupantView()` / `setLobbyOccupant(..., 'empty'|'ai'|tier)` over existing `selectedPlayers` + `playerAI`.

## Keep

- `.15` touch-pan shell (MAIN `pan-y`, footer sibling, click-only lobby activate)
- `.16` combat nested stages (`playStage` ORIGIN→UNITS→DEST→CONFIRM) untouched
- Stamp SoT (`__TR_GAME_VERSION`, `no-store` `/`, grow-to-fit `overflow:visible`)

Full SCORE: `briefs/2026-09-19-hybrid-solo-ai/SCORE-solo-17.md`.
