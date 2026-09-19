// Three / side-project HUD. Preview only.
// Frosted L0/L1/L2 + exclusive Confirm gold. Board stays main Canvas art.

import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import { formatUnitName } from '../utils/unitNames.js';
import { getUnitIconPath } from '../utils/unitIcons.js';
import { stripPreviewParams } from './uxPreviewFlag.js';

const TYPE_SHORT = {
  infantry: 'INF',
  armour: 'TNK',
  artillery: 'ART',
  fighter: 'FTR',
  bomber: 'BMB',
  tacticalBomber: 'TAC',
  transport: 'TRN',
  submarine: 'SUB',
  destroyer: 'DD',
  cruiser: 'CA',
  battleship: 'BB',
  carrier: 'CV',
  factory: 'FAC',
  aaGun: 'AA',
};

export function shortType(type) {
  return TYPE_SHORT[type] || String(type || '?').slice(0, 3).toUpperCase();
}

export function stackSummary(stacks) {
  if (!stacks?.length) return '';
  return stacks
    .map((s) => `${shortType(s.type)}×${s.quantity}`)
    .join(' ');
}

function iconRowHtml(stacks) {
  if (!stacks?.length) return '';
  return `<div class="three-peek-row">${stacks.map((s) => {
    const src = getUnitIconPath(s.type, s.owner) || '';
    return `<button type="button" class="three-peek-unit" data-unit-type="${s.type}" title="${formatUnitName(s.type)}">
      <img src="${src}" alt="${shortType(s.type)}" width="36" height="36">
      <b>${s.quantity}</b>
    </button>`;
  }).join('')}</div>`;
}

