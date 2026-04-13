// ── Spectrum ──────────────────────────────────────────────────────────────────
// Real-time FFT spectrum analyser canvas renderer.
// Log-scale frequency axis (20 Hz – 20 kHz), bars coloured by region.

export default class Spectrum {
  /**
   * @param {string} canvasId  ID of the <canvas> element
   */
  constructor(canvasId) {
    this._canvasId  = canvasId;
    this._rafId     = null;
    this._sampleRate = 44100;
  }

  /** @returns {HTMLCanvasElement|null} */
  get canvas() { return document.getElementById(this._canvasId); }

  /**
   * Draw the idle grid (no signal).
   */
  clear() {
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth || 800;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0d0d15';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    const msg = document.getElementById('spectrumMsg');
    if (msg) msg.style.display = '';
  }

  /**
   * Start the rAF animation loop driven by an AnalyserNode.
   * @param {AnalyserNode} analyserNode
   */
  start(analyserNode) {
    this.stop();
    this._sampleRate = analyserNode.context.sampleRate;
    const canvas   = this.canvas;
    if (!canvas) return;
    const freqData = new Float32Array(analyserNode.frequencyBinCount);
    const msg      = document.getElementById('spectrumMsg');
    if (msg) msg.style.display = 'none';

    const draw = () => {
      this._rafId = requestAnimationFrame(draw);
      analyserNode.getFloatFrequencyData(freqData);

      const W = canvas.offsetWidth || 800;
      canvas.width = W;
      const H = canvas.height;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0d0d15';
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * H;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      const nyquist  = this._sampleRate / 2;
      const binCount = freqData.length;
      const logMin   = Math.log10(20);
      const logMax   = Math.log10(20000);
      const numBars  = Math.min(W, 300);
      const bw       = W / numBars;

      for (let i = 0; i < numBars; i++) {
        const freq = Math.pow(10, logMin + (i / numBars) * (logMax - logMin));
        const bin  = Math.min(Math.floor(freq / nyquist * binCount), binCount - 1);
        const db   = freqData[bin];
        const norm = Math.max(0, (db + 90) / 90);
        const barH = norm * H;
        const x    = i * bw;

        let color;
        if (freq < 250)       color = `rgba(108,99,255,${0.7 + norm * 0.3})`;
        else if (freq < 4000) color = `rgba(0,212,170,${0.7 + norm * 0.3})`;
        else                  color = `rgba(180,220,255,${0.6 + norm * 0.4})`;

        ctx.fillStyle = color;
        ctx.fillRect(x, H - barH, Math.max(1, bw - 1), barH);
      }
    };
    draw();
  }

  /** Stop the rAF loop and show the idle grid. */
  stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.clear();
  }
}
