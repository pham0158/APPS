// ── Exporter ──────────────────────────────────────────────────────────────────
// Offline rendering + WAV encoding for the master chain and stem mixer.
// JSZip is loaded from CDN on demand for ZIP export.

import { encodeWAV, downloadBlob } from '../utils/wav.js';

const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

export default class Exporter {
  /**
   * @param {import('./AudioEngine.js').default} audioEngine
   */
  constructor(audioEngine) {
    this._engine = audioEngine;
  }

  // ── Master export ─────────────────────────────────────────────────────────

  /**
   * Render the master chain offline and return a WAV Blob.
   *
   * @param {AudioBuffer} sourceBuffer   Original decoded audio
   * @param {object}      settings       Master settings snapshot
   *   @param {object}  settings.sliders  { 'eq-sub', 'eq-bass', … }
   *   @param {object}  settings.toggles  { denoise, limiter, gate }
   * @param {16|24}       bitDepth
   * @param {function}    [onProgress]   Called with (pct: 0–100, msg: string)
   * @returns {Promise<Blob>}  WAV Blob
   */
  async exportMaster(sourceBuffer, settings, bitDepth, onProgress) {
    onProgress?.(0, 'Initializing mastering chain…');

    const sr  = sourceBuffer.sampleRate;
    const dur = sourceBuffer.duration;
    const nch = Math.max(sourceBuffer.numberOfChannels, 2);
    const offCtx = new OfflineAudioContext(nch, Math.ceil(dur * sr), sr);

    // Upmix mono → stereo if needed
    const srcNode = offCtx.createBufferSource();
    if (sourceBuffer.numberOfChannels === 1) {
      const stBuf = offCtx.createBuffer(2, sourceBuffer.length, sr);
      const mono  = sourceBuffer.getChannelData(0);
      stBuf.copyToChannel(mono, 0);
      stBuf.copyToChannel(mono, 1);
      srcNode.buffer = stBuf;
    } else {
      srcNode.buffer = sourceBuffer;
    }

    this.buildOfflineChain(offCtx, srcNode, settings);
    srcNode.start(0);

    onProgress?.(10, 'Rendering offline context…');
    const rendered = await offCtx.startRendering();

    // M/S stereo widening (buffer-domain post-render)
    onProgress?.(90, 'Applying stereo widening…');
    const w = (settings.sliders?.['stereo-width'] ?? 100) / 100;
    _applyStereoWidth(rendered, w);

    // Noise gate (buffer-domain)
    if (settings.toggles?.gate) {
      onProgress?.(94, 'Applying noise gate…');
      _applyNoiseGate(rendered);
    }

    onProgress?.(98, 'Encoding WAV…');
    return encodeWAV(rendered, bitDepth);
  }

  // ── Stem export ───────────────────────────────────────────────────────────

