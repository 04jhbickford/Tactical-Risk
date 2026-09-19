# SCORE — V2.81.53-ux-preview.5
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
scenario=karelia-finland-air
```

**Lineage:** follow-up on Hybrid PR68 / PR73 / PR74. James he-correct: no Try, no auto-start. Tesla off. Do not merge to main.

## Playable pocket
Russians · **Karelia S.S.R.** (INF×3 + FTR×1) → **Finland Norway** (INF×2 + AA). After the take, land the fighter on teal **Russia** or **Karelia**. Seeded AA miss + ATK 2 / DEF 1.

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Cold-open start | **PASS** | Numbered strip + pulsing Karelia + TAP chip before any tap. |
| Combat move origin/dest | **PASS** | Origin pulses until tap. Dest pulses after INF+FTR. Confirm gold when legal. |
| Battle AA / dice / hits | **PASS** | One bottom card. Zoom hidden. Single gold CTA. |
| Air land + Done | **PASS** | Teal landable. Confirm: Land in Russia. After: idle Replay, not gold. |
| Phase guide | **STRIP** | Persistent numbered steps. Not a Got it modal. No ×. |
| No icon overlap | **PASS** | Same STACK-LOD pack as preview.2. |
| Mobile ~390 | **PASS** | 64px thumb Confirm. Peek or battle card, not both. |

## How-to (390)
Cold open already shows the path. Then:
1. **Combat move** — Tap glowing Karelia → tap INF + FTR chips → tap glowing Finland → gold **Confirm: Move to Finland Norway**.
2. **Battle** — Confirm Fire AA (miss) → Continue → Roll combat → Take hits → Take Finland Norway.
3. **Air land** — Tap teal Russia → **Confirm: Land in Russia**. Confirm drops to idle `Landed in Russia · Replay`.

## Stills @390
- `combat-move-cold-390.png` — strip + pulsing origin + TAP, no taps yet
- `combat-move-select-390.png` — origin/dest gold, Confirm gold
- `battle-mid-390.png` — Round 1 dice + hits
- `air-land-choice-390.png` — teal Russia + Karelia
- `air-landed-390.png` — fighter in Russia, Confirm idle

**Vercel:** https://tactical-risk20-git-cursor-comba-cfebfb-james-projects-20d8de40.vercel.app/?three=1
**Deployment:** https://tactical-risk20-em2czwl5r-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/74 (draft · PR68 lineage · do not merge to main)
