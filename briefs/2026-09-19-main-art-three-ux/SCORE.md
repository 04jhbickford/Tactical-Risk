# SCORE — V2.81.53-ux-preview.6
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
scenario=karelia-finland-air
tryCombatMove=false
```

**Lineage:** follow-up on Hybrid PR68 / PR73 / PR74. James he-correct: no Try, no auto-start. Tesla off. Do not merge to main.

## Playable pocket
Russians · **Karelia S.S.R.** (INF×3 + FTR×1) → **Finland Norway** or **Ukraine S.S.R.** After the take, land the fighter on teal **Russia** or **Karelia**. Seeded AA miss + ATK 2 / DEF 1. Optional attacker loss is a picker.

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Cold-open start | **PASS** | Map labels + pulsing Karelia + disabled “Select units”. No Try / TAP / strip. |
| Combat move origin/dest | **PASS** | Origin tap → INF/FTR chips. Dest pulses after ground. Gold Confirm when legal. |
| Ukraine dest | **PASS** | Ukraine before units does not steal chips. After INF, Ukraine is a legal dest. |
| Chip taps | **PASS** | HUD mouseup no longer eats unit / casualty chips. |
| Battle AA / dice / hits | **PASS** | One bottom card. Optional losses use picker. Confirm stays “Assign casualties” until picked. |
| Air land + Done | **PASS** | Teal landable. Confirm: Land in Russia. After: idle Replay, not gold. |
| Phase guide | **OFF** | Hidden strip. Discoverability is labels + pulse + Confirm hints. |
| No icon overlap | **PASS** | Same STACK-LOD pack as preview.2. |
| Mobile ~390 | **PASS** | 64px thumb Confirm. Peek or battle card, not both. |

## How-to (390)
He drives every tap. Seeded pocket only.
1. **Combat move** — Tap glowing **Karelia** → tap INF + FTR chips → tap glowing **Finland** or **Ukraine** → gold **Confirm: Attack …**.
2. **Battle** — Confirm Fire AA (miss) → Continue → Roll combat → tap a casualty chip → Take hits → Take the dest.
3. **Air land** — Tap teal Russia → **Confirm: Land in Russia**. Confirm drops to idle `Landed in Russia · Replay`.

## Stills @390
- `combat-move-cold-390.png` — labels + pulsing origin + Select units, no taps yet
- `combat-move-origin-chips-390.png` — Karelia peek chips, Confirm still Select units
- `combat-move-pick-target-390.png` — INF+FTR picked, Pick target
- `combat-move-ukraine-attack-390.png` — gold Attack Ukraine
- `combat-move-select-390.png` — gold Attack Finland
- `battle-mid-390.png` — casualty picker, Assign casualties
- `battle-casualty-picked-390.png` — INF assigned, Take hits gold
- `air-land-choice-390.png` — teal Russia + Karelia
- `air-landed-390.png` — fighter in Russia, Confirm idle

**Vercel:** https://tactical-risk20-git-cursor-comba-cfebfb-james-projects-20d8de40.vercel.app/?three=1
**Deployment:** https://tactical-risk20-hnc32wx45-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/74 (draft · PR68 lineage · do not merge to main)
