// L0 / L1 / Confirm chrome for the ?three=1 preview. 390 lock.
// Patterns: Poly / Clash Royale shallow / Root-TTR edge / Settlecoast safe-area.
// Not a Canvas HUD rewrite. Preview only.

import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import { formatUnitName } from '../utils/unitNames.js';

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

export function injectThreeChrome({ seat = 'Russians', ipc = 24, phase = 'PLACE' } = {}) {
  document.documentElement.classList.add('three-spike');
  const style = document.createElement('style');
  style.textContent = `
    html.three-spike, html.three-spike body {
      background:#1c3840; overflow:hidden;
    }
    html.three-spike #mapCanvas,
    html.three-spike #minimap,
    html.three-spike #sidebar,
    html.three-spike #hud,
    html.three-spike #hud-clarity,
    html.three-spike #three-spike-hint { display:none !important; }
    #threeCanvas {
      position:absolute; inset:0; width:100%; height:100%;
      display:block; touch-action:none; cursor:grab;
      -webkit-user-select:none; user-select:none;
    }
    #threeCanvas.is-panning { cursor:grabbing; }
    #threeCanvas.is-hovering { cursor:pointer; }
    #three-l0 {
      position:absolute; left:0; right:0; top:0; z-index:30;
      height:calc(48px + env(safe-area-inset-top, 0px));
      padding:env(safe-area-inset-top, 0px) 10px 0;
      padding-left:max(10px, env(safe-area-inset-left));
      padding-right:max(10px, env(safe-area-inset-right));
      display:flex; align-items:center; gap:8px;
      background:linear-gradient(180deg, rgba(14,20,24,0.82) 0%, rgba(14,20,24,0.28) 72%, transparent 100%);
      color:#efe6d6; font:600 12px/1 "Segoe UI", sans-serif;
      letter-spacing:0.06em;
      pointer-events:none;
    }
    #three-l0 button, #three-l0 .three-l0-chip {
      pointer-events:auto;
    }
    #three-menu-btn {
      width:40px; height:40px; border-radius:10px;
      border:1px solid rgba(255,255,255,0.18);
      background:rgba(16,20,28,0.82); color:#f4ead4;
      font-size:18px; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-l0 .three-l0-chip {
      min-height:28px; padding:0 9px; border-radius:999px;
      display:inline-flex; align-items:center; gap:6px;
      background:rgba(20,24,32,0.72);
      border:1px solid rgba(239,230,214,0.16);
      letter-spacing:0.04em;
    }
    #three-l0 .three-l0-seat { margin-left:auto; }
    #three-l0 .three-l0-pip {
      width:10px; height:10px; border-radius:50%;
      background:#B22222; box-shadow:0 0 0 1px rgba(0,0,0,0.35);
    }
    #three-l0 .three-l0-ver {
      font-size:10px; font-weight:600; opacity:0.55; letter-spacing:0.02em;
    }
    #three-bottom {
      position:absolute; left:0; right:0; bottom:0; z-index:32;
      padding:0 12px calc(10px + env(safe-area-inset-bottom, 0px));
      padding-left:max(12px, env(safe-area-inset-left));
      padding-right:max(12px, env(safe-area-inset-right));
      display:flex; flex-direction:column; gap:8px;
      pointer-events:none;
      background:linear-gradient(0deg, rgba(14,20,24,0.7) 0%, transparent 100%);
    }
    #three-peek {
      display:none; pointer-events:none;
      min-height:36px; padding:8px 12px; border-radius:10px;
      background:rgba(18,22,26,0.88); color:#efe6d6;
      border:1px solid rgba(239,230,214,0.14);
      font:500 12px/1.35 "Segoe UI", sans-serif;
    }
    #three-peek.is-on { display:block; }
    #three-peek strong { display:block; font:700 14px/1.2 "Segoe UI", sans-serif; letter-spacing:0.02em; }
    #three-peek div { margin-top:3px; font:500 12px/1.3 "Segoe UI", sans-serif; color:#c8c0b0; }
    #three-confirm {
      pointer-events:auto;
      min-height:44px; width:100%;
      border:0; border-radius:12px;
      background:#c9a44a; color:#1a1420;
      font:700 15px/1 "Segoe UI", sans-serif;
      letter-spacing:0.02em;
      cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-confirm:disabled {
      background:rgba(80,86,96,0.72); color:#c5c9d4; cursor:default;
    }
    #three-zoom {
      position:absolute; right:max(10px, env(safe-area-inset-right));
      bottom:calc(168px + env(safe-area-inset-bottom, 0px));
      z-index:28; display:flex; flex-direction:column; gap:6px;
    }
    #three-zoom button {
      width:40px; height:40px; border-radius:10px;
      border:1px solid rgba(255,255,255,0.2);
      background:rgba(16,20,28,0.78); color:#fff;
      font-size:20px; line-height:1; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-sheet {
      display:none; position:absolute; left:0; right:0; bottom:0; z-index:40;
      max-height:min(52dvh, 420px);
      padding:14px 14px calc(16px + env(safe-area-inset-bottom, 0px));
      background:rgba(12,16,22,0.96); color:#f4ead4;
      border-top:1px solid rgba(201,164,74,0.35);
      border-radius:16px 16px 0 0;
    }
    #three-sheet.is-open { display:block; }
    #three-sheet h2 { margin:0 0 10px; font-size:16px; }
    #three-sheet button.three-sheet-row {
      display:block; width:100%; text-align:left;
      min-height:44px; margin:0 0 6px; padding:0 12px;
      border-radius:10px; border:1px solid rgba(255,255,255,0.12);
      background:rgba(255,255,255,0.04); color:#f4ead4;
      font:600 14px/1 "Segoe UI", sans-serif; cursor:pointer;
    }
    #three-sheet .three-sheet-note { margin:8px 0 0; font-size:12px; color:#9aa3b5; }
    @media (max-width:430px) {
      #three-l0 { font-size:12px; gap:6px; }
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
    <span class="three-l0-chip" id="three-ipc">IPC ${ipc}</span>
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
    <div id="three-peek"></div>
    <button type="button" id="three-confirm" disabled>Select a land</button>
  `;
  document.body.appendChild(bottom);

  const sheet = document.createElement('div');
  sheet.id = 'three-sheet';
  sheet.innerHTML = `
    <h2>Match</h2>
    <button type="button" class="three-sheet-row" data-sheet="close">Back to board</button>
    <button type="button" class="three-sheet-row" data-sheet="canvas">Open live Canvas (no three)</button>
    <p class="three-sheet-note">Preview only · SCHEMA ${SCHEMA_VERSION} · map still peeks. One sheet.</p>
  `;
  document.body.appendChild(sheet);

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
    setSheetOpen(open) {
      sheet.classList.toggle('is-open', !!open);
      if (open) api.peek.classList.remove('is-on');
      else if (api.peek.textContent) api.peek.classList.add('is-on');
    },
    isSheetOpen() {
      return sheet.classList.contains('is-open');
    },
    paintSelection({ land = null, stacks = [], unitType = null, confirmed = false } = {}) {
      if (api.isSheetOpen()) {
        api.peek.classList.remove('is-on');
      }
      if (!land) {
        api.peek.classList.remove('is-on');
        api.peek.textContent = '';
        api.confirm.disabled = true;
        api.confirm.textContent = 'Select a land';
        return;
      }
      const summary = stackSummary(stacks);
      const owner = land.originalOwner && !land.isWater ? land.originalOwner : '';
      const unitBit = unitType
        ? `${shortType(unitType)} · ${formatUnitName(unitType)}`
        : summary;
      api.peek.innerHTML = `<strong>${land.name}</strong>${owner ? ` · ${owner}` : ''}${unitBit ? `<div>${unitBit}</div>` : ''}`;
      if (!api.isSheetOpen()) api.peek.classList.add('is-on');
      api.confirm.disabled = false;
      // Named Confirm grammar. inspect ≠ commit is still a soft ack —
      // tap does not write gameState. Never "Inspect" / "Noted".
      if (unitType) {
        const qty = stacks.find((s) => s.type === unitType)?.quantity || 1;
        api.confirm.textContent = `Confirm ${shortType(unitType)} ×${qty} · ${land.name}`;
      } else {
        api.confirm.textContent = confirmed
          ? `Confirm inspect · ${land.name}`
          : `Confirm · ${land.name}`;
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
      const url = new URL(location.href);
      url.searchParams.delete('three');
      location.href = url.toString();
      return;
    }
    api.setSheetOpen(false);
  });
  api.confirm.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  zoom.addEventListener('pointerdown', (e) => e.stopPropagation());
  return api;
}
