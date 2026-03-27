/**
 * Procedural ambient audio using Web Audio API.
 * Generates a soft, evolving pad — no external audio files needed.
 * Designed to feel meditative and warm, not intrusive.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isPlaying = false;
let nodes: AudioNode[] = [];

const FADE_DURATION = 3; // seconds
const MASTER_VOLUME = 0.08; // very subtle

// Warm chord frequencies (C major 7th, spread across octaves)
const FREQUENCIES = [130.81, 164.81, 196.0, 246.94, 329.63];

export function startAmbient(): void {
  if (isPlaying) return;

  try {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(MASTER_VOLUME, audioCtx.currentTime + FADE_DURATION);
    masterGain.connect(audioCtx.destination);

    FREQUENCIES.forEach((freq, i) => {
      if (!audioCtx || !masterGain) return;

      // Main oscillator — soft sine wave
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      // Slow frequency drift for organic feel
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.05 + i * 0.02, audioCtx.currentTime);
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(freq * 0.003, audioCtx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      // Individual gain with slight variation
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.15 + i * 0.03, audioCtx.currentTime);

      // Gentle low-pass filter to keep it warm
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + i * 100, audioCtx.currentTime);
      filter.Q.setValueAtTime(0.5, audioCtx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start();

      nodes.push(osc, lfo, lfoGain, gain, filter);
    });

    isPlaying = true;
  } catch {
    // Web Audio API not available — fail silently
  }
}

export function stopAmbient(): void {
  if (!isPlaying || !audioCtx || !masterGain) return;

  // Fade out
  masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + FADE_DURATION);

  // Clean up after fade
  const ctx = audioCtx;
  setTimeout(() => {
    nodes.forEach((node) => {
      try { node.disconnect(); } catch { /* ignore */ }
    });
    nodes = [];
    ctx.close().catch(() => {});
    audioCtx = null;
    masterGain = null;
    isPlaying = false;
  }, FADE_DURATION * 1000 + 200);
}

export function isAmbientPlaying(): boolean {
  return isPlaying;
}
