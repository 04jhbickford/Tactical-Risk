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

function iconRowHtml(stacks, staged = {}, { pulse = false } = {}) {
  if (!stacks?.length) return '';
  return `<div class="three-peek-row">${stacks.map((s) => {
    const src = getUnitIconPath(s.type, s.owner) || '';
    const have = Number(s.quantity) || 0;
    const n = Number(staged[s.type]) || 0;
    const picked = n > 0;
    const pulseCls = pulse && !picked ? ' is-pulse' : '';
    const pickedCls = picked ? ' is-picked' : '';
    return `<div class="three-peek-unit${pickedCls}${pulseCls}" data-unit-type="${s.type}" title="${formatUnitName(s.type)}">
      <button type="button" class="three-peek-icon" data-unit-type="${s.type}" aria-label="${shortType(s.type)} ${n} of ${have}">
        <img src="${src}" alt="${shortType(s.type)}" width="36" height="36">
      </button>
      <div class="three-peek-step">
        <button type="button" data-unit-adjust="${s.type}" data-delta="-1" aria-label="Fewer ${shortType(s.type)}" ${n <= 0 ? 'disabled' : ''}>−</button>
        <b>${n}/${have}</b>
        <button type="button" data-unit-adjust="${s.type}" data-delta="1" aria-label="More ${shortType(s.type)}" ${n >= have ? 'disabled' : ''}>+</button>
      </div>
    </div>`;
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
      display:flex; flex-wrap:nowrap; gap:6px; margin-top:8px;
      overflow-x:auto; -webkit-overflow-scrolling:touch;
      scrollbar-width:none;
    }
    #three-peek .three-peek-row::-webkit-scrollbar { display:none; }
    #three-peek .three-peek-unit { flex:0 0 auto; }
    #three-peek .three-peek-unit {
      position:relative; min-width:64px;
      display:inline-flex; flex-direction:column; align-items:center;
      background:rgba(240,230,210,0.16);
      border:1px solid rgba(255,255,255,0.18);
      border-radius:12px;
      color:inherit; padding:6px 6px 4px;
      -webkit-tap-highlight-color:transparent;
    }
    #three-peek .three-peek-unit.is-picked {
      background:rgba(196,163,90,0.42);
      border-color:#C4A35A;
      box-shadow:0 0 0 2px rgba(196,163,90,0.55);
    }
    #three-peek .three-peek-unit.is-pulse {
      animation:three-chip-pulse 1.1s ease-in-out infinite;
    }
    @keyframes three-chip-pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(196,163,90,0.0); border-color:rgba(196,163,90,0.35); }
      50% { box-shadow:0 0 0 3px rgba(196,163,90,0.55); border-color:#C4A35A; }
    }
    #three-peek .three-peek-icon {
      width:48px; height:48px; padding:0; border:0; background:transparent;
      color:inherit; cursor:pointer;
    }
    #three-peek .three-peek-unit img { width:44px; height:44px; display:block; }
    #three-peek .three-peek-step {
      display:flex; align-items:center; gap:4px; margin-top:2px;
    }
    #three-peek .three-peek-step button {
      width:28px; height:28px; border-radius:8px;
      border:1px solid rgba(255,255,255,0.16);
      background:rgba(30,36,32,0.55); color:#F4EFE4;
      font:700 16px/1 -apple-system,sans-serif; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-peek .three-peek-step button:disabled { opacity:0.35; }
    #three-peek .three-peek-step b {
      min-width:28px;
      font:700 12px/1 -apple-system,"SF Pro Text",sans-serif;
      font-variant-numeric:tabular-nums; text-align:center; color:#F4EFE4;
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
      display:none;
    }
    html.three-spike.has-l1 #three-stack-toggle,
    html.three-spike.has-stacks #three-stack-toggle { display:none; }
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
    #three-confirm.is-try:not(:disabled) {
      background:rgba(30,36,32,0.88); color:#F4EFE4; cursor:pointer;
      border:1.5px solid #C4A35A;
      box-shadow:inset 0 1px 0 rgba(255,248,230,0.16), 0 0 0 1px rgba(196,163,90,0.28);
    }
    #three-confirm-hint {
      display:none; pointer-events:none;
      margin:-4px 2px 0; text-align:center;
      font:600 12px/1.3 -apple-system,"SF Pro Text",sans-serif;
      color:#C4A35A;
    }
    #three-confirm-hint.is-on { display:block; }
    #three-land-tags {
      position:absolute; inset:0; z-index:26; pointer-events:none;
    }
    .three-land-tag {
      position:absolute; transform:translate(-50%,-130%);
      min-height:22px; padding:3px 8px; border-radius:999px;
      background:rgba(30,36,32,0.86);
      border:1px solid #C4A35A; color:#F4EFE4;
      font:700 11px/1.2 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:0.02em; white-space:nowrap;
      box-shadow:0 4px 12px rgba(0,0,0,0.35);
    }
    .three-land-tag.is-from { border-color:#C4A35A; }
    .three-land-tag.is-to { border-color:#E8E2D4; }
    #three-zoom {
      position:absolute; right:max(10px, env(safe-area-inset-right));
      bottom:calc(74px + env(safe-area-inset-bottom, 0px));
      z-index:28; display:flex; flex-direction:column; gap:8px;
    }
    html.three-spike.has-l1 #three-zoom,
    html.three-spike.has-battle #three-zoom {
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
    #three-phase-guide { display:none !important; }
    #three-guide {
      display:none; pointer-events:auto;
      min-height:36px; padding:8px 10px; border-radius:12px;
      background:rgba(30,36,32,0.62);
      -webkit-backdrop-filter:saturate(1.35) blur(16px);
      backdrop-filter:saturate(1.35) blur(16px);
      border:1px solid rgba(196,163,90,0.42);
      color:#F4EFE4;
      font:600 13px/1.3 -apple-system,"SF Pro Text",sans-serif;
      align-items:flex-start; gap:8px;
    }
    #three-guide.is-on { display:flex; }
    #three-guide span { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #three-guide button {
      flex:0 0 auto; width:36px; height:36px; margin:-4px -4px 0 0;
      border:0; border-radius:10px; background:transparent; color:#c8c0b0;
      font:600 16px/1 -apple-system,sans-serif; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-battle {
      display:none; pointer-events:none;
      padding:10px 12px; border-radius:12px;
      background:rgba(30,36,32,0.55);
      -webkit-backdrop-filter:saturate(1.35) blur(18px);
      backdrop-filter:saturate(1.35) blur(18px);
      color:#E8E2D4;
      border:1px solid rgba(255,255,255,0.14);
      box-shadow:0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10);
    }
    #three-battle.is-on { display:block; pointer-events:auto; }
    #three-battle .three-battle-kicker {
      margin:0; font:600 11px/1 -apple-system,sans-serif;
      letter-spacing:0.08em; text-transform:uppercase; color:#C4A35A;
    }
    #three-battle strong {
      display:block; margin-top:4px;
      font:600 17px/1.2 -apple-system,"SF Pro Text",sans-serif;
    }
    #three-battle .three-battle-body {
      margin-top:4px; font:400 13px/1.35 -apple-system,"SF Pro Text",sans-serif;
      color:#c8c0b0;
    }
    #three-battle .three-dice {
      display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;
    }
    #three-battle .three-die {
      width:28px; height:28px; border-radius:8px;
      display:inline-flex; align-items:center; justify-content:center;
      background:rgba(240,230,210,0.14);
      border:1px solid rgba(255,255,255,0.12);
      font:700 13px/1 -apple-system,sans-serif;
      font-variant-numeric:tabular-nums;
    }
    #three-battle .three-die.is-hit {
      background:#C4A35A; color:#1E2420; border-color:transparent;
    }
    #three-battle .three-die.is-def { opacity:0.88; }
    html.three-spike.has-battle #three-zoom,
    html.three-spike.has-l2 #three-zoom { display:none; }
    html.three-spike.has-battle #three-stack-toggle { display:none; }
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
      #three-peek .three-peek-unit { min-width:58px; }
      #three-peek .three-peek-icon { width:42px; height:42px; }
      #three-peek .three-peek-unit img { width:38px; height:38px; }
      #three-guide { font-size:11px; }
      #three-battle strong { font-size:16px; }
      #three-battle .three-die { width:26px; height:26px; }
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
    <button type="button" data-zoom="fit" aria-label="Fit pocket">Fit</button>
  `;
  document.body.appendChild(zoom);

  const bottom = document.createElement('div');
  bottom.id = 'three-bottom';
  bottom.innerHTML = `
    <button type="button" id="three-stack-toggle" aria-pressed="false">Expand stacks</button>
    <div id="three-guide" aria-live="polite"></div>
    <div id="three-battle"></div>
    <div id="three-peek"></div>
    <button type="button" id="three-confirm" class="is-idle" disabled>Select your stack</button>
    <div id="three-confirm-hint"></div>
  `;
  document.body.appendChild(bottom);

  const tags = document.createElement('div');
  tags.id = 'three-land-tags';
  document.body.appendChild(tags);

  const sheet = document.createElement('div');
  sheet.id = 'three-sheet';
  sheet.innerHTML = `
    <h2>Match</h2>
    <button type="button" class="three-sheet-row" data-sheet="close">Back to board</button>
    <button type="button" class="three-sheet-row" data-sheet="russians">Russians tip (Karelia → Finland)</button>
    <button type="button" class="three-sheet-row" data-sheet="germans">Germans tip (Ukraine → Karelia)</button>
    <button type="button" class="three-sheet-row" data-sheet="canvas">Open live Canvas (no preview)</button>
    <p class="three-sheet-note">Preview only · main art · Three UX · SCHEMA ${SCHEMA_VERSION} · do not merge.</p>
  `;
  document.body.appendChild(sheet);

  const stackToggle = bottom.querySelector('#three-stack-toggle');

  const api = {
    l0,
    zoom,
    bottom,
    sheet,
    peek: bottom.querySelector('#three-peek'),
    guideEl: bottom.querySelector('#three-guide'),
    battleEl: bottom.querySelector('#three-battle'),
    confirm: bottom.querySelector('#three-confirm'),
    hintEl: bottom.querySelector('#three-confirm-hint'),
    tags,
    phaseEl: l0.querySelector('#three-phase'),
    seatEl: l0.querySelector('#three-seat'),
    ipcEl: l0.querySelector('#three-ipc'),
    pipEl: l0.querySelector('#three-seat-pip'),
    menuBtn: l0.querySelector('#three-menu-btn'),
    guide: null,
    guideOn: false,
    stackToggle,
    stacksExpanded: false,
    onStackToggle: null,
    onUnitPick: null,
    onUnitAdjust: null,
    onGuideDismiss: null,
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
      const battleOn = api.battleEl.classList.contains('is-on');
      const l1 = !l2 && !battleOn && api.peek.classList.contains('is-on');
      document.documentElement.classList.toggle('has-l1', l1);
      document.documentElement.classList.toggle('has-l2', l2);
      document.documentElement.classList.toggle('has-battle', battleOn);
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
    setConfirmIdle(label = 'Select your stack') {
      api.confirm.disabled = true;
      api.confirm.classList.remove('is-ready', 'is-try');
      api.confirm.classList.add('is-idle');
      api.confirm.textContent = label;
      api.confirm.style.removeProperty('background');
      api.confirm.style.removeProperty('color');
    },
    setConfirmTry(label = 'Try combat move') {
      api.confirm.disabled = false;
      api.confirm.classList.remove('is-ready', 'is-idle');
      api.confirm.classList.add('is-try');
      api.confirm.textContent = label;
      api.confirm.style.removeProperty('background');
      api.confirm.style.removeProperty('color');
    },
    setConfirmReady(label) {
      api.confirm.disabled = false;
      api.confirm.classList.remove('is-idle', 'is-try');
      api.confirm.classList.add('is-ready');
      api.confirm.textContent = label;
    },
    setConfirmReplay(label) {
      api.confirm.disabled = false;
      api.confirm.classList.remove('is-ready', 'is-try');
      api.confirm.classList.add('is-idle');
      api.confirm.textContent = label;
      api.confirm.style.removeProperty('background');
      api.confirm.style.removeProperty('color');
    },
    setHint(text = '') {
      if (!text) {
        api.hintEl.classList.remove('is-on');
        api.hintEl.textContent = '';
        return false;
      }
      api.hintEl.textContent = text;
      api.hintEl.classList.add('is-on');
      return true;
    },
    setLandTags(items = []) {
      api.tags.innerHTML = (items || []).map((t) => {
        if (!t?.name || !Number.isFinite(t.x) || !Number.isFinite(t.y)) return '';
        const kind = t.kind === 'to' ? 'to' : 'from';
        const mark = kind === 'to' ? 'TO' : 'FROM';
        return `<div class="three-land-tag is-${kind}" style="left:${Math.round(t.x)}px;top:${Math.round(t.y)}px">${mark} · ${t.name}</div>`;
      }).join('');
    },
    setGuide(text, on = true) {
      api.guideOn = !!on && !!text;
      if (!api.guideOn) {
        api.guideEl.classList.remove('is-on');
        api.guideEl.innerHTML = '';
        return false;
      }
      api.guideEl.innerHTML = `<span>${text}</span><button type="button" data-guide="dismiss" aria-label="Dismiss tip">×</button>`;
      api.guideEl.classList.add('is-on');
      return true;
    },
    setBattle(card) {
      if (!card) {
        api.battleEl.classList.remove('is-on');
        api.battleEl.innerHTML = '';
        api.syncLayers();
        return;
      }
      const dice = (card.dice || []).map((d) => {
        const hit = d.hit ? ' is-hit' : '';
        const side = d.side === 'def' ? ' is-def' : '';
        return `<span class="three-die${hit}${side}" title="${d.type || ''}">${d.face}</span>`;
      }).join('');
      api.battleEl.innerHTML = `
        <p class="three-battle-kicker">${card.kicker || 'Battle'}</p>
        <strong>${card.title || ''}</strong>
        <div class="three-battle-body">${card.body || ''}</div>
        ${dice ? `<div class="three-dice">${dice}</div>` : ''}`;
      api.battleEl.classList.add('is-on');
      api.syncLayers();
    },
    setStacksExpanded(on) {
      api.stacksExpanded = !!on;
      stackToggle.setAttribute('aria-pressed', api.stacksExpanded ? 'true' : 'false');
      stackToggle.textContent = api.stacksExpanded ? 'Collapse stacks' : 'Expand stacks';
      api.syncLayers();
    },
    showGuide(on = false, text = '') {
      return api.setGuide(text, on);
    },
    paintPlay({
      land = null,
      stacks = [],
      unitType = null,
      unitTypes = null,
      staged = {},
      label = null,
      gold = false,
      enabled = false,
      guide = '',
      guideOn = false,
      battle = null,
      replay = false,
      route = '',
      hint = '',
      pulseChips = false,
    } = {}) {
      api.setGuide(guide, guideOn);
      api.setHint(hint);
      api.setBattle(battle);
      if (battle && !battle.casualties) {
        api.peek.classList.remove('is-on');
        api.peek.textContent = '';
      } else if (!land && !battle?.casualties) {
        api.peek.classList.remove('is-on');
        api.peek.textContent = '';
      } else {
        const owner = stacks[0]?.owner || (!land.isWater ? land.originalOwner : '');
        const ipcLine = !land.isWater ? `${printIpc(land)} IPC` : '';
        const rosterTotal = stacks.reduce((n, s) => n + (s.quantity || 0), 0);
        const stagedMap = { ...(staged || {}) };
        if (unitType && !stagedMap[unitType]) stagedMap[unitType] = 1;
        if (Array.isArray(unitTypes)) {
          for (const t of unitTypes) {
            if (t && !stagedMap[t]) stagedMap[t] = 1;
          }
        }
        api.peek.innerHTML = `<strong>${land.name}</strong>
          <div class="three-peek-meta">${[owner, ipcLine, route].filter(Boolean).join(' · ')}</div>
          ${iconRowHtml(stacks, stagedMap, { pulse: pulseChips })}`;
        api.peek.dataset.rosterTotal = String(rosterTotal);
        if (!api.isSheetOpen()) api.peek.classList.add('is-on');
      }
      if (replay) api.setConfirmReplay(label || 'Replay scenario');
      else if (gold && enabled) api.setConfirmReady(label || 'Confirm');
      else api.setConfirmIdle(label || 'Select your stack');
      api.syncLayers();
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
        ${iconRowHtml(stacks, unitType ? { [unitType]: stacks.find((s) => s.type === unitType)?.quantity || 1 } : {})}`;
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
    if (row.dataset.sheet === 'germans') {
      const url = new URL(location.href);
      url.searchParams.set('three', '1');
      url.searchParams.set('germans', '1');
      location.href = url.toString();
      return;
    }
    if (row.dataset.sheet === 'russians') {
      const url = new URL(location.href);
      url.searchParams.set('three', '1');
      url.searchParams.delete('germans');
      url.searchParams.delete('seat');
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
  stackToggle.addEventListener('pointerdown', (e) => e.stopPropagation());
  stackToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    api.setStacksExpanded(!api.stacksExpanded);
    if (typeof api.onStackToggle === 'function') api.onStackToggle(api.stacksExpanded);
  });
  api.peek.addEventListener('click', (e) => {
    const adj = e.target.closest('[data-unit-adjust]');
    if (adj) {
      e.stopPropagation();
      const type = adj.dataset.unitAdjust;
      const delta = Number(adj.dataset.delta) || 0;
      if (typeof api.onUnitAdjust === 'function') api.onUnitAdjust(type, delta);
      return;
    }
    const chip = e.target.closest('[data-unit-type]');
    if (!chip) return;
    e.stopPropagation();
    if (typeof api.onUnitPick === 'function') api.onUnitPick(chip.dataset.unitType);
  });
  api.guideEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-guide="dismiss"]');
    if (!btn) return;
    e.stopPropagation();
    api.setGuide('', false);
    if (typeof api.onGuideDismiss === 'function') api.onGuideDismiss();
  });
  api.setStacksExpanded(false);
  api.showGuide(false);
  return api;
}
