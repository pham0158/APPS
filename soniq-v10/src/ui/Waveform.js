// ── Waveform ──────────────────────────────────────────────────────────────────
// Canvas waveform renderer.
// Draws before/after waveforms from AudioBuffer data and a playhead overlay.

export default class Waveform {
  /**
   * @param {string} canvasId   ID of the <canvas> element
   * @param {string} color      Stroke/fill accent colour (#rrggbb)
   */
  constructor(canvasId, color) {
    this._canvasId = canvasId;
    this._color    = color || '#6c63ff';
  }

  /** @returns {HTMLCanvasElement|null} */
  get canvas() { return document.getElementById(this._canvasId); }

  /**
   * Draw the waveform for an AudioBuffer.
   * @param {AudioBuffer} audioBuffer
   */
  draw(audioBuffer) {
    const canvas = this.canvas;
    if (!canvas || !audioBuffer) return;
    canvas.width  = canvas.offsetWidth || 600;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const color = this._color;
    const fill  = this._color + '1f'; // ~12% alpha hex is hard to compute, use rgba below

    // Build a rgba fill from the hex color
    const r = parseInt(color.slice(1,3),16);
    const g = parseInt(color.slice(3,5),16);
    const b = parseInt(color.slice(5,7),16);
    const fillRGBA = `rgba(${r},${g},${b},0.12)`;

    ctx.fillStyle = '#0d0d15';
    ctx.fillRect(0, 0, W, H);

    const nch  = audioBuffer.numberOfChannels;
    const data = audioBuffer.getChannelData(0);
    const data2 = nch > 1 ? audioBuffer.getChannelData(1) : null;
    const len   = data.length;
    const spp   = len / W;

    const tops = new Float32Array(W);
    const bots = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      const s = Math.floor(x * spp);
      const e = Math.min(Math.floor((x + 1) * spp), len);
      let mn = 0, mx = 0;
      for (let i = s; i < e; i++) {
        const v = data2 ? (data[i] + data2[i]) * 0.5 : data[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      tops[x] = H / 2 - mx * (H / 2 - 2);
      bots[x] = H / 2 - mn * (H / 2 - 2);
    }

    // Filled area
    ctx.beginPath();
    ctx.moveTo(0, tops[0]);
    for (let x = 1; x < W; x++) ctx.lineTo(x, tops[x]);
    for (let x = W - 1; x >= 0; x--) ctx.lineTo(x, bots[x]);
    ctx.closePath();
    ctx.fillStyle = fillRGBA;
    ctx.fill();

    // Top outline
    ctx.beginPath();
    ctx.moveTo(0, tops[0]);
    for (let x = 1; x < W; x++) ctx.lineTo(x, tops[x]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Overlay a playhead marker at a fractional position.
   * @param {number} progress  0–1
   */
  drawPlayhead(progress) {
    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const x   = Math.round(progress * canvas.width);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.restore();
  }

  /** Clear the canvas to the background colour. */
  clear() {
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth || 600;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d0d15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
