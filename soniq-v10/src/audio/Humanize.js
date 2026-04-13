// ── Humanizer ─────────────────────────────────────────────────────────────────
// Applies subtle imperfections to an AudioBuffer to make AI-generated audio
// sound more like a human performance:
//   - velocity micro-variation (±6% gain per ~10 ms block)
//   - wow/flutter (slow sinusoidal speed variation via sample interpolation)
// Live-playback imperfections (LFO pitch drift, timing jitter) are applied
// directly to the BufferSourceNode in StemTab and are not part of this class.

export default class Humanize {
  constructor() {}

  /**
   * Apply all humanization effects to an AudioBuffer (buffer-domain).
   * Returns a new AudioBuffer; the source is not mutated.
   *
   * @param {AudioBuffer}  audioBuffer  Source buffer
   * @param {AudioContext} audioCtx     Live context used to create the output buffer
   * @param {number}       intensity    0–1 (maps to 0–100% in the UI)
   * @returns {Promise<AudioBuffer>}
   */
  async process(audioBuffer, audioCtx, intensity) {
    const nch = audioBuffer.numberOfChannels;
    const sr  = audioBuffer.sampleRate;
    const out = audioCtx.createBuffer(nch, audioBuffer.length, sr);

    for (let c = 0; c < nch; c++) {
      const src = audioBuffer.getChannelData(c).slice(); // copy — don't mutate source
      this.applyVelocityVariations(src, intensity);
      this.applyWowFlutter(src, sr, intensity);
      out.copyToChannel(src, c);
    }

    return out;
  }

  /**
   * Apply micro-timing variations.
   * In the offline buffer domain, timing is effectively encoded as a phase shift
   * per block (re-aligns blocks by an intensity-scaled jitter offset).
   * Lightweight: shifts each ~10 ms block by ±1–2 samples at full intensity.
   *
   * @param {Float32Array} data       Channel data (mutated in place)
   * @param {number}       intensity  0–1
   */
  applyTimingVariations(data, intensity) {
    const blockSize = 441; // ~10 ms @ 44.1 kHz
    const maxShift  = Math.round(intensity * 2); // ±2 samples at full intensity
    if (maxShift === 0) return;

    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += blockSize) {
      const shift = Math.round((Math.random() - 0.5) * 2 * maxShift);
      const end   = Math.min(i + blockSize, data.length);
      for (let j = i; j < end; j++) {
        const src = j + shift;
        out[j] = (src >= 0 && src < data.length) ? data[src] : 0;
      }
    }
    data.set(out);
  }

  /**
   * Apply micro-pitch variations via subtle sample-rate modulation.
   * Uses the same sinusoidal approach as wow/flutter but at a faster rate
   * (5–8 Hz) and shallower depth to simulate vibrato.
   *
   * @param {Float32Array} data       Channel data (mutated in place)
   * @param {number}       sr         Sample rate
   * @param {number}       intensity  0–1
   */
  applyPitchVariations(data, sr, intensity) {
    const speed = 5 + Math.random() * 3; // 5–8 Hz vibrato
    const depth = intensity * 0.001;     // subtle — up to 0.1% pitch deviation
    if (depth === 0) return;

    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const mod  = 1 + depth * Math.sin(2 * Math.PI * speed * (i / sr));
      const si   = Math.floor(i * mod);
      const frac = i * mod - si;
      const a    = data[Math.min(si,     data.length - 1)];
      const b    = data[Math.min(si + 1, data.length - 1)];
      out[i] = a + frac * (b - a);
    }
    data.set(out);
  }

  /**
   * Apply per-block gain (velocity) micro-variation.
   * Each ~10 ms block is scaled by a random factor within ±6% of 1.0.
   *
   * @param {Float32Array} data       Channel data (mutated in place)
   * @param {number}       intensity  0–1
   */
  applyVelocityVariations(data, intensity) {
    const blockSize = 441; // ~10 ms @ 44.1 kHz
    for (let i = 0; i < data.length; i += blockSize) {
      const vel = 1 + (Math.random() - 0.5) * 2 * intensity * 0.06;
      const end = Math.min(i + blockSize, data.length);
      for (let j = i; j < end; j++) data[j] *= vel;
    }
  }

  /**
   * Apply wow/flutter: slow sinusoidal speed variation via sample interpolation.
   * Simulates the speed instability of analog tape / vinyl.
   *
   * @param {Float32Array} data       Channel data (mutated in place)
   * @param {number}       sr         Sample rate
   * @param {number}       intensity  0–1
   */
  applyWowFlutter(data, sr, intensity) {
    const speed = 0.3 + Math.random() * 0.4; // 0.3–0.7 Hz
    const depth = intensity * 0.003;          // up to 0.3% speed deviation
    if (depth === 0) return;

    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const mod  = 1 + depth * Math.sin(2 * Math.PI * speed * (i / sr));
      const si   = Math.floor(i * mod);
      const frac = i * mod - si;
      const a    = data[Math.min(si,     data.length - 1)];
      const b    = data[Math.min(si + 1, data.length - 1)];
      out[i] = a + frac * (b - a);
    }
    data.set(out);
  }
}
