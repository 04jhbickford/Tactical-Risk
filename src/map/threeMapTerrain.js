// Preview-only geography for ?three=1.
// Steal Civ/Polytopia TERRAIN LITERACY (biome, relief, forest clumps,
// coast shelf, rivers, undulation). Do NOT steal hex/low-poly/diorama art.
// Material language stays A&A parchment + Risk continent washes.

import * as THREE from 'three';
import { MAP_WIDTH, MAP_HEIGHT } from './camera.js';
import { PALETTE, REGION_WASH, USSR_LANDS, bonusContinent, mixHex } from './threeMapPalette.js';

export const BAKE_W = 2048;
export const BAKE_H = 1170;

export const TERRAIN_TEX = {
  forest: 'assets/three/board/terrain-forest.png',
  mountain: 'assets/three/board/terrain-mountain.png',
  arid: 'assets/three/board/terrain-arid.png',
  snow: 'assets/three/board/terrain-snow.png',
};

// Climate — not flat continent fills. Snow → lush → arid, plus relief.
export const BIOME = {
  snow: 'snow',
  lush: 'lush',
  forest: 'forest',
  arid: 'arid',
  mountain: 'mountain',
  hills: 'hills',
  steppe: 'steppe',
};

const BIOME_OF = {
  'Finland Norway': 'snow',
  Sweden: 'snow',
  'Evenki National Okrug': 'snow',
  Alaska: 'snow',
  'West Canada': 'snow',
  'Soviet Far East': 'snow',
  'Karelia S.S.R.': 'forest',
  'East Canada': 'forest',
  Brazil: 'forest',
  Congo: 'forest',
  'French Equatorial Africa': 'forest',
  'French Indo China': 'forest',
  'New Guinea': 'forest',
  'East Indies': 'forest',
  'Borneo Celebes': 'forest',
  'West Europe': 'lush',
  'United Kingdom': 'lush',
  Eire: 'lush',
  'East US': 'lush',
  Mexico: 'lush',
  Panama: 'lush',
  Cuba: 'lush',
  'South Africa': 'lush',
  Madagascar: 'lush',
  Germany: 'lush',
  'East Europe': 'lush',
  Japan: 'hills',
  Manchuria: 'hills',
  Spain: 'arid',
  Switzerland: 'mountain',
  'South Europe': 'mountain',
  China: 'mountain',
  India: 'mountain',
  'Argentina-Chile': 'mountain',
  Peru: 'mountain',
  'West US': 'mountain',
  Novosibirsk: 'mountain',
  Mongolia: 'hills',
  Kwangtung: 'hills',
  Algeria: 'arid',
  'Anglo Sudan Egypt': 'arid',
  'French West Africa': 'arid',
  'Saudi Arabia': 'arid',
  Persia: 'arid',
  'Syria Jordan': 'arid',
  'Kazakh S.S.R.': 'arid',
  Australia: 'arid',
  'Italian East Africa': 'arid',
  'Kenya-Rhodesia': 'arid',
  Turkey: 'steppe',
  'Ukraine S.S.R.': 'steppe',
  Russia: 'steppe',
  Columbia: 'lush',
};

// P29: stain hexes for ink-on-parchment, not solid GIS fills.
// P30: lift chroma toward paper so Central/Eastern lands cannot crush to void.
const BIOME_HEX = {
  snow: '#E8E2D4',
  lush: '#9AAA70',
  forest: '#7A8E58',
  arid: '#C4A35A',
  mountain: '#B0A078',
  hills: '#A09868',
  steppe: '#C4B080',
};

// P30 HARD: every land texel stays stained parchment after ACES + lighting.
// Rec.709 luma floor — darker biome wash OK, black fill/void is not.
export const PARCHMENT_LUMA_FLOOR = 0.48;

const BIOME_HEIGHT = {
  mountain: 2.24,
  hills: 1.36,
  forest: 0.98,
  snow: 1.08,
  steppe: 0.84,
  lush: 0.80,
  arid: 0.70,
};

const BIOME_LIFT = {
  mountain: 1.18,
  hills: 0.46,
  forest: 0.18,
  snow: 0.22,
  steppe: 0.14,
  lush: 0.12,
  arid: 0.09,
};

