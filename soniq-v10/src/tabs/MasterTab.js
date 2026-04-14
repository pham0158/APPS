// ── MasterTab ─────────────────────────────────────────────────────────────────
// Complete Master tab: drop zone, EQ/Comp/Output/Processing controls,
// before/after waveforms, spectrum, LUFS meter, seekbar, transport, export.

import Waveform     from '../ui/Waveform.js';
import Spectrum     from '../ui/Spectrum.js';
import LUFSMeter    from '../ui/LUFSMeter.js';
import Seekbar      from '../ui/Seekbar.js';
import Presets, { PRESETS } from '../ui/Presets.js';
import ResetButtons from '../ui/ResetButtons.js';
import Denoise      from '../audio/Denoise.js';
import { formatSlider, dbToGain } from '../utils/format.js';
import { encodeWAV, downloadBlob } from '../utils/wav.js';
import { DEFAULT_STATE, saveState, STORAGE_KEY } from '../utils/storage.js';

const SLIDER_IDS = [
  'eq-sub','eq-bass','eq-mid','eq-highs','eq-presence','eq-air','eq-demud',
  'comp-threshold','comp-ratio','comp-attack','comp-release',
  'stereo-width','output-gain'
];
const TOGGLE_IDS = ['denoise','limiter','gate'];

