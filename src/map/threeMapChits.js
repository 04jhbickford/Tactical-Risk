// STACK-LOD lock for ?three=1.
// Mid/far: cream pip + N ONLY. ZERO type parade. (James OK)
// Near / select / tray / peek: faction-tinted molded plastic A&A minis
// (infantry / tank / plane / ship) — not recessed glyph-on-disc.
// Grey mold atlas + runtime plastic tint. Not photoreal photo-scan figurines.

import * as THREE from 'three';
import { PLASTIC, PALETTE } from './threeMapPalette.js';

const CREAM = PALETTE.cream || '#F0E6D2';

export const UNIT_ATLAS = {
  // P37: plastic atlas is complete unclipped minis. Minis sheet had black
  // rectangular cells + ships sliced across the grid ("clipped by sheet").
  land: 'assets/three/units/units-land-plastic.png',
  naval: 'assets/three/units/units-naval-plastic.png',
};

export const ATLAS_CELL = {
  infantry: { atlas: 'land', col: 0, row: 0 },
  armour: { atlas: 'land', col: 1, row: 0 },
  artillery: { atlas: 'land', col: 2, row: 0 },
  fighter: { atlas: 'land', col: 3, row: 0 },
  tacticalBomber: { atlas: 'land', col: 0, row: 1 },
  bomber: { atlas: 'land', col: 0, row: 1 },
  aaGun: { atlas: 'land', col: 1, row: 1 },
  factory: { atlas: 'land', col: 2, row: 1 },
  battleship: { atlas: 'naval', col: 0, row: 0 },
  destroyer: { atlas: 'naval', col: 0, row: 0 },
  cruiser: { atlas: 'naval', col: 0, row: 0 },
  carrier: { atlas: 'naval', col: 1, row: 0 },
  submarine: { atlas: 'naval', col: 0, row: 1 },
  transport: { atlas: 'naval', col: 1, row: 1 },
};

const atlases = { land: null, naval: null };

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadUnitAtlases() {
  if (atlases.land && atlases.naval) return atlases;
  const [land, naval] = await Promise.all([
    loadImage(UNIT_ATLAS.land),
    loadImage(UNIT_ATLAS.naval),
  ]);
  atlases.land = land;
  atlases.naval = naval;
  return atlases;
}

export function atlasCellFor(type) {
  return ATLAS_CELL[type] || null;
}

export function plasticFor(owner) {
  return PLASTIC[owner] || '#8E8F8C';
}

