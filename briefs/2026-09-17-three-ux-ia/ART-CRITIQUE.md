# ART-CRITIQUE — Three.js preview lock (2026-09-17)

Hard P0 for `?three=1` only. Do not merge over live Canvas V2.81.51.

Viz / Arc / James QA of the Three polish frames vs SOTA mobile strategy (Polytopia, Root, Ticket to Ride mobile, Civ mobile, Clash Royale HUD). Current read was still a prototype: grey/plastic land, neon or royal-blue water artifacts, coast bloom, utility scrap icons, full type-stacks at mid-zoom.

## Steal
- **Polytopia:** mark → name → occupant/meta. One peek. Land is a plate, not a photo tile.
- **Root / TTR:** material honesty. Paper/bone board. Faction is a rim + wash, not candy fills.
- **Clash Royale:** ≤1 bottom surface. Named Confirm is the only primary.

## Kill
- Neon cyan water and any `#44C5BD` / royal-blue placeholder
- Translucent sea-zone quads / Line2 boxes
- Emissive / foam coast bloom
- Full type-stack at mid-zoom Europe
- Grey scrap icons + black text pills under every unit
- Inspect / Noted wording

## P0 lock
1. **Zero placeholder quads.** No water-zone fills or hairboxes. No full-map bake plane. Land plates opaque and DoubleSide so ocean cannot show through Egypt / N. Africa. No bevel inset that punches coast holes. Inflated sand **land-seal** plates punch ocean out under every coast.
2. **North-up Canvas SoT.** UK west of Germany. Africa / Egypt south of the Med. Same `data/territories.json` politics. Wrap frustum-culled.
3. **Palette.** AA-PALETTE.md: parchment/olive land `#C4B896`, muted blue-grey sea `#3D5A66` / `#4F6E78`, paper grain multiply, soft `#D9D2C0` coast. No cyan bloom.
4. **Dense stacks.** Far = faction pip + total N. Mid = cream chits with collision spacing (no overlap piles). Near/select = typed atlas chits. Labels offset or hide under stacks.
5. **Cream chits.** Molded atlas discs (INF/TNK/FTR/BMB + BB/CV/SS/TR). Faction = rim tint only. No UI glyph icons.

## P1
Soft key + board grain. Continuous gold edge-ink on select. Labels hide under stacks / on select. Named Confirm (`Confirm · Land` / `Confirm inspect · Land`).
