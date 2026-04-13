// ── LUFSMeter ─────────────────────────────────────────────────────────────────
// Displays integrated LUFS, short-term, LRA, true peak, and a bar-fill meter.
// Also drives L/R peak meter bars via rAF.

export default class LUFSMeter {
  constructor() {
    this._rafId       = null;
    this._peakDecayL  = 0;
    this._peakDecayR  = 0;
    this._lufsHistory = [];
    this._histLen     = 15;
  }

  /**
   * Set static values from an offline analysis result.
   * @param {{ integrated: number, shortTerm: number, lra: number, truePeak: number }} lufsData
   */
  update(lufsData) {
    const { integrated, shortTerm, lra, truePeak } = lufsData;
    this._setText('lufsIntegrated', integrated?.toFixed(1) ?? '—');
    this._setText('lufsLRA',        lra?.toFixed(1)        ?? '—');
    this._setText('lufsTruePeak',   truePeak?.toFixed(1)   ?? '—');

    // Colour-code the short-term number
    const el = document.getElementById('lufsShortTerm');
    if (el) {
      el.textContent = shortTerm != null && isFinite(shortTerm)
        ? shortTerm.toFixed(1) : '—';
      el.className = 'lufs-number';
      if (shortTerm > -10)     el.classList.add('hot');
      else if (shortTerm > -14) el.classList.add('warn');
      else                      el.classList.add('good');
    }

    if (shortTerm != null) {
      const pct = Math.max(0, Math.min(100, ((shortTerm + 30) / 24) * 100));
      const bar = document.getElementById('lufsBarFill');
      if (bar) bar.style.width = pct + '%';
    }
  }

  /**
   * Start live monitoring using an AnalyserNode (rAF loop).
   * Updates short-term LUFS display and bar fill in real time.
   * @param {AnalyserNode}  analyserNode
   * @param {AnalyserNode}  [analyserL]   Optional separate L analyser for peak meters
   * @param {AnalyserNode}  [analyserR]   Optional separate R analyser for peak meters
   */
  startMonitoring(analyserNode, analyserL, analyserR) {
    this.stopMonitoring();
    const timeData = new Float32Array(analyserNode.fftSize);
    this._lufsHistory = [];

    // Peak meter data arrays
    const dataL = analyserL ? new Float32Array(analyserL.fftSize) : null;
    const dataR = analyserR ? new Float32Array(analyserR.fftSize) : null;

    const tick = () => {
      this._rafId = requestAnimationFrame(tick);

      // ── LUFS short-term ─────────────────────────────────────────────────────
      analyserNode.getFloatTimeDomainData(timeData);
      let sq = 0;
      for (let i = 0; i < timeData.length; i++) sq += timeData[i] * timeData[i];
      const rms  = Math.sqrt(sq / timeData.length);
      const lufs = -0.691 + 10 * Math.log10(Math.max(rms * rms, 1e-10));
      this._lufsHistory.push(lufs);
      if (this._lufsHistory.length > this._histLen) this._lufsHistory.shift();
      const avg = this._lufsHistory.reduce((a, b) => a + b, 0) / this._lufsHistory.length;

      const el = document.getElementById('lufsShortTerm');
      if (el) {
        el.textContent = isFinite(avg) ? avg.toFixed(1) : '—';
        el.className = 'lufs-number';
        if (avg > -10)      el.classList.add('hot');
        else if (avg > -14) el.classList.add('warn');
        else                el.classList.add('good');
      }
      const pct = Math.max(0, Math.min(100, ((avg + 30) / 24) * 100));
      const bar = document.getElementById('lufsBarFill');
      if (bar) bar.style.width = pct + '%';

      // ── Peak meters ──────────────────────────────────────────────────────────
      if (analyserL && dataL) {
        analyserL.getFloatTimeDomainData(dataL);
        let mL = 0;
        for (let i = 0; i < dataL.length; i++) { const a = Math.abs(dataL[i]); if (a > mL) mL = a; }
        this._peakDecayL = Math.max(mL, this._peakDecayL * 0.88);
        const peakL = document.getElementById('peakL');
        if (peakL) peakL.style.height = Math.min(100, this._peakDecayL * 130) + '%';
      }
      if (analyserR && dataR) {
        analyserR.getFloatTimeDomainData(dataR);
        let mR = 0;
        for (let i = 0; i < dataR.length; i++) { const a = Math.abs(dataR[i]); if (a > mR) mR = a; }
        this._peakDecayR = Math.max(mR, this._peakDecayR * 0.88);
        const peakR = document.getElementById('peakR');
        if (peakR) peakR.style.height = Math.min(100, this._peakDecayR * 130) + '%';
      }
    };
    tick();
  }

  /** Stop live monitoring. */
  stopMonitoring() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._lufsHistory = [];
    this._peakDecayL  = 0;
    this._peakDecayR  = 0;
  }

  /** Reset all displayed values to dash/zero. */
  reset() {
    this.stopMonitoring();
    ['lufsIntegrated','lufsShortTerm','lufsLRA','lufsTruePeak'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = '—'; el.className = 'lufs-number'; }
    });
    const bar = document.getElementById('lufsBarFill');
    if (bar) bar.style.width = '0%';
    const peakL = document.getElementById('peakL');
    const peakR = document.getElementById('peakR');
    if (peakL) peakL.style.height = '0%';
    if (peakR) peakR.style.height = '0%';
  }

  // ── private ─────────────────────────────────────────────────────────────────
  _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}
