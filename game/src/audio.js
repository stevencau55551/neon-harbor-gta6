// Neon Harbor audio: every sound is synthesised with WebAudio — no audio files,
// no network. Engine hum, siren, gunshots, pickups and a small bass loop.
export function createAudio() {
  let ctx = null;
  let musicTimer = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c || muted) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch {
      // Audio is decoration; a failure never breaks the game.
    }
  }

  function noise(dur, vol, lowpass) {
    const c = ensure();
    if (!c || muted) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const g = c.createGain();
      g.gain.value = vol || 0.15;
      src.connect(filter);
      filter.connect(g);
      g.connect(c.destination);
      src.start();
    } catch {
      // Ignore.
    }
  }

  const NOTE = [55, 65.41, 49, 58.27]; // A1 C2 G1 A#1 — a slow harbour bassline.
  let noteIndex = 0;

  return {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    },
    startMusic() {
      if (musicTimer) return;
      musicTimer = setInterval(() => {
        if (muted) return;
        const f = NOTE[noteIndex % NOTE.length];
        noteIndex += 1;
        tone(f, 0.9, 'triangle', 0.05);
        tone(f * 2, 0.4, 'sine', 0.03);
      }, 520);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    shot() {
      noise(0.12, 0.22, 2400);
    },
    punch() {
      noise(0.08, 0.12, 500);
    },
    pickup() {
      tone(660, 0.12, 'sine', 0.09);
      setTimeout(() => tone(990, 0.18, 'sine', 0.09), 90);
    },
    crime() {
      tone(220, 0.25, 'sawtooth', 0.07, 110);
    },
    mission() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.09), i * 110));
    },
    siren() {
      tone(700, 0.5, 'sine', 0.045, 950);
      setTimeout(() => tone(950, 0.5, 'sine', 0.045, 700), 520);
    },
    crash() {
      noise(0.25, 0.2, 700);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
