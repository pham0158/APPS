// ── 8-band parametric EQ ─────────────────────────────────────────────────────
// Chain: HPF(80Hz) → Sub(60Hz shelf) → Bass(200Hz peak) → Mid(1kHz peak)
//        → Highs(8kHz peak) → DeMud(300Hz notch) → Presence(3.5kHz peak)
//        → Air(12kHz shelf)

const DEFAULTS = {
  sub:      0,   // dB, lowshelf  @ 60 Hz
  bass:     0,   // dB, peaking   @ 200 Hz
  mid:      0,   // dB, peaking   @ 1 kHz
  highs:    0,   // dB, peaking   @ 8 kHz
  presence: 0,   // dB, peaking   @ 3.5 kHz
  air:      0,   // dB, highshelf @ 12 kHz
  deMud:    0,   // 0–100 (→ 0 to −10 dB notch @ 300 Hz)
};

export default class EQ {
  /**
   * @param {AudioContext} audioCtx
   */
  constructor(audioCtx) {
    this._ctx = audioCtx;

    // 1. HPF — 80 Hz rumble cut (not gain-adjustable; always active)
    this.highPass = audioCtx.createBiquadFilter();
    this.highPass.type = 'highpass';
    this.highPass.frequency.value = 80;
    this.highPass.Q.value = 0.707;

    // 2. Sub Bass — lowshelf @ 60 Hz
    this.subBass = audioCtx.createBiquadFilter();
    this.subBass.type = 'lowshelf';
    this.subBass.frequency.value = 60;
    this.subBass.gain.value = DEFAULTS.sub;

    // 3. Bass — peaking @ 200 Hz
    this.bass = audioCtx.createBiquadFilter();
    this.bass.type = 'peaking';
    this.bass.frequency.value = 200;
    this.bass.Q.value = 1.0;
    this.bass.gain.value = DEFAULTS.bass;

    // 4. Mid — peaking @ 1 kHz
    this.mid = audioCtx.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 1.0;
    this.mid.gain.value = DEFAULTS.mid;

    // 5. Highs — peaking @ 8 kHz
    this.highs = audioCtx.createBiquadFilter();
    this.highs.type = 'peaking';
    this.highs.frequency.value = 8000;
    this.highs.Q.value = 1.0;
    this.highs.gain.value = DEFAULTS.highs;

    // 6. De-Mud — peaking notch @ 300 Hz (negative gain, 0–100 → 0 to −10 dB)
    this.deMud = audioCtx.createBiquadFilter();
    this.deMud.type = 'peaking';
    this.deMud.frequency.value = 300;
    this.deMud.Q.value = 1.5;
    this.deMud.gain.value = 0;

    // 7. Presence — peaking @ 3.5 kHz
    this.presence = audioCtx.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 3500;
    this.presence.Q.value = 1.2;
    this.presence.gain.value = DEFAULTS.presence;

    // 8. Air — highshelf @ 12 kHz
    this.air = audioCtx.createBiquadFilter();
    this.air.type = 'highshelf';
    this.air.frequency.value = 12000;
    this.air.gain.value = DEFAULTS.air;

    // Wire nodes internally
    this.highPass.connect(this.subBass);
    this.subBass.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.highs);
    this.highs.connect(this.deMud);
    this.deMud.connect(this.presence);
    this.presence.connect(this.air);

    this._deMudPct = 0; // stored 0–100 for getValues()
  }

  /**
   * Insert the EQ chain between inputNode and outputNode.
   * @param {AudioNode} inputNode
   * @param {AudioNode} outputNode
   */
  connect(inputNode, outputNode) {
    inputNode.connect(this.highPass);
    this.air.connect(outputNode);
  }

  /** @param {number} db */
  setSubBass(db)    { this.subBass.gain.value   = db; }
  /** @param {number} db */
  setBass(db)       { this.bass.gain.value       = db; }
  /** @param {number} db */
  setMid(db)        { this.mid.gain.value         = db; }
  /** @param {number} db */
  setHighs(db)      { this.highs.gain.value       = db; }
  /** @param {number} db */
  setPresence(db)   { this.presence.gain.value    = db; }
  /** @param {number} db */
  setAir(db)        { this.air.gain.value          = db; }

  /**
   * Set the de-mud notch amount.
   * @param {number} pct  0–100 maps to 0 → −10 dB at 300 Hz
   */
  setDeMud(pct) {
    this._deMudPct = pct;
    this.deMud.gain.value = -(pct / 100) * 10;
  }

  /** @returns {{ sub, bass, mid, highs, presence, air, deMud }} current dB values */
  getValues() {
    return {
      sub:      this.subBass.gain.value,
      bass:     this.bass.gain.value,
      mid:      this.mid.gain.value,
      highs:    this.highs.gain.value,
      presence: this.presence.gain.value,
      air:      this.air.gain.value,
      deMud:    this._deMudPct,
    };
  }

  /** Reset all bands to 0 dB (flat). */
  reset() {
    this.setSubBass(DEFAULTS.sub);
    this.setBass(DEFAULTS.bass);
    this.setMid(DEFAULTS.mid);
    this.setHighs(DEFAULTS.highs);
    this.setPresence(DEFAULTS.presence);
    this.setAir(DEFAULTS.air);
    this.setDeMud(DEFAULTS.deMud);
  }
}