  /**
   * Render each stem through its per-stem chain + shared master bus offline,
   * then return individual WAV Blobs and the mixed master Blob.
   *
   * @param {Map<number, AudioBuffer>} stemBuffers    stem.id → AudioBuffer
   * @param {object[]}                 stemSettings   Array of stem state objects
   * @param {object}                   masterSettings { sliders, toggles }
   * @param {16|24}                    bitDepth
   * @param {function}                 [onProgress]
   * @returns {Promise<{ master: Blob, stems: Array<{ name: string, blob: Blob }> }>}
   */
  async exportStems(stemBuffers, stemSettings, masterSettings, bitDepth, onProgress) {
    const ready = stemSettings.filter(s => stemBuffers.has(s.id));
    if (!ready.length) throw new Error('No stems with loaded audio');

    const limOn   = masterSettings.toggles?.limiter ?? true;
    const sr      = ready[0] ? stemBuffers.get(ready[0].id).sampleRate : 44100;
    const dur     = Math.max(...ready.map(s => stemBuffers.get(s.id).duration));
    const widthW  = (masterSettings.sliders?.['stereo-width'] ?? 100) / 100;

    const stemBlobs = [];

    for (let i = 0; i < ready.length; i++) {
      const s   = ready[i];
      const buf = stemBuffers.get(s.id);
      onProgress?.((i / ready.length) * 90, `Encoding ${s.name}… (${i + 1}/${ready.length})`);

      const nch    = Math.max(buf.numberOfChannels, 2);
      const offCtx = new OfflineAudioContext(nch, Math.ceil(dur * sr), sr);
      const padBuf = _padBuffer(offCtx, buf, nch, Math.ceil(dur * sr), sr);
      const src    = offCtx.createBufferSource();
      src.buffer   = padBuf;

      const chainOut = _buildOfflineStemChain(offCtx, s, src);
      const masterIn = offCtx.createGain();
      chainOut.connect(masterIn);
      _buildOfflineStemMasterBus(offCtx, masterIn, limOn, masterSettings.sliders ?? {});
      src.start(0);

      let rendered = await offCtx.startRendering();
      _applyStereoWidth(rendered, widthW);

      stemBlobs.push({ name: s.name, blob: encodeWAV(rendered, bitDepth) });
      await new Promise(r => setTimeout(r, 0)); // yield to UI
    }

    // Build master mix
    onProgress?.(92, 'Rendering master mix…');
    const nch    = 2;
    const offCtx = new OfflineAudioContext(nch, Math.ceil(dur * sr), sr);
    const mixBus = offCtx.createGain();
    for (const s of ready) {
      const buf    = stemBuffers.get(s.id);
      const padBuf = _padBuffer(offCtx, buf, Math.max(buf.numberOfChannels, 2), Math.ceil(dur * sr), sr);
      const src    = offCtx.createBufferSource();
      src.buffer   = padBuf;
      const out    = _buildOfflineStemChain(offCtx, s, src);
      out.connect(mixBus);
      src.start(0);
    }
    _buildOfflineStemMasterBus(offCtx, mixBus, limOn, masterSettings.sliders ?? {});
    let mix = await offCtx.startRendering();
    _applyStereoWidth(mix, widthW);

    onProgress?.(99, 'Encoding master mix…');
    const masterBlob = encodeWAV(mix, bitDepth);

    return { master: masterBlob, stems: stemBlobs };
  }

