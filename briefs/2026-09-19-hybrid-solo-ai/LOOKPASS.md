# Lookpass — V2.81.56-ux-solo.8

**Hold merge.** Off main. Tesla / Viz off. SoT = [PR76](https://github.com/04jhbickford/Tactical-Risk/pull/76).

**Tip:** https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
**Pocket:** `?three=1&max=1` (Karelia fixture, unchanged)  
**Skip lobby:** `?three=1&solo=1&go=1`

## James P0 checklist (.8)

| # | Ask | Result |
|---|---|---|
| 1 | Setup menu compact @390; scroll does not steal faction taps | Seats-only scroller (`touch-action:pan-y`); header/opts/start pinned; seats `manipulation` |
| 2 | Select budget = deploy cap / casualty need | Steppers `plusOff` + `capSelectedToBudget`; casualty `used >= need` |
| 3 | After initial 6: Undo **or** Pass | `canEndPhase` at 6; gold Pass; Undo via `undoPlacement` |
| 4 | Global Undo except battle + tech dice | `#three-undo`; false during `play.battle` / `tech.rolls` / breakthrough |
| 5 | Eligible units by territory | Land → land+air; sea → naval/air/cargo; sheet uses `eligibleStacks` |
| 6 | Research: info top, compact die + selector | No orphan hero die; `.three-research-row` SVG die + DIE 5 stepper |
| 7 | Breakthrough dense + (i) | 2-col `.three-tech-grid`; (i) pops; no tall inline copy |
| 8 | Combat-move load land onto TRN | `legalDests` land→adj sea w/ TRN; `moveUnits(..., { targetShipId })` |
| 9 | Multi-cargo UI | Per TRN/CV row + chips; tap ship to load/unload independently |

## Kept

Lobby polish (.6). Deploy 6+5 @390 (.6). Research SVG die, never `<img>` (.7). Persist P0 `1bef077`. Three UX locks. Pocket `?max=1` unchanged.

## Stubs left

Retreat / bombard tiles. S11 diagnostics sheet. Naval leftover still `allowNavalSkip`. Play Online. My Games list.
