// ── Presets ───────────────────────────────────────────────────────────────────
// Preset definitions and apply logic for the Master tab.
// Preset names: vocalBoost, hiFiMaster, warmth, broadcast, maxClarity.

export const PRESETS = {
  vocalBoost: {
    'eq-sub': 0, 'eq-bass': -2, 'eq-mid': -3, 'eq-highs': 4,
    'eq-presence': 8, 'eq-air': 5, 'eq-demud': 50,
    'comp-threshold': -20, 'comp-ratio': 10, 'comp-attack': 10, 'comp-release': 150,
    'stereo-width': 100, 'output-gain': 0,
    toggles: { denoise: true, limiter: true, gate: false }
  },
  hiFiMaster: {
    'eq-sub': 2, 'eq-bass': 2, 'eq-mid': 0, 'eq-highs': 5,
    'eq-presence': 5, 'eq-air': 7, 'eq-demud': 30,
    'comp-threshold': -18, 'comp-ratio': 4, 'comp-attack': 15, 'comp-release': 200,
    'stereo-width': 150, 'output-gain': 0,
    toggles: { denoise: false, limiter: true, gate: false }
  },
  warmth: {
    'eq-sub': 4, 'eq-bass': 5, 'eq-mid': 1, 'eq-highs': -1,
    'eq-presence': 2, 'eq-air': 1, 'eq-demud': 20,
    'comp-threshold': -18, 'comp-ratio': 8, 'comp-attack': 25, 'comp-release': 250,
    'stereo-width': 100, 'output-gain': 0,
    toggles: { denoise: false, limiter: true, gate: false }
  },
  broadcast: {
    'eq-sub': 0, 'eq-bass': 0, 'eq-mid': -2, 'eq-highs': 3,
    'eq-presence': 6, 'eq-air': 4, 'eq-demud': 60,
    'comp-threshold': -18, 'comp-ratio': 14, 'comp-attack': 5, 'comp-release': 100,
    'stereo-width': 100, 'output-gain': 0,
    toggles: { denoise: false, limiter: true, gate: false }
  },
  maxClarity: {
    'eq-sub': 0, 'eq-bass': -1, 'eq-mid': -4, 'eq-highs': 6,
    'eq-presence': 10, 'eq-air': 8, 'eq-demud': 70,
    'comp-threshold': -18, 'comp-ratio': 5, 'comp-attack': 10, 'comp-release': 150,
    'stereo-width': 160, 'output-gain': 0,
    toggles: { denoise: false, limiter: true, gate: false }
  }
};

export default class Presets {
  /**
   * @param {function(string, object):void} onPresetSelect
   *   Called with (presetName, presetValues) when a preset button is clicked.
   */
  constructor(onPresetSelect) {
    this._onPresetSelect = onPresetSelect || null;
    this._active = null;
  }

  /** Wire click listeners on all .preset-btn elements and sync state. */
  render() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.preset;
        if (!name || !PRESETS[name]) return;
        this.setActive(name);
        this._onPresetSelect && this._onPresetSelect(name, PRESETS[name]);
      });
    });
    this._syncButtons();
  }

  /**
   * Mark a preset button as active.
   * @param {string} presetName
   */
  setActive(presetName) {
    this._active = presetName;
    this._syncButtons();
  }

  /** Clear the active preset (no button highlighted). */
  clearActive() {
    this._active = null;
    this._syncButtons();
  }

  /** @returns {string|null} Currently active preset name */
  get active() { return this._active; }

  // ── private ─────────────────────────────────────────────────────────────────
  _syncButtons() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === this._active);
    });
  }
}
