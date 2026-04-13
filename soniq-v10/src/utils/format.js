// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Format seconds as M:SS or H:MM:SS.
 * Non-finite or negative values are treated as 0.
 * @param {number} seconds
 * @returns {string} e.g. "3:07" or "1:02:45"
 */
export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format a LUFS value with one decimal place.
 * @param {number} value  Integrated LUFS measurement
 * @returns {string} e.g. "-14.2 LUFS" or "— LUFS" if not finite
 */
export function formatLUFS(value) {
  if (!isFinite(value)) return '— LUFS';
  return `${value.toFixed(1)} LUFS`;
}

/**
 * Format a dB value with explicit sign and one decimal place.
 * @param {number} value  Decibel value
 * @returns {string} e.g. "+3.0 dB" or "-6.5 dB"
 */
export function formatDB(value) {
  value = parseFloat(value);
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`;
}

/**
 * Format a compressor ratio value.
 * @param {number} value  Ratio (e.g. 4)
 * @returns {string} e.g. "4:1"
 */
export function formatRatio(value) {
  return `${parseFloat(value)}:1`;
}

/**
 * Format a percentage value (rounded to nearest integer).
 * @param {number} value  0–100 (or beyond)
 * @returns {string} e.g. "75%"
 */
export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

/**
 * Format a millisecond value.
 * @param {number} value  Time in milliseconds
 * @returns {string} e.g. "10 ms"
 */
export function formatMS(value) {
  return `${parseFloat(value)} ms`;
}

/**
 * Format a pan value as L/R/C string (used in stem mixer).
 * @param {number} value  -100 (hard left) to +100 (hard right), 0 = center
 * @returns {string} e.g. "C", "R25", "L50"
 */
export function formatPan(value) {
  value = parseInt(value);
  if (value === 0) return 'C';
  return value > 0 ? `R${value}` : `L${Math.abs(value)}`;
}

/**
 * Format a frequency value in Hz.
 * @param {number} value  Frequency in Hz
 * @returns {string} e.g. "80 Hz"
 */
export function formatHz(value) {
  return `${parseInt(value)} Hz`;
}

/**
 * Format a stem parameter value by parameter path key.
 * Covers all data-p attributes used in stem track cards.
 * @param {string} param  Parameter path e.g. "volume", "pan", "eq.hpf", "comp.rat"
 * @param {number} value
 * @returns {string}
 */
export function stemFormatParam(param, value) {
  if (param === 'volume')                         return formatPercent(value);
  if (param === 'pan')                            return formatPan(value);
  if (param === 'reverb' || param === 'width')    return formatPercent(value);
  if (param === 'eq.hpf')                         return formatHz(value);
  if (param === 'eq.bass' || param === 'eq.pres' || param === 'eq.air') return formatDB(value);
  if (param === 'comp.thr')                       return `${value} dB`;
  if (param === 'comp.rat')                       return formatRatio(value);
  if (param === 'comp.atk' || param === 'comp.rel') return formatMS(value);
  if (param === 'humanizeIntensity')              return formatPercent(value);
  return String(value);
}

/**
 * Format a master-tab slider value by slider ID.
 * Covers all master-tab slider IDs (eq-*, comp-*, stereo-width, output-gain).
 * @param {string} id     Slider element ID
 * @param {number|string} value
 * @returns {string}
 */
export function formatSlider(id, value) {
  value = parseFloat(value);
  if (id === 'eq-demud')    return formatPercent(value);
  if (id === 'comp-ratio')  return formatRatio(value);
  if (id === 'comp-attack' || id === 'comp-release') return formatMS(value);
  if (id === 'stereo-width') return formatPercent(value);
  return `${value > 0 ? '+' : ''}${value} dB`;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/**
 * Clamp a number between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert decibels to a linear gain multiplier.
 * @param {number} db  Decibel value
 * @returns {number}   Linear gain (e.g. 0 dB → 1.0, +6 dB → ~2.0)
 */
export function dbToGain(db) {
  return Math.pow(10, db / 20);
}

/**
 * Convert a linear gain multiplier to decibels.
 * Values ≤ 0 return -Infinity.
 * @param {number} gain  Linear gain value
 * @returns {number}     Decibel value
 */
export function gainToDB(gain) {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}
