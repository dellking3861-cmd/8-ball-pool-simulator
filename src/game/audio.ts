// Realistic billiard ball audio using Web Audio API synthesis
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function getMasterGain(): GainNode {
  const a = ac();
  if (!masterGain) {
    masterGain = a.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(a.destination);
  }
  return masterGain;
}

// ─── Realistic ball-on-ball "click/clack" ───
// Hard phenolic resin balls produce a short, bright "tock" with:
//  • a sharp transient (white-noise burst ~2ms)
//  • a resonant mid-frequency body (800-2500 Hz sine that decays quickly)
//  • filtered noise tail
export function playHitSound(volume: number = 0.3) {
  try {
    const a = ac(), t = a.currentTime;
    const vol = Math.min(volume, 0.55);
    const dest = getMasterGain();

    // — sharp transient click (filtered noise) —
    const nLen = Math.floor(a.sampleRate * 0.012);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 4);
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const nGain = a.createGain();
    nGain.gain.setValueAtTime(vol * 0.8, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    nSrc.connect(hp).connect(nGain).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.015);

    // — resonant body tone —
    const freq = 1200 + Math.random() * 800;
    const osc = a.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    const oGain = a.createGain();
    oGain.gain.setValueAtTime(vol * 0.5, t);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(oGain).connect(dest);
    osc.start(t); osc.stop(t + 0.06);

    // — low thump —
    const osc2 = a.createOscillator();
    osc2.type = 'sine'; osc2.frequency.value = 180 + Math.random() * 60;
    const oGain2 = a.createGain();
    oGain2.gain.setValueAtTime(vol * 0.3, t);
    oGain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc2.connect(oGain2).connect(dest);
    osc2.start(t); osc2.stop(t + 0.04);
  } catch {}
}

// ─── Cushion bounce — softer, thuddy ───
export function playCushionSound(volume: number = 0.2) {
  try {
    const a = ac(), t = a.currentTime;
    const vol = Math.min(volume, 0.35);
    const dest = getMasterGain();

    // filtered noise thud
    const nLen = Math.floor(a.sampleRate * 0.03);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 3);
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
    const nGain = a.createGain();
    nGain.gain.setValueAtTime(vol, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    nSrc.connect(lp).connect(nGain).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.06);

    // rubber resonance
    const osc = a.createOscillator();
    osc.type = 'triangle'; osc.frequency.value = 120 + Math.random() * 40;
    const og = a.createGain();
    og.gain.setValueAtTime(vol * 0.4, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(og).connect(dest);
    osc.start(t); osc.stop(t + 0.08);
  } catch {}
}

// ─── Ball drops into pocket — deep hollow thunk + rattle ───
export function playPocketSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getMasterGain();

    // deep drop
    const osc = a.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.25);
    const og = a.createGain();
    og.gain.setValueAtTime(0.35, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(og).connect(dest);
    osc.start(t); osc.stop(t + 0.3);

    // rattle noise
    const nLen = Math.floor(a.sampleRate * 0.15);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      const env = Math.pow(1 - i / nLen, 2) * (0.5 + 0.5 * Math.sin(i / (a.sampleRate * 0.008)));
      nd[i] = (Math.random() * 2 - 1) * env;
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 2;
    const ng = a.createGain(); ng.gain.setValueAtTime(0.2, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    nSrc.connect(bp).connect(ng).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.2);

    // satisfying "plop" harmonic
    const osc2 = a.createOscillator();
    osc2.type = 'sine'; osc2.frequency.value = 440;
    const og2 = a.createGain();
    og2.gain.setValueAtTime(0.12, t + 0.03);
    og2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc2.connect(og2).connect(dest);
    osc2.start(t + 0.03); osc2.stop(t + 0.15);
  } catch {}
}

// ─── Cue tip striking cue ball ───
export function playShotSound(power: number) {
  try {
    const a = ac(), t = a.currentTime;
    const vol = 0.15 + Math.min(power * 0.015, 0.25);
    const dest = getMasterGain();

    // sharp tip crack
    const nLen = Math.floor(a.sampleRate * 0.008);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 6);
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const ng = a.createGain();
    ng.gain.setValueAtTime(vol, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
    nSrc.connect(hp).connect(ng).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.01);

    // impact body
    const osc = a.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900 + power * 40, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    const og = a.createGain();
    og.gain.setValueAtTime(vol * 0.6, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(og).connect(dest);
    osc.start(t); osc.stop(t + 0.1);
  } catch {}
}

// ─── Foul buzzer ───
export function playFoulSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getMasterGain();
    for (let i = 0; i < 2; i++) {
      const osc = a.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 185 - i * 55;
      const g = a.createGain();
      g.gain.setValueAtTime(0.1, t + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.14);
      osc.connect(g).connect(dest);
      osc.start(t + i * 0.14); osc.stop(t + i * 0.14 + 0.14);
    }
  } catch {}
}

// ─── Win fanfare ───
export function playWinSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getMasterGain();
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = a.createGain();
      g.gain.setValueAtTime(0.18, t + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.35);
      o.connect(g).connect(dest);
      o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.35);
    });
  } catch {}
}

// ─── Turn switch chime ───
export function playTurnSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getMasterGain();
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = 660;
    const g = a.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + 0.15);
  } catch {}
}

// ─── NEW: Ball rolling sound (subtle rumble) ───
let rollingOsc: OscillatorNode | null = null;
let rollingGain: GainNode | null = null;
let rollingNoise: AudioBufferSourceNode | null = null;

export function startRollingSound() {
  try {
    const a = ac();
    const dest = getMasterGain();
    if (rollingOsc) return; // already playing

    // Low rumble oscillator
    rollingOsc = a.createOscillator();
    rollingOsc.type = 'sine';
    rollingOsc.frequency.value = 45;
    rollingGain = a.createGain();
    rollingGain.gain.value = 0;
    rollingOsc.connect(rollingGain).connect(dest);
    rollingOsc.start();

    // Subtle noise layer
    const nLen = Math.floor(a.sampleRate * 0.5);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 2);
    }
    rollingNoise = a.createBufferSource();
    rollingNoise.buffer = nBuf;
    rollingNoise.loop = true;
    const noiseGain = a.createGain();
    noiseGain.gain.value = 0;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;
    rollingNoise.connect(lp).connect(noiseGain).connect(dest);
    rollingNoise.start();
  } catch {}
}

export function updateRollingSound(speed: number) {
  try {
    if (!rollingGain || !rollingOsc) return;
    // Map speed to volume (0-1 range)
    const vol = Math.min(speed * 0.02, 0.08);
    rollingGain.gain.setValueAtTime(vol, ac().currentTime);
    // Pitch shift with speed
    rollingOsc.frequency.setValueAtTime(40 + speed * 2, ac().currentTime);
  } catch {}
}

export function stopRollingSound() {
  try {
    if (rollingOsc) { rollingOsc.stop(); rollingOsc.disconnect(); rollingOsc = null; }
    if (rollingGain) { rollingGain.disconnect(); rollingGain = null; }
    if (rollingNoise) { rollingNoise.stop(); rollingNoise.disconnect(); rollingNoise = null; }
  } catch {}
}