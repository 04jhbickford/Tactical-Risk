# SCORE-solo-17 — Seat cards Human / AI / Empty

**Hold merge.** Tip only. PR76 hybrid `cursor/unit-sheet-clickthrough-d314`. Quiet James.

## Claim
Hard reload `?three=1&solo=1` @390 paints `V2.81.56-ux-solo.17`. Every faction seat shows occupant **Human · AI · Empty** with Easy/Med/Hard as AI tiers. START GAME stays disabled until a legal local config (≥2 seats and at least one Human). Cards grow-to-fit (no `overflow:hidden` clip). `.15` finger-pan and `.16` combat stages stay.

## Steal vs invent

Catalog SoT cited by James: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A #3, GAPS P0 #4). Folder was not on this checkout; patterns named in the tip brief are the steal list.

| Piece | Steal / invent | Cite |
|---|---|---|
| Nation/seat card + occupant Human / AI / Empty | **STEAL** | `aa-1942-seat-combatants` |
| Start dead until legal (local: ≥2 + one Human) | **STEAL** | `aa-1942-seat-combatants` + main tip `selectedCount >= 2` |
| Explicit 5-seat list; Empty clears; 2+ Humans = pass-and-play | **STEAL** | `bgio-lobby-seat-picker` / `bgio-local-pass-and-play` |
| Faction card is seat identity; Local / Online on home | **STEAL** | `root-digital-lobby-hud` (Online already off this tip) |
| Easy / Med / Hard as AI tiers under AI occupant | **STEAL** | same + existing `AI_DIFFICULTIES` / `playerAI` |
| Touch-pan shell + stamp SoT | **KEEP** | `.15` T1–T5 + `.14` `no-store` `/` |
| Combat nested stages | **KEEP** | `.16` `playStage()` untouched |

Nothing invented for the occupant grammar. Only glue: `seatOccupantView()` so chrome and `lobbyCanStart` read one derived occupant.

## Ship
- `GAME_VERSION` = `V2.81.56-ux-solo.17`
- `index.html` `__TR_GAME_VERSION` + `main.js?v=.17` + SW/Cache drop (keep `.14` no-store on `/`)
- Boot graph `?v=.17`
- Occupant row Human / AI / Empty; AI-tier row Easy / Med / Hard on all 5 seats
- `setLobbyOccupant(..., 'empty')` clears; `'ai'` seats last Easy/Med/Hard (default Med)
- `lobbyCanStart` = ≥2 seated **and** at least one Human
- Seat wraps stay `flex:0 0 auto; overflow:visible` (no `.10`–`.11` clip)

## QC @390 (fill after fail-closed)

Tip after hard reload. `/` `no-store`.

- A1 stamp `.17` on L0 + lobby + `__TR_GAME_VERSION`
- All 5 seats full occupant chrome (Human/AI/Empty + Easy/Med/Hard), no clip, Americans not collapsed
- Start dead at 0 seats and at all-AI; live at 1 Human + AI / 2+ Humans
- T1 smoke: MAIN `pan-y`, footer sibling, CDP touch moves `scrollTop`

Hold merge.
