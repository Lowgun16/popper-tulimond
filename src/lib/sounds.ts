"use client";

// All sounds synthesized with Web Audio API — no files, no libraries.
// Each function creates its own AudioContext so it can be called from any
// user-gesture handler. On iOS, AudioContext is gated to user gestures;
// sounds triggered directly from button clicks will work. Sounds triggered
// after async operations (WebAuthn) may be silently skipped on iOS — that
// is acceptable graceful degradation. All calls are wrapped in try/catch.

function getCtx(): AudioContext | null {
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

// ─── Audition sounds (candidates for Add-to-Cart / Purchase) ─────────────────

/**
 * Revolver cock — two-stage metallic click.
 * Stage 1: hammer pull (dull metallic scrape + resonance).
 * Stage 2: cylinder lock (sharper, higher click ~130ms later).
 */
export function playRevolverCock(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.7, ctx.currentTime);
    master.connect(ctx.destination);
    const now = ctx.currentTime;

    function metalClick(t: number, freq: number, noiseAmt: number, duration: number, gain: number) {
      // Noise burst (mechanical scrape)
      const bufLen = Math.floor(ctx!.sampleRate * duration);
      const buf = ctx!.createBuffer(1, bufLen, ctx!.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3);
      }
      const noise = ctx!.createBufferSource();
      noise.buffer = buf;
      const hpf = ctx!.createBiquadFilter();
      hpf.type = "highpass";
      hpf.frequency.setValueAtTime(800, t);
      const noiseEnv = ctx!.createGain();
      noiseEnv.gain.setValueAtTime(noiseAmt, t);
      noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      noise.connect(hpf);
      hpf.connect(noiseEnv);
      noiseEnv.connect(master);
      noise.start(t);

      // Metallic ring
      const osc = ctx!.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + duration * 1.5);
      const ringEnv = ctx!.createGain();
      ringEnv.gain.setValueAtTime(0, t);
      ringEnv.gain.linearRampToValueAtTime(gain, t + 0.004);
      ringEnv.gain.exponentialRampToValueAtTime(0.0001, t + duration * 2);
      const bpf = ctx!.createBiquadFilter();
      bpf.type = "bandpass";
      bpf.frequency.setValueAtTime(freq, t);
      bpf.Q.setValueAtTime(4, t);
      osc.connect(bpf);
      bpf.connect(ringEnv);
      ringEnv.connect(master);
      osc.start(t);
      osc.stop(t + duration * 2 + 0.02);
    }

    // Stage 1: hammer pull — lower, heavier
    metalClick(now, 620, 0.55, 0.045, 0.18);
    // Stage 2: cylinder locks — sharper, higher
    metalClick(now + 0.13, 1100, 0.7, 0.028, 0.22);

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 500);
  } catch { /* ignore */ }
}

/**
 * Ice cube in crystal glass — sharp glass contact + long crystal ring.
 * Three harmonic partials decay slowly, the way fine crystal does.
 */
export function playIceCubeInGlass(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.65, ctx.currentTime);
    master.connect(ctx.destination);
    const now = ctx.currentTime;

    // Impact click
    const bufLen = Math.floor(ctx.sampleRate * 0.018);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.setValueAtTime(2200, now);
    const clickEnv = ctx.createGain();
    clickEnv.gain.setValueAtTime(0.9, now);
    noise.connect(hpf);
    hpf.connect(clickEnv);
    clickEnv.connect(master);
    noise.start(now);

    // Crystal ring — 3 harmonic partials (crystal rings at ~2–5kHz)
    const partials = [
      { freq: 2340, gain: 0.14, decay: 1.8 },
      { freq: 3510, gain: 0.09, decay: 1.4 },
      { freq: 4680, gain: 0.05, decay: 1.0 },
    ];
    partials.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(gain, now + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(env);
      env.connect(master);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });

    // Low thud of ice settling
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(160, now + 0.012);
    const thudEnv = ctx.createGain();
    thudEnv.gain.setValueAtTime(0, now + 0.012);
    thudEnv.gain.linearRampToValueAtTime(0.12, now + 0.022);
    thudEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc2.connect(thudEnv);
    thudEnv.connect(master);
    osc2.start(now + 0.012);
    osc2.stop(now + 0.22);

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 2200);
  } catch { /* ignore */ }
}

