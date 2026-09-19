# SCORE — V2.81.53-ux-preview.11
**Preview only** `?three=1&max=1`. Do not merge. Tesla off.

```
version=V2.81.53-ux-preview.11
maxQuery=?three=1&max=1
doNotMerge=true
tesla=off
```

| Bar | Verdict |
|---|---|
| Air land | **PASS** — dest tap does not dump-all; per-type counts + dest choice; planes-only sheet; Confirm land. |
| Selector UX | **PASS** — combat-move / casualty / air-land are horizontal icon tiles + badge + +/−. |
| Cutoff | **KEEP** — YOU + THEY + Confirm pinned; IA scrolls. Horizontal tiles shrink the picker. |
| P0.1–P0.4 | **KEEP** — zoom hidden, YOU-confirm, dense sheet, ATK/DEF IA, max seed. |

THEY is read-only cheapest (badge only) and fully visible.

**URL:** https://tactical-risk20-git-cursor-air-l-39e813-james-projects-20d8de40.vercel.app/?three=1&max=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/80 (draft · hold merge · hybrid lineage)

Stills @390:
- `preview11-combat-tiles-390.png` — origin INF/ART/TNK/FTR/BMB tiles + +/−
- `preview11-casualty-tiles-390.png` — YOU tiles + THEY INF badge + gold Confirm
- `preview11-air-land-assign-390.png` — Russia dest, FTR/BMB at 0, Assign planes
- `preview11-air-land-ftr2-390.png` — 2 FTR to Russia, 5 left, not dump-all
- `preview11-russia-landed-390.png` — Russia INF×1 FTR×2 strip after split land
