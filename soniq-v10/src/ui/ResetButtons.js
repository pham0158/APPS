// ── ResetButtons ──────────────────────────────────────────────────────────────
// Wires section reset buttons and provides visual confirmation feedback.
// Used by MasterTab (EQ, Compression, Output, Denoise, Gate, Limiter)
// and StemTab (per-stem section resets, Reset All Stems).

export default class ResetButtons {
  /**
   * @param {function(string, HTMLButtonElement):void} onReset
   *   Called with (sectionName, buttonElement) when a reset button is clicked.
   */
  constructor(onReset) {
    this._onReset = onReset || null;
  }

  /**
   * Wire a reset button to a named section.
   * @param {HTMLButtonElement} buttonEl    The reset <button> element
   * @param {string}            sectionName Identifier forwarded to onReset callback
   */
  addResetButton(buttonEl, sectionName) {
    if (!buttonEl) return;
    buttonEl.addEventListener('click', () => {
      this._onReset && this._onReset(sectionName, buttonEl);
      this.showConfirmation(buttonEl);
    });
  }

  /**
   * Wire a reset button by element ID.
   * @param {string} buttonId
   * @param {string} sectionName
   */
  addResetButtonById(buttonId, sectionName) {
    const el = document.getElementById(buttonId);
    this.addResetButton(el, sectionName);
  }

  /**
   * Flash the button text to "✓ Reset" for 1.5 s then restore it.
   * @param {HTMLButtonElement} btn
   */
  showConfirmation(btn) {
    if (!btn) return;
    const orig       = btn.textContent;
    const origColor  = btn.style.color;
    const origBorder = btn.style.borderColor;
    btn.textContent        = '✓ Reset';
    btn.style.color        = 'var(--accent-2)';
    btn.style.borderColor  = 'var(--accent-2)';
    setTimeout(() => {
      btn.textContent       = orig;
      btn.style.color       = origColor;
      btn.style.borderColor = origBorder;
    }, 1500);
  }
}
