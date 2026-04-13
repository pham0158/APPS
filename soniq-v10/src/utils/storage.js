// ── localStorage helpers ──────────────────────────────────────────────────────

/** Key used to persist all app state in localStorage. */
export const STORAGE_KEY = 'soniq_v10_state';

/**
 * Default values for every slider, toggle, and setting in the app.
 * Master-tab sliders use their HTML defaultValue.
 * Stem-tab per-track defaults are the factory values applied to new stems.
 */
export const DEFAULT_STATE = {
  // Master-tab slider defaults (same as HTML element defaultValues)
  sliders: {
    'eq-sub':           0,
    'eq-bass':          0,
    'eq-mid':           0,
    'eq-highs':         0,
    'eq-presence':      0,
    'eq-air':           0,
    'eq-demud':         0,
    'comp-threshold':  -18,
    'comp-ratio':       4,
    'comp-attack':      10,
    'comp-release':     100,
    'stereo-width':     100,
    'output-gain':      0,
  },

  // Master-tab toggle defaults
  toggles: {
    denoise: false,
    limiter: false,
    gate:    false,
  },

  // Active preset name or null
  activePreset: null,

  // Whether the stem master collapsible panel is open
  smtOpen: false,

  // Per-stem track default (applied when a new stem is created)
  stemDefaults: {
    volume:            100,
    pan:               0,
    muted:             false,
    soloed:            false,
    eqEnabled:         false,
    eqOpen:            false,
    eq: {
      hpf:  80,
      bass: 0,
      pres: 0,
      air:  0,
    },
    compEnabled:       false,
    compOpen:          false,
    comp: {
      thr: -18,
      rat: 4,
      atk: 10,
      rel: 100,
    },
    reverb:            0,
    width:             100,
    denoise:           false,
    humanize:          false,
    humanizeIntensity: 50,
  },
};

/**
 * Serialize and save data to localStorage under the given key.
 * Silently ignores errors (e.g. private browsing, storage quota exceeded).
 *
 * @param {string} key   localStorage key
 * @param {*}      data  Value to serialize as JSON
 * @returns {void}
 */
export function saveState(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
}

/**
 * Load and parse a JSON value from localStorage.
 * Returns null if the key is missing or the stored value is not valid JSON.
 *
 * @param {string} key  localStorage key
 * @returns {*|null}    Parsed value, or null on any error
 */
export function loadState(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Remove a key from localStorage.
 * Silently ignores errors.
 *
 * @param {string} key  localStorage key to delete
 * @returns {void}
 */
export function clearState(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}
