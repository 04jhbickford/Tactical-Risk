// V3.00-exp analog board-game skin. Visual/audio only — no rules or schema.

import { GAME_VERSION } from '../version.js';
import { playActionSound, playBoardSound, unlockBoardAudio, setBoardAudioMuted, isBoardAudioMuted } from '../audio/boardAudio.js';
import { flyTableToken, liftPiecesOffTile } from './boardMotion.js';

export const MAP_FILTER = 'sepia(0.55) saturate(0.38) contrast(1.12) brightness(1.14) hue-rotate(-8deg)';
export const OCEAN_PARCHMENT = '#5C7382';
export const TABLE_WOOD = '#4A2A14';
export const INK = 'rgba(32, 20, 10, 0.92)';
export const PARCHMENT_LAND = 'rgba(236, 218, 172, 0.78)';

export function isBoardSkin() {
  return document.documentElement.classList.contains('board-skin');
}

export function hexToRgba(hex, alpha) {
  const raw = String(hex || '#888').replace('#', '');
  const n = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw.padEnd(6, '0').slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16) || 136;
  const g = parseInt(n.slice(2, 4), 16) || 136;
  const b = parseInt(n.slice(4, 6), 16) || 136;
  return `rgba(${r},${g},${b},${alpha})`;
}

function ensureBanner() {
  if (document.getElementById('exp-banner')) return;
  const el = document.createElement('div');
  el.id = 'exp-banner';
  el.innerHTML = `
    <span class="exp-banner-mark">EXPERIMENT</span>
    <span class="exp-banner-ver">${GAME_VERSION}</span>
    <span class="exp-banner-note">Preview only · not production</span>
    <button type="button" id="exp-audio-toggle" class="exp-audio-toggle" title="Table sounds">Sound on</button>
  `;
  document.body.appendChild(el);
  const btn = el.querySelector('#exp-audio-toggle');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockBoardAudio();
    setBoardAudioMuted(!isBoardAudioMuted());
    btn.textContent = isBoardAudioMuted() ? 'Sound off' : 'Sound on';
    btn.classList.toggle('muted', isBoardAudioMuted());
    if (!isBoardAudioMuted()) playBoardSound('dice');
  });
}

function bindTableFeel() {
  const unlock = () => unlockBoardAudio();
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .lobby-menu-card, .lobby-phone-card, .player-card, .mp-color-btn');
    if (!btn) return;
    if (btn.id === 'exp-audio-toggle') return;
    const action = btn.getAttribute('data-action') || '';
    if (/roll|aa-fire|auto-battle|bombardment|first-strike/i.test(action)) {
      playBoardSound('dice');
    } else if (/purchase|buy|confirm-purchase|start/i.test(action)) {
      playBoardSound('stamp');
    } else {
      playBoardSound('ui-click');
    }
    btn.classList.add('board-pressed');
    setTimeout(() => btn.classList.remove('board-pressed'), 140);
  }, true);

  document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('button.lobby-menu-card, .hud-next-phase-btn, .combat-btn, .start-game-btn');
    if (!btn) return;
    playBoardSound('ui-hover');
  }, true);
}

export function attachBoardActionSounds(actionLog) {
  if (!actionLog || actionLog._boardSkinHooked) return;
  actionLog._boardSkinHooked = true;
  const original = actionLog.log.bind(actionLog);
  actionLog.log = (type, data) => {
    playActionSound(type);
    const from = data?.from;
    const to = data?.to;
    const color = data?.color || '#8B1A1A';
    if ((type === 'move' || type === 'ncm' || type === 'mobilize') && from && to) {
      flyTableToken(from, to, color, 'move');
    } else if (type === 'attack' && from && to) {
      flyTableToken(from, to, color, 'combat');
    } else if (type === 'combat' || type === 'combat-summary') {
      liftPiecesOffTile(data?.territory, color);
    }
    return original(type, data);
  };
}

export function initBoardSkin() {
  document.documentElement.classList.add('board-skin');
  document.body.classList.add('board-skin');
  const minimap = document.getElementById('minimap');
  if (minimap) minimap.hidden = true;
  const zoom = document.getElementById('zoom-controls');
  if (zoom) zoom.remove();
  const clarity = document.getElementById('hud-clarity');
  if (clarity) {
    clarity.hidden = true;
    clarity.setAttribute('hidden', '');
    clarity.innerHTML = '';
  }
  ensureBanner();
  bindTableFeel();
}