  /**
   * ZIP stem WAV Blobs using JSZip (loaded from CDN on demand).
   *
   * @param {Array<{ name: string, blob: Blob }>} stemBlobs
   * @returns {Promise<Blob>}  ZIP Blob
   */
  async createZip(stemBlobs) {
    await _loadJSZip();
    // eslint-disable-next-line no-undef
    const zip = new JSZip();
    for (const { name, blob } of stemBlobs) {
      zip.file(`${name}.wav`, await blob.arrayBuffer());
    }
    return zip.generateAsync({ type: 'blob' });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  /**
   * Build the full master processing chain in an OfflineAudioContext.
   * Chain: HPF → EQ (8 bands) → Compressor → Limiter → OutputGain → destination
   *
   * @param {OfflineAudioContext} offCtx
   * @param {AudioBufferSourceNode} srcNode  Already connected to offCtx
   * @param {object} settings  { sliders, toggles }
   */
  buildOfflineChain(offCtx, srcNode, settings) {
    const sl  = settings.sliders  ?? {};
    const tog = settings.toggles  ?? {};

    const hpf = offCtx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 80; hpf.Q.value = 0.707;

    const sub = offCtx.createBiquadFilter();
    sub.type = 'lowshelf'; sub.frequency.value = 60;
    sub.gain.value = sl['eq-sub'] ?? 0;

    const bass = offCtx.createBiquadFilter();
    bass.type = 'peaking'; bass.frequency.value = 200; bass.Q.value = 1.0;
    bass.gain.value = sl['eq-bass'] ?? 0;

    const mid = offCtx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 1.0;
    mid.gain.value = sl['eq-mid'] ?? 0;

    const highs = offCtx.createBiquadFilter();
    highs.type = 'peaking'; highs.frequency.value = 8000; highs.Q.value = 1.0;
    highs.gain.value = sl['eq-highs'] ?? 0;

    const demud = offCtx.createBiquadFilter();
    demud.type = 'peaking'; demud.frequency.value = 300; demud.Q.value = 1.5;
    demud.gain.value = -((sl['eq-demud'] ?? 0) / 100) * 10;

    const pres = offCtx.createBiquadFilter();
    pres.type = 'peaking'; pres.frequency.value = 3500; pres.Q.value = 1.2;
    pres.gain.value = sl['eq-presence'] ?? 0;

    const air = offCtx.createBiquadFilter();
    air.type = 'highshelf'; air.frequency.value = 12000;
    air.gain.value = sl['eq-air'] ?? 0;

    const comp = offCtx.createDynamicsCompressor();
    comp.threshold.value = sl['comp-threshold'] ?? -18;
    comp.ratio.value     = sl['comp-ratio']     ?? 4;
    comp.attack.value    = (sl['comp-attack']   ?? 10)  / 1000;
    comp.release.value   = (sl['comp-release']  ?? 100) / 1000;
    comp.knee.value      = 6;

    const limiter = offCtx.createDynamicsCompressor();
    if (tog.limiter) {
      limiter.threshold.value = -1;  limiter.ratio.value   = 20;
      limiter.attack.value    = 0.001; limiter.release.value = 0.05;
      limiter.knee.value      = 0;
    } else {
      limiter.threshold.value = 0; limiter.ratio.value   = 1;
      limiter.attack.value    = 0; limiter.release.value = 0;
      limiter.knee.value      = 0;
    }

    const gain = offCtx.createGain();
    gain.gain.value = Math.pow(10, (sl['output-gain'] ?? 0) / 20);

    srcNode.connect(hpf);
    hpf.connect(sub); sub.connect(bass); bass.connect(mid); mid.connect(highs);
    highs.connect(demud); demud.connect(pres); pres.connect(air);
    air.connect(comp); comp.connect(limiter); limiter.connect(gain);
    gain.connect(offCtx.destination);
  }
}

// ── Module-private helpers ────────────────────────────────────────────────────

function _applyStereoWidth(buf, w) {
  if (buf.numberOfChannels < 2) return;
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  for (let i = 0; i < L.length; i++) {
    const m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5 * w;
    L[i] = m + s; R[i] = m - s;
  }
}

function _applyNoiseGate(buf) {
  const thresh = Math.pow(10, -50 / 20);
  const sr = buf.sampleRate;
  const atk = Math.exp(-1 / (0.005 * sr));
  const rel = Math.exp(-1 / (0.1   * sr));
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

/** Pad (or trim) a buffer to `len` samples, upmixing mono→stereo as needed. */
function _padBuffer(offCtx, buf, nch, len, sr) {
  const out = offCtx.createBuffer(nch, len, sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(0, Math.min(src.length, len)));
  }
  if (buf.numberOfChannels === 1 && nch >= 2)
    out.copyToChannel(out.getChannelData(0), 1);
  return out;
}

/**
 * Build a per-stem processing chain in an OfflineAudioContext.
 * Chain: vol → pan → HPF → bass EQ → presence EQ → air EQ → compressor → mute
 * Returns the last node (mute gain) so the caller can route it to a mix bus.
 */
function _buildOfflineStemChain(offCtx, s, srcNode) {
  const vol = offCtx.createGain();
  vol.gain.value = s.volume / 100;

  const pan = offCtx.createStereoPanner();
  pan.pan.value = s.pan / 100;

  const hpf = offCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = s.eqEnabled ? s.eq.hpf : 20;
  hpf.Q.value = 0.707;

  const low = offCtx.createBiquadFilter();
  low.type = 'lowshelf'; low.frequency.value = 200;
  low.gain.value = s.eqEnabled ? s.eq.bass : 0;

  const prs = offCtx.createBiquadFilter();
  prs.type = 'peaking'; prs.frequency.value = 3000; prs.Q.value = 1;
  prs.gain.value = s.eqEnabled ? s.eq.pres : 0;

  const airEq = offCtx.createBiquadFilter();
  airEq.type = 'highshelf'; airEq.frequency.value = 10000;
  airEq.gain.value = s.eqEnabled ? s.eq.air : 0;

  const comp = offCtx.createDynamicsCompressor();
  if (s.compEnabled) {
    comp.threshold.value = s.comp.thr;
    comp.ratio.value     = s.comp.rat;
    comp.attack.value    = s.comp.atk / 1000;
    comp.release.value   = s.comp.rel / 1000;
    comp.knee.value      = 6;
  }

  const mute = offCtx.createGain();
  mute.gain.value = (s.muted) ? 0 : 1;

  srcNode.connect(vol);
  vol.connect(pan); pan.connect(hpf); hpf.connect(low);
  low.connect(prs); prs.connect(airEq); airEq.connect(comp); comp.connect(mute);
  return mute;
}

/**
 * Build the stem master bus chain (same topology as the master tab) and connect
 * it directly to offCtx.destination.
 */
function _buildOfflineStemMasterBus(offCtx, inputNode, limOn, sliders) {
  const gv = (id, def = 0) => parseFloat(sliders[id] ?? def);

  const hpf   = offCtx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = 80; hpf.Q.value = 0.707;

  const sub   = offCtx.createBiquadFilter();
  sub.type = 'lowshelf'; sub.frequency.value = 60; sub.gain.value = gv('smt-sub');

  const bass  = offCtx.createBiquadFilter();
  bass.type = 'peaking'; bass.frequency.value = 200; bass.Q.value = 1; bass.gain.value = gv('smt-bass');

  const mid   = offCtx.createBiquadFilter();
  mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 1; mid.gain.value = gv('smt-mid');

  const highs = offCtx.createBiquadFilter();
  highs.type = 'peaking'; highs.frequency.value = 8000; highs.Q.value = 1; highs.gain.value = gv('smt-highs');

  const demud = offCtx.createBiquadFilter();
  demud.type = 'peaking'; demud.frequency.value = 300; demud.Q.value = 1.5;
  demud.gain.value = -(gv('smt-demud') / 100) * 10;

  const pres  = offCtx.createBiquadFilter();
  pres.type = 'peaking'; pres.frequency.value = 3500; pres.Q.value = 1.2; pres.gain.value = gv('smt-pres');

  const airEq = offCtx.createBiquadFilter();
  airEq.type = 'highshelf'; airEq.frequency.value = 12000; airEq.gain.value = gv('smt-air');

  const comp  = offCtx.createDynamicsCompressor();
  comp.threshold.value = gv('smt-thr', -18); comp.ratio.value = gv('smt-rat', 4);
  comp.attack.value    = gv('smt-atk', 10) / 1000;
  comp.release.value   = gv('smt-rel', 100) / 1000;
  comp.knee.value      = 6;

  const lim   = offCtx.createDynamicsCompressor();
  lim.threshold.value = limOn ? -1  : 0;
  lim.ratio.value     = limOn ? 20  : 1;
  lim.attack.value    = limOn ? 0.001 : 0;
  lim.release.value   = limOn ? 0.05  : 0;
  lim.knee.value      = 0;

  const out = offCtx.createGain();
  out.gain.value = Math.pow(10, gv('smt-gain', 0) / 20);

  inputNode.connect(hpf);
  hpf.connect(sub); sub.connect(bass); bass.connect(mid); mid.connect(highs);
  highs.connect(demud); demud.connect(pres); pres.connect(airEq);
  airEq.connect(comp); comp.connect(lim); lim.connect(out);
  out.connect(offCtx.destination);
}

/** Dynamically load JSZip from CDN (resolves immediately if already loaded). */
function _loadJSZip() {
  if (typeof window !== 'undefined' && typeof window.JSZip === 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${JSZIP_CDN}"]`)) { resolve(); return; }
    const s    = document.createElement('script');
    s.src      = JSZIP_CDN;
    s.onload   = resolve;
    s.onerror  = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(s);
  });
}
