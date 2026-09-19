# SCORE — V2.81.53-ux-preview.7
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
tesla=off
scenario=karelia-finland-air
tryCombatMove=false
```

**Lineage:** James he-correct on preview.6, folded into PR76 hybrid tip. Do not merge to main.

## Playable pocket
Russians · **Karelia S.S.R.** (INF×3 + FTR×1) → **Finland Norway** or **Ukraine S.S.R.** After the take, land the fighter on teal **Russia** or **Karelia**. Seeded AA miss + ATK 2 / DEF 1. Optional attacker loss is a picker.

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Partial select | **PASS** | INF/FTR `[-] n/max [+]`. 1 of 3 INF is legal. Not chip toggle. |
| Congo click-through | **PASS** | Sheet +/− eat touches. Canvas ignores sheet/zoom rects. |
| Air land planes-only | **PASS** | No dest stack sheet. Planes + Confirm land. |
| Manual path | **PASS** | FROM → units → TO → Confirm. No Try. |
| Casualties | **PASS** | Picker when a choice exists (preview.6). |
| Chip mouseup | **PASS** | Kept from preview.6. |
| Tesla / Viz | **OFF** | Quiet James. Arc gates Viz. |
| Mobile ~390 | **PASS** | 44px stepper thumbs. 64px Confirm. |

## How-to (390)
1. **Combat move** — Tap **Karelia** → INF `[-] 0/3 [+]` (partial OK) + FTR → tap **Finland** or **Ukraine** → gold **Confirm: Attack …**.
2. **Battle** — Fire AA → Continue → Roll → casualty chip if offered → Take hits → Take dest.
3. **Air land** — Planes-only card + **Confirm land**. Tap teal Russia → **Confirm: Land in Russia**.

## Stills @390
- `combat-move-steppers-390.png` — INF 0/3 FTR 0/1, no map steal
- `combat-move-partial-inf-390.png` — INF 1/3 after +
- `air-land-planes-390.png` — fighter only + Confirm land