function hexRgb(hex) {
  const n = Number.parseInt(String(hex || '').replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(hex, toward, t) {
  const a = hexRgb(hex);
  const b = hexRgb(toward);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function mutePipRim(hex) {
  // P29 P1: pip rim chroma ≤ Confirm gold. Faction metal ≠ CTA #C4A35A.
  return mixRgb(hex || '#8E8F8C', '#3A3428', 0.42);
}

function drawBadge(ctx, x, y, label, scale) {
  const text = String(label);
  ctx.font = `700 ${Math.round(scale * 0.22)}px -apple-system, "SF Pro Text", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  const bw = Math.max(scale * 0.28, tw + scale * 0.14);
  const bh = scale * 0.26;
  ctx.fillStyle = '#1A1610';
  ctx.beginPath();
  const r = bh * 0.5;
  ctx.moveTo(x - bw / 2 + r, y - bh / 2);
  ctx.arcTo(x + bw / 2, y - bh / 2, x + bw / 2, y + bh / 2, r);
  ctx.arcTo(x + bw / 2, y + bh / 2, x - bw / 2, y + bh / 2, r);
  ctx.arcTo(x - bw / 2, y + bh / 2, x - bw / 2, y - bh / 2, r);
  ctx.arcTo(x - bw / 2, y - bh / 2, x + bw / 2, y - bh / 2, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F4EFE4';
  ctx.fillText(text, x, y + 1);
}

function pathInf(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.78, s * 0.38, s * 0.10, 0, 0, Math.PI * 2);
  ctx.moveTo(cx - s * 0.20, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.04, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.78);
  ctx.lineTo(cx - s * 0.22, cy + s * 0.78);
  ctx.closePath();
  ctx.moveTo(cx + s * 0.04, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.20, cy + s * 0.78);
  ctx.lineTo(cx + s * 0.02, cy + s * 0.78);
  ctx.closePath();
  ctx.roundRect(cx - s * 0.22, cy - s * 0.22, s * 0.44, s * 0.50, s * 0.08);
  ctx.moveTo(cx + s * 0.16, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.30, cy + s * 0.12);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.06);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.16, cy - s * 0.06);
  ctx.lineTo(cx - s * 0.36, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.16);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.04);
  ctx.closePath();
  ctx.ellipse(cx, cy - s * 0.42, s * 0.16, s * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy - s * 0.54, s * 0.20, s * 0.14, 0, 0, Math.PI * 2);
}

function pathTnk(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.82, cy + s * 0.08, s * 1.64, s * 0.42, s * 0.14);
  ctx.roundRect(cx - s * 0.58, cy - s * 0.10, s * 1.08, s * 0.32, s * 0.08);
  ctx.roundRect(cx - s * 0.20, cy - s * 0.36, s * 0.42, s * 0.32, s * 0.08);
  ctx.rect(cx + s * 0.16, cy - s * 0.28, s * 0.72, s * 0.12);
}

function pathArt(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.38, cy + s * 0.40, s * 0.22, s * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + s * 0.30, cy + s * 0.40, s * 0.22, s * 0.22, 0, 0, Math.PI * 2);
  ctx.roundRect(cx - s * 0.26, cy - s * 0.02, s * 0.48, s * 0.28, s * 0.06);
  ctx.moveTo(cx - s * 0.04, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.72, cy - s * 0.58);
  ctx.lineTo(cx + s * 0.82, cy - s * 0.44);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.16);
  ctx.closePath();
}

function pathFtr(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.90);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.08);
  ctx.lineTo(cx + s * 0.96, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.86, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.06);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.58);
  ctx.lineTo(cx + s * 0.36, cy + s * 0.70);
  ctx.lineTo(cx, cy + s * 0.56);
  ctx.lineTo(cx - s * 0.36, cy + s * 0.70);
  ctx.lineTo(cx - s * 0.10, cy + s * 0.58);
  ctx.lineTo(cx - s * 0.10, cy + s * 0.06);
  ctx.lineTo(cx - s * 0.86, cy + s * 0.18);
  ctx.lineTo(cx - s * 0.96, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.08);
  ctx.closePath();
}

function pathBmb(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.88);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.16);
  ctx.lineTo(cx + s * 1.00, cy + s * 0.00);
  ctx.lineTo(cx + s * 0.90, cy + s * 0.16);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.62);
  ctx.lineTo(cx + s * 0.28, cy + s * 0.82);
  ctx.lineTo(cx, cy + s * 0.70);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.82);
  ctx.lineTo(cx - s * 0.12, cy + s * 0.62);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.90, cy + s * 0.16);
  ctx.lineTo(cx - s * 1.00, cy + s * 0.00);
  ctx.lineTo(cx - s * 0.14, cy - s * 0.16);
  ctx.closePath();
  ctx.ellipse(cx - s * 0.36, cy + s * 0.00, s * 0.14, s * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + s * 0.36, cy + s * 0.00, s * 0.14, s * 0.16, 0, 0, Math.PI * 2);
}

function pathAa(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.42, s * 0.42, s * 0.18, 0, 0, Math.PI * 2);
  ctx.roundRect(cx - s * 0.18, cy - s * 0.06, s * 0.36, s * 0.38, s * 0.06);
  ctx.moveTo(cx - s * 0.08, cy + s * 0.02);
  ctx.lineTo(cx - s * 0.02, cy - s * 0.82);
  ctx.lineTo(cx + s * 0.14, cy - s * 0.82);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.02);
  ctx.closePath();
}

function pathFac(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.rect(cx - s * 0.68, cy - s * 0.02, s * 1.36, s * 0.62);
  ctx.moveTo(cx - s * 0.68, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.46, cy - s * 0.40);
  ctx.lineTo(cx - s * 0.24, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.02, cy - s * 0.40);
  ctx.lineTo(cx + s * 0.20, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.40);
  ctx.lineTo(cx + s * 0.64, cy - s * 0.02);
  ctx.closePath();
  ctx.rect(cx + s * 0.28, cy - s * 0.74, s * 0.20, s * 0.72);
}

function pathShip(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.96, cy + s * 0.06);
  ctx.lineTo(cx - s * 0.68, cy - s * 0.10);
  ctx.lineTo(cx + s * 0.62, cy - s * 0.10);
  ctx.lineTo(cx + s * 0.96, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.68, cy + s * 0.22);
  ctx.lineTo(cx - s * 0.68, cy + s * 0.22);
  ctx.closePath();
  ctx.roundRect(cx - s * 0.20, cy - s * 0.34, s * 0.52, s * 0.30, s * 0.05);
}

function pathCarrier(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.94, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.60, cy - s * 0.16);
  ctx.lineTo(cx + s * 0.70, cy - s * 0.16);
  ctx.lineTo(cx + s * 0.94, cy + s * 0.02);
  ctx.lineTo(cx + s * 0.68, cy + s * 0.20);
  ctx.lineTo(cx - s * 0.68, cy + s * 0.20);
  ctx.closePath();
  ctx.roundRect(cx + s * 0.28, cy - s * 0.06, s * 0.28, s * 0.28, s * 0.04);
}

function pathSub(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.04, s * 0.92, s * 0.22, 0, 0, Math.PI * 2);
  ctx.roundRect(cx - s * 0.10, cy - s * 0.34, s * 0.28, s * 0.28, s * 0.04);
}

function pathTr(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.88, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.58, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.68, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.90, cy + s * 0.10);
  ctx.lineTo(cx + s * 0.60, cy + s * 0.28);
  ctx.lineTo(cx - s * 0.60, cy + s * 0.28);
  ctx.closePath();
  ctx.roundRect(cx - s * 0.26, cy - s * 0.32, s * 0.60, s * 0.32, s * 0.05);
}

const PATHS = {
  infantry: pathInf,
  armour: pathTnk,
  artillery: pathArt,
  fighter: pathFtr,
  bomber: pathBmb,
  tacticalBomber: pathBmb,
  aaGun: pathAa,
  factory: pathFac,
  battleship: pathShip,
  destroyer: pathShip,
  cruiser: pathShip,
  carrier: pathCarrier,
  submarine: pathSub,
  transport: pathTr,
};

function drawContactShadow(ctx, cx, cy, s) {
  // Soft contact AO blob UNDER the chit — never a black disc over the cream face.
  ctx.save();
  ctx.fillStyle = 'rgba(14, 12, 8, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.10, cy + s * 1.02, s * 0.92, s * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(14, 12, 8, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.12, cy + s * 1.14, s * 1.16, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function tokenEllipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

function drawCreamToken(ctx, cx, cy, s, faction) {
  const rx = s * 0.88;
  const ry = s * 0.66;
  const side = s * 0.36;
  // ≥2.5px screen at mid 64px sprite (256 tex → 14px stroke ≈ 3.5px on glass).
  const outlineW = Math.max(14, s * 0.155);

  // Thick dark silhouette / undercut — filled wall, not a hairline stroke.
  tokenEllipse(ctx, cx + 2.2, cy + side + 3.6, rx + outlineW * 0.58, ry + outlineW * 0.50);
  ctx.fillStyle = '#0E0C08';
  ctx.fill();
  tokenEllipse(ctx, cx, cy - 1.6, rx + outlineW * 0.58, ry + outlineW * 0.50);
  ctx.fill();

  // Cylinder side — injection-molded cream plastic, not a flat disc / grey figurine.
  const sideGrad = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy + side);
  sideGrad.addColorStop(0, mixRgb(CREAM, '#8A7355', 0.42));
  sideGrad.addColorStop(0.32, '#D4C4A8');
  sideGrad.addColorStop(0.68, mixRgb(CREAM, '#6A5640', 0.28));
  sideGrad.addColorStop(1, mixRgb(CREAM, '#3A2E1C', 0.52));
  ctx.beginPath();
  ctx.ellipse(cx, cy + side, rx, ry, 0, 0, Math.PI);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = sideGrad;
  ctx.fill();

  // Faction rim painted on the side + lip — thick enough to read at 64px.
  ctx.save();
  tokenEllipse(ctx, cx, cy + side * 0.22, rx, ry);
  ctx.strokeStyle = faction || '#8E8F8C';
  ctx.lineWidth = Math.max(14, s * 0.28);
  ctx.stroke();
  ctx.restore();

  // Cream #F0E6D2 top face — keep cream (do not bleach to white poker-chip).
  const top = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.7, cy + ry);
  top.addColorStop(0, mixRgb(CREAM, '#FFF8E6', 0.10));
  top.addColorStop(0.42, CREAM);
  top.addColorStop(1, mixRgb(CREAM, '#8A7355', 0.28));
  tokenEllipse(ctx, cx, cy, rx - 2, ry - 2);
  ctx.fillStyle = top;
  ctx.fill();

  // Recessed face well — injection cavity, not a stamp-on-disc.
  ctx.save();
  tokenEllipse(ctx, cx, cy, rx * 0.78, ry * 0.76);
  ctx.clip();
  const well = ctx.createRadialGradient(cx, cy, s * 0.08, cx, cy, s * 0.72);
  well.addColorStop(0, mixRgb(CREAM, '#8A7355', 0.16));
  well.addColorStop(0.62, 'rgba(240,230,210,0)');
  well.addColorStop(1, 'rgba(58,46,28,0.10)');
  ctx.fillStyle = well;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  ctx.restore();

  // Emboss / bevel highlight (NW lip) + shadow (SE undercut) — stronger molded edge.
  ctx.save();
  tokenEllipse(ctx, cx, cy, rx - 3, ry - 3);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.10, cy - ry * 0.18, rx * 0.94, ry * 0.88, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,248,230,0.88)';
  ctx.lineWidth = Math.max(7, s * 0.11);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.12, cy + ry * 0.20, rx * 0.90, ry * 0.84, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(58,46,28,0.52)';
  ctx.lineWidth = Math.max(7, s * 0.11);
  ctx.stroke();
  ctx.restore();

  // Dark inner outline so the cream punches at 64px (≥2.5px screen).
  tokenEllipse(ctx, cx, cy, rx - 2, ry - 2);
  ctx.strokeStyle = '#0E0C08';
  ctx.lineWidth = outlineW;
  ctx.stroke();

  // Faction lip on the top edge (2–3px screen at mid).
  tokenEllipse(ctx, cx, cy, rx - outlineW * 0.70, ry - outlineW * 0.60);
  ctx.strokeStyle = faction || '#8E8F8C';
  ctx.lineWidth = Math.max(9, s * 0.17);
  ctx.stroke();

  // Mold seam groove between rim and face.
  tokenEllipse(ctx, cx, cy, rx - outlineW * 1.05, ry - outlineW * 0.92);
  ctx.strokeStyle = 'rgba(14,12,8,0.28)';
  ctx.lineWidth = Math.max(2, s * 0.028);
  ctx.stroke();

  // P25: glossy toy-plastic specular — tight lobe + streak, not matte token.
  // Keep cream #F0E6D2; do not bleach the face to white.
  ctx.save();
  tokenEllipse(ctx, cx, cy, rx - outlineW * 0.85, ry - outlineW * 0.75);
  ctx.clip();
  const spec = ctx.createRadialGradient(
    cx - rx * 0.40, cy - ry * 0.50, 0,
    cx - rx * 0.40, cy - ry * 0.50, s * 0.16,
  );
  spec.addColorStop(0, 'rgba(255,255,255,0.92)');
  spec.addColorStop(0.16, 'rgba(255,252,244,0.62)');
  spec.addColorStop(0.38, 'rgba(255,248,230,0.16)');
  spec.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spec;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  ctx.save();
  ctx.translate(cx - rx * 0.34, cy - ry * 0.48);
  ctx.rotate(-0.42);
  const streak = ctx.createLinearGradient(-s * 0.24, 0, s * 0.24, 0);
  streak.addColorStop(0, 'rgba(255,255,255,0)');
  streak.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  streak.addColorStop(0.70, 'rgba(255,248,230,0.08)');
  streak.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.24, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = streak;
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Cylinder wall catch-light — injection-molded side sheen.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + side, rx, ry, 0, 0, Math.PI);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.clip();
  const sideSpec = ctx.createLinearGradient(cx - rx * 0.55, cy, cx - rx * 0.18, cy + side);
  sideSpec.addColorStop(0, 'rgba(255,255,255,0)');
  sideSpec.addColorStop(0.45, 'rgba(255,248,230,0.34)');
  sideSpec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sideSpec;
  ctx.fillRect(cx - rx * 0.62, cy - 2, rx * 0.38, side + ry);
  ctx.restore();
}

function drawTypeGlyph(ctx, type, cx, cy, s) {
  // Recessed INTO cream plastic — carved cavity, not a stamp-on-disc / Lucide fill.
  const pathFn = PATHS[type];
  if (!pathFn) return;
  const gs = s * 0.52;
  const gy = cy + s * 0.03;
  const strokePath = (dx, dy, style, width) => {
    ctx.save();
    ctx.translate(dx, dy);
    pathFn(ctx, cx, gy, gs);
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  };
  const fillPath = (dx, dy, style) => {
    ctx.save();
    ctx.translate(dx, dy);
    pathFn(ctx, cx, gy, gs);
    ctx.fillStyle = style;
    ctx.fill();
    ctx.restore();
  };
  fillPath(2.6, 3.0, 'rgba(14, 12, 8, 0.34)');
  fillPath(-2.2, -2.4, 'rgba(255, 248, 230, 0.48)');
  fillPath(0.6, 1.0, mixRgb(CREAM, '#5A4A32', 0.52));
  fillPath(0.2, 0.4, mixRgb(CREAM, '#3A2E1C', 0.22));
  strokePath(-1.6, -1.8, 'rgba(255,248,230,0.40)', Math.max(1.8, s * 0.028));
  strokePath(1.6, 1.8, 'rgba(14,12,8,0.42)', Math.max(1.6, s * 0.024));
}

function drawFactionWell(ctx, cx, cy, s, faction) {
  // Recessed faction dimple on mid pip — molded cavity, not a soldier/type mark.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx + 1.2, cy + 1.6, s * 0.20, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14, 12, 8, 0.36)';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - 1.0, cy - 1.2, s * 0.18, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 248, 230, 0.42)';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.17, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = faction || '#8E8F8C';
  ctx.fill();
  ctx.strokeStyle = '#0E0C08';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.04, cy - s * 0.04, s * 0.08, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,248,230,0.28)';
  ctx.fill();
  ctx.restore();
}

function paintCreamChit(ctx, {
  faction,
  quantity,
  glyph = null,
  w = 256,
  h = 256,
  shadow = true,
} = {}) {
  const cx = w / 2;
  const cy = h / 2 - Math.min(w, h) * 0.10;
  const s = Math.min(w, h) * 0.36;
  ctx.clearRect(0, 0, w, h);
  if (shadow) drawContactShadow(ctx, cx, cy, s);
  drawCreamToken(ctx, cx, cy, s, faction);
  // Near only. Mid/far pass glyph:null — ZERO type parade.
  if (glyph) {
    drawTypeGlyph(ctx, glyph, cx, cy, s);
  } else {
    drawFactionWell(ctx, cx, cy, s, faction);
  }
  if (quantity >= 1) drawBadge(ctx, w * 0.82, h * 0.86, quantity, Math.min(w, h) * 0.85);
}

function atlasImage(type) {
  const cell = atlasCellFor(type);
  if (!cell) return null;
  return atlases[cell.atlas] || null;
}

function sampleCell(img, type) {
  const cell = atlasCellFor(type);
  if (!img || !cell) return null;
  const cols = cell.atlas === 'naval' ? 2 : 4;
  const rows = 2;
  const cw = (img.naturalWidth || img.width) / cols;
  const ch = (img.naturalHeight || img.height) / rows;
  return { img, sx: cell.col * cw, sy: cell.row * ch, cw, ch };
}

function keyBackdrop(pix) {
  // P37 HARD: every mini is bare plastic + contact shadow. Drop black
  // rectangular sheets and leftover paper so infantry/tank/ship match.
  // P38: do NOT key mid-luma parchment-like sculpt — that punched holes
  // so tan plastic showed the board through the body.
  const d = pix.data;
  const w = pix.width;
  const h = pix.height;
  const sample = (x, y) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const corners = [
    sample(2, 2), sample(w - 3, 2), sample(2, h - 3), sample(w - 3, h - 3),
  ];
  const bg = corners.reduce((acc, c) => {
    acc[0] += c[0] / 4;
    acc[1] += c[1] / 4;
    acc[2] += c[2] / 4;
    return acc;
  }, [0, 0, 0]);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const a = d[i + 3];
    if (a < 8) continue;
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const dist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
    if ((lum < 26 && sat < 18) || (lum > 248 && sat < 16) || dist < 16) {
      d[i + 3] = 0;
    }
  }
}

function isTanPlastic(hex) {
  const [r, g, b] = hexRgb(hex);
  return r > 130 && g > 90 && b < 130 && r - b > 28;
}

function drawOpaqueUnderbody(ctx, cx, cy, s, ownerColor) {
  // Solid plastic disc under the sculpt so parchment cannot show through.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.04, cy + s * 0.22, s * 0.78, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = mixRgb(ownerColor || '#8E8F8C', '#2A2014', 0.28);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.02, s * 0.70, s * 0.58, 0, 0, Math.PI * 2);
  ctx.fillStyle = ownerColor || '#8E8F8C';
  ctx.fill();
  ctx.strokeStyle = '#1A140C';
  ctx.lineWidth = Math.max(5, s * 0.08);
  ctx.stroke();
  ctx.restore();
}

function drawPlasticRim(ctx, cx, cy, s, ownerColor) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.04, s * 0.72, s * 0.60, 0, 0, Math.PI * 2);
  ctx.strokeStyle = isTanPlastic(ownerColor) ? '#1A140C' : '#0E0C08';
  ctx.lineWidth = Math.max(isTanPlastic(ownerColor) ? 8 : 5, s * (isTanPlastic(ownerColor) ? 0.12 : 0.07));
  ctx.stroke();
  ctx.restore();
}

function paintMoldedMini(ctx, {
  type,
  ownerColor,
  quantity,
  w = 256,
  h = 256,
  shadow = true,
  badge = true,
} = {}) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const s = Math.min(w, h) * 0.42;
  if (shadow) drawContactShadow(ctx, cx, cy + s * 0.12, s);
  const bodyHex = isTanPlastic(ownerColor) ? mixRgb(ownerColor, '#3A2A14', 0.22) : ownerColor;
  drawOpaqueUnderbody(ctx, cx, cy, s, bodyHex);
  const src = sampleCell(atlasImage(type), type);
  const [fr, fg, fb] = hexRgb(bodyHex || '#8E8F8C');
  if (src) {
    const tmp = document.createElement('canvas');
    tmp.width = 256;
    tmp.height = 256;
    const tx = tmp.getContext('2d');
    tx.drawImage(src.img, src.sx, src.sy, src.cw, src.ch, 0, 0, 256, 256);
    const pix = tx.getImageData(0, 0, 256, 256);
    keyBackdrop(pix);
    const d = pix.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 8) continue;
      // P29 HARD: luminance colorize. Grey sculpt lighting stays; chroma
      // becomes faction plastic (DE field-grey, SU green, UK tan, US olive,
      // JP orange-red). Do not keep primer-grey or crush to black glyphs.
      const sculpt = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      const body = 0.55 + sculpt * 0.75;
      let r = fr * body;
      let g = fg * body;
      let b = fb * body;
      const highlight = Math.max(0, (sculpt - 0.72) / 0.28);
      if (highlight > 0) {
        r += (240 - r) * highlight * 0.40;
        g += (232 - g) * highlight * 0.34;
        b += (210 - b) * highlight * 0.24;
      }
      d[i] = Math.max(0, Math.min(255, Math.round(r)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      d[i + 3] = a;
    }
    tx.putImageData(pix, 0, 0);
    const dw = w * 0.96;
    const dh = h * 0.96;
    ctx.drawImage(tmp, (w - dw) / 2, (h - dh) / 2 - 2, dw, dh);
    drawPlasticRim(ctx, cx, cy, s, bodyHex);
    // Soft toy-plastic specular — keep the sculpt, do not flatten to a disc.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spec = ctx.createRadialGradient(w * 0.34, h * 0.28, 2, w * 0.34, h * 0.28, w * 0.26);
    spec.addColorStop(0, 'rgba(255,255,255,0.58)');
    spec.addColorStop(0.28, 'rgba(255,248,230,0.16)');
    spec.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else {
    // Fallback: faction-plastic silhouette, still not a cream glyph disc.
    ctx.save();
    const pathFn = PATHS[type] || PATHS.infantry;
    pathFn(ctx, cx, cy, s * 0.95);
    ctx.fillStyle = ownerColor || '#8E8F8C';
    ctx.fill();
    ctx.strokeStyle = '#0E0C08';
    ctx.lineWidth = Math.max(3, s * 0.05);
    ctx.stroke();
    ctx.restore();
  }
  if (badge && quantity >= 1) drawBadge(ctx, w * 0.82, h * 0.86, quantity, Math.min(w, h) * 0.85);
}

export function paintPiece(ctx, { type, ownerColor, quantity, w = 256, h = 256, shadow = true, badge = true } = {}) {
  paintMoldedMini(ctx, { type, ownerColor, quantity, w, h, shadow, badge });
}

export function paintPip(ctx, { ownerColor, total, size = 256 } = {}) {
  // P22 HARD: mid/far = cream plastic chit + faction rim + N.
  // ZERO type parade. No soldier, ship, tank, or atlas figurine.
  // P29: rim is muted ink-metal so it cannot outshine Confirm gold.
  paintCreamChit(ctx, {
    faction: mutePipRim(ownerColor),
    quantity: total,
    glyph: null,
    w: size,
    h: size,
    shadow: true,
  });
}

export function paintOverflow(ctx, { plus, size = 192 } = {}) {
  ctx.clearRect(0, 0, size, size);
  drawBadge(ctx, size / 2, size / 2, `+${plus}`, size * 1.35);
}

function chitTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function makeChitTexture(type, ownerColor, quantity) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  paintPiece(canvas.getContext('2d'), { type, ownerColor, quantity });
  return chitTex(canvas);
}

export function makePipTexture(ownerColor, total) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  paintPip(canvas.getContext('2d'), { ownerColor, total, size: 256 });
  return chitTex(canvas);
}

export function makeOverflowTexture(plus) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  paintOverflow(canvas.getContext('2d'), { plus });
  return chitTex(canvas);
}

export function pieceIconDataUrl(type, ownerColor, quantity = 0) {
  // P38 HARD: peek/HUD shows ONE number (the <b> count). Never bake a
  // leading "1" badge into the icon (that was the "1 2" / "1 1" bug).
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  paintPiece(canvas.getContext('2d'), {
    type, ownerColor, quantity: 0, w: 128, h: 128, badge: false,
  });
  void quantity;
  return canvas.toDataURL('image/png');
}
