// Generates Excellent Mind's original sound assets (16-bit mono WAV) into assets/audio.
// Run: node scripts/gen-audio.js
const fs = require('fs');
const path = require('path');

const SR = 22050;
const out = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(out, { recursive: true });

function wav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const g = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * g)) * 32767), 44 + i * 2);
  fs.writeFileSync(path.join(out, name), buf);
  console.log('wrote', name, (buf.length / 1024).toFixed(0) + ' KB');
}

let seed = 1234567;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

// Crossfade the tail into the head so the loop is seamless.
function loopable(s, fadeSec = 0.4) {
  const f = Math.floor(fadeSec * SR);
  const body = s.slice(0, s.length - f);
  for (let i = 0; i < f; i++) {
    const a = i / f;
    body[i] = body[i] * a + s[s.length - f + i] * (1 - a);
  }
  return body;
}

const tone = (dur, fn) => Array.from({ length: Math.floor(dur * SR) }, (_, i) => fn(i / SR));

// --- reward sounds ---
wav(
  'reward-chime.wav',
  tone(1.1, (t) => {
    const e = Math.exp(-t * 4);
    return e * (Math.sin(2 * Math.PI * 880 * t) + 0.6 * Math.sin(2 * Math.PI * 1320 * t) + 0.25 * Math.sin(2 * Math.PI * 2640 * t)) * Math.min(1, t * 200);
  }),
);
wav(
  'reward-pulse.wav',
  tone(0.45, (t) => {
    const e = Math.min(1, t * 60) * Math.exp(-t * 9);
    return e * (Math.sin(2 * Math.PI * 523 * t) + 0.5 * Math.sin(2 * Math.PI * 1046 * t));
  }),
);
wav(
  'reward-drop.wav',
  tone(0.35, (t) => {
    const f = 500 + 900 * Math.exp(-t * 30);
    const ph = 2 * Math.PI * (500 * t + (900 / 30) * (1 - Math.exp(-t * 30)));
    return Math.exp(-t * 14) * Math.sin(ph) * Math.min(1, t * 400) * (f > 0 ? 1 : 0);
  }),
);

// --- ambiences (12 s loops) ---
const D = 12.4;
const N = Math.floor(D * SR);

// rain: filtered white noise + scattered droplets
{
  const s = new Array(N).fill(0);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += (rnd() - lp) * 0.35;
    s[i] = lp * 0.5;
  }
  for (let k = 0; k < 260; k++) {
    const at = Math.floor(Math.abs(rnd()) * (N - SR));
    const f = 1800 + Math.abs(rnd()) * 2500;
    const a = 0.05 + Math.abs(rnd()) * 0.12;
    for (let i = 0; i < 0.04 * SR; i++) s[at + i] += a * Math.exp(-i / (0.006 * SR)) * Math.sin((2 * Math.PI * f * i) / SR);
  }
  wav('amb-rain.wav', loopable(s));
}

// breeze: brown noise with a slow swell
{
  const s = new Array(N).fill(0);
  let b = 0;
  for (let i = 0; i < N; i++) {
    b = (b + rnd() * 0.02) * 0.998;
    const t = i / SR;
    s[i] = b * (0.55 + 0.45 * Math.sin((2 * Math.PI * t) / 6.0));
  }
  wav('amb-breeze.wav', loopable(s));
}

// ocean: brown noise shaped into waves
{
  const s = new Array(N).fill(0);
  let b = 0;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    b = (b + rnd() * 0.03) * 0.997;
    lp += (rnd() - lp) * 0.08;
    const t = i / SR;
    const w = Math.pow(0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 6.0 - Math.PI / 2), 2);
    s[i] = b * (0.3 + 0.7 * w) + lp * 0.25 * w;
  }
  wav('amb-ocean.wav', loopable(s));
}

// night: soft hum + cricket chirps
{
  const s = new Array(N).fill(0);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += (rnd() - lp) * 0.03;
    s[i] = lp * 0.25;
  }
  for (let c = 0; c < 22; c++) {
    const at = Math.floor(Math.abs(rnd()) * (N - SR));
    const f = 4200 + rnd() * 300;
    for (let p = 0; p < 3; p++) {
      const st = at + Math.floor(p * 0.06 * SR);
      for (let i = 0; i < 0.035 * SR; i++) {
        const env = Math.sin((Math.PI * i) / (0.035 * SR));
        s[st + i] += 0.08 * env * Math.sin((2 * Math.PI * f * i) / SR);
      }
    }
  }
  wav('amb-night.wav', loopable(s));
}