/**
 * Shot glass on bar — short decisive thud with woody surface resonance.
 */
export function playShotGlassOnBar(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.75, ctx.currentTime);
    master.connect(ctx.destination);
    const now = ctx.currentTime;

    // Thud body — low noise burst
    const bufLen = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(320, now);
    lpf.Q.setValueAtTime(1.5, now);
    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.85, now);
    noiseEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    noise.connect(lpf);
    lpf.connect(noiseEnv);
    noiseEnv.connect(master);
    noise.start(now);

    // Woody surface ring
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
    const ringEnv = ctx.createGain();
    ringEnv.gain.setValueAtTime(0.15, now);
    ringEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(ringEnv);
    ringEnv.connect(master);
    osc.start(now);
    osc.stop(now + 0.25);

    // Glass lip ping
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1800, now + 0.003);
    const pingEnv = ctx.createGain();
    pingEnv.gain.setValueAtTime(0, now + 0.003);
    pingEnv.gain.linearRampToValueAtTime(0.06, now + 0.01);
    pingEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc2.connect(pingEnv);
    pingEnv.connect(master);
    osc2.start(now + 0.003);
    osc2.stop(now + 0.3);

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 500);
  } catch { /* ignore */ }
}

/**
 * Zippo lighter flick — metallic scrape wheel + soft ignition whoosh.
 */
export function playZippoFlick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.6, ctx.currentTime);
    master.connect(ctx.destination);
    const now = ctx.currentTime;

    // Wheel scrape — short burst of high filtered noise
    const scrapeLen = Math.floor(ctx.sampleRate * 0.055);
    const scrapeBuf = ctx.createBuffer(1, scrapeLen, ctx.sampleRate);
    const scrapeData = scrapeBuf.getChannelData(0);
    for (let i = 0; i < scrapeLen; i++) {
      scrapeData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / scrapeLen, 1.2);
    }
    const scrape = ctx.createBufferSource();
    scrape.buffer = scrapeBuf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.setValueAtTime(3200, now);
    bpf.Q.setValueAtTime(1.8, now);
    const scrapeEnv = ctx.createGain();
    scrapeEnv.gain.setValueAtTime(0.75, now);
    scrapeEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    scrape.connect(bpf);
    bpf.connect(scrapeEnv);
    scrapeEnv.connect(master);
    scrape.start(now);

    // Ignition whoosh — rising bandpass noise
    const whooshLen = Math.floor(ctx.sampleRate * 0.22);
    const whooshBuf = ctx.createBuffer(1, whooshLen, ctx.sampleRate);
    const whooshData = whooshBuf.getChannelData(0);
    for (let i = 0; i < whooshLen; i++) {
      whooshData[i] = Math.random() * 2 - 1;
    }
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = whooshBuf;
    const wpf = ctx.createBiquadFilter();
    wpf.type = "bandpass";
    wpf.frequency.setValueAtTime(400, now + 0.04);
    wpf.frequency.exponentialRampToValueAtTime(1800, now + 0.14);
    wpf.Q.setValueAtTime(2.0, now + 0.04);
    const whooshEnv = ctx.createGain();
    whooshEnv.gain.setValueAtTime(0, now + 0.04);
    whooshEnv.gain.linearRampToValueAtTime(0.28, now + 0.09);
    whooshEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    whoosh.connect(wpf);
    wpf.connect(whooshEnv);
    whooshEnv.connect(master);
    whoosh.start(now + 0.04);

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 500);
  } catch { /* ignore */ }
}

/**
 * Coin on marble — bright metallic ping + hard surface ring, slow decay.
 */
