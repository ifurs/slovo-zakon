// Tiny WebAudio blips — no audio files needed.
let ctx = null;
let muted = false;

export function setMuted(v) { muted = v; }
export function isMuted() { return muted; }

function tone(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (muted) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch { /* audio unavailable */ }
}

export function sfx(name) {
  switch (name) {
    case 'step': tone(220, 0.05, 'triangle', 0.05); break;
    case 'bump': tone(90, 0.06, 'square', 0.03); break;
    case 'undo': tone(330, 0.06, 'triangle', 0.04, -120); break;
    case 'rule': tone(523, 0.08, 'triangle', 0.06); tone(784, 0.12, 'triangle', 0.06, 0, 0.07); break;
    case 'poof': tone(160, 0.18, 'sawtooth', 0.05, -110); break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, 0, i * 0.09));
      break;
  }
}
