// ── AudioEngine ───────────────────────────────────────────────────────────────
// Central audio context manager and live master bus.
// Master bus chain:
//   masterInput → EQ → Compressor → StereoWidth (passthrough) → Limiter
//               → OutputGain → analyserTap → destination

import EQ           from './EQ.js';
import Compressor   from './Compressor.js';
import StereoWidth  from './StereoWidth.js';
import Limiter      from './Limiter.js';

export default class AudioEngine {
  constructor() {
    // Create the AudioContext in suspended state — must be resumed on a user gesture
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this._ctx = new Ctx();

    // ── Master bus node instances ──────────────────────────────────────────
    this.eqNodes     = new EQ(this._ctx);
    this.compressor  = new Compressor(this._ctx);
    this.stereoWidth = new StereoWidth(this._ctx);
    this.limiter     = new Limiter(this._ctx);

    // Output gain (GainNode, not wrapped in a class — simple scalar)
    this.outputGain = this._ctx.createGain();
    this.outputGain.gain.value = 1.0;

    // Analyser tap wired after output gain so visualisers always see the
    // post-master signal without affecting the audio path
    this._analyserTap = this._ctx.createGain();
    this._analyserTap.gain.value = 1.0;

    // Input passthrough — everything that wants to reach the master bus
    // connects here (stems, playback sources, etc.)
    this._masterInput = this._ctx.createGain();
    this._masterInput.gain.value = 1.0;

    // ── Wire the master bus chain ──────────────────────────────────────────
    // masterInput → EQ chain
    this.eqNodes.connect(this._masterInput, this._compressorInput());
    // compressor
    this.compressor.connect(this._compressorInput(), this._stereoWidthInput());
    // stereo width (passthrough GainNode)
    this.stereoWidth.connect(this._stereoWidthInput(), this._limiterInput());
    // limiter
    this.limiter.connect(this._limiterInput(), this.outputGain);
    // output gain → analyser tap → destination
    this.outputGain.connect(this._analyserTap);
    this._analyserTap.connect(this._ctx.destination);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** @returns {AudioContext} */
  get context() { return this._ctx; }

  /**
   * The entry point for all audio that should pass through the master bus.
   * Connect stem/playback sources here.
   * @returns {GainNode}
   */
  get masterInput() { return this._masterInput; }

  /** @returns {AudioDestinationNode} */
  get destination() { return this._ctx.destination; }

  /**
   * Resume the AudioContext. Must be called from within a user-gesture handler
   * (click, keydown, etc.) to satisfy browser autoplay policy.
   * @returns {Promise<void>}
   */
  async resume() {
    if (this._ctx.state === 'suspended') await this._ctx.resume();
  }

  /**
   * Suspend the AudioContext to conserve battery/CPU when idle.
   * @returns {Promise<void>}
   */
  async suspend() {
    if (this._ctx.state === 'running') await this._ctx.suspend();
  }

  /**
   * Create an AnalyserNode pre-configured for spectrum/LUFS display and
   * connect it to the post-master analyser tap (so it sees processed audio).
   *
   * @param {{ fftSize?: number, smoothing?: number }} [options]
   * @returns {AnalyserNode}
   */
  createAnalyser({ fftSize = 4096, smoothing = 0.8 } = {}) {
    const node = this._ctx.createAnalyser();
    node.fftSize                = fftSize;
    node.smoothingTimeConstant  = smoothing;
    this._analyserTap.connect(node);
    return node;
  }

  /**
   * Set the master output gain (linear, not dB).
   * Use dbToGain() from utils/format.js to convert dB → linear first.
   * @param {number} linearGain
   */
  setOutputGain(linearGain) {
    this.outputGain.gain.value = linearGain;
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  // Each returns the GainNode that acts as the input to the corresponding stage.
  // By creating a dedicated input GainNode for each stage we can safely call
  // .connect() without causing feedback loops from cross-wiring.

  _compressorInput() {
    if (!this.__compIn) {
      this.__compIn = this._ctx.createGain();
      this.__compIn.gain.value = 1.0;
    }
    return this.__compIn;
  }

  _stereoWidthInput() {
    if (!this.__widthIn) {
      this.__widthIn = this._ctx.createGain();
      this.__widthIn.gain.value = 1.0;
    }
    return this.__widthIn;
  }

  _limiterInput() {
    if (!this.__limIn) {
      this.__limIn = this._ctx.createGain();
      this.__limIn.gain.value = 1.0;
    }
    return this.__limIn;
  }
}
