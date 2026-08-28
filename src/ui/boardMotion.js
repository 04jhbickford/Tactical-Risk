// Canvas sculpt motion for the V3.00-exp skin. Visual only.
// Slides the plastic piece on the tile — no overlay chips.

import { playBoardSound } from '../audio/boardAudio.js';

let sculptRenderer = null;

export function setSculptMotion(renderer) {
  sculptRenderer = renderer;
}

export function setBoardMotionContext() {
  // Kept for callers that used to pass camera/canvas. Slides now live on the
  // unit renderer (world space), so this is a no-op.
}

export function flyTableToken(fromName, toName, color = '#8B1A1A', kind = 'move', unitType = 'infantry', qty = 1) {
  playBoardSound(kind === 'combat' ? 'combat' : 'plastic');
  const n = Math.min(4, Math.max(1, Number(qty) || 1));
  for (let i = 0; i < n; i++) {
    sculptRenderer?.slideSculpt(fromName, toName, unitType, color, kind === 'combat' ? 'attack' : 'move', i * 45);
  }
}

export function liftPiecesOffTile(territoryName, color, unitType = 'infantry') {
  playBoardSound('plastic');
  sculptRenderer?.slideSculpt(territoryName, null, unitType, color, 'lift');
}

export function placeTableToken(territoryName, color = '#8B1A1A', unitType = 'infantry') {
  playBoardSound('plastic');
  sculptRenderer?.slideSculpt(territoryName, territoryName, unitType, color, 'place');
}