export default class MasterTab {
  /**
   * @param {import('../audio/AudioEngine.js').default} audioEngine
   * @param {{ denoise?: import('../audio/Denoise.js').default }} [opts]
   */
  constructor(audioEngine, { denoise = null } = {}) {
    this._ae       = audioEngine;
    this._denoise  = denoise || new Denoise();

    // Playback state
    this._originalBuffer  = null;
    this._masteredBuffer  = null;
    this._currentFile     = null;
    this._isPlaying       = false;
    this._playSource      = null;
    this._playAnalyser    = null;
    this._playStartTime   = 0;
    this._playOffset      = 0;
    this._abMode          = false;
    this._hasFile         = false;
    this._hasEnhanced     = false;
    this._seekWasPlaying  = false;
    this._liveEqNodes     = null;  // live BiquadFilter map for real-time EQ
    this._rnnoiseApplied  = false;

    // Control state
    this._sliders = { ...DEFAULT_STATE.sliders };
    this._toggles = { ...DEFAULT_STATE.toggles };
    this._toggles.limiter = true;  // default ON for limiter
    this._activePreset = null;

    // UI components
    this._waveformBefore = new Waveform('waveformBefore', '#6c63ff');
    this._waveformAfter  = new Waveform('waveformAfter',  '#00d4aa');
    this._spectrum       = new Spectrum('spectrum');
    this._lufsMeter      = new LUFSMeter();
    this._seekbar        = new Seekbar(pos => this._onSeek(pos));
    this._presets        = new Presets((name, vals) => this._applyPreset(name, vals));
    this._resetBtns      = new ResetButtons((section, btn) => this._onReset(section, btn));

    this._el = null;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  /** Build and return the complete Master tab DOM element. */
  render() {
    const div = document.createElement('div');
    div.innerHTML = this._buildHTML();
    this._el = div.firstElementChild;
    return this._el;
  }

  /** Wire all controls after render() output is mounted in the DOM. */
  init() {
    // Initial canvas states
    this._waveformBefore.clear();
    this._waveformAfter.clear();
    this._spectrum.clear();

    // Seekbar
    this._seekbar.render({
      containerId: 'masterSeekContainer',
      inputId: 'masterSeek',
      curId: 'masterSeekCur',
      durId: 'masterSeekDur'
    });

    // Presets
    this._presets.render();

    // Reset buttons
    this._resetBtns.addResetButtonById('resetMasterEQ',     'eq');
    this._resetBtns.addResetButtonById('resetMasterComp',   'comp');
    this._resetBtns.addResetButtonById('resetMasterOutput', 'output');
    this._resetBtns.addResetButtonById('clearPresetBtn',    'preset');
    // Toggle resets: use direct listeners because stopPropagation is needed
    document.getElementById('resetDenoise')?.addEventListener('click', e => {
      e.stopPropagation();
      this._resetToggle('denoise', false);
      this._resetBtns.showConfirmation(e.currentTarget);
    });
    document.getElementById('resetLimiter')?.addEventListener('click', e => {
      e.stopPropagation();
      this._resetToggle('limiter', true);
      this._resetBtns.showConfirmation(e.currentTarget);
    });
    document.getElementById('resetGate')?.addEventListener('click', e => {
      e.stopPropagation();
      this._resetToggle('gate', false);
      this._resetBtns.showConfirmation(e.currentTarget);
    });

    this._initDropZone();
    this._initSliders();
    this._initToggles();
    this._initActionBar();
    this._initResetAll();
    this._initKeyboard();
    this._initResizeObserver();
    this._updateActionBar();
    this._initTooltips();

    // Load RNNoise in background; update badge when done
    this._updateRNNoiseBadge('loading');
    this._denoise.load()
      .then(() => this._updateRNNoiseBadge(null))
      .catch(() => this._updateRNNoiseBadge('unavailable'));
  }

  // ── State I/O ────────────────────────────────────────────────────────────────

  /** Restore controls from a saved state object. */
  loadState(state) {
    if (!state) return;
    if (state.sliders) {
      Object.assign(this._sliders, state.sliders);
      SLIDER_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && this._sliders[id] !== undefined) {
          el.value = this._sliders[id];
          this._updateSliderDisplay(id, this._sliders[id]);
        }
      });
    }
    if (state.toggles) {
      Object.assign(this._toggles, state.toggles);
      TOGGLE_IDS.forEach(id => {
        const el = document.getElementById(`toggle-${id}`);
        if (el) {
          el.classList.toggle('on', !!this._toggles[id]);
          el.setAttribute('aria-checked', String(!!this._toggles[id]));
        }
      });
    }
    if (state.activePreset) {
      this._activePreset = state.activePreset;
      this._presets.setActive(this._activePreset);
    }
    this._syncAudioEngine();
  }

  /** Return current state for persisting. */
  getState() {
    return {
      sliders: { ...this._sliders },
      toggles: { ...this._toggles },
      activePreset: this._activePreset
    };
  }

  // ── HTML Template ────────────────────────────────────────────────────────────

  _buildHTML() {
    return `
<div id="masterTabRoot">

  <!-- Drop Zone -->
  <div class="drop-zone" id="dropZone" role="button" tabindex="0" aria-label="Drop audio file or click to browse">
    <div class="drop-icon">🎵</div>
    <h2>Drop your audio file here</h2>
    <p>or click to browse your files</p>
    <div class="file-types">
      <span class="file-badge">MP3</span>
      <span class="file-badge">WAV</span>
      <span class="file-badge">FLAC</span>
      <span class="file-badge">OGG</span>
    </div>
    <div class="file-info" id="fileInfo">
      <span class="file-info-icon">🎧</span>
      <div>
        <div class="file-info-name" id="fileName">—</div>
        <div class="file-info-meta" id="fileMeta">—</div>
      </div>
      <button class="file-info-clear" id="fileClear" title="Remove file">✕</button>
    </div>
    <input type="file" id="fileInput" accept=".mp3,.wav,.flac,.ogg,audio/mpeg,audio/wav,audio/flac,audio/ogg">
  </div>

  <!-- Presets -->
  <div>
    <div style="display:flex;align-items:center;margin-bottom:10px;">
      <div class="section-label" style="margin-bottom:0;flex:1;">Presets</div>
      <button class="reset-btn" id="clearPresetBtn" title="Deselect active preset (sliders unchanged)">✕ Clear Preset</button>
    </div>
    <div class="presets-row" id="presetsRow">
      <button class="preset-btn" data-preset="vocalBoost" data-tip="Strong de-mud cut, presence boost, tight compression for voice clarity. Mono-safe processing. Great starting point for vocals and podcasts."><span class="preset-icon">⚡</span>Vocal Boost</button>
      <button class="preset-btn" data-preset="hiFiMaster" data-tip="Targets -14 LUFS integrated loudness, the standard for Spotify and Apple Music. Balanced EQ, gentle compression, clean and transparent."><span class="preset-icon">✨</span>Hi-Fi Master</button>
      <button class="preset-btn" data-preset="warmth" data-tip="Gentle compression, low-shelf warmth, subtle saturation character. Sounds like vintage tape mastering."><span class="preset-icon">🎸</span>Warmth</button>
      <button class="preset-btn" data-preset="broadcast" data-tip="Heavy low end, wide stereo image, punchy limiting. Targets -8 LUFS for loud club or broadcast playback."><span class="preset-icon">📻</span>Broadcast</button>
      <button class="preset-btn" data-preset="maxClarity" data-tip="Minimal processing philosophy. Wide stereo, clean highs, light compression. Maximum transparency — let the music speak."><span class="preset-icon">💎</span>Max Clarity</button>
    </div>
  </div>

  <!-- Controls Grid -->
  <div class="controls-grid">

    <!-- EQ -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">EQ</div>
        <button class="reset-btn" id="resetMasterEQ" title="Reset EQ to defaults">↺ Reset</button>
      </div>
      <div class="slider-row">
        <span class="slider-label">Sub Bass <i class="tip-icon" data-tip="Controls the deep rumble and sub-bass frequencies. Boost for more power in kick drums and bass lines. Cut if the track sounds muddy on small speakers.">i</i></span>
        <div class="slider-wrap"><input type="range" id="eq-sub" min="-12" max="12" step="0.5" value="0"></div>
        <span class="slider-val" id="val-eq-sub">0 dB</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Bass <i class="tip-icon" data-tip="Controls warmth and body in the low end. Boost for fullness, cut if the mix sounds boomy or unclear.">i</i></span>
        <div class="slider-wrap"><input type="range" id="eq-bass" min="-12" max="12" step="0.5" value="0"></div>
        <span class="slider-val" id="val-eq-bass">0 dB</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Midrange <i class="tip-icon" data-tip="The presence of most instruments and vocals lives here. Cut slightly for a more modern scooped sound, boost to bring vocals forward.">i</i></span>
        <div class="slider-wrap"><input type="range" id="eq-mid" min="-12" max="12" step="0.5" value="0"></div>
        <span class="slider-val" id="val-eq-mid">0 dB</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Highs <i class="tip-icon" data-tip="Controls brightness and definition. Boost to add clarity and detail, cut to reduce harshness or sibilance.">i</i></span>
        <div class="slider-wrap"><input type="range" id="eq-highs" min="-12" max="12" step="0.5" value="0"></div>
        <span class="slider-val" id="val-eq-highs">0 dB</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Presence <i class="tip-icon" data-tip="The key frequency range for vocal intelligibility and guitar bite. Boosting here makes vocals cut through the mix.">i</i></span>
        <div class="slider-wrap"><input type="range" id="eq-presence" min="0" max="12" step="0.5" value="0"></div>
        <span class="slider-val" id="val-eq-presence">0 dB</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Air <i class="tip-icon" data-tip="Adds sparkle and openness to the top end. A gentle boost here makes recordings sound more professional and airy.">i</i></span>
        <div class="slider-wrap"><input type="range" id="eq-air" min="0" max="10" step="0.5" value="0"></div>
        <span class="slider-val" id="val-eq-air">0 dB</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">De-Mud <i class="tip-icon" data-tip="Cuts the muddy buildup that clouds mixes. Very effective for cleaning up vocals, acoustic guitars, and full mixes that sound congested.">i</i></span>
        <div class="slider-wrap"><input type="range" id="eq-demud" min="0" max="100" step="1" value="0"></div>
        <span class="slider-val" id="val-eq-demud">0%</span>
      </div>
    </div>

    <!-- Compression -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Compression</div>
        <button class="reset-btn" id="resetMasterComp" title="Reset Compression to defaults">↺ Reset</button>
      </div>
      <div class="slider-row">
        <span class="slider-label">Threshold <i class="tip-icon" data-tip="Sets the volume level at which compression kicks in. Signals louder than this get compressed. Lower = more compression.">i</i></span>
        <div class="slider-wrap"><input type="range" id="comp-threshold" min="-60" max="0" step="1" value="-18"></div>
        <span class="slider-val" id="val-comp-threshold">-18 dB</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Ratio <i class="tip-icon" data-tip="How much compression is applied once the signal crosses the threshold. 4:1 means for every 4dB over the threshold, only 1dB comes through.">i</i></span>
        <div class="slider-wrap"><input type="range" id="comp-ratio" min="1" max="20" step="0.5" value="4"></div>
        <span class="slider-val" id="val-comp-ratio">4:1</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Attack <i class="tip-icon" data-tip="How quickly compression kicks in after the signal crosses the threshold. Faster = tighter sound. Slower = more punch and transient preserved.">i</i></span>
        <div class="slider-wrap"><input type="range" id="comp-attack" min="0.1" max="200" step="0.1" value="10"></div>
        <span class="slider-val" id="val-comp-attack">10 ms</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Release <i class="tip-icon" data-tip="How quickly compression lets go after the signal drops below the threshold. Shorter = snappier, longer = smoother.">i</i></span>
        <div class="slider-wrap"><input type="range" id="comp-release" min="10" max="1000" step="5" value="100"></div>
        <span class="slider-val" id="val-comp-release">100 ms</span>
      </div>
    </div>

    <!-- Stereo & Output -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Stereo &amp; Output</div>
        <button class="reset-btn" id="resetMasterOutput" title="Reset Stereo &amp; Output to defaults">↺ Reset</button>
      </div>
      <div class="slider-row">
        <span class="slider-label">St. Width <i class="tip-icon" data-tip="Expands or narrows the stereo image using mid/side processing. 100% = original width. 150%+ = wider, more immersive. Keep above 80% to stay mono-compatible.">i</i></span>
        <div class="slider-wrap"><input type="range" id="stereo-width" min="0" max="200" step="1" value="100"></div>
        <span class="slider-val" id="val-stereo-width">100%</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Output Gain <i class="tip-icon" data-tip="The final volume level of the mastered signal before the limiter. Use this to hit a target loudness without clipping.">i</i></span>
        <div class="slider-wrap"><input type="range" id="output-gain" min="-12" max="12" step="0.5" value="0"></div>
        <span class="slider-val" id="val-output-gain">0 dB</span>
      </div>
    </div>

    <!-- Processing Toggles -->
    <div class="panel" style="display:flex;flex-direction:column;justify-content:center;">
      <div class="panel-title">Processing</div>
      <div class="toggle-item" id="toggle-denoise" data-toggle="denoise" role="switch" tabindex="0" aria-checked="false">
        <span class="toggle-icon">✨</span>
        <div class="toggle-info">
          <div class="toggle-name">AI Denoise ✨ <i class="tip-icon" data-tip="Uses RNNoise neural network to remove background hiss, hum, and noise from your audio. Works best on vocals and voice recordings. Processing happens entirely in your browser — nothing is uploaded.">i</i></div>
          <div class="toggle-desc" id="denoiseDesc">RNNoise neural suppression</div>
        </div>
        <span class="rnnoise-badge badge-loading" id="rnnoiseStatus" style="display:none"><span class="rn-spin">⟳</span> Loading</span>
        <button class="reset-btn" id="resetDenoise" title="Reset AI Denoise (toggle off)" style="font-size:11px;padding:2px 6px;">↺</button>
        <div class="toggle-switch"></div>
      </div>
      <div class="toggle-hint" id="denoiseHint">Works best on vocals and voice recordings</div>
      <div class="toggle-item" id="toggle-limiter" data-toggle="limiter" role="switch" tabindex="0" aria-checked="true">
        <span class="toggle-icon">🔒</span>
        <div class="toggle-info">
          <div class="toggle-name">Limiter <i class="tip-icon" data-tip="Prevents your audio from ever exceeding -1 dBFS (digital ceiling). Acts as a safety net to avoid harsh digital clipping on export.">i</i></div>
          <div class="toggle-desc">True peak limiting at -1 dBTP</div>
        </div>
        <button class="reset-btn" id="resetLimiter" title="Reset Limiter (toggle on)" style="font-size:11px;padding:2px 6px;">↺</button>
        <div class="toggle-switch"></div>
      </div>
      <div class="toggle-item" id="toggle-gate" data-toggle="gate" role="switch" tabindex="0" aria-checked="false">
        <span class="toggle-icon">🚪</span>
        <div class="toggle-info">
          <div class="toggle-name">Noise Gate <i class="tip-icon" data-tip="Automatically silences audio that falls below a volume threshold. Useful for cutting out background noise between sung phrases or spoken words.">i</i></div>
          <div class="toggle-desc">Silence background noise floor</div>
        </div>
        <button class="reset-btn" id="resetGate" title="Reset Noise Gate (toggle off)" style="font-size:11px;padding:2px 6px;">↺</button>
        <div class="toggle-switch"></div>
      </div>
    </div>

  </div><!-- /.controls-grid -->

  <!-- Waveforms -->
  <div class="viz-grid">
    <div class="viz-panel">
      <div class="viz-header">
        <span class="viz-title">Waveform — Original</span>
        <span class="viz-badge">Before</span>
      </div>
      <div class="waveform-wrap canvas-placeholder">
        <canvas id="waveformBefore" height="80"></canvas>
        <div class="canvas-placeholder-msg" id="waveBeforeMsg">Load a file to view waveform</div>
      </div>
      <div class="waveform-labels">
        <span>0:00</span><span id="waveBeforeDuration">—</span>
      </div>
    </div>
    <div class="viz-panel">
      <div class="viz-header">
        <span class="viz-title">Waveform — Enhanced</span>
        <span class="viz-badge">After</span>
      </div>
      <div class="waveform-wrap canvas-placeholder">
        <canvas id="waveformAfter" height="80"></canvas>
        <div class="canvas-placeholder-msg" id="waveAfterMsg">Enhance to preview</div>
      </div>
      <div class="waveform-labels">
        <span>0:00</span><span id="waveAfterDuration">—</span>
      </div>
    </div>
  </div>

  <!-- Spectrum -->
  <div class="spectrum-panel">
    <div class="viz-header">
      <span class="viz-title">Spectrum Analyzer</span>
      <span class="viz-badge">Real-time FFT</span>
    </div>
    <div class="canvas-placeholder">
      <canvas id="spectrum" height="100"></canvas>
      <div class="canvas-placeholder-msg" id="spectrumMsg">Spectrum will appear during playback</div>
    </div>
    <div class="spectrum-freq-labels">
      <span>20 Hz</span><span>100</span><span>500</span><span>1k</span><span>5k</span><span>10k</span><span>20k Hz</span>
    </div>
  </div>

  <!-- Meters -->
  <div class="meters-row">
    <div class="lufs-panel">
      <div class="section-label" style="margin-bottom:12px;">Loudness (LUFS)</div>
      <div class="lufs-values">
        <div class="lufs-val-group">
          <div class="lufs-number placeholder" id="lufsIntegrated">—</div>
          <div class="lufs-label">Integrated</div>
        </div>
        <div class="lufs-val-group">
          <div class="lufs-number placeholder" id="lufsShortTerm">—</div>
          <div class="lufs-label">Short-term</div>
        </div>
        <div class="lufs-val-group">
          <div class="lufs-number placeholder" id="lufsLRA">—</div>
          <div class="lufs-label">LRA</div>
        </div>
        <div class="lufs-val-group">
          <div class="lufs-number placeholder" id="lufsTruePeak">—</div>
          <div class="lufs-label">True Peak</div>
        </div>
      </div>
      <div class="lufs-bar-track"><div class="lufs-bar-fill" id="lufsBarFill"></div></div>
    </div>
    <div class="peak-panel">
      <div class="section-label" style="margin-bottom:12px;">Peak Meter</div>
      <div class="peak-channels">
        <div class="peak-channel">
          <div class="peak-bar-wrap"><div class="peak-bar ch-l" id="peakL"></div></div>
          <span class="peak-ch-label">L</span>
        </div>
        <div class="peak-channel">
          <div class="peak-bar-wrap"><div class="peak-bar ch-r" id="peakR"></div></div>
          <span class="peak-ch-label">R</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Action Bar -->
  <div class="action-bar">
    <button class="btn btn-primary" id="enhanceBtn" disabled data-tip="Apply the full mastering chain: EQ, compression, stereo widening, limiting, and optional AI denoise. Processing runs offline in your browser — no upload needed.">
      <span class="btn-icon">⚡</span>Enhance
    </button>
    <div class="divider"></div>
    <button class="btn btn-secondary" id="playBtn" disabled data-tip="Preview your audio. Plays the mastered version after enhancing, or the original before. Use A/B Compare during playback to flip between them.">
      <span class="play-btn-icon">▶</span>
      <span class="play-btn-text">Preview</span>
    </button>
    <button class="btn btn-secondary" id="abBtn" disabled data-tip="Instantly flip between your original unprocessed audio (A) and the mastered version (B) during playback. Use this to judge if your processing is actually improving the sound.">
      <span class="btn-icon">🔀</span>A/B Compare
    </button>
    <div class="divider"></div>
    <div class="download-group">
      <button class="btn-dl" id="dl16Btn" disabled data-tip="Download the mastered audio as a 16-bit WAV. Good for streaming distribution and general use. Smaller file size than 24-bit."><span>⬇</span> 16-bit WAV</button>
      <button class="btn-dl" id="dl24Btn" disabled data-tip="Download the mastered audio as a 24-bit WAV. Full studio quality — recommended for archiving, further mixing, or mastering submission. Keyboard shortcut: D"><span>⬇</span> 24-bit WAV</button>
    </div>
  </div>

  <!-- Master Seekbar -->
  <div class="seekbar-container" id="masterSeekContainer" style="display:none">
    <div class="seekbar-row">
      <span class="seekbar-time" id="masterSeekCur">0:00</span>
      <div class="seekbar-track-wrap">
        <div class="seekbar-loading-bar" id="masterSeekLoading"></div>
        <input type="range" class="seekbar" id="masterSeek" min="0" max="1000" step="1" value="0">
      </div>
      <span class="seekbar-time right" id="masterSeekDur">0:00</span>
    </div>
  </div>

  <!-- Progress -->
  <div class="progress-wrap" id="progressWrap" style="display:none">
    <div class="progress-header">
      <span class="progress-title">Mastering</span>
      <span class="progress-pct" id="progressPct">0%</span>
    </div>
    <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
    <div class="progress-msg" id="progressMsg">Initializing…</div>
  </div>

  <!-- Summary Card -->
  <div class="summary-card" id="summaryCard" style="display:none">
    <div class="summary-header">
      <span class="summary-title">✦ Mastering Complete</span>
      <button class="summary-close" id="summaryClose">✕</button>
    </div>
    <div class="summary-grid">
      <div class="summary-item"><div class="summary-val" id="sumLUFS">—</div><div class="summary-lbl">Integrated LUFS</div></div>
      <div class="summary-item"><div class="summary-val" id="sumGained">—</div><div class="summary-lbl">Loudness Gained</div></div>
      <div class="summary-item"><div class="summary-val" id="sumPeak">—</div><div class="summary-lbl">True Peak</div></div>
      <div class="summary-item"><div class="summary-val" id="sumLRA">—</div><div class="summary-lbl">Dynamic Range</div></div>
      <div class="summary-item"><div class="summary-val" id="sumWidth">—</div><div class="summary-lbl">Stereo Width</div></div>
      <div class="summary-item"><div class="summary-val" id="sumTime">—</div><div class="summary-lbl">Process Time</div></div>
    </div>
    <div class="summary-note" id="summaryDenoiseNote" style="display:none">
      ✨ AI Denoise applied — RNNoise neural noise suppression was active
    </div>
  </div>

</div>`;
  }

  // ── Drop Zone ────────────────────────────────────────────────────────────────

  _initDropZone() {
    const zone  = document.getElementById('dropZone');
    const input = document.getElementById('fileInput');
    if (!zone || !input) return;

    zone.addEventListener('click', e => {
      if (e.target.id === 'fileClear') return;
      input.click();
    });
    zone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this._handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) this._handleFile(input.files[0]);
      input.value = '';
    });
    document.getElementById('fileClear')?.addEventListener('click', e => {
      e.stopPropagation();
      this._clearFile();
    });
  }

  async _handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['mp3','wav','flac','ogg'].includes(ext)) {
      this._setStatus('Unsupported format — use MP3, WAV, FLAC, or OGG', false);
      return;
    }
    this._setStatus('Decoding audio…', true, true);
    await this._ae.resume();

    let ab;
    try { ab = await file.arrayBuffer(); }
    catch(e) { this._setStatus('Failed to read file', false); return; }

    let buf;
    try { buf = await this._ae.context.decodeAudioData(ab); }
    catch(e) { this._setStatus(`Failed to decode audio: ${e.message}`, false); return; }

    this._originalBuffer = buf;
    this._masteredBuffer = null;
    this._currentFile    = file;
    this._hasFile        = true;
    this._hasEnhanced    = false;
    this._abMode         = false;
    this._playOffset     = 0;

    const dur = this._fmtDuration(buf.duration);
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileMeta').textContent =
      `${this._fmtBytes(file.size)} · ${ext.toUpperCase()} · ${buf.numberOfChannels}ch · ${(buf.sampleRate/1000).toFixed(1)}kHz`;
    document.getElementById('fileInfo').classList.add('visible');
    document.getElementById('dropZone').classList.add('has-file');
    document.getElementById('waveBeforeDuration').textContent = dur;
    document.getElementById('waveAfterDuration').textContent  = '—';
    document.getElementById('waveAfterMsg').textContent       = 'Enhance to preview';
    document.getElementById('waveAfterMsg').style.display     = '';
    document.getElementById('waveBeforeMsg').style.display    = 'none';
    document.getElementById('summaryCard').style.display      = 'none';

    this._seekbar.setDuration(buf.duration);
    this._seekbar.reset();
    document.getElementById('masterSeekContainer').style.display = '';

    this._waveformBefore.draw(buf);
    this._waveformAfter.clear();
    this._spectrum.clear();
    this._lufsMeter.reset();
    this._updateActionBar();
    this._setStatus(`Loaded: ${file.name} (${dur})`, true);
  }

  _clearFile() {
    this._stopPlayback();
    this._originalBuffer = null;
    this._masteredBuffer = null;
    this._currentFile    = null;
    this._hasFile        = false;
    this._hasEnhanced    = false;
    this._abMode         = false;
    this._playOffset     = 0;

    document.getElementById('fileInfo').classList.remove('visible');
    document.getElementById('dropZone').classList.remove('has-file');
    document.getElementById('waveBeforeMsg').style.display = '';
    document.getElementById('waveAfterMsg').textContent    = 'Enhance to preview';
    document.getElementById('waveAfterMsg').style.display  = '';
    document.getElementById('waveBeforeDuration').textContent = '—';
    document.getElementById('waveAfterDuration').textContent  = '—';
    document.getElementById('summaryCard').style.display = 'none';
    this._seekbar.reset();
    this._waveformBefore.clear();
    this._waveformAfter.clear();
    this._spectrum.clear();
    this._lufsMeter.reset();
    this._updateActionBar();
    this._setStatus('Drop a file to begin', false);
  }

  // ── Sliders ──────────────────────────────────────────────────────────────────

  _initSliders() {
    SLIDER_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (this._sliders[id] !== undefined) el.value = this._sliders[id];
      else this._sliders[id] = +el.value;
      this._updateSliderDisplay(id, el.value);
      el.addEventListener('input', () => {
        this._sliders[id] = +el.value;
        this._updateSliderDisplay(id, el.value);
        this._updateLiveEQ(id, el.value);
        this._syncAESlider(id, +el.value);
        this._activePreset = null;
        this._presets.clearActive();
        this._save();
      });
    });
  }

  _updateSliderDisplay(id, val) {
    const lbl = document.getElementById(`val-${id}`);
    if (lbl) lbl.textContent = formatSlider(id, val);
    const el = document.getElementById(id);
    if (el) {
      const min = +el.min, max = +el.max, v = +val;
      const pct = ((v - min) / (max - min)) * 100;
      el.style.background = `linear-gradient(to right,var(--accent) ${pct}%,var(--knob-track) ${pct}%)`;
    }
  }

  /** Sync one slider to the live AudioEngine node during playback. */
  _updateLiveEQ(id, val) {
    if (!this._liveEqNodes) return;
    const v = parseFloat(val);
    if      (id === 'eq-sub')      this._liveEqNodes.sub.gain.value   = v;
    else if (id === 'eq-bass')     this._liveEqNodes.bass.gain.value  = v;
    else if (id === 'eq-mid')      this._liveEqNodes.mid.gain.value   = v;
    else if (id === 'eq-highs')    this._liveEqNodes.highs.gain.value = v;
    else if (id === 'eq-presence') this._liveEqNodes.pres.gain.value  = v;
    else if (id === 'eq-air')      this._liveEqNodes.air.gain.value   = v;
    else if (id === 'eq-demud')    this._liveEqNodes.demud.gain.value = -(v / 100) * 10;
  }

  /** Sync a slider value to the AudioEngine bus (always-on master bus). */
  _syncAESlider(id, v) {
    const ae = this._ae;
    if      (id === 'eq-sub')        ae.eqNodes.setSubBass(v);
    else if (id === 'eq-bass')       ae.eqNodes.setBass(v);
    else if (id === 'eq-mid')        ae.eqNodes.setMid(v);
    else if (id === 'eq-highs')      ae.eqNodes.setHighs(v);
    else if (id === 'eq-presence')   ae.eqNodes.setPresence(v);
    else if (id === 'eq-air')        ae.eqNodes.setAir(v);
    else if (id === 'eq-demud')      ae.eqNodes.setDeMud(v);
    else if (id === 'comp-threshold') ae.compressor.setThreshold(v);
    else if (id === 'comp-ratio')    ae.compressor.setRatio(v);
    else if (id === 'comp-attack')   ae.compressor.setAttack(v / 1000);
    else if (id === 'comp-release')  ae.compressor.setRelease(v / 1000);
    else if (id === 'output-gain')   ae.setOutputGain(dbToGain(v));
  }

  /** Push all current slider values to the AudioEngine bus. */
  _syncAudioEngine() {
    SLIDER_IDS.forEach(id => {
      if (this._sliders[id] !== undefined) this._syncAESlider(id, this._sliders[id]);
    });
    this._ae.limiter.setEnabled(!!this._toggles.limiter);
  }

  // ── Toggles ──────────────────────────────────────────────────────────────────

  _initToggles() {
    TOGGLE_IDS.forEach(id => {
      const el = document.getElementById(`toggle-${id}`);
      if (!el) return;
      const on = id === 'limiter' ? true : !!this._toggles[id];
      this._toggles[id] = on;
      el.classList.toggle('on', on);
      el.setAttribute('aria-checked', String(on));

      const toggle = () => {
        this._toggles[id] = !this._toggles[id];
        el.classList.toggle('on', this._toggles[id]);
        el.setAttribute('aria-checked', String(this._toggles[id]));
        if (id === 'limiter') this._ae.limiter.setEnabled(this._toggles.limiter);
        this._activePreset = null;
        this._presets.clearActive();
        this._save();
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
    });
  }

  _resetToggle(id, defaultOn) {
    this._toggles[id] = defaultOn;
    const el = document.getElementById(`toggle-${id}`);
    if (el) {
      el.classList.toggle('on', defaultOn);
      el.setAttribute('aria-checked', String(defaultOn));
    }
    if (id === 'limiter') this._ae.limiter.setEnabled(defaultOn);
    this._activePreset = null;
    this._presets.clearActive();
    this._save();
  }

  // ── Presets ──────────────────────────────────────────────────────────────────

  _applyPreset(name, vals) {
    SLIDER_IDS.forEach(id => {
      if (vals[id] === undefined) return;
      const el = document.getElementById(id);
      if (el) el.value = vals[id];
      this._sliders[id] = vals[id];
      this._updateSliderDisplay(id, vals[id]);
      this._updateLiveEQ(id, vals[id]);
      this._syncAESlider(id, vals[id]);
    });
    TOGGLE_IDS.forEach(id => {
      const v = vals.toggles?.[id] !== undefined ? vals.toggles[id] : this._toggles[id];
      this._toggles[id] = v;
      const el = document.getElementById(`toggle-${id}`);
      if (el) { el.classList.toggle('on', v); el.setAttribute('aria-checked', String(v)); }
    });
    this._ae.limiter.setEnabled(!!this._toggles.limiter);
    this._activePreset = name;
    this._save();
  }

  // ── Reset Handlers ───────────────────────────────────────────────────────────

  _onReset(section) {
    const defaults = DEFAULT_STATE.sliders;
    let ids = [];
    if (section === 'eq')      ids = ['eq-sub','eq-bass','eq-mid','eq-highs','eq-presence','eq-air','eq-demud'];
    if (section === 'comp')    ids = ['comp-threshold','comp-ratio','comp-attack','comp-release'];
    if (section === 'output')  ids = ['stereo-width','output-gain'];
    if (section === 'preset') {
      this._activePreset = null;
      this._presets.clearActive();
      return;
    }
    ids.forEach(id => {
      const el = document.getElementById(id);
      const def = defaults[id] !== undefined ? defaults[id] : +el?.defaultValue;
      if (el) el.value = def;
      this._sliders[id] = def;
      this._updateSliderDisplay(id, def);
      this._updateLiveEQ(id, def);
      this._syncAESlider(id, def);
    });
    this._activePreset = null;
    this._presets.clearActive();
    this._save();
  }

  _initResetAll() {
    document.getElementById('resetAllBtn')?.addEventListener('click', () => {
      SLIDER_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const def = DEFAULT_STATE.sliders[id] !== undefined ? DEFAULT_STATE.sliders[id] : +el.defaultValue;
        el.value = def;
        this._sliders[id] = def;
        this._updateSliderDisplay(id, def);
        this._updateLiveEQ(id, def);
        this._syncAESlider(id, def);
      });
      this._toggles = { denoise: false, limiter: true, gate: false };
      TOGGLE_IDS.forEach(id => {
        const el = document.getElementById(`toggle-${id}`);
        const on = this._toggles[id];
        if (el) { el.classList.toggle('on', on); el.setAttribute('aria-checked', String(on)); }
      });
      this._ae.limiter.setEnabled(true);
      this._activePreset = null;
      this._presets.clearActive();
      this._save();
      this._setStatus('Settings reset to defaults', true);
    });
  }

  // ── Action Bar ───────────────────────────────────────────────────────────────

  _initActionBar() {
    document.getElementById('enhanceBtn')?.addEventListener('click', () => {
      if (this._hasFile) this._runMastering();
    });
    document.getElementById('playBtn')?.addEventListener('click', () => {
      if (this._hasFile) this._togglePlayback();
    });
    document.getElementById('abBtn')?.addEventListener('click', () => {
      if (!this._hasEnhanced) return;
      this._abMode = !this._abMode;
      if (this._isPlaying) { this._stopPlayback(); this._startPlayback(); }
      this._updateActionBar();
    });
    document.getElementById('dl16Btn')?.addEventListener('click', () => {
      if (!this._masteredBuffer) return;
      const name = this._baseName() + '_mastered_16bit.wav';
      this._setStatus('Encoding 16-bit WAV…', true, true);
      setTimeout(() => {
        downloadBlob(encodeWAV(this._masteredBuffer, 16), name);
        this._setStatus('Downloaded: ' + name, true);
      }, 0);
    });
    document.getElementById('dl24Btn')?.addEventListener('click', () => {
      if (!this._masteredBuffer) return;
      const name = this._baseName() + '_mastered_24bit.wav';
      this._setStatus('Encoding 24-bit WAV…', true, true);
      setTimeout(() => {
        downloadBlob(encodeWAV(this._masteredBuffer, 24), name);
        this._setStatus('Downloaded: ' + name, true);
      }, 0);
    });
    document.getElementById('summaryClose')?.addEventListener('click', () => {
      document.getElementById('summaryCard').style.display = 'none';
    });
  }

  _updateActionBar(processing = false) {
    const $ = id => document.getElementById(id);
    $('enhanceBtn').disabled = !this._hasFile || processing;
    $('playBtn').disabled    = !this._hasFile || processing;
    $('abBtn').disabled      = !this._hasEnhanced || processing;
    $('dl16Btn').disabled    = !this._hasEnhanced || processing;
    $('dl24Btn').disabled    = !this._hasEnhanced || processing;
    $('abBtn').classList.toggle('active', this._abMode);
  }

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────────

  _initKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const stemActive = document.getElementById('tab-stem')?.style.display !== 'none';
      if (stemActive) return; // stem tab handles its own shortcuts
      if (e.key === ' ') {
        e.preventDefault();
        if (this._hasFile) this._togglePlayback();
      } else if (e.key === 'a' || e.key === 'A') {
        if (this._hasEnhanced) {
          this._abMode = !this._abMode;
          if (this._isPlaying) { this._stopPlayback(); this._startPlayback(); }
          this._updateActionBar();
        }
      } else if (e.key === 'd' || e.key === 'D') {
        if (this._hasEnhanced && this._masteredBuffer) {
          const name = this._baseName() + '_mastered_24bit.wav';
          downloadBlob(encodeWAV(this._masteredBuffer, 24), name);
          this._setStatus('Downloaded: ' + name, true);
        }
      }
    });
  }

  // ── Mastering ────────────────────────────────────────────────────────────────

  async _runMastering() {
    if (!this._originalBuffer) return;
    this._stopPlayback();
    document.getElementById('summaryCard').style.display = 'none';
    this._rnnoiseApplied = false;
    const t0 = performance.now();

    this._showProgress(0, 'Initializing mastering chain…');
    this._setStatus('Mastering in progress…', true, true);
    this._updateActionBar(true);
    document.getElementById('masterSeekLoading')?.classList.add('active');

    // ── Phase 1: optional RNNoise denoise ─────────────────────────────────────
    let preBuf = this._originalBuffer;
    if (this._toggles.denoise) {
      if (this._denoise.isAvailable) {
        this._showProgress(1, 'AI Denoise: resampling to 16 kHz…');
        try {
          preBuf = await this._denoise.process(this._originalBuffer, this._ae.context, p =>
            this._showProgress(1 + Math.round(p * 20), `AI Denoising… ${Math.round(p * 100)}%`)
          );
          this._rnnoiseApplied = true;
          this._showProgress(21, 'AI Denoise complete ✨');
          await this._sleep(150);
        } catch(err) {
          console.warn('[MasterTab] RNNoise error:', err.message);
          preBuf = this._originalBuffer;
        }
      } else if (this._denoise.isLoading) {
        this._showProgress(1, 'AI Denoise: WASM still loading, skipping…');
        await this._sleep(300);
      }
    }

    // ── Phase 2: offline render ───────────────────────────────────────────────
    const sr   = preBuf.sampleRate;
    const dur  = preBuf.duration;
    const nch  = Math.max(preBuf.numberOfChannels, 2);
    const offCtx = new OfflineAudioContext(nch, Math.ceil(dur * sr), sr);

    const srcNode = offCtx.createBufferSource();
    if (preBuf.numberOfChannels === 1) {
      const stBuf = offCtx.createBuffer(2, preBuf.length, sr);
      const mono  = preBuf.getChannelData(0);
      stBuf.copyToChannel(mono, 0);
      stBuf.copyToChannel(mono, 1);
      srcNode.buffer = stBuf;
    } else {
      srcNode.buffer = preBuf;
    }

    this._buildOfflineChain(offCtx, srcNode);
    srcNode.start(0);

    const steps = [
      [8,  'Applying high-pass filter (80 Hz)…'],
      [18, 'Equalizing bass frequencies…'],
      [28, 'Applying de-mud notch at 300 Hz…'],
      [38, 'Boosting presence at 3 kHz…'],
      [46, 'Adding air at 12 kHz…'],
      [55, 'Applying dynamics compression…'],
      [68, 'Peak limiting at -1 dBFS…'],
      [78, 'Applying output gain…'],
      [88, 'Rendering offline context…']
    ];
    let si = 0;
    const progInt = setInterval(() => {
      if (si < steps.length) { const [p, m] = steps[si++]; this._showProgress(p, m); }
    }, 180);

    let rendered;
    try {
      rendered = await offCtx.startRendering();
    } catch(e) {
      clearInterval(progInt);
      this._hideProgress();
      this._setStatus('Mastering failed: ' + e.message, false);
      this._updateActionBar();
      return;
    }
    clearInterval(progInt);

    // ── Phase 3: buffer-domain post-processing ────────────────────────────────
    this._showProgress(91, 'Applying M/S stereo widening…');
    this._applyStereoWidth(rendered);

    this._showProgress(94, 'Applying noise gate…');
    this._applyNoiseGate(rendered);

    if (this._toggles.denoise && !this._rnnoiseApplied) {
      this._showProgress(96, 'AI Denoise: applying spectral fallback…');
      this._applyWienerFallback(rendered);
    }

    this._showProgress(98, 'Computing loudness metrics…');
    await this._sleep(0);

    const origLUFS  = this._computeIntegratedLUFS(this._originalBuffer);
    const masterLUFS = this._computeIntegratedLUFS(rendered);
    const truePeak  = this._computeTruePeak(rendered);
    const lra       = this._computeLRA(rendered);
    const procTime  = ((performance.now() - t0) / 1000).toFixed(2);

    this._masteredBuffer = rendered;
    this._showProgress(100, 'Done!');
    await this._sleep(250);
    this._hideProgress();
    document.getElementById('masterSeekLoading')?.classList.remove('active');

    this._hasEnhanced = true;
    this._waveformAfter.draw(this._masteredBuffer);
    document.getElementById('waveAfterMsg').style.display    = 'none';
    document.getElementById('waveAfterDuration').textContent = this._fmtDuration(this._masteredBuffer.duration);

    this._lufsMeter.update({ integrated: masterLUFS, shortTerm: masterLUFS, lra, truePeak });
    this._showSummary({ masterLUFS, lufsGained: masterLUFS - origLUFS, truePeak, lra, procTime });
    this._updateActionBar();
    this._setStatus(`Mastered — ${masterLUFS.toFixed(1)} LUFS · ${truePeak.toFixed(1)} dBTP`, true);
  }

  /** Build the offline mastering chain: HPF → EQ → Compressor → Limiter → destination. */
  _buildOfflineChain(offCtx, srcNode) {
    const s = this._sliders;

    const hpf = offCtx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 80; hpf.Q.value = 0.707;

    const sub = offCtx.createBiquadFilter();
    sub.type = 'lowshelf'; sub.frequency.value = 60;
    sub.gain.value = s['eq-sub'] || 0;

    const bass = offCtx.createBiquadFilter();
    bass.type = 'lowshelf'; bass.frequency.value = 120;
    bass.gain.value = s['eq-bass'] || 0;

    const mid = offCtx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 1.0;
    mid.gain.value = s['eq-mid'] || 0;

    const highs = offCtx.createBiquadFilter();
    highs.type = 'peaking'; highs.frequency.value = 8000; highs.Q.value = 1.0;
    highs.gain.value = s['eq-highs'] || 0;

    const demud = offCtx.createBiquadFilter();
    demud.type = 'peaking'; demud.frequency.value = 300; demud.Q.value = 1.5;
    demud.gain.value = -((s['eq-demud'] || 0) / 100) * 12;

    const pres = offCtx.createBiquadFilter();
    pres.type = 'peaking'; pres.frequency.value = 3000; pres.Q.value = 1.2;
    pres.gain.value = s['eq-presence'] || 0;

    const air = offCtx.createBiquadFilter();
    air.type = 'highshelf'; air.frequency.value = 12000;
    air.gain.value = s['eq-air'] || 0;

    const comp = offCtx.createDynamicsCompressor();
    comp.threshold.value = s['comp-threshold'] || -18;
    comp.ratio.value     = s['comp-ratio'] || 4;
    comp.attack.value    = (s['comp-attack'] || 10) / 1000;
    comp.release.value   = (s['comp-release'] || 100) / 1000;
    comp.knee.value      = 6;

    const limiter = offCtx.createDynamicsCompressor();
    if (this._toggles.limiter) {
      limiter.threshold.value = -1;
      limiter.ratio.value     = 20;
      limiter.attack.value    = 0.001;
      limiter.release.value   = 0.05;
      limiter.knee.value      = 0;
    } else {
      limiter.threshold.value = 0;
      limiter.ratio.value     = 1;
      limiter.attack.value    = 0;
      limiter.release.value   = 0;
      limiter.knee.value      = 0;
    }

    const outGain = offCtx.createGain();
    outGain.gain.value = dbToGain(s['output-gain'] || 0);

    // Build dynamic chain — skip sub/mid/highs when at 0 to avoid phase rotation
    const chain = [hpf];
    if ((s['eq-sub']   || 0) !== 0) chain.push(sub);
    chain.push(bass);
    if ((s['eq-mid']   || 0) !== 0) chain.push(mid);
    if ((s['eq-highs'] || 0) !== 0) chain.push(highs);
    chain.push(demud, pres, air, comp, limiter, outGain);

    srcNode.connect(chain[0]);
    for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
    outGain.connect(offCtx.destination);
  }

  // ── Buffer-domain post-processing ────────────────────────────────────────────

  _applyStereoWidth(buf) {
    if (buf.numberOfChannels < 2) return;
    const w = (this._sliders['stereo-width'] || 100) / 100;
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let i = 0; i < L.length; i++) {
      const m = (L[i] + R[i]) * 0.5;
      const s = (L[i] - R[i]) * 0.5 * w;
      L[i] = m + s; R[i] = m - s;
    }
  }

  _applyNoiseGate(buf) {
    if (!this._toggles.gate) return;
    const thresh = Math.pow(10, -50 / 20);
    const sr = buf.sampleRate;
    const atk = Math.exp(-1 / (0.005 * sr));
    const rel = Math.exp(-1 / (0.1 * sr));
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      let env = 0;
      for (let i = 0; i < d.length; i++) {
        const lv = Math.abs(d[i]);
        env = lv > env ? atk * env + (1 - atk) * lv : rel * env + (1 - rel) * lv;
        if (env < thresh) d[i] *= Math.max(0, env / thresh);
      }
    }
  }

  _applyWienerFallback(buf) {
    const sr = buf.sampleRate;
    const profileLen = Math.min(Math.floor(0.2 * sr), buf.length);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      let nPow = 0;
      for (let i = 0; i < profileLen; i++) nPow += d[i] * d[i];
      nPow /= profileLen;
      const nAmp = Math.sqrt(nPow) * 2.5;
      for (let i = 0; i < d.length; i++) {
        const s = Math.abs(d[i]);
        d[i] *= Math.max(0, 1 - nAmp / Math.max(s, 1e-10));
      }
    }
  }

  // ── LUFS Computation ─────────────────────────────────────────────────────────

  _computeIntegratedLUFS(buf) {
    const sr = buf.sampleRate;
    const block = Math.floor(0.4 * sr), hop = Math.floor(0.1 * sr);
    const n = buf.length;
    const chs = [];
    for (let c = 0; c < Math.min(buf.numberOfChannels, 2); c++) chs.push(buf.getChannelData(c));
    const blocks = [];
    for (let s = 0; s + block <= n; s += hop) {
      let sq = 0;
      for (let c = 0; c < chs.length; c++)
        for (let i = s; i < s + block; i++) sq += chs[c][i] * chs[c][i];
      blocks.push(-0.691 + 10 * Math.log10(Math.max(sq / (block * chs.length), 1e-10)));
    }
    if (!blocks.length) return -Infinity;
    const g1 = blocks.filter(l => l >= -70);
    if (!g1.length) return -70;
    const um = g1.reduce((a, b) => a + Math.pow(10, b / 10), 0) / g1.length;
    const rt = 10 * Math.log10(um) - 10;
    const g2 = g1.filter(l => l >= rt);
    if (!g2.length) return -Infinity;
    return -0.691 + 10 * Math.log10(g2.reduce((a, b) => a + Math.pow(10, b / 10), 0) / g2.length);
  }

  _computeTruePeak(buf) {
    let mx = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > mx) mx = a; }
    }
    return 20 * Math.log10(Math.max(mx, 1e-10));
  }

  _computeLRA(buf) {
    const sr = buf.sampleRate;
    const block = Math.floor(3 * sr), hop = Math.floor(1 * sr), n = buf.length;
    const nch = Math.min(buf.numberOfChannels, 2);
    const st = [];
    for (let s = 0; s + block <= n; s += hop) {
      let sq = 0;
      for (let c = 0; c < nch; c++) {
        const d = buf.getChannelData(c);
        for (let i = s; i < s + block; i++) sq += d[i] * d[i];
      }
      st.push(-0.691 + 10 * Math.log10(Math.max(sq / (block * nch), 1e-10)));
    }
    if (st.length < 2) return 0;
    const g = st.filter(l => l >= -70).sort((a, b) => a - b);
    if (g.length < 2) return 0;
    return Math.max(0, g[Math.floor(g.length * 0.95)] - g[Math.floor(g.length * 0.10)]);
  }

  // ── Playback ─────────────────────────────────────────────────────────────────

  _startPlayback() {
    const ctx = this._ae.context;
    this._ae.resume();
    const buf = this._abMode ? this._originalBuffer : (this._masteredBuffer || this._originalBuffer);
    if (!buf) return;

    this._playSource = ctx.createBufferSource();
    this._playSource.buffer = buf;

    // Splitter for L/R peak metering
    const splitter = ctx.createChannelSplitter(2);
    const analyserL = ctx.createAnalyser(); analyserL.fftSize = 512; analyserL.smoothingTimeConstant = 0.5;
    const analyserR = ctx.createAnalyser(); analyserR.fftSize = 512; analyserR.smoothingTimeConstant = 0.5;

    this._playAnalyser = ctx.createAnalyser();
    this._playAnalyser.fftSize = 4096;
    this._playAnalyser.smoothingTimeConstant = 0.8;

    // source → analyser + splitter → destination (no EQ in live path — matches v6)
    this._playSource.connect(this._playAnalyser);
    this._playSource.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);
    this._playAnalyser.connect(ctx.destination);

    const startOff = this._playOffset % buf.duration;
    this._playSource.start(0, startOff);
    this._playStartTime = ctx.currentTime - startOff;

    this._playSource.onended = () => {
      if (this._isPlaying) { this._playOffset = 0; this._stopPlayback(); }
    };

    this._isPlaying = true;
    const btn = document.getElementById('playBtn');
    if (btn) {
      btn.querySelector('.play-btn-icon').textContent = '⏸';
      btn.querySelector('.play-btn-text').textContent = 'Pause';
    }
    document.getElementById('spectrumMsg').style.display = 'none';

    this._spectrum.start(this._playAnalyser);
    this._lufsMeter.startMonitoring(this._playAnalyser, analyserL, analyserR);
    this._seekbar.startAnimation(() => {
      const elapsed = ctx.currentTime - this._playStartTime;
      return Math.max(0, elapsed);
    });
  }

  _stopPlayback() {
    this._spectrum.stop();
    this._lufsMeter.stopMonitoring();
    this._seekbar.stopAnimation();

    if (this._playSource) {
      try { this._playSource.stop(); } catch(e) {}
      this._playSource = null;
    }
    this._playAnalyser = null;
    this._liveEqNodes  = null;
    this._isPlaying    = false;

    const btn = document.getElementById('playBtn');
    if (btn) {
      btn.querySelector('.play-btn-icon').textContent = '▶';
      btn.querySelector('.play-btn-text').textContent = 'Preview';
    }

    // Update seekbar to paused position
    const buf = this._abMode ? this._originalBuffer : (this._masteredBuffer || this._originalBuffer);
    if (buf && isFinite(this._playOffset)) {
      this._seekbar.update(this._playOffset, buf.duration);
    }
    this._spectrum.clear();
  }

  _togglePlayback() {
    if (this._isPlaying) {
      const ctx = this._ae.context;
      this._playOffset = Math.max(0, ctx.currentTime - this._playStartTime);
      this._stopPlayback();
    } else {
      this._startPlayback();
    }
  }

  // ── Seekbar Callbacks ────────────────────────────────────────────────────────

  _onSeek(pos) {
    if (pos < 0) {
      // drag start — pause and remember wasPlaying
      this._seekWasPlaying = this._isPlaying;
      if (this._isPlaying) {
        const ctx = this._ae.context;
        this._playOffset = Math.max(0, ctx.currentTime - this._playStartTime);
        this._stopPlayback();
      }
    } else {
      // drag end — seek to new position
      this._playOffset = pos;
      if (this._seekWasPlaying) this._startPlayback();
      this._seekWasPlaying = false;
    }
  }

  // ── RNNoise Badge ────────────────────────────────────────────────────────────

  _updateRNNoiseBadge(mode) {
    const badge = document.getElementById('rnnoiseStatus');
    const item  = document.getElementById('toggle-denoise');
    const desc  = document.getElementById('denoiseDesc');
    if (!badge || !item) return;

    item.classList.remove('rn-loading', 'rn-unavailable');
    badge.style.display = 'none';
    badge.className = 'rnnoise-badge';

    if (mode === 'loading') {
      badge.innerHTML = '<span class="rn-spin">⟳</span> Loading';
      badge.classList.add('badge-loading');
      badge.style.display = '';
      item.classList.add('rn-loading');
    } else if (mode === 'unavailable') {
      badge.textContent = 'Unavailable';
      badge.classList.add('badge-unavail');
      badge.style.display = '';
      item.classList.add('rn-unavailable');
      if (desc) desc.textContent = 'Unavailable in this browser';
      this._toggles.denoise = false;
      const el = document.getElementById('toggle-denoise');
      if (el) { el.classList.remove('on'); el.setAttribute('aria-checked', 'false'); }
    }
  }

  // ── Tooltips ─────────────────────────────────────────────────────────────────

  _initTooltips() {
    const bubble = document.getElementById('tipBubble');
    if (!bubble) return;
    let activeIcon = null, hideTimer = null;

    const showTip = target => {
      const text = target.dataset.tip;
      if (!text) return;
      clearTimeout(hideTimer);
      if (activeIcon && activeIcon !== target) activeIcon.classList.remove('tip-active');
      activeIcon = target;
      target.classList.add('tip-active');
      bubble.textContent = text;
      bubble.classList.add('visible');
      const rect = target.getBoundingClientRect();
      const bw = bubble.offsetWidth || 260, bh = bubble.offsetHeight || 60, gap = 8;
      let left = rect.left + rect.width / 2 - bw / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
      const top = rect.top - bh - gap >= 8 ? rect.top - bh - gap : rect.bottom + gap;
      bubble.style.left = left + 'px';
      bubble.style.top  = top  + 'px';
    };
    const hideTip = () => {
      hideTimer = setTimeout(() => {
        bubble.classList.remove('visible');
        if (activeIcon) { activeIcon.classList.remove('tip-active'); activeIcon = null; }
      }, 120);
    };

    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-tip]'); if (t) showTip(t);
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('[data-tip]')) hideTip();
    });
    document.addEventListener('click', e => {
      const t = e.target.closest('.tip-icon[data-tip]');
      if (!t) return;
      e.stopPropagation();
      if (t === activeIcon && bubble.classList.contains('visible')) hideTip(); else showTip(t);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-tip]') && bubble.classList.contains('visible')) hideTip();
    });
  }

  // ── Resize ───────────────────────────────────────────────────────────────────

  _initResizeObserver() {
    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (this._originalBuffer) this._waveformBefore.draw(this._originalBuffer);
        if (this._masteredBuffer) this._waveformAfter.draw(this._masteredBuffer);
        if (!this._isPlaying) this._spectrum.clear();
      }, 150);
    });
  }

  // ── Progress & Summary ───────────────────────────────────────────────────────

  _showProgress(pct, msg) {
    const wrap = document.getElementById('progressWrap');
    if (wrap) wrap.style.display = 'block';
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = pct + '%';
    const pctEl = document.getElementById('progressPct');
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    const msgEl = document.getElementById('progressMsg');
    if (msgEl) msgEl.textContent = msg;
  }

  _hideProgress() {
    const wrap = document.getElementById('progressWrap');
    if (wrap) wrap.style.display = 'none';
  }

  _showSummary({ masterLUFS, lufsGained, truePeak, lra, procTime }) {
    const f = v => isFinite(v) ? v.toFixed(1) : '—';
    document.getElementById('sumLUFS').textContent = f(masterLUFS) + ' LUFS';
    const gEl = document.getElementById('sumGained');
    gEl.textContent = (lufsGained >= 0 ? '+' : '') + f(lufsGained) + ' LU';
    gEl.className = 'summary-val' + (lufsGained > 6 ? ' warn' : '');
    const tpEl = document.getElementById('sumPeak');
    tpEl.textContent = f(truePeak) + ' dBTP';
    tpEl.className = 'summary-val' + (truePeak > -1 ? ' hot' : truePeak > -3 ? ' warn' : '');
    document.getElementById('sumLRA').textContent   = f(lra) + ' LU';
    document.getElementById('sumWidth').textContent = Math.round(this._sliders['stereo-width'] || 100) + '%';
    document.getElementById('sumTime').textContent  = procTime + 's';
    document.getElementById('summaryDenoiseNote').style.display = this._rnnoiseApplied ? '' : 'none';
    document.getElementById('summaryCard').style.display = 'block';
  }

  // ── Status ───────────────────────────────────────────────────────────────────

  _setStatus(msg, ready = true, processing = false) {
    const text = document.getElementById('statusText');
    if (text) text.textContent = msg;
    const dot = document.getElementById('statusDot');
    if (dot) dot.className = 'status-dot' + (processing ? ' processing' : ready ? ' ready' : '');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _fmtDuration(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  _fmtBytes(b) {
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
  }

  _baseName() {
    return this._currentFile
      ? this._currentFile.name.replace(/\.[^.]+$/, '')
      : 'soniq';
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /** Persist current slider/toggle/preset state to localStorage. */
  _save() { saveState(STORAGE_KEY, this.getState()); }
}
