# SCORE — V2.81.53-ux-preview.7
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

**Lineage:** follow-up on Hybrid PR68 / PR73 / PR74. James stills: INF + must increment, not steal the map. Tesla off. Do not merge to main.

## Playable pocket
Russians · **Karelia S.S.R.** (INF×3 + FTR×1) → **Finland Norway** or **Ukraine S.S.R.** After the take, land the fighter on teal **Russia** or **Karelia**. Seeded AA miss + ATK 2 / DEF 1. Optional attacker loss is a picker.

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Cold-open start | **PASS** | Map labels + pulsing Karelia + disabled “Select units”. No Try / TAP / strip. |
| Combat move origin/dest | **PASS** | Origin tap → INF/FTR **steppers** `[-] 0/n [+]`. Dest pulses after ground. Gold Confirm when legal. |
| INF + click-through | **PASS** | Tap INF + several times: count rises. Map does not select Africa under the button. |
| Zoom +/- Fit | **PASS** | Sealed; canvas ignores the zoom rect. |
| Ukraine dest | **PASS** | Ukraine before units does not steal chips. After INF, Ukraine is a legal dest. |
| Battle AA / dice / hits | **PASS** | One bottom card. Optional losses use picker. Confirm stays “Assign casualties” until picked. |
| Air land + Done | **PASS** | Teal landable. Confirm: Land in Russia. After: idle Replay, not gold. |
| Phase guide | **OFF** | Hidden strip. Discoverability is labels + pulse + Confirm hints. |
| No icon overlap | **PASS** | Same STACK-LOD pack as preview.2. |
| Mobile ~390 | **PASS** | 44px stepper thumbs. 64px Confirm. Peek or battle card, not both. |

## How-to (390)
He drives every tap. Seeded pocket only.
1. **Combat move** — Tap glowing **Karelia** → INF `[-] 0/3 [+]` and FTR steppers → tap glowing **Finland** or **Ukraine** → gold **Confirm: Attack …**.
2. **Battle** — Confirm Fire AA (miss) → Continue → Roll combat → tap a casualty chip → Take hits → Take the dest.
3. **Air land** — Tap teal Russia → **Confirm: Land in Russia**. Confirm drops to idle `Landed in Russia · Replay`.

## Stills @390
- `combat-move-origin-steppers-390.png` — Karelia sheet, INF 0/3 FTR 0/1
- `combat-move-inf-plus-390.png` — after several INF +, count rose, selection still Karelia
- `combat-move-pick-target-390.png` — INF+FTR staged, Pick target
- `combat-move-select-390.png` — gold Attack Finland
