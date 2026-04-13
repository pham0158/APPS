// ── Mid/Side Stereo Widener ───────────────────────────────────────────────────
// Live chain: passthrough GainNode (true M/S requires AudioWorklet — future phase).
// Export path: processBuffer() applies M/S matrix directly to an AudioBuffer.
//
// Width scale:
//   0   = full mono   (side = 0)
//   1.0 = original    (identity, stereoWidth slider = 100)
//   2.0 = double wide (stereoWidth slider = 200)
//   3.0 = extreme     (max value accepted)

export default class StereoWidth {
  /**
   * @param {AudioContext} audioCtx
   */
  constructor(audioCtx) {
    this._ctx   = audioCtx;
    this._width = 1.0;

    // Passthrough for the live node chain
    this._gain = audioCtx.createGain();
    this._gain.gain.value = 1.0;
  }

  /**
   * Insert the width node between inputNode and outputNode.
   * @param {AudioNode} inputNode
   * @param {AudioNode} outputNode
   */
  connect(inputNode, outputNode) {
    inputNode.connect(this._gain);
    this._gain.connect(outputNode);
  }

  /**
   * Set the stereo width multiplier.
   * Live chain remains a passthrough; buffer exports use processBuffer().
   * @param {number} value  0–3 (1.0 = identity)
   */
  setWidth(value) {
    this._width = Math.max(0, Math.min(3, value));
  }

  /** @returns {number} Current width value (0–3) */
  get width() { return this._width; }

  /**
   * Apply M/S stereo widening to an AudioBuffer in place.
   * Used during offline export rendering.
   * Formula: M = (L+R)·0.5,  S = (L−R)·0.5·width
   *          outL = M+S,  outR = M−S
   * @param {AudioBuffer} buf
   */
  processBuffer(buf) {
    if (buf.numberOfChannels < 2) return;
    const w = this._width;
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    for (let i = 0; i < L.length; i++) {
      const m = (L[i] + R[i]) * 0.5;
      const s = (L[i] - R[i]) * 0.5 * w;
      L[i] = m + s;
      R[i] = m - s;
    }
  }

  /** Reset width to 1.0 (identity). */
  reset() { this._width = 1.0; }
}