// Printed IPC homage (classic A&A board language). Sits on paper, not HUD.
export const PRINT_IPC = {
  Germany: 10,
  'United Kingdom': 8,
  'West Europe': 6,
  'South Europe': 6,
  'East Europe': 3,
  'Ukraine S.S.R.': 3,
  'Karelia S.S.R.': 3,
  Russia: 8,
  'East US': 12,
  'West US': 10,
  'East Canada': 3,
  India: 3,
  Japan: 8,
  China: 2,
  'Anglo Sudan Egypt': 2,
  Brazil: 3,
  Australia: 2,
  'South Africa': 2,
  Persia: 2,
  Manchuria: 3,
  'French Indo China': 2,
  Algeria: 1,
  Spain: 2,
  Sweden: 2,
  'Finland Norway': 2,
  Switzerland: 0,
};

// World-space ridge polylines (map pixels). Alps / Himalayas / Rockies / Andes.
export const RIDGES = [
  [[960, 590], [992, 604], [1040, 630], [1096, 680], [1160, 700], [1200, 690]], // Alps
  [[1700, 820], [1791, 860], [1900, 760], [2034, 733], [2140, 700]], // Himalaya
  [[3180, 220], [3258, 400], [3260, 620], [3258, 795]], // Rockies
  [[220, 1230], [240, 1411], [285, 1635]], // Andes
  [[1550, 700], [1679, 600], [1905, 490]], // Altai / Kazakh
  [[1086, 160], [1070, 230], [1086, 280]], // Scandes
];

const CAPITAL_ROUNDELS = {
  Germany: '#6A6C68',
  Russia: '#2F7A2A',
  'United Kingdom': '#B89050',
  'East US': '#4E6828',
  Japan: '#D24A1C',
};

// Thin drainage into sea — recessed printed-ink rivers, not Civ city chrome.
export const RIVERS = [
  [[1195, 900], [1189, 1064], [1208, 1280], [1200, 1460]], // Nile
  [[912, 560], [960, 500], [1000, 400], [980, 260]], // Rhine
  [[1000, 630], [1100, 560], [1211, 492], [1360, 500]], // Danube
  [[1550, 420], [1693, 289], [1820, 210]], // Volga
  [[1905, 490], [1989, 240], [1989, 120]], // Yenisei
  [[2024, 740], [2140, 800], [2260, 860]], // Yangtze
  [[1798, 947], [1880, 1000], [1960, 1040]], // Ganges
  [[125, 700], [140, 860], [180, 1080]], // Mississippi
  [[420, 1360], [300, 1365], [180, 1320]], // Amazon
  [[1126, 1453], [1080, 1320], [1013, 1188]], // Congo
  [[3263, 279], [3100, 200], [3000, 160]], // Mackenzie
  [[1399, 471], [1480, 520], [1558, 700]], // Dnieper / Don
];

const tiles = { forest: null, mountain: null, arid: null, snow: null };
let worldLandTex = null;

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

function hashName(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function wrapHash(ix, iy, period) {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y, period) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = wrapHash(x0, y0, period);
  const n10 = wrapHash(x0 + 1, y0, period);
  const n01 = wrapHash(x0, y0 + 1, period);
  const n11 = wrapHash(x0 + 1, y0 + 1, period);
  return n00 + (n10 - n00) * sx + (n01 - n00) * sy + (n11 - n01 - n10 + n00) * sx * sy;
}

export function fbm(x, y, period = 16, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const p = Math.max(2, Math.round(period / freq));
    sum += valueNoise(x * freq, y * freq, p) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / (norm || 1);
}

export function biomeFor(territory) {
  if (!territory || territory.isWater) return 'lush';
  if (BIOME_OF[territory.name]) return BIOME_OF[territory.name];
  if (USSR_LANDS.has(territory.name)) return 'steppe';
  const c = territory.continent || '';
  if (c === 'Africa' || c === 'Middle East') return 'arid';
  if (c === 'Asia') return 'steppe';
  if (c === 'Europe') return 'lush';
  if (c === 'Oceania') return 'lush';
  return 'lush';
}

