// ── Dynamics Compressor ───────────────────────────────────────────────────────

const DEFAULTS = {
  threshold: -18,  // dBFS
  ratio:       4,  // N:1
  attack:     10,  // ms
  release:   100,  // ms
  knee:        6,  // dB
};

export default class Compressor {
  /**
   * @param {AudioContext} audioCtx
   */
  constructor(audioCtx) {
    this._ctx = audioCtx;

    this.node = audioCtx.createDynamicsCompressor();
    this.node.threshold.value = DEFAULTS.threshold;
    this.node.ratio.value     = DEFAULTS.ratio;
    this.node.attack.value    = DEFAULTS.attack  / 1000;
    this.node.release.value   = DEFAULTS.release / 1000;
    this.node.knee.value      = DEFAULTS.knee;
  }

  /**
   * Insert the compressor between inputNode and outputNode.
   * @param {AudioNode} inputNode
   * @param {AudioNode} outputNode
   */
  connect(inputNode, outputNode) {
    inputNode.connect(this.node);
    this.node.connect(outputNode);
  }

  /** @param {number} db  Threshold in dBFS */
  setThreshold(db)       { this.node.threshold.value = db; }
  /** @param {number} ratio  Compression ratio (e.g. 4 for 4:1) */
  setRatio(ratio)        { this.node.ratio.value     = ratio; }
  /** @param {number} seconds  Attack time in seconds */
  setAttack(seconds)     { this.node.attack.value    = seconds; }
  /** @param {number} seconds  Release time in seconds */
  setRelease(seconds)    { this.node.release.value   = seconds; }

  /**
   * @returns {{ threshold, ratio, attack, release, knee }}
   *   Current settings (attack/release in seconds)
   */
  getValues() {
    return {
      threshold: this.node.threshold.value,
      ratio:     this.node.ratio.value,
      attack:    this.node.attack.value,
      release:   this.node.release.value,
      knee:      this.node.knee.value,
    };
  }

  /** Reset to default compressor settings. */
  reset() {
    this.node.threshold.value = DEFAULTS.threshold;
    this.node.ratio.value     = DEFAULTS.ratio;
    this.node.attack.value    = DEFAULTS.attack  / 1000;
    this.node.release.value   = DEFAULTS.release / 1000;
    this.node.knee.value      = DEFAULTS.knee;
  }
}
