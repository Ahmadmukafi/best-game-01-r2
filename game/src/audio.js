// audio.js — every sound in Ember & Anvil is synthesized with WebAudio.
// One job: clang, whoosh, hiss, coins and fanfares. No audio files.
export function createSoundBank() {
  let ctx = null;
  let muted = false;
  let noiseBuffer = null;

  function context() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = ctx.sampleRate;
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    const c = context();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    const c = context();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq, type = 'bandpass', when = 0, slideTo = null) {
    const c = context();
    if (!c || muted || !noiseBuffer) return;
    const t0 = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, t0);
    if (slideTo !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    unlock,
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    // A hammer blow on hot iron: bright metallic ring plus a thud.
    clang(quality = 1) {
      tone(1180 + quality * 300, 0.22, 'square', 0.10);
      tone(1975, 0.16, 'triangle', 0.08);
      tone(190, 0.12, 'sine', 0.16, 0, 90);
      noise(0.06, 0.10, 3200, 'highpass');
    },
    // Bellows pumping air into the coals.
    whoosh() { noise(0.45, 0.12, 500, 'bandpass', 0, 1600); },
    // Hot metal plunged into the quench barrel.
    hiss() { noise(0.7, 0.16, 5200, 'highpass', 0, 900); },
    // Coins landing on the counter.
    coin() {
      tone(1320, 0.09, 'sine', 0.12);
      tone(1760, 0.16, 'sine', 0.12, 0.08);
    },
    // A ruined order: dull clank and a low sigh.
    ruin() {
      tone(140, 0.4, 'sawtooth', 0.12, 0, 70);
      noise(0.35, 0.08, 300, 'lowpass');
    },
    // A short rising arpeggio when a day is cleared.
    dayClear() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.09));
    },
    // The Crown is delivered: a full fanfare.
    fanfare() {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, i * 0.11));
      tone(262, 0.9, 'sine', 0.08, 0);
      noise(0.5, 0.05, 4000, 'highpass', 0.2);
    },
    // Losing the last heart: a low descending phrase.
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'sine', 0.12, i * 0.16));
    },
    click() { tone(880, 0.05, 'sine', 0.07); },
  };
}
