// Professional billiard ball audio using Web Audio API synthesis
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
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

function getSfxGain(): GainNode {
  const a = ac();
  if (!sfxGain) {
    sfxGain = a.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(getMasterGain());
  }
  return sfxGain;
}

const a = () => ac();

// ─── Pitch variation helper ───
function pitchVariation(base: number, range: number = 0.15): number {
  return base * (1 + (Math.random() - 0.5) * range * 2);
}

// ─── Ball-on-ball collision sound ───
// Produces a crisp phenolic resin "tock" with body resonance
export function playHitSound(volume: number = 0.3) {
  try {
    const a = ac(), t = a.currentTime;
    const vol = Math.min(volume, 0.55);
    const dest = getSfxGain();
    const pitch = pitchVariation(1.0, 0.12);

    // — sharp transient click (high-passed noise burst) —
    const nLen = Math.floor(a.sampleRate * 0.01);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 3);
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500 * pitch;
    const nGain = a.createGain();
    nGain.gain.setValueAtTime(vol * 0.9, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    nSrc.connect(hp).connect(nGain).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.015);

    // — resonant body tone (mid) —
    const freq = pitchVariation(1400, 0.2);
    const osc = a.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    const oGain = a.createGain();
    oGain.gain.setValueAtTime(vol * 0.45, t);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(oGain).connect(dest);
    osc.start(t); osc.stop(t + 0.06);

    // — low thump (body resonance) —
    const osc2 = a.createOscillator();
    osc2.type = 'sine'; osc2.frequency.value = pitchVariation(200, 0.15);
    const oGain2 = a.createGain();
    oGain2.gain.setValueAtTime(vol * 0.25, t);
    oGain2.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc2.connect(oGain2).connect(dest);
    osc2.start(t); osc2.stop(t + 0.04);
  } catch {}
}

// ─── Cushion bounce — softer, rubbery thud ───
export function playCushionSound(volume: number = 0.2) {
  try {
    const a = ac(), t = a.currentTime;
    const vol = Math.min(volume, 0.35);
    const dest = getSfxGain();
    const pitch = pitchVariation(1.0, 0.1);

    // rubber thud noise
    const nLen = Math.floor(a.sampleRate * 0.025);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 2);
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 * pitch;
    const nGain = a.createGain();
    nGain.gain.setValueAtTime(vol * 0.8, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    nSrc.connect(lp).connect(nGain).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.06);

    // rubber band resonance
    const osc = a.createOscillator();
    osc.type = 'triangle'; osc.frequency.value = pitchVariation(130, 0.12);
    const og = a.createGain();
    og.gain.setValueAtTime(vol * 0.35, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(og).connect(dest);
    osc.start(t); osc.stop(t + 0.08);
  } catch {}
}

// ─── Ball drops into pocket — deep hollow thunk + rattle ───
export function playPocketSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
    const pitch = pitchVariation(1.0, 0.08);

    // deep drop tone
    const osc = a.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(50 * pitch, t + 0.2);
    const og = a.createGain();
    og.gain.setValueAtTime(0.4, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(og).connect(dest);
    osc.start(t); osc.stop(t + 0.3);

    // pocket rattle noise
    const nLen = Math.floor(a.sampleRate * 0.12);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      const env = Math.pow(1 - i / nLen, 2) * (0.5 + 0.5 * Math.sin(i / (a.sampleRate * 0.006)));
      nd[i] = (Math.random() * 2 - 1) * env;
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 550; bp.Q.value = 2.5;
    const ng = a.createGain(); ng.gain.setValueAtTime(0.18, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    nSrc.connect(bp).connect(ng).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.2);

    // satisfying "plop" harmonic
    const osc2 = a.createOscillator();
    osc2.type = 'sine'; osc2.frequency.value = pitchVariation(480, 0.1);
    const og2 = a.createGain();
    og2.gain.setValueAtTime(0.14, t + 0.02);
    og2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc2.connect(og2).connect(dest);
    osc2.start(t + 0.02); osc2.stop(t + 0.14);
  } catch {}
}

