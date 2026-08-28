// Analog table-feel SFX for the V3.00-exp board-skin experiment.
// Synthesized in Web Audio — no sample files, no licensed recordings.

let ctx = null;
let master = null;
let unlocked = false;
let muted = false;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockBoardAudio() {
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  unlocked = true;
}

export function setBoardAudioMuted(next) {
  muted = !!next;
}

export function isBoardAudioMuted() {
  return muted;
}

function envGain(duration, peak = 0.4, attack = 0.008) {
  const ac = audio();
  if (!ac || !unlocked || muted) return null;
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  g.connect(master);
  return { ac, g, now };
}

function noiseBuffer(seconds = 0.2) {
  const ac = audio();
  const n = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(freq, type, duration, peak, attack) {
  const e = envGain(duration, peak, attack);
  if (!e) return;
  const o = e.ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, e.now);
  o.connect(e.g);
  o.start(e.now);
  o.stop(e.now + duration);
}

function noise(duration, peak, hp = 400, lp = 2400) {
  const e = envGain(duration, peak, 0.004);
  if (!e) return;
  const src = e.ac.createBufferSource();
  src.buffer = noiseBuffer(Math.max(duration, 0.05));
  const high = e.ac.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = hp;
  const low = e.ac.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = lp;
  src.connect(high);
  high.connect(low);
  low.connect(e.g);
  src.start(e.now);
  src.stop(e.now + duration);
}

export function playBoardSound(kind) {
  switch (kind) {
    case 'ui-click':
      tone(220, 'triangle', 0.07, 0.18, 0.004);
      noise(0.05, 0.08, 800, 1800);
      break;
    case 'ui-hover':
      tone(520, 'sine', 0.04, 0.05, 0.002);
      break;
    case 'paper':
      noise(0.16, 0.14, 1200, 5000);
      break;
    case 'stamp':
      tone(90, 'sine', 0.12, 0.28, 0.002);
      noise(0.08, 0.12, 200, 900);
      break;
    case 'dice':
      noise(0.09, 0.16, 600, 3500);
      tone(180 + Math.random() * 40, 'square', 0.06, 0.08, 0.001);
      setTimeout(() => noise(0.07, 0.12, 700, 3200), 40);
      setTimeout(() => tone(140, 'triangle', 0.08, 0.1, 0.002), 90);
      break;
    case 'move':
      tone(196, 'sine', 0.14, 0.1, 0.01);
      noise(0.1, 0.06, 300, 900);
      break;
    case 'combat':
      tone(70, 'sine', 0.22, 0.32, 0.003);
      noise(0.18, 0.2, 80, 700);
      break;
    case 'hit':
      tone(55, 'sawtooth', 0.16, 0.22, 0.002);
      noise(0.12, 0.16, 100, 800);
      break;
    case 'capture':
      tone(262, 'triangle', 0.18, 0.16, 0.01);
      tone(330, 'sine', 0.22, 0.1, 0.02);
      break;
    case 'buy':
      tone(392, 'triangle', 0.09, 0.14, 0.004);
      tone(523, 'sine', 0.12, 0.1, 0.02);
      break;
    case 'place':
      tone(164, 'triangle', 0.1, 0.14, 0.003);
      noise(0.06, 0.08, 400, 1400);
      break;
    case 'phase':
      tone(147, 'sine', 0.16, 0.12, 0.02);
      tone(196, 'triangle', 0.2, 0.08, 0.04);
      break;
    case 'tech':
      tone(440, 'sine', 0.12, 0.1, 0.01);
      tone(554, 'triangle', 0.18, 0.08, 0.03);
      break;
    case 'turn':
      tone(174, 'triangle', 0.2, 0.12, 0.02);
      break;
    default:
      break;
  }
}

export function playActionSound(type) {
  const map = {
    move: 'move',
    ncm: 'move',
    attack: 'combat',
    combat: 'hit',
    'combat-summary': 'hit',
    capture: 'capture',
    purchase: 'buy',
    placement: 'place',
    mobilize: 'place',
    phase: 'phase',
    turn: 'turn',
    tech: 'tech',
    'aa-fire': 'combat',
    cards: 'paper',
    'card-earned': 'stamp',
    income: 'buy',
  };
  const sound = map[type];
  if (sound) playBoardSound(sound);
}
