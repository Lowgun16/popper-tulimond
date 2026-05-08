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

/**
 * Cart add chime — two ascending sine tones, soft and bright.
 * Sounds like being handed a gold coin.
 */
export function playCartAddSound(): void {
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
