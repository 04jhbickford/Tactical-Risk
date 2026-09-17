# Three preview — iPhone game-app UI lock
**As-of:** 17 Sep 2026 · James: clean polished professional modern iPhone game · spare no expense (craft, not hire)  
**Scope:** `?three=1` / PR44 preview only · Quiet to James · Tesla off  
**Bar:** Polytopia · Root · TTR mobile · Apple HIG density — **not** web dashboard / admin chrome

## Standing style-guide paths (reuse, don’t fork)
| Path | Use for |
|---|---|
| `/workspace/viz/LANGUAGE.md` + `LANGUAGE.css` | Type, radii, chips, hairline, Ink Blue money SoT (**money only** — board uses AA-PALETTE) |
| `/workspace/viz/METHOD.md` | Claim titles, phone-first 390, status chips |
| `/workspace/briefs/2026-09-17-three-ux-ia/UX-IA.md` | L0/L1/L2, Confirm grammar, board-vs-chrome |
| `/workspace/briefs/2026-09-17-three-art-gap/AA-PALETTE.md` | Parchment land / muted ocean / cream plastic units |
| `/workspace/briefs/2026-09-17-three-art-gap/ux/STACK-LOD.md` | Stack LOD, contrast, screen-space chits |
| `/workspace/briefs/2026-09-17-three-art-gap/ART-GAP.md` | Ranked P0–P2 art build |

This file = **chrome + HIG density** for Three. Board materials stay AA-PALETTE. Money Ink Blue does **not** recolor the war board.

---

## 1. Device & safe area (390 primary)
- Design @ **390×844** (iPhone 14/15 logical); also verify 393/430.
- Honor **safe-area-inset-***: L0 sits in top safe area; Confirm sits above home indicator (≥8pt clear).
- Board = **≥70%** of viewport height. Chrome is frame, not a second product.
- One-thumb: primary action in **bottom 24%**; no hover-only docks.

## 2. Type (SF / HIG-ish)
Prefer **SF Pro** (system `-apple-system, SF Pro Text`) on chrome. Tabular nums for IPC / counts.

| Role | Size / weight | Tracking | Use |
|---|---|---|---|
| L0 phase chip | 13 semibold | +0.02em | One word: PLACE / COMBAT / … |
| L0 meta (seat, IPC) | 13 medium | 0 | `Russians · IPC 24` |
| Peek title | 17 semibold | −0.01em | Territory name |
| Peek meta | 13 regular | 0 | Owner · stack summary |
| Confirm CTA | 17 semibold | −0.01em | `Confirm: Germany` |
| Map label | 11–12 medium | +0.01em | Offset from stack; hide when selected stack is the read |
| Sheet section | 13 semibold caps / 15 body | — | L2 ☰ only |

**Kill:** tiny 9–10pt map soup; ALL-CAPS HUD shout; dashboard Inter/Roboto default look; shop jargon on chrome.

## 3. Touch targets (HIG)
- Minimum **44×44pt** hit for Confirm, ☰, zoom, phase chip.
- Peek row / unit stepper ≥44pt tall.
- Confirm: full-width (minus 16pt side inset) × ≥50pt, thumb zone.
- Zoom cluster (+/−/Fit): 44pt each, 8pt gap, trailing edge, above Confirm — never overlapping peek.

## 4. Materials / blur chrome (iOS game, not CSS card)
- L0 + peek + Confirm: **frosted dark** — `backdrop-filter: blur(20–28px)` + `#1E2420` @ ~72–88% (AA-PALETTE `--hud-panel`). Hairline top edge `rgba(255,255,255,0.08)`.
- No drop-shadow stacks; one soft contact shadow under peek max (`0 8px 24px rgba(0,0,0,0.35)`).
- Board stays matte parchment; chrome is glass; **don’t** glass the map.
- Separators: 1px hairline, not chunky rules.

## 5. L0 / L1 / L2 density (from UX-IA — enforce)
| Layer | Always | Chrome |
|---|---|---|
| **L0** | Yes | ≤48pt top strip: ☰ · phase chip · seat+color · IPC. No second row. |
| **L1** | On select | **One** peek card above Confirm: name · owner · stack summary. Gold select on land. |
| **L2** | ☰ only | Single sheet; map still peeks (~20–30%). Never peek+sheet+tray together. |
| **L3** | Never | Debug tickers banned. |

**Rule:** at most **one** bottom surface. Opening L2 collapses L1 to a chip or replaces it.

## 6. Selection + Confirm craft
1. Tap land → select ring (`--select-gold` `#C4A35A`, continuous, ~2–3px screen) + peek names it (**inspect ≠ commit**).
2. Unit/count in peek → land name stays.
3. Thumb **Confirm: \<Land\>** (or Deploy N → Land) commits; tap must not fall through to map.
4. Confirm uses `--cta-confirm` amber; **only** primary action gets that fill. Secondary = ghost / hairline.
5. Kill Inspect / Noted / Select-a-land copy drift — named Confirm only when staged; idle CTA = quiet `Select a territory` (disabled look, not amber).

## 7. Light vs board contrast
- Board: warm parchment + muted ocean (AA-PALETTE) — tabletop, lit.
- Chrome: dark frosted — recedes; type `#E8E2D4` on HUD.
- Units: cream plastic + **thick dark outline** + faction rim (STACK-LOD) — must punch off parchment (fail if washed).
- Never: neon teal sea, cyan coast bloom, light-grey HUD on light land, cream-on-sand chits without outline.

## 8. Polish checklist (App Store glance test)
- [ ] 390 screenshot: board dominates; L0 thin; one bottom surface  
- [ ] Safe areas respected; Confirm clear of home indicator  
- [ ] All controls ≥44pt  
- [ ] SF hierarchy readable at arm’s length  
- [ ] Select gold continuous; Confirm named when staged  
- [ ] Dense Europe = pip+N (STACK-LOD); types in peek  
- [ ] Frosted chrome, matte board, cream plastic units  
- [ ] No web-dashboard cards, no debug quads, no neon water  

## Steal / kill
**Steal:** Poly mark→name→meta; Root/TTR edge chrome; CR ≤1 sheet; HIG 44pt + safe area + SF; AA cream plastic + parchment.  
**Kill:** Admin tables, purple-teal AI chrome, multi-bottom stack, glow-stick coasts, Lucide-as-army, hover docks.

Done when a cold App Store screenshot sits next to Polytopia/Root/TTR without looking like a web prototype.
