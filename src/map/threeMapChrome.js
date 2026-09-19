// Three / side-project HUD. Preview only.
// Frosted L0/L1/L2 + exclusive Confirm gold. Board stays main Canvas art.

import { GAME_VERSION, SCHEMA_VERSION } from '../version.js';
import { formatUnitName } from '../utils/unitNames.js';
import { getUnitIconPath } from '../utils/unitIcons.js';
import { stripPreviewParams } from './uxPreviewFlag.js';
import {
  bindSealedActivate,
  chromeHitRectsFrom,
  isPointInAnyRect,
  sealChromeControl,
} from './threeChromeEvents.js';

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
      <em>${shortType(s.type)}</em>
      <b>${s.quantity}</b>
    </button>`;
  }).join('')}</div>`;
}

function stepperRowHtml(steppers) {
  if (!steppers?.length) return '';
  const fat = steppers.length >= 5 ? ' is-fat' : '';
  return `<div class="three-steppers${fat}">${steppers.map((s) => {
    const src = getUnitIconPath(s.type, s.owner) || '';
    const short = shortType(s.type);
    const have = Number(s.have ?? s.quantity) || 0;
    const picked = Number(s.picked) || 0;
    const name = formatUnitName(s.type);
    return `<div class="three-stepper" data-unit-type="${s.type}">
      <img src="${src}" alt="${short}" width="28" height="28">
      <em>${short}</em>
      <div class="three-stepper-ctrls">
        <button type="button" class="three-step" data-step="-1" data-unit-type="${s.type}" ${picked <= 0 ? 'disabled' : ''} aria-label="Fewer ${name}">−</button>
        <span class="three-step-count" data-step-count="${s.type}">${picked}/${have}</span>
        <button type="button" class="three-step" data-step="1" data-unit-type="${s.type}" ${picked >= have ? 'disabled' : ''} aria-label="More ${name}">+</button>
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
    html.three-spike.has-l1 #three-bottom,
    html.three-spike.has-battle #three-bottom,
    html.three-spike.has-l2 #three-bottom {
      pointer-events:auto;
    }
    #three-peek {
      display:none; pointer-events:none;
      min-height:0; padding:6px 10px; border-radius:12px;
      max-height:min(38dvh, 280px); overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      background:rgba(30,36,32,0.36);
      -webkit-backdrop-filter:saturate(1.35) blur(18px);
      backdrop-filter:saturate(1.35) blur(18px);
      color:#E8E2D4;
      border:1px solid rgba(255,255,255,0.16);
      box-shadow:0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10);
    }
    #three-peek.is-on { display:block; pointer-events:auto; }
    #three-peek .three-peek-head {
      display:flex; align-items:baseline; gap:8px; min-height:0;
    }
    #three-peek strong {
      display:block;
      font:600 14px/1.15 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:-0.01em;
    }
    #three-peek .three-peek-meta {
      margin-top:0;
      font:400 11px/1.2 -apple-system,"SF Pro Text",sans-serif;
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
      position:relative; width:64px; height:72px;
      display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
      background:rgba(240,230,210,0.20);
      border:1.5px solid rgba(255,255,255,0.22);
      border-radius:14px;
      color:inherit; padding:0; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    #three-peek .three-peek-unit.is-picked {
      box-shadow:0 0 0 2px #C4A35A;
      border-color:#C4A35A;
    }
    #three-peek .three-peek-unit img { width:44px; height:44px; display:block; }
    #three-peek .three-peek-unit em {
      display:block; margin-top:1px;
      font:700 10px/1 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:0.04em; color:#F4E8C4; font-style:normal;
    }
    #three-peek .three-peek-unit b {
      position:absolute; right:-2px; bottom:-2px;
      min-width:16px; height:16px; padding:0 4px;
      border-radius:999px; background:#1A1610; color:#F4EFE4;
      font:700 11px/16px -apple-system,"SF Pro Text",sans-serif;
      font-variant-numeric:tabular-nums; text-align:center;
    }
    #three-peek .three-steppers {
      display:flex; flex-direction:column; gap:3px; margin-top:6px;
    }
    #three-peek .three-steppers.is-fat .three-stepper { min-height:36px; padding:1px 4px; }
    #three-peek .three-steppers.is-fat .three-step { width:36px; height:36px; font-size:18px; }
    #three-peek .three-stepper {
      display:flex; align-items:center; gap:6px;
      min-height:36px; padding:1px 6px;
      background:rgba(240,230,210,0.12);
      border:1px solid rgba(255,255,255,0.14);
      border-radius:10px;
    }
    #three-peek .three-stepper img { width:28px; height:28px; display:block; }
    #three-peek .three-stepper em {
      flex:0 0 28px;
      font:700 11px/1 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:0.04em; color:#F4E8C4; font-style:normal;
    }
    #three-peek .three-stepper-ctrls {
      margin-left:auto; display:flex; align-items:center; gap:4px;
    }
    #three-peek .three-step {
      width:36px; height:36px; border-radius:10px;
      border:1px solid rgba(255,255,255,0.16);
      background:rgba(30,36,32,0.55); color:#F4E8C4;
      font:700 18px/1 -apple-system,"SF Pro Text",sans-serif;
      cursor:pointer; -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    }
    #three-peek .three-step:disabled { opacity:0.35; cursor:default; }
    #three-peek .three-step-count {
      min-width:44px; text-align:center;
      font:700 13px/1 -apple-system,"SF Pro Text",sans-serif;
      font-variant-numeric:tabular-nums lining-nums;
      color:#F4EFE4;
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
      min-height:56px; height:56px; width:100%;
      border:1px solid rgba(255,255,255,0.10); border-radius:16px;
      background:rgba(30,36,32,0.88); color:rgba(232,226,212,0.55);
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
      box-shadow:inset 0 1px 0 rgba(255,248,230,0.28), 0 0 0 3px rgba(196,163,90,0.28);
    }
    #three-zoom {
      position:absolute; right:max(10px, env(safe-area-inset-right));
      bottom:calc(88px + env(safe-area-inset-bottom, 0px));
      z-index:28; display:flex; flex-direction:column; gap:8px;
      pointer-events:auto;
    }
    html.three-spike.has-l1 #three-zoom,
    html.three-spike.has-battle #three-zoom,
    html.three-spike.has-l2 #three-zoom {
      display:none !important;
    }
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
    #three-phase-strip { display:none !important; }
    #three-phase-strip .three-steps {
      display:flex; align-items:center; flex-wrap:nowrap; gap:0;
      min-height:36px; padding:7px 10px; border-radius:12px;
      overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none;
      background:rgba(30,36,32,0.58);
      -webkit-backdrop-filter:saturate(1.35) blur(16px);
      backdrop-filter:saturate(1.35) blur(16px);
      border:1px solid rgba(255,255,255,0.12);
      color:#E8E2D4;
    }
    #three-phase-strip .three-steps::-webkit-scrollbar { display:none; }
    #three-phase-strip .three-step {
      flex:0 0 auto;
      display:inline; font:500 12px/1.35 -apple-system,"SF Pro Text",sans-serif;
      color:rgba(232,226,212,0.55);
      white-space:nowrap;
    }
    #three-phase-strip .three-step i {
      font-style:normal; font-weight:700; color:rgba(232,226,212,0.42);
    }
    #three-phase-strip .three-step.is-now {
      color:#F4E8C4; font-weight:700;
    }
    #three-phase-strip .three-step.is-now i { color:#C4A35A; }
    #three-phase-strip .three-step.is-done { color:rgba(232,226,212,0.78); }
    #three-phase-strip .three-step.is-done i { color:#C4A35A; }
    #three-phase-strip .three-dot {
      margin:0 5px; color:rgba(232,226,212,0.28); font-weight:700;
    }
    #three-guide {
      display:none !important;
    }
    #three-battle {
      display:none; pointer-events:none;
      padding:8px 10px; border-radius:12px;
      max-height:min(36dvh, 260px); overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      background:rgba(30,36,32,0.55);
      -webkit-backdrop-filter:saturate(1.35) blur(18px);
      backdrop-filter:saturate(1.35) blur(18px);
      color:#E8E2D4;
      border:1px solid rgba(255,255,255,0.14);
      box-shadow:0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10);
    }
    #three-battle.is-on { display:block; pointer-events:auto; }
    #three-battle .three-battle-kicker {
      margin:0; font:600 10px/1 -apple-system,sans-serif;
      letter-spacing:0.08em; text-transform:uppercase; color:#C4A35A;
    }
    #three-battle strong {
      display:block; margin-top:3px;
      font:600 14px/1.2 -apple-system,"SF Pro Text",sans-serif;
    }
    #three-battle .three-battle-body {
      margin-top:3px; font:400 12px/1.3 -apple-system,"SF Pro Text",sans-serif;
      color:#c8c0b0;
    }
    #three-battle .three-lanes {
      display:flex; flex-direction:column; gap:6px; margin-top:6px;
    }
    #three-battle .three-lane {
      padding:5px 6px; border-radius:10px;
      border:1px solid rgba(255,255,255,0.10);
    }
    #three-battle .three-lane.is-atk {
      background:rgba(196,163,90,0.10);
      border-color:rgba(196,163,90,0.35);
    }
    #three-battle .three-lane.is-def {
      background:rgba(91,140,168,0.12);
      border-color:rgba(91,140,168,0.38);
    }
    #three-battle .three-lane-head {
      display:flex; align-items:baseline; justify-content:space-between; gap:8px;
      font:700 11px/1.2 -apple-system,"SF Pro Text",sans-serif;
      letter-spacing:0.02em; text-transform:uppercase;
    }
    #three-battle .three-lane.is-atk .three-lane-head { color:#E6C57A; }
    #three-battle .three-lane.is-def .three-lane-head { color:#8EB8C8; }
    #three-battle .three-lane-head b { font-variant-numeric:tabular-nums; }
    #three-battle .three-dice {
      display:flex; flex-wrap:wrap; gap:3px; margin-top:4px;
    }
    #three-battle .three-die {
      width:18px; height:18px; border-radius:5px;
      display:inline-flex; align-items:center; justify-content:center;
      background:rgba(240,230,210,0.14);
      border:1px solid rgba(255,255,255,0.12);
      font:700 10px/1 -apple-system,sans-serif;
      font-variant-numeric:tabular-nums;
    }
    #three-battle .three-lane.is-atk .three-die.is-hit,
    #three-battle .three-die.is-hit {
      background:#C4A35A; color:#1E2420; border-color:transparent;
    }
    #three-battle .three-lane.is-def .three-die.is-hit {
      background:#5B8CA8; color:#F4EFE4; border-color:transparent;
    }
    #three-battle .three-die.is-def { opacity:0.92; }
    #three-battle .three-die-miss {
      display:inline-flex; align-items:center; min-height:18px; padding:0 6px;
      font:600 10px/1 -apple-system,"SF Pro Text",sans-serif;
      color:rgba(232,226,212,0.62); letter-spacing:0.02em;
    }
    #three-battle .three-pickers { margin-top:6px; display:flex; flex-direction:column; gap:6px; }
    #three-battle .three-picker-label {
      font:600 10px/1.2 -apple-system,sans-serif; letter-spacing:0.03em;
      text-transform:uppercase; color:#C4A35A; margin-bottom:3px;
    }
    #three-battle .three-picker[data-loss-side="def"] .three-picker-label { color:#8EB8C8; }
    #three-battle .three-picker-row { display:flex; flex-wrap:wrap; gap:4px; }
    #three-battle .three-loss {
      min-width:44px; min-height:36px; padding:3px 6px; border-radius:10px;
      border:1.5px solid rgba(255,255,255,0.16);
      background:rgba(240,230,210,0.12); color:#E8E2D4;
      font:700 11px/1.2 -apple-system,"SF Pro Text",sans-serif;
      cursor:pointer; -webkit-tap-highlight-color:transparent;
    }
    #three-battle .three-loss.is-on {
      background:#C4A35A; color:#1E2420; border-color:transparent;
    }
    #three-battle .three-picker[data-loss-side="def"] .three-loss.is-on {
      background:#5B8CA8; color:#F4EFE4;
    }
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
      pointer-events:auto;
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
      #three-peek .three-peek-unit { width:60px; height:70px; }
      #three-peek .three-peek-unit img { width:40px; height:40px; }
      #three-phase-strip .three-step { font-size:11px; }
      #three-confirm, #three-confirm.is-idle, #three-confirm:disabled {
        min-height:56px; height:56px; font-size:15px;
      }
      #three-battle strong { font-size:14px; }
      #three-battle .three-die { width:18px; height:18px; }
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

  const strip = document.createElement('div');
  strip.id = 'three-phase-strip';
  strip.setAttribute('aria-live', 'polite');
  document.body.appendChild(strip);

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
    <button type="button" id="three-confirm" class="is-idle" disabled>Select units</button>
  `;
  document.body.appendChild(bottom);

  const sheet = document.createElement('div');
  sheet.id = 'three-sheet';
  sheet.innerHTML = `
    <h2>Match</h2>
    <button type="button" class="three-sheet-row" data-sheet="close">Back to board</button>
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
    stripEl: strip,
    battleEl: bottom.querySelector('#three-battle'),
    confirm: bottom.querySelector('#three-confirm'),
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
    onUnitStep: null,
    onLossPick: null,
    onGuideDismiss: null,
    hitRects() {
      return chromeHitRectsFrom(api);
    },
    blocksMapAt(clientX, clientY) {
      if (api.isSheetOpen()) return true;
      return isPointInAnyRect(clientX, clientY, api.hitRects());
    },
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
      const hideZoom = l1 || l2 || battleOn;
      api.zoom.hidden = hideZoom;
      api.zoom.setAttribute('aria-hidden', hideZoom ? 'true' : 'false');
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
    setConfirmIdle(label = 'Select units') {
      api.confirm.disabled = true;
      api.confirm.classList.remove('is-ready');
      api.confirm.classList.add('is-idle');
      api.confirm.textContent = label;
      api.confirm.style.removeProperty('background');
      api.confirm.style.removeProperty('color');
    },
    setConfirmReady(label) {
      api.confirm.disabled = false;
      api.confirm.classList.remove('is-idle');
      api.confirm.classList.add('is-ready');
      api.confirm.textContent = label;
    },
    setConfirmReplay(label) {
      api.confirm.disabled = false;
      api.confirm.classList.remove('is-ready');
      api.confirm.classList.add('is-idle');
      api.confirm.textContent = label;
      api.confirm.style.removeProperty('background');
      api.confirm.style.removeProperty('color');
    },
    setGuide(text, on = true) {
      api.guideOn = !!on && !!text;
      return api.guideOn;
    },
    setPhaseStrip(steps, current = 1) {
      const list = Array.isArray(steps) ? steps.filter(Boolean) : (steps ? [String(steps)] : []);
      if (!list.length) {
        api.stripEl.innerHTML = '';
        return false;
      }
      if (list.length === 1) {
        api.stripEl.innerHTML = `<div class="three-steps"><span class="three-step is-now">${list[0]}</span></div>`;
        return true;
      }
      api.stripEl.innerHTML = `<div class="three-steps">${list.map((label, i) => {
        const n = i + 1;
        const cls = n === current ? ' is-now' : (n < current ? ' is-done' : '');
        const dot = i ? '<span class="three-dot">·</span>' : '';
        return `${dot}<span class="three-step${cls}"><i>${n}</i> ${label}</span>`;
      }).join('')}</div>`;
      return true;
    },
    setBattle(card) {
      if (!card) {
        api.battleEl.classList.remove('is-on');
        api.battleEl.innerHTML = '';
        api.syncLayers();
        return;
      }
      const dieHtml = (d) => {
        const hit = d.hit ? ' is-hit' : '';
        const side = d.side === 'def' ? ' is-def' : '';
        return `<span class="three-die${hit}${side}" title="${d.type || ''}">${d.face}</span>`;
      };
      const compactDice = (dice = []) => {
        const hits = dice.filter((d) => d.hit);
        const miss = dice.length - hits.length;
        const shown = (hits.length ? hits : dice.slice(0, 8)).map(dieHtml).join('');
        const missEl = miss > 0 && hits.length
          ? `<span class="three-die-miss">${miss} miss</span>`
          : '';
        return `${shown}${missEl}`;
      };
      const lanes = Array.isArray(card.lanes) && card.lanes.length
        ? `<div class="three-lanes">${card.lanes.map((lane) => {
          const hits = Number(lane.hits) || 0;
          const dice = compactDice(lane.dice || []);
          return `<div class="three-lane is-${lane.side || 'atk'}">
            <div class="three-lane-head"><span>${lane.label || ''}</span><b>${hits} hit${hits === 1 ? '' : 's'}</b></div>
            ${dice ? `<div class="three-dice">${dice}</div>` : ''}
          </div>`;
        }).join('')}</div>`
        : ((card.dice || []).length ? `<div class="three-dice">${compactDice(card.dice)}</div>` : '');
      const pickers = (card.pickers || []).map((p) => {
        const chips = (p.units || []).map((u) => {
          const n = Number(p.taken?.[u.type]) || 0;
          const on = n > 0 ? ' is-on' : '';
          const short = shortType(u.type);
          return `<button type="button" class="three-loss${on}" data-loss-side="${p.side}" data-loss-type="${u.type}">${short}${n ? ` −${n}` : ''}</button>`;
        }).join('');
        return `<div class="three-picker" data-loss-side="${p.side}"><div class="three-picker-label">${p.label}</div><div class="three-picker-row">${chips}</div></div>`;
      }).join('');
      api.battleEl.innerHTML = `
        <p class="three-battle-kicker">${card.kicker || 'Battle'}</p>
        <strong>${card.title || ''}</strong>
        <div class="three-battle-body">${card.body || ''}</div>
        ${lanes}
        ${pickers ? `<div class="three-pickers">${pickers}</div>` : ''}`;
      api.battleEl.classList.add('is-on');
      api.wirePeekButtons();
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
    wirePeekButtons() {
      const stamp = (el) => {
        if (!el || el.dataset.wired === '1') return;
        el.dataset.wired = '1';
      };
      api.peek.querySelectorAll('[data-step]').forEach((btn) => {
        stamp(btn);
        let last = 0;
        const activate = (e) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          if (btn.disabled) return;
          const now = Date.now();
          if (now - last < 280) return;
          last = now;
          if (typeof api.onUnitStep === 'function') {
            api.onUnitStep(btn.dataset.unitType, Number(btn.dataset.step));
          }
        };
        btn.onpointerdown = activate;
        btn.ontouchstart = activate;
        btn.onclick = activate;
      });
      api.peek.querySelectorAll('button.three-peek-unit[data-unit-type]').forEach((chip) => {
        stamp(chip);
        let last = 0;
        const activate = (e) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          if (api.peek.dataset.airLand === '1') return;
          const now = Date.now();
          if (now - last < 280) return;
          last = now;
          if (typeof api.onUnitPick === 'function') api.onUnitPick(chip.dataset.unitType);
        };
        chip.onpointerdown = activate;
        chip.ontouchstart = activate;
        chip.onclick = activate;
      });
      api.battleEl.querySelectorAll('[data-loss-type]').forEach((chip) => {
        stamp(chip);
        let last = 0;
        const activate = (e) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          const now = Date.now();
          if (now - last < 280) return;
          last = now;
          if (typeof api.onLossPick === 'function') {
            api.onLossPick(chip.dataset.lossSide, chip.dataset.lossType);
          }
        };
        chip.onpointerdown = activate;
        chip.ontouchstart = activate;
        chip.onclick = activate;
      });
    },
    paintPlay({
      land = null,
      stacks = [],
      unitType = null,
      unitTypes = null,
      steppers = null,
      airLand = false,
      label = null,
      gold = false,
      enabled = false,
      guide = '',
      guideOn = false,
      guideSteps = null,
      battle = null,
      replay = false,
      route = '',
    } = {}) {
      api.setGuide('', false);
      api.setPhaseStrip([], 0);
      api.setBattle(battle);
      if (battle) {
        api.peek.classList.remove('is-on');
        api.peek.textContent = '';
      } else if (airLand) {
        const title = land?.name || 'Land aircraft';
        const rosterTotal = stacks.reduce((n, s) => n + (s.quantity || 0), 0);
        api.peek.innerHTML = `<div class="three-peek-head"><strong>${title}</strong>
          <div class="three-peek-meta">${route || 'Selected aircraft'}</div></div>
          ${iconRowHtml(stacks)}`;
        api.peek.dataset.rosterTotal = String(rosterTotal);
        api.peek.dataset.airLand = '1';
        if (!api.isSheetOpen()) api.peek.classList.add('is-on');
      } else if (!land) {
        api.peek.classList.remove('is-on');
        api.peek.textContent = '';
        delete api.peek.dataset.airLand;
      } else {
        const owner = stacks[0]?.owner || (!land.isWater ? land.originalOwner : '');
        const ipcLine = !land.isWater ? `${printIpc(land)} IPC` : '';
        const rosterTotal = stacks.reduce((n, s) => n + (s.quantity || 0), 0);
        api.peek.innerHTML = `<div class="three-peek-head"><strong>${land.name}</strong>
          <div class="three-peek-meta">${[owner, ipcLine, route].filter(Boolean).join(' · ')}</div></div>
          ${steppers?.length ? stepperRowHtml(steppers) : iconRowHtml(stacks)}`;
        api.peek.dataset.rosterTotal = String(rosterTotal);
        delete api.peek.dataset.airLand;
        const pickedTypes = [
          ...(Array.isArray(unitTypes) ? unitTypes : []),
          ...(unitType ? [unitType] : []),
        ];
        for (const type of pickedTypes) {
          const picked = api.peek.querySelector(`[data-unit-type="${type}"]`);
          if (picked) picked.classList.add('is-picked');
        }
        if (!api.isSheetOpen()) api.peek.classList.add('is-on');
      }
      if (replay) api.setConfirmReplay(label || 'Replay scenario');
      else if (gold && enabled) api.setConfirmReady(label || 'Confirm');
      else api.setConfirmIdle(label || 'Select units');
      api.wirePeekButtons();
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

  for (const el of [api.l0, api.bottom, api.sheet, api.zoom, api.peek, api.battleEl, api.confirm, api.menuBtn, stackToggle]) {
    sealChromeControl(el);
  }
  bindSealedActivate(api.menuBtn, null, () => {
    api.setSheetOpen(!api.isSheetOpen());
  });
  bindSealedActivate(sheet, '[data-sheet]', (e, row) => {
    if (row.dataset.sheet === 'canvas') {
      location.href = stripPreviewParams(location.href);
      return;
    }
    api.setSheetOpen(false);
  });
  bindSealedActivate(stackToggle, null, () => {
    api.setStacksExpanded(!api.stacksExpanded);
    if (typeof api.onStackToggle === 'function') api.onStackToggle(api.stacksExpanded);
  });
  bindSealedActivate(api.bottom, '[data-step]', (e, btn) => {
    if (typeof api.onUnitStep === 'function') {
      api.onUnitStep(btn.dataset.unitType, Number(btn.dataset.step));
    }
  });
  bindSealedActivate(api.bottom, 'button.three-peek-unit[data-unit-type]', (e, chip) => {
    if (api.peek?.dataset?.airLand === '1') return;
    if (typeof api.onUnitPick === 'function') api.onUnitPick(chip.dataset.unitType);
  });
  bindSealedActivate(api.battleEl, '[data-loss-type]', (e, chip) => {
    if (typeof api.onLossPick === 'function') {
      api.onLossPick(chip.dataset.lossSide, chip.dataset.lossType);
    }
  });
  bindSealedActivate(api.guideEl, '[data-guide="dismiss"]', () => {
    api.setGuide('', false);
    if (typeof api.onGuideDismiss === 'function') api.onGuideDismiss();
  });
  api.setStacksExpanded(false);
  api.showGuide(false);
  return api;
}