function printIpc(land) {
  const n = Number(land?.production ?? land?.ipc ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function injectThreeChrome({ seat = 'Russians', ipc = 24, phase = 'PLACE' } = {}) {
  document.documentElement.classList.add('three-spike', 'ux-preview');
  const style = document.createElement('style');
  style.textContent = `
    html.three-spike, html.three-spike body {
      background:#3D5A66; overflow:hidden;
      font-family:-apple-system,"SF Pro Text","SF Pro Display","Segoe UI",sans-serif;
      -webkit-font-smoothing:antialiased;
    }
    html.three-spike #minimap,
    html.three-spike #sidebar,
    html.three-spike #hud,
    html.three-spike #hud-clarity,
    html.three-spike #three-spike-hint { display:none !important; }
    html.three-spike #mapCanvas {
      position:absolute; inset:0; width:100%; height:100%;
      display:block; touch-action:none; cursor:grab;
      -webkit-user-select:none; user-select:none;
    }
    html.three-spike #mapCanvas.is-panning { cursor:grabbing; }
    html.three-spike #mapCanvas.is-hovering { cursor:pointer; }
    #three-l0 {
      position:absolute; left:0; right:0; top:0; z-index:30;
      height:calc(48px + env(safe-area-inset-top, 0px));
      padding:env(safe-area-inset-top, 0px) 10px 0;
      padding-left:max(10px, env(safe-area-inset-left));
      padding-right:max(10px, env(safe-area-inset-right));
      display:flex; align-items:center; gap:8px;
      background:linear-gradient(180deg, rgba(30,36,32,0.12) 0%, rgba(30,36,32,0.00) 100%);
      -webkit-backdrop-filter:saturate(1.35) blur(22px);
      backdrop-filter:saturate(1.35) blur(22px);
      border-bottom:1px solid rgba(255,255,255,0.08);
      box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);
      color:#E8E2D4;
      pointer-events:none;
    }
    #three-l0 button, #three-l0 .three-l0-chip { pointer-events:auto; }
    #three-menu-btn {
      width:44px; height:44px; border-radius:12px;
      border:1px solid rgba(255,255,255,0.12);
      background:rgba(30,36,32,0.42); color:#E8E2D4;
      -webkit-backdrop-filter:saturate(1.35) blur(16px);
      backdrop-filter:saturate(1.35) blur(16px);
      font-size:18px; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-l0 .three-l0-chip {
      min-height:44px; padding:0 12px; border-radius:999px;
      display:inline-flex; align-items:center; gap:6px;
      background:rgba(30,36,32,0.42);
      border:1px solid rgba(255,255,255,0.12);
      color:#E8E2D4;
      -webkit-backdrop-filter:saturate(1.35) blur(16px);
      backdrop-filter:saturate(1.35) blur(16px);
      font:600 13px/1 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:0.02em;
    }
    #three-phase { background:rgba(30,36,32,0.48); }
    #three-l0 .three-l0-seat { margin-left:auto; font-weight:500; letter-spacing:0; }
    #three-l0 .three-l0-ipc {
      font-variant-numeric:tabular-nums lining-nums;
      font-weight:500; letter-spacing:0;
    }
    #three-l0 .three-l0-pip {
      width:10px; height:10px; border-radius:50%;
      background:#3F6E38; box-shadow:0 0 0 1px rgba(0,0,0,0.35);
    }
    #three-l0 .three-l0-ver {
      font-size:11px; font-weight:500; opacity:0.45; letter-spacing:0;
    }
    #three-bottom {
      position:absolute; left:0; right:0; bottom:0; z-index:32;
      padding:0 14px calc(16px + env(safe-area-inset-bottom, 0px));
      padding-left:max(14px, env(safe-area-inset-left));
      padding-right:max(14px, env(safe-area-inset-right));
      display:flex; flex-direction:column; gap:8px;
      pointer-events:none;
      background:linear-gradient(0deg, rgba(30,36,32,0.42) 0%, transparent 70%);
    }
    #three-peek {
      display:none; pointer-events:none;
      min-height:44px; padding:8px 12px; border-radius:12px;
      background:rgba(30,36,32,0.36);
      -webkit-backdrop-filter:saturate(1.35) blur(18px);
      backdrop-filter:saturate(1.35) blur(18px);
      color:#E8E2D4;
      border:1px solid rgba(255,255,255,0.16);
      box-shadow:0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10);
    }
    #three-peek.is-on { display:block; pointer-events:auto; }
    #three-peek strong {
      display:block;
      font:600 17px/1.2 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:-0.01em;
    }
    #three-peek .three-peek-meta {
      margin-top:2px;
      font:400 13px/1.3 -apple-system,"SF Pro Text",sans-serif;
      color:#c8c0b0;
    }
    #three-peek .three-peek-row {
      display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;
    }
    #three-peek .three-peek-unit {
      position:relative; width:68px; height:68px;
      display:inline-flex; align-items:center; justify-content:center;
      background:rgba(240,230,210,0.16);
      border:1px solid rgba(255,255,255,0.10);
      border-radius:12px;
      color:inherit; padding:0; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-peek .three-peek-unit.is-picked {
      box-shadow:0 0 0 2px #C4A35A;
    }
    #three-peek .three-peek-unit img { width:60px; height:60px; display:block; }
    #three-peek .three-peek-unit b {
      position:absolute; right:-2px; bottom:-2px;
      min-width:16px; height:16px; padding:0 4px;
      border-radius:999px; background:#1A1610; color:#F4EFE4;
      font:700 11px/16px -apple-system,"SF Pro Text",sans-serif;
      font-variant-numeric:tabular-nums; text-align:center;
    }
    #three-stack-toggle {
      pointer-events:auto;
      align-self:flex-end;
      min-height:44px; padding:0 14px; border-radius:12px;
      border:1px solid rgba(255,255,255,0.12);
      background:rgba(30,36,32,0.62); color:#E8E2D4;
      -webkit-backdrop-filter:saturate(1.35) blur(16px);
      backdrop-filter:saturate(1.35) blur(16px);
      font:600 13px/1 -apple-system,"SF Pro Text",sans-serif;
      cursor:pointer;
      display:inline-flex; align-items:center;
    }
    #three-confirm,
    #three-confirm.is-idle,
    #three-confirm:disabled {
      pointer-events:auto;
      min-height:50px; height:50px; width:100%;
      border:1px solid rgba(255,255,255,0.10); border-radius:14px;
      background:rgba(30,36,32,0.88); color:rgba(232,226,212,0.42);
      -webkit-backdrop-filter:blur(24px) saturate(1.15);
      backdrop-filter:blur(24px) saturate(1.15);
      box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);
      font:600 17px/1 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:-0.01em;
      cursor:default;
      -webkit-tap-highlight-color:transparent;
    }
    #three-confirm.is-ready:not(:disabled):not(.is-idle) {
      background:#C4A35A; color:#1E2420; cursor:pointer;
      border-color:transparent;
      -webkit-backdrop-filter:none;
      backdrop-filter:none;
      box-shadow:inset 0 1px 0 rgba(255,248,230,0.28);
    }
    #three-zoom {
      position:absolute; right:max(10px, env(safe-area-inset-right));
      bottom:calc(74px + env(safe-area-inset-bottom, 0px));
      z-index:28; display:flex; flex-direction:column; gap:8px;
    }
    html.three-spike.has-l1 #three-zoom {
      bottom:calc(208px + env(safe-area-inset-bottom, 0px));
    }
    html.three-spike.has-l2 #three-zoom { display:none; }
    #three-zoom button {
      width:44px; height:44px; border-radius:12px;
      border:1px solid rgba(255,255,255,0.12);
      background:rgba(30,36,32,0.62);
      -webkit-backdrop-filter:saturate(1.35) blur(18px);
      backdrop-filter:saturate(1.35) blur(18px);
      color:#E8E2D4;
      font:600 18px/1 -apple-system,"SF Pro Text",sans-serif;
      cursor:pointer;
      box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);
      -webkit-tap-highlight-color:transparent;
    }
    #three-zoom button[data-zoom="fit"] { font-size:12px; letter-spacing:0.02em; }
    #three-sheet {
      display:none; position:absolute; left:0; right:0; bottom:0; z-index:40;
      max-height:min(52dvh, 420px);
      padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
      background:rgba(30,36,32,0.94);
      -webkit-backdrop-filter:blur(28px);
      backdrop-filter:blur(28px);
      color:#E8E2D4;
      border-top:1px solid rgba(255,255,255,0.12);
      border-radius:24px 24px 0 0;
    }
    #three-sheet.is-open { display:block; }
    #three-sheet h2 { margin:0 0 10px; font:600 13px/1 -apple-system,sans-serif; letter-spacing:0.08em; text-transform:uppercase; opacity:0.72; }
    #three-sheet button.three-sheet-row {
      display:block; width:100%; text-align:left;
      min-height:44px; margin:0 0 8px; padding:0 12px;
      border-radius:12px; border:1px solid rgba(255,255,255,0.12);
      background:rgba(255,255,255,0.04); color:#f4ead4;
      font:600 15px/1 -apple-system,"SF Pro Text",sans-serif; cursor:pointer;
    }
    #three-sheet .three-sheet-note { margin:8px 0 0; font-size:13px; color:#9aa3b5; }
    @media (max-width:430px) {
      #three-l0 .three-l0-ver { display:none; }
    }
  `;
  document.head.appendChild(style);

  const l0 = document.createElement('div');
  l0.id = 'three-l0';
  l0.innerHTML = `
    <button type="button" id="three-menu-btn" aria-label="Menu">☰</button>
    <span class="three-l0-chip" id="three-phase">${phase}</span>
    <span class="three-l0-chip three-l0-seat">
      <span class="three-l0-pip" id="three-seat-pip"></span>
      <span id="three-seat">${seat}</span>
    </span>
    <span class="three-l0-chip three-l0-ipc" id="three-ipc">IPC ${ipc}</span>
    <span class="three-l0-ver">${GAME_VERSION}</span>
  `;
  document.body.appendChild(l0);

  const zoom = document.createElement('div');
  zoom.id = 'three-zoom';
  zoom.innerHTML = `
    <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
    <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
    <button type="button" data-zoom="fit" aria-label="Fit Europe">Fit</button>
  `;
  document.body.appendChild(zoom);

  const bottom = document.createElement('div');
  bottom.id = 'three-bottom';
  bottom.innerHTML = `
    <button type="button" id="three-stack-toggle" aria-pressed="false">Expand stacks</button>
    <div id="three-peek"></div>
    <button type="button" id="three-confirm" class="is-idle" disabled>Select a territory</button>
  `;
  document.body.appendChild(bottom);

  const sheet = document.createElement('div');
  sheet.id = 'three-sheet';
  sheet.innerHTML = `
    <h2>Match</h2>
    <button type="button" class="three-sheet-row" data-sheet="close">Back to board</button>
    <button type="button" class="three-sheet-row" data-sheet="canvas">Open live Canvas (no preview)</button>
    <p class="three-sheet-note">Tap a land to inspect. Stacks stay pip+N when the land is small or zoomed out. Preview only · main art · Three UX · SCHEMA ${SCHEMA_VERSION} · do not merge.</p>
  `;
  document.body.appendChild(sheet);

  const stackToggle = bottom.querySelector('#three-stack-toggle');

  const api = {
    l0,
    zoom,
    bottom,
    sheet,
    peek: bottom.querySelector('#three-peek'),
    confirm: bottom.querySelector('#three-confirm'),
    phaseEl: l0.querySelector('#three-phase'),
    seatEl: l0.querySelector('#three-seat'),
    ipcEl: l0.querySelector('#three-ipc'),
    pipEl: l0.querySelector('#three-seat-pip'),
    menuBtn: l0.querySelector('#three-menu-btn'),
    guide: null,
    stackToggle,
    stacksExpanded: false,
    onStackToggle: null,
    onUnitPick: null,
    setSeat(name, color) {
      api.seatEl.textContent = name;
      if (color) api.pipEl.style.background = color;
    },
    setPhase(word) {
      api.phaseEl.textContent = word;
    },
    setIpc(n) {
      api.ipcEl.textContent = `IPC ${n}`;
    },
    syncLayers() {
      const l2 = sheet.classList.contains('is-open');
      const l1 = !l2 && api.peek.classList.contains('is-on');
      document.documentElement.classList.toggle('has-l1', l1);
      document.documentElement.classList.toggle('has-l2', l2);
      document.documentElement.classList.toggle('has-stacks', api.stacksExpanded);
    },
    setSheetOpen(open) {
      sheet.classList.toggle('is-open', !!open);
      if (open) api.peek.classList.remove('is-on');
      else if (api.peek.textContent) api.peek.classList.add('is-on');
      api.syncLayers();
    },
    isSheetOpen() {
      return sheet.classList.contains('is-open');
    },
    setConfirmIdle() {
      api.confirm.disabled = true;
      api.confirm.classList.remove('is-ready');
      api.confirm.classList.add('is-idle');
      api.confirm.textContent = 'Select a territory';
      api.confirm.style.removeProperty('background');
      api.confirm.style.removeProperty('color');
    },
    setConfirmReady(label) {
      api.confirm.disabled = false;
      api.confirm.classList.remove('is-idle');
      api.confirm.classList.add('is-ready');
      api.confirm.textContent = label;
    },
    setStacksExpanded(on) {
      api.stacksExpanded = !!on;
      stackToggle.setAttribute('aria-pressed', api.stacksExpanded ? 'true' : 'false');
      stackToggle.textContent = api.stacksExpanded ? 'Collapse stacks' : 'Expand stacks';
      api.syncLayers();
    },
    showGuide(_on = false) {
      return false;
    },
    paintSelection({ land = null, stacks = [], unitType = null, confirmed = false } = {}) {
      if (api.isSheetOpen()) {
        api.peek.classList.remove('is-on');
      }
      if (!land) {
        api.peek.classList.remove('is-on');
        api.peek.textContent = '';
        api.setConfirmIdle();
        api.syncLayers();
        return;
      }
      const owner = stacks[0]?.owner || (!land.isWater ? land.originalOwner : '');
      const unitLine = unitType ? `${formatUnitName(unitType)}` : '';
      const ipcLine = !land.isWater ? `${printIpc(land)} IPC` : '';
      const rosterTotal = stacks.reduce((n, s) => n + (s.quantity || 0), 0);
      api.peek.innerHTML = `<strong>${land.name}</strong>
        <div class="three-peek-meta">${[owner, ipcLine, unitLine].filter(Boolean).join(' · ')}</div>
        ${iconRowHtml(stacks)}`;
      api.peek.dataset.rosterTotal = String(rosterTotal);
      if (unitType) {
        const picked = api.peek.querySelector(`[data-unit-type="${unitType}"]`);
        if (picked) picked.classList.add('is-picked');
      }
      if (!api.isSheetOpen()) api.peek.classList.add('is-on');
      api.syncLayers();
      if (unitType) {
        const qty = stacks.find((s) => s.type === unitType)?.quantity || 1;
        api.setConfirmReady(`Confirm: ${shortType(unitType)} ×${qty} · ${land.name}`);
      } else {
        api.setConfirmReady(confirmed
          ? `Confirm inspect · ${land.name}`
          : `Confirm: ${land.name}`);
      }
    },
  };

  api.menuBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  api.menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    api.setSheetOpen(!api.isSheetOpen());
  });
  sheet.addEventListener('pointerdown', (e) => e.stopPropagation());
  sheet.addEventListener('click', (e) => {
    e.stopPropagation();
    const row = e.target.closest('[data-sheet]');
    if (!row) return;
    if (row.dataset.sheet === 'canvas') {
      location.href = stripPreviewParams(location.href);
      return;
    }
    api.setSheetOpen(false);
  });
  api.confirm.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  zoom.addEventListener('pointerdown', (e) => e.stopPropagation());
  stackToggle.addEventListener('pointerdown', (e) => e.stopPropagation());
  stackToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    api.setStacksExpanded(!api.stacksExpanded);
    if (typeof api.onStackToggle === 'function') api.onStackToggle(api.stacksExpanded);
  });
  api.peek.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-unit-type]');
    if (!chip) return;
    e.stopPropagation();
    if (typeof api.onUnitPick === 'function') api.onUnitPick(chip.dataset.unitType);
  });
  api.setStacksExpanded(false);
  api.showGuide(false);
  return api;
}
