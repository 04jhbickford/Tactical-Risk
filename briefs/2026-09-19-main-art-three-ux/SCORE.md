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
startCue=labels+originPulse+grayWhy
manualOnly=true
```

**Lineage:** follow-up on Hybrid PR74 / PR73 (`cursor/combat-start-affordance-9056`, `cursor/mobile-combat-ux-a29a`). James he-correct: no Try, no wizard. Tesla off. Quiet.

## Playable pocket
Russians · **Karelia S.S.R.** (INF×3 + FTR×1) → **Finland Norway** (INF×2 + AA) or **Ukraine S.S.R.** (ARM×2 + INF×3 + FTR). After the Finland take, land the fighter on teal **Russia** or **Karelia**. Seeded Finland path: AA miss + ATK 2 / DEF 1, then **choose** INF or FTR for the one attacker hit.

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Cold-open start | **PASS** | Labels + pulsing Karelia + TAP. Confirm gray: Tap a glowing stack. No Try. |
| Manual combat move | **PASS** | From → units (toggle) → dest → Confirm. No pre-stage. |
| Ukraine-style dest | **PASS** | After ground staged, Ukraine pulses. Attack enables on staged+dest. |
| Gray Confirm why | **PASS** | Idle / pick units / tap enemy / choose which unit dies. |
| Casualty choice | **PASS** | Optional hits open a picker sheet. Forced losses auto-fill only. |
| Battle AA / dice | **PASS** | One bottom card. Single gold CTA when the verb is ready. |
| Air land + Done | **PASS** | Teal landable. After: idle Replay, not gold. |
| Phase guide | **STRIP** | Persistent numbered steps. Not a Got it modal. |
| Mobile ~390 | **PASS** | Thumb Confirm. Peek or battle/casualty card, not both. |

## How-to (390) — manual taps only
1. Cold open: read **Karelia** / **Finland** labels. Confirm stays gray (`Tap a glowing stack`). There is no Try button.
2. Tap glowing **Karelia** → tap **INF** (and FTR if you want) chips — they gold-ring on/off.
3. Legal dests pulse. Tap **Finland Norway** *or* **Ukraine S.S.R.** → gold **Confirm: Attack …**.
4. Battle (Finland demo): Fire AA → Continue → Roll combat → **choose which unit dies** (INF or FTR) → Take hits → Take Finland.
5. Air land: tap teal Russia → **Confirm: Land in Russia**.

## Stills @390
- `combat-move-cold-390.png` — labels + origin pulse, no Try
- `combat-move-units-dest-390.png` — origin → units → dest, Confirm gold
- `casualty-choice-390.png` — Choose which unit dies sheet
- `ukraine-dest-390.png` — Karelia staged, Attack Ukraine enabled

**Vercel:** https://tactical-risk20-git-cursor-hybri-e0b48e-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/75 (draft · PR68 lineage · do not merge to main)
