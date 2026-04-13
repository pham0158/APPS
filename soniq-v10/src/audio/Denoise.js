// ── RNNoise AI Denoiser ───────────────────────────────────────────────────────
// Lazy-loads RNNoise WASM from CDN, processes each channel at 16 kHz,
// then resamples back to the original sample rate.
// Falls back to Wiener spectral subtraction when WASM is unavailable.

const RNNOISE_JS_URL   = 'https://cdn.jsdelivr.net/npm/@jitsi/rnnoise-wasm@0.0.1/dist/rnnoise.js';
const RNNOISE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@jitsi/rnnoise-wasm@0.0.1/dist/rnnoise.wasm';
const RNNOISE_SR       = 16000; // RNNoise only processes 16 kHz audio
const RNNOISE_FRAME    = 480;   // exactly 480 samples per frame at 16 kHz
const RNNOISE_SCALE    = 32768; // int16 range expected by RNNoise

export default class Denoise {
  constructor() {
    this._module    = null;
    this._loaded    = false;
    this._available = false;
    this._loading   = false;
  }

  /** @returns {boolean} True once the WASM module is loaded and ready. */
  get isLoaded() { return this._loaded; }

  /** @returns {boolean} False if WASM failed to load or is unsupported. */
  get isAvailable() { return this._available; }

  /** @returns {boolean} True while loading is in progress. */
  get isLoading() { return this._loading; }

  /**
   * Lazy-load the RNNoise WASM module from CDN.
   * Safe to call multiple times — subsequent calls are no-ops.
   * @returns {Promise<void>}
   */
  async load() {
    if (this._loaded || this._loading) return;
    this._loading = true;

    try {
      await this._loadScript(RNNOISE_JS_URL);

      // Emscripten UMD exposes factory under various global names
      const candidates = ['createRNNoise', 'RNNoiseModule', 'Module', 'createModule'];
      let factory = null;
      for (const name of candidates) {
        if (typeof window[name] === 'function') { factory = window[name]; break; }
      }

      // ESM import fallback
      if (!factory) {
        try {
          const mod = await import(/* webpackIgnore: true */ RNNOISE_JS_URL);
          factory = mod.default || mod.createRNNoise || mod.Module;
        } catch (_) {}
      }

      if (typeof factory !== 'function') throw new Error('RNNoise factory not found');

      this._module = await factory({
        locateFile: (path) =>
          path.endsWith('.wasm') ? RNNOISE_WASM_URL
            : RNNOISE_JS_URL.replace('rnnoise.js', path),
      });

      if (typeof this._module._rnnoise_create !== 'function')
        throw new Error('RNNoise C API not found in module');

      this._loaded    = true;
      this._available = true;
      this._loading   = false;
      console.info('[Denoise] RNNoise WASM ready');
    } catch (err) {
      console.warn('[Denoise] RNNoise unavailable:', err.message);
      this._loaded    = false;
      this._available = false;
      this._loading   = false;
      this._module    = null;
    }
  }

  /**
   * Denoise an AudioBuffer using RNNoise (if available) or Wiener fallback.
   * Resamples to 16 kHz, processes each channel, resamples back.
   *
   * @param {AudioBuffer}   audioBuffer   Source buffer (any sample rate)
   * @param {AudioContext}  audioCtx      Live AudioContext for resample buffers
   * @param {function}      [onProgress]  Called with 0–1 progress fraction
   * @returns {Promise<AudioBuffer>}      Denoised buffer at original sample rate
   */
  async process(audioBuffer, audioCtx, onProgress) {
    if (this._available && this._module) {
      return this._processRNNoise(audioBuffer, audioCtx, onProgress);
    }
    return this._processWiener(audioBuffer, audioCtx);
  }

  // ── private ───────────────────────────────────────────────────────────────

  /** Resample an AudioBuffer to targetSR via OfflineAudioContext. */
  async _resample(buf, targetSR, audioCtx) {
    if (buf.sampleRate === targetSR) return buf;
    const len = Math.round(buf.length * targetSR / buf.sampleRate);
    const off = new OfflineAudioContext(buf.numberOfChannels, len, targetSR);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start(0);
    return off.startRendering();
  }

  /** Process one Float32 channel through RNNoise frame by frame. */
  async _processChannelRNN(data, onProgress) {
    const mod   = this._module;
    const inPtr = mod._malloc(RNNOISE_FRAME * 4);
    const ouPtr = mod._malloc(RNNOISE_FRAME * 4);
    const st    = mod._rnnoise_create(0);
    const out   = new Float32Array(data.length);
    const inIdx = inPtr >> 2;
    const ouIdx = ouPtr >> 2;
    const total = Math.ceil(data.length / RNNOISE_FRAME);

    for (let f = 0; f * RNNOISE_FRAME < data.length; f++) {
      const base = f * RNNOISE_FRAME;
      for (let j = 0; j < RNNOISE_FRAME; j++)
        mod.HEAPF32[inIdx + j] = (data[base + j] || 0) * RNNOISE_SCALE;

      mod._rnnoise_process_frame(st, ouPtr, inPtr);

      for (let j = 0; j < RNNOISE_FRAME && base + j < data.length; j++)
        out[base + j] = mod.HEAPF32[ouIdx + j] / RNNOISE_SCALE;

      // Yield every 80 frames (~2.4 s of audio per yield)
      if (f % 80 === 79) {
        onProgress && onProgress((f + 1) / total);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    mod._rnnoise_destroy(st);
    mod._free(inPtr);
    mod._free(ouPtr);
    return out;
  }

  async _processRNNoise(buf, audioCtx, onProgress) {
    const origSR = buf.sampleRate;
    const nch    = buf.numberOfChannels;

    const buf16  = await this._resample(buf, RNNOISE_SR, audioCtx);
    const processed = [];
    for (let c = 0; c < nch; c++) {
      const data   = buf16.getChannelData(c).slice();
      const result = await this._processChannelRNN(data, p =>
        onProgress && onProgress((c + p) / nch)
      );
      processed.push(result);
    }

    const out16 = audioCtx.createBuffer(nch, buf16.length, RNNOISE_SR);
    for (let c = 0; c < nch; c++) out16.copyToChannel(processed[c], c);

    return this._resample(out16, origSR, audioCtx);
  }

  /** Wiener spectral subtraction fallback (simple, no WASM required). */
  async _processWiener(buf, audioCtx) {
    const sr         = buf.sampleRate;
    const profileLen = Math.min(Math.floor(0.2 * sr), buf.length);
    const out        = audioCtx.createBuffer(buf.numberOfChannels, buf.length, sr);

    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src  = buf.getChannelData(ch);
      const dst  = out.getChannelData(ch);
      dst.set(src);

      let nPow = 0;
      for (let i = 0; i < profileLen; i++) nPow += dst[i] * dst[i];
      nPow /= profileLen;
      const nAmp = Math.sqrt(nPow) * 2.5;

      for (let i = 0; i < dst.length; i++) {
        const s = Math.abs(dst[i]);
        dst[i] *= Math.max(0, 1 - nAmp / Math.max(s, 1e-10));
      }
    }
    return out;
  }

  /** Dynamically inject a <script> tag and resolve when loaded. */
  _loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
      const s    = document.createElement('script');
      s.src      = url;
      s.onload   = resolve;
      s.onerror  = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(s);
    });
  }
}
