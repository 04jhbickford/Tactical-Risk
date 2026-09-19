# SCORE — V2.81.53-ux-preview.3
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
flow=combatMove→battle→airLanding
```

**Lineage:** stacked on PR68 preview.2 (icon no-overlap + coach-off). James next: Combat Move / Battle / airplane landing on ~390. Tesla off. Quiet until Arc gates.

## What changed
- Preview boots **Germans · COMBAT MOVE** (Ukraine S.S.R. → Karelia / Caucasus). `?inspect=1` restores PLACE inspect.
- Named CTAs match live: `Attack {dest}`, `Fire AA Guns`, `Continue`, `Roll Dice`, `Confirm Casualties`, `Retreat`, `End Battle`, `Confirm All Landings` (disabled while remaining > 0), **`Done →`** at 0 remaining, `End Combat Movement →`.
- Battle sheet is progressive Odds / Select / Resolve — thumb-reachable, map stays up.
- Air landing: pick dest per AF (map or chips). Done uses live `remainingAirLandingsToAssign`.
- Prior icon pack + Got it off kept. No rule-engine changes.

## Proof
See stills @390 after capture. Tests: `node tools/test-ux-preview-flows.mjs`.

**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/68 (draft · do not merge)
