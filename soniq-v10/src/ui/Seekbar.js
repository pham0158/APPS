// ── Seekbar ───────────────────────────────────────────────────────────────────
// rAF-driven animated seekbar shared by Master and Stem tabs.
// Supports drag-to-scrub and shimmer loading state.

import { formatTime } from '../utils/format.js';

export default class Seekbar {
  /**
   * @param {function(number):void} onSeek  Called with seek position in seconds
   */
  constructor(onSeek) {
    this._onSeek    = onSeek || null;
    this._duration  = 0;
    this._rafId     = null;
    this._dragging  = false;
    this._wasPlaying = false;
    // DOM refs — set by render()
    this._container = null;
    this._input     = null;
    this._curEl     = null;
    this._durEl     = null;
  }

  /**
   * Attach the seekbar to existing DOM nodes.
   * @param {{ containerId: string, inputId: string, curId: string, durId: string }} ids
   */
  render({ containerId, inputId, curId, durId }) {
    this._container = document.getElementById(containerId);
    this._input     = document.getElementById(inputId);
    this._curEl     = document.getElementById(curId);
    this._durEl     = document.getElementById(durId);

    if (!this._input) return;

    this._input.addEventListener('pointerdown', () => {
      this._dragging   = true;
      this._wasPlaying = false; // caller will set this via onSeek
      this._onSeek && this._onSeek(-1); // signal drag start (negative = pause signal)
    });

    this._input.addEventListener('input', () => {
      if (!this._duration) return;
      const pct = this._input.value / 1000;
      const pos = pct * this._duration;
      if (this._curEl) this._curEl.textContent = formatTime(pos);
      this._setFill(pct * 100);
    });

    this._input.addEventListener('pointerup',  () => this._endDrag());
    this._input.addEventListener('touchend',   () => this._endDrag());
  }

  _endDrag() {
    if (!this._dragging) return;
    this._dragging = false;
    if (!this._duration) return;
    const pct = this._input.value / 1000;
    const pos = pct * this._duration;
    this._onSeek && this._onSeek(pos);
  }

  /**
   * Update display to a specific position.
   * @param {number} currentTime  Seconds
   * @param {number} duration     Seconds
   */
  update(currentTime, duration) {
    if (this._dragging) return;
    if (!this._input) return;
    this._duration = duration;
    const pct = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
    this._input.value = Math.round(pct * 1000);
    this._setFill(pct * 100);
    if (this._curEl) this._curEl.textContent = formatTime(currentTime);
  }

  /** Set total duration and update the duration label. */
  setDuration(seconds) {
    this._duration = seconds;
    if (this._durEl) this._durEl.textContent = formatTime(seconds);
    if (this._container) this._container.style.display = '';
  }

  /** Reset to zero position. */
  reset() {
    this.stopAnimation();
    if (this._input) { this._input.value = 0; this._setFill(0); }
    if (this._curEl) this._curEl.textContent = formatTime(0);
    this._duration = 0;
    if (this._container) this._container.style.display = 'none';
  }

  /**
   * Start rAF animation loop.
   * @param {function():number} getTimeFn  Returns current playback position in seconds
   */
  startAnimation(getTimeFn) {
    this.stopAnimation();
    const tick = () => {
      this._rafId = requestAnimationFrame(tick);
      if (this._dragging) return;
      this.update(getTimeFn(), this._duration);
    };
    tick();
  }

  /** Stop the rAF animation loop. */
  stopAnimation() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  // ── private ─────────────────────────────────────────────────────────────────
  _setFill(pct) {
    if (!this._input) return;
    this._input.style.background =
      `linear-gradient(to right, var(--accent) ${pct}%, var(--knob-track) ${pct}%)`;
  }
}
