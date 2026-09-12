/**
 * Soothing acoustic sound effects engine using Web Audio API.
 * Synthesizes pure procedural audio with zero external asset dependencies,
 * zero network requests, and zero latency. Works completely offline.
 * Respects the global soundMuted preference in useCozyStore.
 */

import { useCozyStore } from '@/store/useCozyStore';

export type SoundEffect =
  | 'cozy_chime'
  | 'wooden_click'
  | 'paper_rustle'
  | 'tea_pour'
  | 'camera_shutter';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Checks if sound effects are globally muted in Cozy store or SSR.
 */
export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return useCozyStore.getState().soundMuted ?? false;
  } catch {
    return false;
  }
}

/**
 * 1. Cozy Chime: Pentatonic sine harmonics (C5, E5, G5) with gentle attack and warm decay.
 * Perfect for cheers, gifts, achievements, and positive village milestones.
 */
export function playCozyChime() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startTime = ctx.currentTime + idx * 0.08;
      const duration = 0.55;

      osc.frequency.setValueAtTime(freq, startTime);

      // Warm envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  } catch {
    // Graceful fallback if blocked by browser policy
  }
}

/**
 * 2. Wooden Click: Resonant wooden tap (180Hz -> 65Hz pitch sweep) with lowpass filter.
 * Simulates placing physical wooden blocks, furniture, stickers, or tactile switches.
 */
export function playWoodenClick() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const now = ctx.currentTime;
    const duration = 0.055;

    // Pitch drops quickly like tapping dense oak
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    // Graceful fallback
  }
}

/**
 * 3. Paper Rustle: Filtered noise sweep (bandpass 900Hz -> 2400Hz).
 * Evokes unfolding an envelope letter, opening a journal, or unrolling a scroll.
 */
export function playPaperRustle() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const bufferSize = ctx.sampleRate * 0.16;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate soft pink/white noise
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 2.5; // Gain
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.linearRampToValueAtTime(2200, now + 0.15);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
  } catch {
    // Graceful fallback
  }
}

/**
 * 4. Tea Pour: Dual modulated gentle bubbling sine tones with soft trickle.
 * Invoked when sending a Warm Brew, resting by the tea pavilion, or taking a mindful pause.
 */
export function playTeaPour() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.42;

    // Dual soothing water droplets/trickles
    [460, 580].forEach((baseFreq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const offset = now + i * 0.07;
      osc.frequency.setValueAtTime(baseFreq, offset);
      osc.frequency.linearRampToValueAtTime(baseFreq + 70, offset + 0.18);
      osc.frequency.linearRampToValueAtTime(baseFreq - 30, offset + duration);

      gain.gain.setValueAtTime(0, offset);
      gain.gain.linearRampToValueAtTime(0.07, offset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(offset);
      osc.stop(offset + duration + 0.02);
    });
  } catch {
    // Graceful fallback
  }
}

/**
 * 5. Camera Shutter: Soft rangefinder mechanical double-click (opening and closing curtains).
 * Soft, vintage tactile shutter click without harsh digital noise.
 */
export function playCameraShutter() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Two rapid soft mechanical clicks: shutter release (now) and curtain return (now + 0.065s)
    [0, 0.065].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const startTime = now + delay;
      const duration = 0.035;

      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 0 ? 320 : 260, startTime);
      osc.frequency.exponentialRampToValueAtTime(80, startTime + duration);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, startTime);
      filter.Q.setValueAtTime(2.5, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.09, startTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    });
  } catch {
    // Graceful fallback
  }
}

/**
 * Generic sound player for named effects.
 */
export function playSound(effect: SoundEffect) {
  switch (effect) {
    case 'cozy_chime':
      return playCozyChime();
    case 'wooden_click':
      return playWoodenClick();
    case 'paper_rustle':
      return playPaperRustle();
    case 'tea_pour':
      return playTeaPour();
    case 'camera_shutter':
      return playCameraShutter();
  }
}
