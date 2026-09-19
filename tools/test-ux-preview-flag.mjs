import { isUxPreviewRequested, stripPreviewParams, parseUxDemo } from '../src/map/uxPreviewFlag.js';
import { lodBandFromZoom, shouldExpandPreview } from '../src/map/uxPreviewUnits.js';
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
assert(parseUxDemo('?three=1') === 'karelia-finland-air', 'default demo');
assert(parseUxDemo('?three=1&demo=max') === 'max-both-sides', 'demo=max');
assert(parseUxDemo('?ux=1&demo=maxed') === 'max-both-sides', 'demo=maxed');
assert(parseUxDemo('?demo=max-both-sides') === 'max-both-sides', 'demo id');
assert(parseUxDemo('?demo=pocket') === 'karelia-finland-air', 'unknown demo stays pocket');
assert(stripPreviewParams('https://example.com/?three=1&demo=max').includes('demo') === false, 'strip demo');
assert(lodBandFromZoom(0.2) === 'far', 'far');
assert(lodBandFromZoom(0.55) === 'mid', 'mid');
assert(lodBandFromZoom(1.2) === 'near', 'near');
assert(showMinis('mid', false) === false, 'mid idle collapse');
assert(showMinis('mid', true) === true, 'mid select expand');
assert(showMinis('near', false) === true, 'near expand');
assert(shouldExpandPreview('far', false, true) === false, 'far ignores expand toggle');
assert(shouldExpandPreview('near', false, false) === true, 'near still expands');

console.log('ux-preview flag + STACK-LOD checks passed');