export function playCoinOnMarble(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.6, ctx.currentTime);
    master.connect(ctx.destination);
    const now = ctx.currentTime;

    // Strike transient — sharp high click
    const bufLen = Math.floor(ctx.sampleRate * 0.012);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.4);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.setValueAtTime(3000, now);
    const clickEnv = ctx.createGain();
    clickEnv.gain.setValueAtTime(0.8, now);
    noise.connect(hpf);
    hpf.connect(clickEnv);
    clickEnv.connect(master);
    noise.start(now);

    // Coin ring — bright metallic ping (~3.5kHz)
    [3520, 5280, 7040].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      const decay = 0.9 - i * 0.15;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.12 - i * 0.03, now + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(env);
      env.connect(master);
      osc.start(now);
      osc.stop(now + decay + 0.02);
    });

    // Marble surface — lower resonance, fast decay
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(520, now);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.15);
    const surfEnv = ctx.createGain();
    surfEnv.gain.setValueAtTime(0, now);
    surfEnv.gain.linearRampToValueAtTime(0.08, now + 0.006);
    surfEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc2.connect(surfEnv);
    surfEnv.connect(master);
    osc2.start(now);
    osc2.stop(now + 0.35);

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1200);
  } catch { /* ignore */ }
}

/**
 * Whiskey cork pull — brief squeak, sharp pressure-release pop, soft air exhale.
 */
export function playWhiskeyCorkPull(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.65, ctx.currentTime);
    master.connect(ctx.destination);
    const now = ctx.currentTime;

    // Cork squeak (rising friction, very short)
    const squeakLen = Math.floor(ctx.sampleRate * 0.07);
    const squeakBuf = ctx.createBuffer(1, squeakLen, ctx.sampleRate);
    const squeakData = squeakBuf.getChannelData(0);
    for (let i = 0; i < squeakLen; i++) {
      squeakData[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const squeak = ctx.createBufferSource();
    squeak.buffer = squeakBuf;
    const spf = ctx.createBiquadFilter();
    spf.type = "bandpass";
    spf.frequency.setValueAtTime(600, now);
    spf.frequency.linearRampToValueAtTime(1400, now + 0.07);
    spf.Q.setValueAtTime(3.5, now);
    const squeakEnv = ctx.createGain();
    squeakEnv.gain.setValueAtTime(0.0, now);
    squeakEnv.gain.linearRampToValueAtTime(0.22, now + 0.02);
    squeakEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    squeak.connect(spf);
    spf.connect(squeakEnv);
    squeakEnv.connect(master);
    squeak.start(now);

    // Pop — sharp pressure release
    const popLen = Math.floor(ctx.sampleRate * 0.03);
    const popBuf = ctx.createBuffer(1, popLen, ctx.sampleRate);
    const popData = popBuf.getChannelData(0);
    for (let i = 0; i < popLen; i++) {
      popData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / popLen, 1.0);
    }
    const pop = ctx.createBufferSource();
    pop.buffer = popBuf;
    const ppf = ctx.createBiquadFilter();
    ppf.type = "lowpass";
    ppf.frequency.setValueAtTime(900, now + 0.07);
    const popEnv = ctx.createGain();
    popEnv.gain.setValueAtTime(0.9, now + 0.07);
    popEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    pop.connect(ppf);
    ppf.connect(popEnv);
    popEnv.connect(master);
    pop.start(now + 0.07);

    // Air exhale — soft white noise trailing off
    const airLen = Math.floor(ctx.sampleRate * 0.35);
    const airBuf = ctx.createBuffer(1, airLen, ctx.sampleRate);
    const airData = airBuf.getChannelData(0);
    for (let i = 0; i < airLen; i++) {
      airData[i] = Math.random() * 2 - 1;
    }
    const air = ctx.createBufferSource();
    air.buffer = airBuf;
    const apf = ctx.createBiquadFilter();
    apf.type = "lowpass";
    apf.frequency.setValueAtTime(600, now + 0.09);
    const airEnv = ctx.createGain();
    airEnv.gain.setValueAtTime(0, now + 0.09);
    airEnv.gain.linearRampToValueAtTime(0.18, now + 0.12);
    airEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
    air.connect(apf);
    apf.connect(airEnv);
    airEnv.connect(master);
    air.start(now + 0.09);

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 700);
  } catch { /* ignore */ }
}