export function biomeHex(biome) {
  return BIOME_HEX[biome] || BIOME_HEX.lush;
}

export function heightForBiome(biome) {
  return BIOME_HEIGHT[biome] || 0.76;
}

const HEIGHT_OF = {
  Germany: 1.12,
  'East Europe': 1.08,
  Spain: 1.05,
  Switzerland: 1.88,
  'South Europe': 1.82,
};

export function landHeightForTerrain(territory) {
  if (territory && HEIGHT_OF[territory.name] != null) return HEIGHT_OF[territory.name];
  return heightForBiome(biomeFor(territory));
}

export function printIpc(territory) {
  if (!territory || territory.isWater) return 0;
  if (PRINT_IPC[territory.name] != null) return PRINT_IPC[territory.name];
  return territory.production > 1 ? territory.production : 1;
}

export const CONTINENT_FILL_ALPHA = 0.08;
export const CONTINENT_OVERLAY_ALPHA = 0.11;
export const CONTINENT_OUTLINE_ALPHA = 0.56;

function continentWash(territory) {
  // P31 HARD: live Risk bonus continents. USSR_LANDS stay Asia, not a 8th wash.
  if (!territory) return REGION_WASH.Europe;
  const key = bonusContinent(territory) || 'Europe';
  return REGION_WASH[key] || PALETTE.landBase;
}

function quietContinentWash(hex) {
  // Mix toward parchment so multiply cannot crush Europe into chocolate.
  return `#${mixHex(hex, PALETTE.landBase, 0.62).toString(16).padStart(6, '0')}`;
}

// Printed +N chips at bonus-group centroids (data/continents.json).
export const CONTINENT_BADGES = [
  { name: 'Europe', bonus: 30, x: 900, y: 640 },
  { name: 'Asia', bonus: 33, x: 1420, y: 500 },
  { name: 'Africa', bonus: 27, x: 1088, y: 1264 },
  { name: 'Middle East', bonus: 18, x: 1516, y: 872 },
  { name: 'North America', bonus: 24, x: 3184, y: 628 },
  { name: 'South America', bonus: 12, x: 292, y: 1476 },
  { name: 'Oceania', bonus: 39, x: 2472, y: 1284 },
];

function wxToU(x) {
  return x / MAP_WIDTH;
}
function wyToV(y) {
  return y / MAP_HEIGHT;
}

function pathPoly(ctx, poly, w, h) {
  if (!poly || poly.length < 3) return false;
  ctx.beginPath();
  ctx.moveTo(wxToU(poly[0][0]) * w, wyToV(poly[0][1]) * h);
  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo(wxToU(poly[i][0]) * w, wyToV(poly[i][1]) * h);
  }
  ctx.closePath();
  return true;
}

function drawTileClipped(ctx, img, alpha, mode, scale = 1) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  const tw = (img.naturalWidth || img.width || 512) * scale;
  const th = (img.naturalHeight || img.height || 512) * scale;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  for (let y = -th * 0.2; y < ch + th; y += th * 0.92) {
    for (let x = -tw * 0.2; x < cw + tw; x += tw * 0.92) {
      ctx.drawImage(img, x, y, tw, th);
    }
  }
  ctx.restore();
}

function stampClumps(ctx, img, poly, w, h, count, seed) {
  if (!img || !poly) return;
  ctx.save();
  if (!pathPoly(ctx, poly, w, h)) {
    ctx.restore();
    return;
  }
  ctx.clip();
  let sx = 0;
  let sy = 0;
  for (const [x, y] of poly) {
    sx += x;
    sy += y;
  }
  const cx = sx / poly.length;
  const cy = sy / poly.length;
  const tw = 260;
  const th = 260;
  for (let i = 0; i < count; i++) {
    const n1 = wrapHash(seed + i * 17, seed + i * 31, 97);
    const n2 = wrapHash(seed + i * 53, seed + i * 11, 97);
    const n3 = wrapHash(seed + i * 7, seed + i * 71, 97);
    const px = wxToU(cx + (n1 - 0.5) * 280) * w - tw / 2;
    const py = wyToV(cy + (n2 - 0.5) * 220) * h - th / 2;
    ctx.globalAlpha = 0.74 + n3 * 0.22;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(img, px, py, tw * (0.88 + n3 * 0.55), th * (0.88 + n1 * 0.55));
  }
  ctx.restore();
}

