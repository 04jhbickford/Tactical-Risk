# SCORE — V2.81.53-ux-preview.4
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
scenario=karelia-finland-air
startCue=tip+originPulse+try
```

**Lineage:** follow-up on Hybrid PR73 (`cursor/mobile-combat-ux-a29a`). James: combat-move START was not discoverable @390. Tesla off. Quiet.

## Playable pocket
Russians · **Karelia S.S.R.** (INF×3 + FTR×1) → **Finland Norway** (INF×2 + AA). After the take, land the fighter on teal **Russia** or **Karelia**. Seeded AA miss + ATK 2 / DEF 1.

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Idle start cue | **PASS** | One-line strip + Karelia pulse + Try combat move. No Got it. |
| Combat move origin/dest | **PASS** | Gold origin + dest. Confirm gold as soon as dest is legal. |
| Battle AA / dice / hits | **PASS** | One bottom card. Zoom hidden. Single gold CTA. |
| Air land + Done | **PASS** | Teal landable. Confirm: Land in Russia. After: idle Replay, not gold. |
| Phase guide | **BRIEF** | One-line strip, dismiss ×. Does not block the board. |
| No icon overlap | **PASS** | Same STACK-LOD pack as preview.2. |
| Mobile ~390 | **PASS** | Thumb Confirm. Peek or battle card, not both. |

## How-to (390)
1. **Combat move** — Idle: pulse on Karelia + tip + **Try combat move**. Or tap Karelia → INF + FTR → Finland → gold **Confirm: Move to Finland Norway**.
2. **Battle** — Confirm Fire AA (miss) → Continue → Roll combat → Take hits → Take Finland Norway.
3. **Air land** — Tap teal Russia → **Confirm: Land in Russia**. Confirm drops to idle `Landed in Russia · Replay`.

## Stills @390
- `combat-move-idle-390.png` — origin pulse + tip + Try combat move
- `combat-move-confirm-390.png` — dest legal, Confirm gold
- `combat-move-select-390.png` — origin/dest gold, Confirm gold (prior)
- `battle-mid-390.png` — Round 1 dice + hits
- `air-land-choice-390.png` — teal Russia + Karelia
- `air-landed-390.png` — fighter in Russia, Confirm idle

**Vercel:** (pending this deploy)
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/73 (draft · do not merge to main)
