# SCORE — V2.81.53-ux-preview.5
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
tryCombatMove=false
manualOnly=true
scenario=karelia-finland-air
germans=?three=1&germans=1
```

**Lineage:** PR73 tip. James: no Try auto-start; fully manual combat-move; casualty pick when there is a choice. Tesla off. Quiet.

## Playable pockets
- Russians · **Karelia S.S.R.** → **Finland Norway**. Default `?three=1`.
- Germans · **Ukraine S.S.R.** → **Karelia S.S.R.** · `?three=1&germans=1` (the stuck still, now solvable).

## Layer B — UX
| Gate | Verdict | Note |
|---|---|---|
| No Try auto-start | **PASS** | Idle Confirm disabled. Manual FROM → units → TO → Confirm. |
| Idle start cue | **PASS** | Pulse + FROM label + one-line tip ×. |
| Chips tappable | **PASS** | Gold fill / n/have steppers. Hint if dest and no units. |
| Gold Confirm | **PASS** | As soon as dest is legal (units + dest). |
| Casualty choice | **PASS** | Do not auto-assign when INF+FTR can both take the hit. |
| Germans mid-flow | **PASS** | Attack lights after unit select. |
| No icon overlap | **PASS** | Same STACK-LOD pack. |
| Mobile ~390 | **PASS** | Single thumb CTA. Safe areas. |

## How-to (390)
1. **Combat move** — Tap pulsing stack → tap units (gold chips) → tap enemy land → gold Confirm / Attack.
2. **Battle** — AA → Continue → Roll. If you have a choice, tap the unit that takes the hit, then **Confirm: Take hits**.
3. **Air land** — Tap teal Russia → Confirm: Land in Russia.

## Stills @390
- `combat-move-idle-390.png` — no Try, pulse + FROM label
- `combat-move-confirm-390.png` — manual mid-flow, Confirm gold
- `casualty-select-390.png` — choice exists, Confirm after pick
- `germans-ukraine-karelia-390.png` — previously stuck, now solvable

**Vercel:** (pending this deploy)
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/73 (draft · do not merge)