function stampForestStipple(ctx, poly, w, h, count, seed) {
  if (!poly) return;
  ctx.save();
  if (!pathPoly(ctx, poly, w, h)) {
    ctx.restore();
    return;
  }
  ctx.clip();
  let sx = 0;
  let sy = 0;
  for (const [x, y] of poly) {
    sx += x;
    sy += y;
  }
  const cx = sx / poly.length;
  const cy = sy / poly.length;
  for (let i = 0; i < count; i++) {
    const n1 = wrapHash(seed + i * 19, seed + i * 41, 127);
    const n2 = wrapHash(seed + i * 67, seed + i * 13, 127);
    const n3 = wrapHash(seed + i * 3, seed + i * 89, 127);
    const px = wxToU(cx + (n1 - 0.5) * 260) * w;
    const py = wyToV(cy + (n2 - 0.5) * 200) * h;
    const r = 3.4 + n3 * 5.2;
    ctx.globalAlpha = 0.42 + n3 * 0.22;
    ctx.fillStyle = n3 > 0.55 ? '#5C6E44' : '#4A5A34';
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.95, r * 0.62, n1 * 1.2, 0, Math.PI * 2);
    ctx.fill();
    if (n3 > 0.42) {
      ctx.globalAlpha = 0.28 + n3 * 0.18;
      ctx.fillStyle = '#4A5E32';
      ctx.beginPath();
      ctx.ellipse(px + r * 0.55, py + r * 0.22, r * 0.55, r * 0.36, n2 * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintMountainMass(ctx, ridge, w, h, tile) {
  // P31 HARD: painted tabletop ranges — not “a line with hatches.”
  if (!ridge || ridge.length < 2) return;
  ctx.save();
  ctx.beginPath();
  const [x0, y0] = ridge[0];
  ctx.moveTo(wxToU(x0) * w, wyToV(y0) * h);
  for (let i = 1; i < ridge.length; i++) {
    ctx.lineTo(wxToU(ridge[i][0]) * w, wyToV(ridge[i][1]) * h);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 118;
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  // Fat corridor clip via destination-in mask on a temp path: clip to
  // overlapping ellipses so the range is a painted mass, not a spine.
  ctx.beginPath();
  for (let i = 0; i < ridge.length; i++) {
    const px = wxToU(ridge[i][0]) * w;
    const py = wyToV(ridge[i][1]) * h;
    ctx.ellipse(px, py, 78, 48, 0.2, 0, Math.PI * 2);
  }
  for (let i = 0; i < ridge.length - 1; i++) {
    const ax = wxToU(ridge[i][0]) * w;
    const ay = wyToV(ridge[i][1]) * h;
    const bx = wxToU(ridge[i + 1][0]) * w;
    const by = wyToV(ridge[i + 1][1]) * h;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    ctx.ellipse(mx, my, 86, 52, 0.15, 0, Math.PI * 2);
  }
  ctx.clip();
  if (tile) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.22;
    const tw = 280;
    const th = 200;
    for (let i = 0; i < ridge.length; i++) {
      const px = wxToU(ridge[i][0]) * w;
      const py = wyToV(ridge[i][1]) * h;
      ctx.drawImage(tile, px - tw / 2, py - th / 2, tw, th);
    }
  }
  for (let i = 0; i < ridge.length; i++) {
    const px = wxToU(ridge[i][0]) * w;
    const py = wyToV(ridge[i][1]) * h;
    const shade = ctx.createRadialGradient(px + 14, py + 16, 6, px, py, 88);
    shade.addColorStop(0, 'rgba(120, 104, 78, 0.18)');
    shade.addColorStop(0.5, 'rgba(176, 160, 124, 0.10)');
    shade.addColorStop(1, 'rgba(196, 184, 150, 0)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 1;
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(px + 6, py + 8, 72, 46, 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(236, 226, 196, 0.28)';
    ctx.beginPath();
    ctx.ellipse(px - 22, py - 18, 48, 26, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function fillFeathered(ctx, poly, w, h, style, alpha) {
  if (!pathPoly(ctx, poly, w, h)) return;
  ctx.save();
  ctx.fillStyle = style;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.strokeStyle = style;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 16;
  ctx.globalAlpha = alpha * 0.55;
  ctx.stroke();
  ctx.lineWidth = 32;
  ctx.globalAlpha = alpha * 0.24;
  ctx.stroke();
  ctx.restore();
}

// P32 HARD: continent stain without 16/32px feathers — those stacked across
// adjacent Europe lands and crushed the +30 basin into chocolate.
function fillStain(ctx, poly, w, h, style, alpha) {
  if (!pathPoly(ctx, poly, w, h)) return;
  ctx.save();
  ctx.fillStyle = style;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.restore();
}

function paintCoastTooth(ctx, poly, w, h) {
  if (!pathPoly(ctx, poly, w, h)) return;
  ctx.save();
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(236, 226, 198, 0.30)';
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(86, 72, 48, 0.16)';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.restore();
}

function drawContinentBadge(ctx, badge, w, h) {
  const px = wxToU(badge.x) * w;
  const py = wyToV(badge.y) * h;
  const wash = REGION_WASH[badge.name] || PALETTE.landBase;
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(px - 28, py - 13, 56, 26, 7);
  else ctx.rect(px - 28, py - 13, 56, 26);
  ctx.fillStyle = 'rgba(237, 228, 204, 0.88)';
  ctx.fill();
  ctx.strokeStyle = wash;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42, 36, 24, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = '#2A2418';
  ctx.font = '700 13px "Palatino Linotype", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+${badge.bonus}`, px, py + 0.5);
  ctx.restore();
}

function drawRoundel(ctx, x, y, color, w, h) {
  // P1: printed A&A control emblem — cream disc, ink ring, faction bullseye.
  const px = wxToU(x) * w;
  const py = wyToV(y) * h;
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 15.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(236, 228, 204, 0.96)';
  ctx.fill();
  ctx.strokeStyle = '#2A2418';
  ctx.lineWidth = 2.1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 11.4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(42, 36, 24, 0.35)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 8.6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, 4.0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(236, 228, 204, 0.70)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, 1.7, 0, Math.PI * 2);
  ctx.fillStyle = '#2A2418';
  ctx.fill();
  ctx.restore();
}

function floorParchmentLuminance(ctx, w, h, floor = PARCHMENT_LUMA_FLOOR) {
  // P30 HARD: lift crushed land texels back to stained paper.
  // P31: scale RGB equally — do not mix toward tan parchment (that killed
  // live continent chroma so Europe/Asia read as one brown slab).
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (y >= floor || y < 0.002) continue;
    const lift = floor / y;
    d[i] = Math.min(255, Math.round(r * lift * 255));
    d[i + 1] = Math.min(255, Math.round(g * lift * 255));
    d[i + 2] = Math.min(255, Math.round(b * lift * 255));
  }
  ctx.putImageData(img, 0, 0);
}

function drawPolyline(ctx, pts, w, h, style, width) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(wxToU(pts[0][0]) * w, wyToV(pts[0][1]) * h);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(wxToU(pts[i][0]) * w, wyToV(pts[i][1]) * h);
  }
  ctx.stroke();
  ctx.restore();
}

function drawIpcDot(ctx, x, y, value, w, h) {
  // P1: printed IPC chip — A&A board literacy, not HUD type.
  if (!value) return;
  const px = wxToU(x) * w;
  const py = wyToV(y) * h;
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 15.5, 0, Math.PI * 2);
  ctx.fillStyle = '#EDE4CC';
  ctx.fill();
  ctx.strokeStyle = '#2A2418';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 12.4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(42, 36, 24, 0.35)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = '#2A2418';
  ctx.font = '700 15px "Palatino Linotype", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), px, py + 0.6);
  ctx.restore();
}

export async function loadTerrainTiles() {
  if (tiles.forest && tiles.mountain) return tiles;
  const [forest, mountain, arid, snow] = await Promise.all([
    loadImage(TERRAIN_TEX.forest),
    loadImage(TERRAIN_TEX.mountain),
    loadImage(TERRAIN_TEX.arid),
    loadImage(TERRAIN_TEX.snow),
  ]);
  tiles.forest = forest;
  tiles.mountain = mountain;
  tiles.arid = arid;
  tiles.snow = snow;
  return tiles;
}

export async function bakeWorldLandAtlas(lands, parchmentImg) {
  await loadTerrainTiles();
  const w = BAKE_W;
  const h = BAKE_H;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.landBase;
  ctx.fillRect(0, 0, w, h);
  if (parchmentImg) {
    const tw = parchmentImg.naturalWidth || parchmentImg.width || 512;
    const th = parchmentImg.naturalHeight || parchmentImg.height || 512;
    for (let y = 0; y < h; y += th) {
      for (let x = 0; x < w; x += tw) ctx.drawImage(parchmentImg, x, y, tw, th);
    }
  }

  // P29 HARD: parchment ink wash — continent + biome stain the paper.
  // Never solid charcoal GIS fills (that was the .28 mid slab).
  // P30: lighter multiply so Central/Eastern Europe cannot crush to void.
  // P31: feathered fills + painted terrain so lands do not read as GIS polygons.
  for (const land of lands) {
    const biome = biomeFor(land);
    const continent = continentWash(land);
    const climate = biomeHex(biome);
    for (const poly of land.polygons || []) {
      if (!pathPoly(ctx, poly, w, h)) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      fillStain(ctx, poly, w, h, continent, CONTINENT_OVERLAY_ALPHA);
      ctx.globalCompositeOperation = 'multiply';
      fillStain(ctx, poly, w, h, quietContinentWash(continent), CONTINENT_FILL_ALPHA);
      fillStain(ctx, poly, w, h, climate, 0.05);
      if (!pathPoly(ctx, poly, w, h)) {
        ctx.restore();
        continue;
      }
      ctx.clip();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = climate;
      ctx.fill();
      if (biome === 'snow') {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = '#F4F0E6';
        ctx.fill();
        drawTileClipped(ctx, tiles.snow, 0.48, 'soft-light', 0.62);
      } else if (biome === 'arid') {
        drawTileClipped(ctx, tiles.arid, 0.28, 'multiply', 0.62);
        drawTileClipped(ctx, tiles.arid, 0.22, 'soft-light', 0.7);
      } else if (biome === 'forest') {
        // Clumps only — never a solid green fill.
        drawTileClipped(ctx, tiles.forest, 0.14, 'multiply', 0.78);
      } else if (biome === 'mountain') {
        drawTileClipped(ctx, tiles.mountain, 0.34, 'multiply', 0.48);
        drawTileClipped(ctx, tiles.mountain, 0.26, 'overlay', 0.42);
      } else if (biome === 'hills') {
        drawTileClipped(ctx, tiles.mountain, 0.20, 'multiply', 0.55);
      } else if (biome === 'lush') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#8A9A62';
        ctx.fill();
      } else if (biome === 'steppe') {
        drawTileClipped(ctx, tiles.arid, 0.22, 'soft-light', 0.7);
      }
      ctx.restore();
      if (pathPoly(ctx, poly, w, h)) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = continent;
        ctx.globalAlpha = CONTINENT_OUTLINE_ALPHA;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4.4;
        ctx.stroke();
        ctx.restore();
      }
      paintCoastTooth(ctx, poly, w, h);
      if (biome === 'forest') {
        stampClumps(ctx, tiles.forest, poly, w, h, 28, hashName(land.name));
        stampForestStipple(ctx, poly, w, h, 170, hashName(land.name) + 3);
      } else if (biome === 'lush') {
        stampClumps(ctx, tiles.forest, poly, w, h, 14, hashName(land.name));
        stampForestStipple(ctx, poly, w, h, 88, hashName(land.name) + 9);
      } else if (biome === 'mountain' || biome === 'hills') {
        stampClumps(ctx, tiles.mountain, poly, w, h, 12, hashName(land.name));
      }
    }
  }

  // Restore paper tooth after inks so the board stays printed, not 3D plastic.
  if (parchmentImg) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.36;
    const tw = parchmentImg.naturalWidth || parchmentImg.width || 512;
    const th = parchmentImg.naturalHeight || parchmentImg.height || 512;
    for (let y = 0; y < h; y += th) {
      for (let x = 0; x < w; x += tw) ctx.drawImage(parchmentImg, x, y, tw, th);
    }
    // Gentle screen lift so multiply stains stay paper, not charcoal.
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.10;
    for (let y = 0; y < h; y += th) {
      for (let x = 0; x < w; x += tw) ctx.drawImage(parchmentImg, x, y, tw, th);
    }
    ctx.restore();
  }
  floorParchmentLuminance(ctx, w, h);

  // Painted mountain masses (A&A board caliber) — never hatch-tick ridges.
  // Soft SE mountain shadow stays as a painted wash, not a hatch stamp.
  for (const ridge of RIDGES) {
    paintMountainMass(ctx, ridge, w, h, tiles.mountain);
  }

  for (const badge of CONTINENT_BADGES) {
    drawContinentBadge(ctx, badge, w, h);
  }

  for (const river of RIVERS) {
    drawPolyline(ctx, river.map(([x, y]) => [x + 3, y + 4]), w, h, 'rgba(36, 40, 32, 0.38)', 5.2);
    drawPolyline(ctx, river, w, h, 'rgba(52, 64, 60, 0.62)', 3.2);
    drawPolyline(ctx, river, w, h, 'rgba(120, 128, 116, 0.28)', 1.4);
  }

  for (const land of lands) {
    const v = printIpc(land);
    if (!v) continue;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const poly of land.polygons || []) {
      for (const [x, y] of poly) {
        sx += x;
        sy += y;
        n += 1;
      }
    }
    if (!n) continue;
    const cx = sx / n;
    const cy = sy / n;
    drawIpcDot(ctx, cx + 18, cy + 22, v, w, h);
    const roundel = CAPITAL_ROUNDELS[land.name];
    if (roundel) drawRoundel(ctx, cx - 22, cy - 10, roundel, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  worldLandTex = tex;
  return tex;
}

export function getWorldLandTex() {
  return worldLandTex;
}

export function applyWorldLandUVs(geometry) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv) return;
  const SCALE = 0.1;
  for (let i = 0; i < pos.count; i++) {
    // Mesh X is (MAP_WIDTH - origX) * SCALE. Atlas is painted in orig map X.
    // Un-mirror or ridges/forests/rivers/IPC land on the wrong continent.
    const flippedX = pos.getX(i) / SCALE;
    const origX = MAP_WIDTH - flippedX;
    const wy = -pos.getZ(i) / SCALE;
    uv.setXY(i, origX / MAP_WIDTH, 1 - wy / MAP_HEIGHT);
  }
  uv.needsUpdate = true;
  geometry.setAttribute('uv2', uv.clone());
}

