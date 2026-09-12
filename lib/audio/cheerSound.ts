/**
 * Gentle cozy chime audio synthesis using Web Audio API.
 * Uses soft sine wave pentatonic harmonics for a warm, soothing cheer chime.
 * Safe across all browsers, gracefully no-ops in SSR or test environments.
 */
export function playCozyChime() {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Warm, comforting pentatonic notes: C5 (523Hz), E5 (659Hz), G5 (784Hz)
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startTime = ctx.currentTime + idx * 0.08;
      const duration = 0.55;

      osc.frequency.setValueAtTime(freq, startTime);

      // Soft envelope: subtle attack, gentle exponential decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  } catch {
    // AudioContext blocked by browser autoplay policy or unsupported - silent fallback
  }
}
