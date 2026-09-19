import { isUxPreviewRequested, stripPreviewParams } from '../src/map/uxPreviewFlag.js';
import { lodBandFromZoom } from '../src/map/uxPreviewUnits.js';
import { showMinis } from '../src/map/threeMapDensity.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isUxPreviewRequested('?three=1') === true, 'three=1');
assert(isUxPreviewRequested('?three=true') === true, 'three=true');
assert(isUxPreviewRequested('?ux=1') === true, 'ux=1');
assert(isUxPreviewRequested('?ux=yes') === true, 'ux=yes');
assert(isUxPreviewRequested('') === false, 'empty');
assert(isUxPreviewRequested('?foo=1') === false, 'unrelated');
assert(stripPreviewParams('https://example.com/?three=1&ux=1').includes('three') === false, 'strip three');
assert(stripPreviewParams('https://example.com/?three=1&ux=1').includes('ux') === false, 'strip ux');
assert(lodBandFromZoom(0.2) === 'far', 'far');
assert(lodBandFromZoom(0.55) === 'mid', 'mid');
assert(lodBandFromZoom(1.2) === 'near', 'near');
assert(showMinis('mid', false) === false, 'mid idle collapse');
assert(showMinis('mid', true) === true, 'mid select expand');
assert(showMinis('near', false) === false, 'near idle stays pip');
assert(showMinis('near', true) === true, 'near select may expand');
assert(showMinis('far', true) === false, 'far select stays pip');

console.log('ux-preview flag + STACK-LOD checks passed');
