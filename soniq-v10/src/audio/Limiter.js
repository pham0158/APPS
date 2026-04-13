// ── True-peak Limiter ─────────────────────────────────────────────────────────
// Implemented as a hard-knee DynamicsCompressorNode (ratio 20:1, fast attack).
// When disabled the node is configured as a unity-gain passthrough.

const CEILING_DEFAULT = -1; // dBFS

export default class Limiter {
  /**
   * @param {AudioContext} audioCtx
   */
  constructor(audioCtx) {
    this._ctx     = audioCtx;
    this._enabled = true;
    this._ceiling = CEILING_DEFAULT;

    this.node = audioCtx.createDynamicsCompressor();
    this._applyEnabled(true);
  }

  /**
   * Insert the limiter between inputNode and outputNode.
   * @param {AudioNode} inputNode
   * @param {AudioNode} outputNode
   */
  connect(inputNode, outputNode) {
    inputNode.connect(this.node);
    this.node.connect(outputNode);
  }

  /**
   * Enable or bypass the limiter.
   * Disabled state: threshold=0, ratio=1 (unity passthrough).
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    this._applyEnabled(enabled);
  }

  /**
   * Set the limiting ceiling.
   * @param {number} db  Threshold in dBFS (e.g. -1)
   */
  setCeiling(db) {
    this._ceiling = db;
    if (this._enabled) this.node.threshold.value = db;
  }

  /** @returns {{ enabled, ceiling }} */
  getValues() {
    return { enabled: this._enabled, ceiling: this._ceiling };
  }

  /** Reset to default: enabled, ceiling = −1 dBFS. */
  reset() {
    this._ceiling = CEILING_DEFAULT;
    this.setEnabled(true);
  }

  // ── private ───────────────────────────────────────────────────────────────

  _applyEnabled(on) {
    if (on) {
      this.node.threshold.value = this._ceiling;
      this.node.ratio.value     = 20;
      this.node.attack.value    = 0.001;
      this.node.release.value   = 0.05;
      this.node.knee.value      = 0;
    } else {
      this.node.threshold.value = 0;
      this.node.ratio.value     = 1;
      this.node.attack.value    = 0;
      this.node.release.value   = 0;
      this.node.knee.value      = 0;
    }
  }
}