/**
 * Cart add — revolver cock MP3, falls back to chime if file unavailable.
 */
export function playCartAddSound(): void {
  const audio = new Audio("/assets/sounds/revolver-cock.mp3");
  audio.play().catch(() => _playCartAddChime());
}

function _playCartAddChime(): void {
  const ctx = getCtx();
  if (!ctx) return;

  try {
    // Master gain — keeps overall level polite
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, ctx.currentTime);
    master.connect(ctx.destination);

    const notes = [
      { freq: 1046.5, startOffset: 0,    peakGain: 0.22, decayEnd: 0.28 }, // C6
      { freq: 1318.5, startOffset: 0.075, peakGain: 0.16, decayEnd: 0.36 }, // E6
    ];

    notes.forEach(({ freq, startOffset, peakGain, decayEnd }) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Tiny pitch drop for warmth
      osc.frequency.exponentialRampToValueAtTime(freq * 0.995, ctx.currentTime + startOffset + decayEnd);

      env.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      env.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + startOffset + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + decayEnd);

      osc.connect(env);
      env.connect(master);

      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + decayEnd + 0.05);
    });

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 600);
  } catch {
    // Silently skip — audio is an enhancement, never a requirement
  }
}

/**
 * Seal stamp — three layers for the wax seal slamming down.
 *
 * Layer 1 (0ms):    Low filtered noise burst — the physical "impact"
 * Layer 2 (90ms):   Warm resonant A3 (220Hz) — the seal settling, blooms slowly
 * Layer 3 (140ms):  High shimmer (A5 + E6) — the gold catching light, long decay
 */
export function playSealStampSound(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const schedule = () => {
    try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.7, ctx.currentTime);
    master.connect(ctx.destination);

    const now = ctx.currentTime;

    // ── Layer 1: Impact thud ──────────────────────────────────────────────────
    {
      const bufLen = Math.floor(ctx.sampleRate * 0.12);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        // White noise shaped into an exponential decay
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.5);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buf;

      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.setValueAtTime(110, now);
      lpf.Q.setValueAtTime(1.2, now);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.9, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      noise.connect(lpf);
      lpf.connect(env);
      env.connect(master);
      noise.start(now);
    }

    // ── Layer 2: Warm resonant bloom ──────────────────────────────────────────
    {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now + 0.09); // A3

      env.gain.setValueAtTime(0, now + 0.09);
      env.gain.linearRampToValueAtTime(0.18, now + 0.19);   // slow bloom
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc.connect(env);
      env.connect(master);
      osc.start(now + 0.09);
      osc.stop(now + 1.15);
    }

    // ── Layer 3a: Shimmer — A5 (880Hz) ───────────────────────────────────────
    {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now + 0.14);

      env.gain.setValueAtTime(0, now + 0.14);
      env.gain.linearRampToValueAtTime(0.10, now + 0.22);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(env);
      env.connect(master);
      osc.start(now + 0.14);
      osc.stop(now + 1.45);
    }

    // ── Layer 3b: Shimmer — E6 (1318Hz) ──────────────────────────────────────
    {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1318.5, now + 0.16);

      env.gain.setValueAtTime(0, now + 0.16);
      env.gain.linearRampToValueAtTime(0.07, now + 0.23);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(env);
      env.connect(master);
      osc.start(now + 0.16);
      osc.stop(now + 1.25);
    }

    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1800);
    } catch {
      // Silently skip
    }
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(schedule).catch(() => { try { ctx.close(); } catch { /* ignore */ } });
  } else {
    schedule();
  }
}
