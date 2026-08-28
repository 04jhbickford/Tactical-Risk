// Table-token motion for the V3.00-exp skin. Visual only.

import { playBoardSound } from '../audio/boardAudio.js';

let motion = {
  camera: null,
  canvas: null,
  getCenter: null,
};

export function setBoardMotionContext(next) {
  motion = { ...motion, ...next };
}

function screenOf(name) {
  const c = motion.getCenter?.(name);
  if (!c || c[0] == null || !motion.camera || !motion.canvas) return null;
  const s = motion.camera.worldToScreen(c[0], c[1]);
  const r = motion.canvas.getBoundingClientRect();
  return { x: r.left + s.x, y: r.top + s.y };
}

export function flyTableToken(fromName, toName, color = '#8B1A1A', kind = 'move') {
  const from = screenOf(fromName);
  const to = toName ? screenOf(toName) : null;
  if (!from) return;
  const dest = to || { x: window.innerWidth / 2, y: window.innerHeight - 120 };
  const el = document.createElement('div');
  el.className = `board-fly-token board-fly-${kind}`;
  el.style.background = color;
  el.style.left = `${from.x - 11}px`;
  el.style.top = `${from.y - 14}px`;
  document.body.appendChild(el);
  playBoardSound(kind === 'combat' ? 'combat' : 'plastic');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dest.x - from.x}px, ${dest.y - from.y}px) scale(1.15)`;
      el.style.opacity = '0.15';
    });
  });
  setTimeout(() => el.remove(), 420);
}

export function liftPiecesOffTile(territoryName, color) {
  const origin = screenOf(territoryName);
  if (!origin) return;
  playBoardSound('plastic');
  for (let i = 0; i < 3; i++) {
    const el = document.createElement('div');
    el.className = 'board-fly-token board-fly-lift';
    el.style.background = color || '#8B1A1A';
    el.style.left = `${origin.x - 10 + i * 8}px`;
    el.style.top = `${origin.y - 8}px`;
    el.style.transitionDelay = `${i * 40}ms`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = `translate(${(i - 1) * 18}px, -52px) scale(1.2)`;
        el.style.opacity = '0.2';
      });
    });
    setTimeout(() => el.remove(), 480);
  }
}
