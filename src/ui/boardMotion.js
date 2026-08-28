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

export function flyTableToken(fromName, toName, color = '#8B1A1A', kind = 'move') {
  playBoardSound(kind === 'combat' ? 'combat' : 'plastic');
  sculptRenderer?.slideSculpt(fromName, toName, 'infantry', color, kind === 'combat' ? 'attack' : 'move');
}

export function liftPiecesOffTile(territoryName, color, unitType = 'infantry') {
  playBoardSound('plastic');
  sculptRenderer?.slideSculpt(territoryName, null, unitType, color, 'lift');
}
