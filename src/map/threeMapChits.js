// Compatibility wrappers. Live chit faces come from threeUnitAtlas (Arc sheets).

export { makeAtlasChitTexture as makeChitTexture, makeAtlasPipTexture as makePipTexture } from './threeUnitAtlas.js';

export function glyphKey(type) {
  return type;
}