// ─── Cue tip striking cue ball ───
export function playShotSound(power: number) {
  try {
    const a = ac(), t = a.currentTime;
    const vol = 0.15 + Math.min(power * 0.015, 0.3);
    const dest = getSfxGain();
    const pitch = pitchVariation(1.0, 0.1);

    // sharp tip crack (filtered noise burst)
    const nLen = Math.floor(a.sampleRate * 0.006);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 5);
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500 * pitch;
    const ng = a.createGain();
    ng.gain.setValueAtTime(vol, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
    nSrc.connect(hp).connect(ng).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.01);

    // impact body resonance
    const osc = a.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitchVariation(1000 + power * 30, 0.1), t);
    osc.frequency.exponentialRampToValueAtTime(pitchVariation(250, 0.15), t + 0.07);
    const og = a.createGain();
    og.gain.setValueAtTime(vol * 0.55, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(og).connect(dest);
    osc.start(t); osc.stop(t + 0.1);
  } catch {}
}

// ─── Foul buzzer ───
export function playFoulSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
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

// ─── Win fanfare (ascending arpeggio) ───
export function playWinSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + Math.random() * 0.02);
      const g = a.createGain();
      g.gain.setValueAtTime(0.2, t + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.4);
      o.connect(g).connect(dest);
      o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.4);
    });
  } catch {}
}

// ─── Defeat sound (descending tones) ───
export function playDefeatSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
    [400, 350, 300, 220].forEach((f, i) => {
      const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = a.createGain();
      g.gain.setValueAtTime(0.12, t + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
      o.connect(g).connect(dest);
      o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.3);
    });
  } catch {}
}

// ─── Turn switch chime ───
export function playTurnSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = pitchVariation(660, 0.08);
    const g = a.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + 0.2);
  } catch {}
}

// ─── UI click sound ───
export function playClickSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
    const nLen = Math.floor(a.sampleRate * 0.003);
    const nBuf = a.createBuffer(1, nLen, a.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 2);
    }
    const nSrc = a.createBufferSource(); nSrc.buffer = nBuf;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.08, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.005);
    nSrc.connect(hp).connect(ng).connect(dest);
    nSrc.start(t); nSrc.stop(t + 0.006);
  } catch {}
}

// ─── UI hover sound ───
export function playHoverSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
    const osc = a.createOscillator();
    osc.type = 'sine'; osc.frequency.value = pitchVariation(880, 0.05);
    const g = a.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g).connect(dest);
    osc.start(t); osc.stop(t + 0.07);
  } catch {}
}

// ─── Countdown tick ───
export function playCountdownSound() {
  try {
    const a = ac(), t = a.currentTime;
    const dest = getSfxGain();
    const osc = a.createOscillator();
    osc.type = 'sine'; osc.frequency.value = 1000;
    const g = a.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g).connect(dest);
    osc.start(t); osc.stop(t + 0.09);
  } catch {}
}

// ─── Ball rolling sound (subtle rumble) ───
let rollingOsc: OscillatorNode | null = null;
let rollingGain: GainNode | null = null;
let rollingNoise: AudioBufferSourceNode | null = null;
let rollingNoiseGain: GainNode | null = null;

export function startRollingSound() {
  try {
    const a = ac();
    const dest = getSfxGain();
    if (rollingOsc) return;

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
    rollingNoiseGain = a.createGain();
    rollingNoiseGain.gain.value = 0;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;
    rollingNoise.connect(lp).connect(rollingNoiseGain).connect(dest);
    rollingNoise.start();
  } catch {}
}

export function updateRollingSound(speed: number) {
  try {
    if (!rollingGain || !rollingOsc) return;
    const vol = Math.min(speed * 0.025, 0.1);
    rollingGain.gain.setValueAtTime(vol, ac().currentTime);
    rollingOsc.frequency.setValueAtTime(40 + speed * 2.5, ac().currentTime);
    if (rollingNoiseGain) {
      rollingNoiseGain.gain.setValueAtTime(vol * 0.5, ac().currentTime);
    }
  } catch {}
}

export function stopRollingSound() {
  try {
    if (rollingOsc) { try { rollingOsc.stop(); } catch {} rollingOsc.disconnect(); rollingOsc = null; }
    if (rollingGain) { rollingGain.disconnect(); rollingGain = null; }
    if (rollingNoise) { try { rollingNoise.stop(); } catch {} rollingNoise.disconnect(); rollingNoise = null; }
    if (rollingNoiseGain) { rollingNoiseGain.disconnect(); rollingNoiseGain = null; }
  } catch {}
}