export function sculptLandRelief(geometry, territory, height) {
  const biome = biomeFor(territory);
  const amp = BIOME_LIFT[biome] || 0.08;
  const seed = hashName(territory?.name) * 0.0017;
  const pos = geometry.attributes.position;
  if (!pos) return;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < height * 0.58) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = fbm(x * 0.22 + seed, z * 0.22 + seed, 14, 4);
    let lift = (n - 0.42) * amp;
    if (biome === 'mountain') {
      const ridge = Math.pow(Math.max(0, n - 0.28), 1.12) * 1.42;
      lift += ridge;
    } else if (biome === 'hills') {
      lift += Math.max(0, n - 0.48) * 0.38;
    } else if (biome === 'forest') {
      lift += Math.max(0, n - 0.58) * 0.16;
    } else {
      lift += (n - 0.5) * 0.06;
    }
    pos.setY(i, y + lift);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function makeCoastShelfMaterial() {
  // P30: printed shelf ink, not emissive turquoise neon.
  return new THREE.MeshStandardMaterial({
    color: 0x6a8488,
    transparent: true,
    opacity: 0.28,
    roughness: 0.78,
    metalness: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.12,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
}

export function makeRiverMaterial() {
  return new THREE.LineBasicMaterial({
    color: 0x3a4e52,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
  });
}
