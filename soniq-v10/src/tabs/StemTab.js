// ── StemTab ───────────────────────────────────────────────────────────────────
// Stem Mixer tab — multi-stem drop zone, per-stem controls, master bus, export.

import Denoise     from '../audio/Denoise.js';
import { PRESETS } from '../ui/Presets.js';
import { stemFormatParam, formatSlider } from '../utils/format.js';
import { encodeWAV, downloadBlob }       from '../utils/wav.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_STEMS = 8;
const STEM_COLORS = { vocals:'#ff6b9d', guitar:'#ff9a3c', bass:'#4da6ff', drums:'#ff4d4d', keys:'#ffd700', other:'#8888a8' };
const STEM_ICONS  = { vocals:'🎤', guitar:'🎸', bass:'🎵', drums:'🥁', keys:'🎹', other:'🎼' };
const SMT_MAP = {
  'smt-sub':   'eq-sub',   'smt-bass':  'eq-bass',  'smt-mid':   'eq-mid',
  'smt-highs': 'eq-highs', 'smt-pres':  'eq-presence', 'smt-air': 'eq-air',
  'smt-demud': 'eq-demud', 'smt-thr':   'comp-threshold', 'smt-rat': 'comp-ratio',
  'smt-atk':   'comp-attack', 'smt-rel': 'comp-release',
  'smt-width': 'stereo-width', 'smt-gain': 'output-gain'
};

// ── Stem helpers ──────────────────────────────────────────────────────────────
function detectStemType(filename) {
  const f = filename.toLowerCase();
  if (/vocal|vox|voice|sing|lead|bgv|bv|chorus/.test(f)) return 'vocals';
  if (/guitar|gtr|gtrs/.test(f))   return 'guitar';
  if (/bass|sub|808/.test(f))      return 'bass';
  if (/drum|kick|snare|hihat|perc/.test(f)) return 'drums';
  if (/keys|piano|synth|pad|organ|chord/.test(f)) return 'keys';
  return 'other';
}
function cleanStemName(filename) {
  let n = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return n.length > 22 ? n.slice(0, 22) + '…' : n;
}
let _sid = 1;
function makeStem(file) {
  const type = detectStemType(file.name);
  return {
    id: _sid++, name: cleanStemName(file.name), type, color: STEM_COLORS[type],
    filename: file.name, fileSize: file.size,
    volume: 100, pan: 0, muted: false, soloed: false,
    eqEnabled: false, eqOpen: false, eq: { hpf: 80, bass: 0, pres: 0, air: 0 },
    compEnabled: false, compOpen: false, comp: { thr: -18, rat: 4, atk: 10, rel: 100 },
    reverb: 0, width: 100, denoise: false, humanize: false, humanizeIntensity: 50
  };
}

// ── Format helpers ────────────────────────────────────────────────────────────
const _fmtT  = s => { if (!isFinite(s)||s<0) s=0; s=Math.floor(s); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
const _fmtHz = v => parseInt(v)+' Hz';
const _fmtDb = v => { v=parseFloat(v); return (v>0?'+':'')+v+' dB'; };
const _fmtMs = v => parseFloat(v)+' ms';
const _fmtRt = v => parseFloat(v)+':1';
const _fmtPn = v => { v=parseInt(v); return v===0?'C':v>0?'R'+v:'L'+Math.abs(v); };
const _fmtB  = b => b<1048576?(b/1024).toFixed(0)+' KB':(b/1048576).toFixed(1)+' MB';
function _fmtSl(id, val) {
  val = parseFloat(val);
  if (id==='eq-demud'||id==='stereo-width') return Math.round(val)+'%';
  if (id==='comp-ratio') return val+':1';
  if (id==='comp-attack'||id==='comp-release') return val+' ms';
  return (val>0?'+':'')+val+' dB';
}
function _fill(sl, color) {
  if (!sl) return;
  const pct = ((+sl.value - +sl.min) / (+sl.max - +sl.min)) * 100;
  sl.style.background = `linear-gradient(to right,${color||'var(--accent)'} ${pct}%,var(--knob-track) ${pct}%)`;
}

// ── LUFS / peak helpers ────────────────────────────────────────────────────────
function _lufs(buf) {
  const sr=buf.sampleRate, block=Math.floor(0.4*sr), hop=Math.floor(0.1*sr), n=buf.length;
  const chs=[]; for(let c=0;c<Math.min(buf.numberOfChannels,2);c++) chs.push(buf.getChannelData(c));
  const blks=[];
  for(let s=0;s+block<=n;s+=hop){let sq=0;for(let c=0;c<chs.length;c++)for(let i=s;i<s+block;i++)sq+=chs[c][i]*chs[c][i];blks.push(-0.691+10*Math.log10(Math.max(sq/(block*chs.length),1e-10)));}
  if(!blks.length)return -Infinity;
  const g1=blks.filter(l=>l>=-70); if(!g1.length)return -70;
  const um=g1.reduce((a,b)=>a+Math.pow(10,b/10),0)/g1.length;
  const g2=g1.filter(l=>l>=10*Math.log10(um)-10); if(!g2.length)return -Infinity;
  return -0.691+10*Math.log10(g2.reduce((a,b)=>a+Math.pow(10,b/10),0)/g2.length);
}
function _peak(buf) {
  let mx=0; for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>mx)mx=a;}}
  return 20*Math.log10(Math.max(mx,1e-10));
}
function _lra(buf) {
  const sr=buf.sampleRate,block=Math.floor(3*sr),hop=sr,n=buf.length,nch=Math.min(buf.numberOfChannels,2);
  const st=[];
  for(let s=0;s+block<=n;s+=hop){let sq=0;for(let c=0;c<nch;c++){const d=buf.getChannelData(c);for(let i=s;i<s+block;i++)sq+=d[i]*d[i];}st.push(-0.691+10*Math.log10(Math.max(sq/(block*nch),1e-10)));}
  if(st.length<2)return 0;
  const g=st.filter(l=>l>=-70).sort((a,b)=>a-b); if(g.length<2)return 0;
  return Math.max(0,g[Math.floor(g.length*0.95)]-g[Math.floor(g.length*0.10)]);
}
function _lufsData(L,R,sr) {
  const block=Math.floor(0.4*sr),hop=Math.floor(0.1*sr),n=L.length,blks=[];
  for(let s=0;s+block<=n;s+=hop){let sq=0;for(let i=s;i<s+block;i++)sq+=L[i]*L[i]+R[i]*R[i];blks.push(-0.691+10*Math.log10(Math.max(sq/(block*2),1e-10)));}
  if(!blks.length)return -Infinity;
  const g1=blks.filter(l=>l>=-70); if(!g1.length)return -70;
  const um=g1.reduce((a,b)=>a+Math.pow(10,b/10),0)/g1.length;
  const g2=g1.filter(l=>l>=10*Math.log10(um)-10); if(!g2.length)return -Infinity;
  return -0.691+10*Math.log10(g2.reduce((a,b)=>a+Math.pow(10,b/10),0)/g2.length);
}

// ── Humanize buffer helpers ────────────────────────────────────────────────────
function _humanize(buf, s) {
  for(let c=0;c<buf.numberOfChannels;c++){
    const d=buf.getChannelData(c);
    // gain envelope
    const bsz=441;
    for(let i=0;i<d.length;i+=bsz){const vel=1+(Math.random()-0.5)*2*(s.humanizeIntensity/100)*0.06;const en=Math.min(i+bsz,d.length);for(let j=i;j<en;j++)d[j]*=vel;}
    // wow/flutter
    const spd=0.3+Math.random()*0.4,dep=(s.humanizeIntensity/100)*0.003,sr=buf.sampleRate;
    const out=new Float32Array(d.length);
    for(let i=0;i<d.length;i++){const mod=1+dep*Math.sin(2*Math.PI*spd*(i/sr));const si=Math.floor(i*mod),fr=i*mod-si;const a=d[Math.min(si,d.length-1)],b2=d[Math.min(si+1,d.length-1)];out[i]=a+fr*(b2-a);}
    d.set(out);
  }
}
function _stereoWidth(buf, w) {
  if(buf.numberOfChannels<2)return;
  const L=buf.getChannelData(0),R=buf.getChannelData(1);
  for(let i=0;i<L.length;i++){const m=(L[i]+R[i])*0.5,s=(L[i]-R[i])*0.5*w;L[i]=m+s;R[i]=m-s;}
}

// ═════════════════════════════════════════════════════════════════════════════
export default class StemTab {
  constructor(audioEngine, { denoise = null } = {}) {
    this._ae      = audioEngine;
    this._ctx     = audioEngine.context;
    this._denoise = denoise || new Denoise();
    this._stems   = [];
    this._stemBuf = new Map();   // id → AudioBuffer
    this._stemNd  = new Map();   // id → audio node bag
    this._master  = null;        // stem master bus
    this._reverbIR = null;
    this._isPlaying = false;
    this._playOff   = 0;
    this._playStart = 0;
    this._maxDur    = 0;
    this._seekDrag  = false;
    this._seekWas   = false;
    this._lufsHist  = [];
    this._clockId   = null;
    this._seekRaf   = null;
    this._specRaf   = null;
    this._lufsInt   = null;
    this._el        = null;
    this._denoise.load();
  }

  render() {
    const wrap = document.createElement('div');
    wrap.innerHTML = this._html();
    this._el = wrap;
    return wrap;
  }

  init() {
    this._buildMasterBus();
    this._initDrop();
    this._initTransport();
    this._initSeekbar();
    this._initMasterPanel();
    this._initResets();
    this._initKeyboard();
  }

  getState()      { return { stems: this._stems.map(s => ({ ...s, eq:{...s.eq}, comp:{...s.comp} })) }; }
  loadState(_s)   { /* file-based, no-op */ }

  // ── HTML ──────────────────────────────────────────────────────────────────
  _slRow(id, lbl, min, max, step, def, display) {
    return `<div class="sl-row"><span class="sl-lbl">${lbl}</span><div class="sl-wrap"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${def}"></div><span class="sl-val" id="sv-${id}">${display}</span></div>`;
  }

  _html() { return `
<div>
  <div class="section-hdr">
    <span class="section-title">🎚️ Stem Tracks</span>
    <div style="display:flex;gap:8px;align-items:center;">
      <span id="stemCount" style="font-size:11px;color:var(--text-dim)">0 / 8 stems</span>
      <button class="reset-btn" id="resetAllStemsBtn" style="display:none" title="Reset all stems">↺ Reset All Stems</button>
      <button class="btn btn-secondary btn-sm" id="clearAllBtn" style="display:none">Clear All</button>
    </div>
  </div>
  <div class="drop-zone-empty" id="stemDropZone">
    <div class="drop-icon-xl">🎛️</div>
    <h2>Drop your stem files here</h2>
    <p>Drop up to 8 WAV files — stem type auto-detected from filename</p>
    <div class="type-badges">
      <span class="type-badge" style="color:#ff6b9d;border-color:color-mix(in srgb,#ff6b9d 35%,transparent)">🎤 Vocals</span>
      <span class="type-badge" style="color:#ff9a3c;border-color:color-mix(in srgb,#ff9a3c 35%,transparent)">🎸 Guitar</span>
      <span class="type-badge" style="color:#4da6ff;border-color:color-mix(in srgb,#4da6ff 35%,transparent)">🎵 Bass</span>
      <span class="type-badge" style="color:#ff4d4d;border-color:color-mix(in srgb,#ff4d4d 35%,transparent)">🥁 Drums</span>
      <span class="type-badge" style="color:#ffd700;border-color:color-mix(in srgb,#ffd700 35%,transparent)">🎹 Keys</span>
      <span class="type-badge" style="color:#8888a8;border-color:color-mix(in srgb,#8888a8 35%,transparent)">🎼 Other</span>
    </div>
    <input type="file" id="stemFileInput" multiple accept=".wav,audio/wav" style="display:none">
  </div>
  <div id="stemsList" style="display:none;grid-template-columns:1fr;gap:10px;"></div>
  <div class="add-stem-bar" id="addStemBar">
    <span style="font-size:16px">＋</span>
    <span id="addStemLabel">Add another stem</span>
    <input type="file" id="addFileInput" multiple accept=".wav,audio/wav" style="display:none">
  </div>
</div>

<div class="stem-transport" id="stemTransport" style="display:none">
  <div class="stem-transport-controls">
    <button class="stem-play-btn" id="stemPlayBtn" disabled>▶</button>
    <div style="flex:1;min-width:0;">
      <div class="stem-transport-time" id="stemTransportTime">0:00</div>
      <div class="stem-transport-sub" id="stemTransportSub">0:00 / 0:00</div>
    </div>
    <button class="btn btn-secondary btn-sm" id="stemAbBtn" disabled>🔀 A/B</button>
    <div class="exp-wrap">
      <button class="btn btn-secondary btn-sm" id="stemExportBtn" disabled>⬇ Export ▾</button>
      <div class="exp-menu" id="stemExpMenu">
        <div class="exp-item" id="stemExp24">⬇ Export Mix — 24-bit WAV</div>
        <div class="exp-item" id="stemExp16">⬇ Export Mix — 16-bit WAV</div>
        <div class="exp-sep"></div>
        <div class="exp-item" id="stemExpStems24">📦 Stems ZIP — 24-bit WAV</div>
        <div class="exp-item" id="stemExpStems16">📦 Stems ZIP — 16-bit WAV</div>
      </div>
    </div>
  </div>
  <div class="seekbar-row" id="stemSeekRow">
    <span class="seekbar-time" id="stemSeekCur">0:00</span>
    <div class="seekbar-track-wrap">
      <div class="seekbar-loading-bar" id="stemSeekLoading"></div>
      <input type="range" class="seekbar" id="stemSeek" min="0" max="1000" step="1" value="0">
    </div>
    <span class="seekbar-time right" id="stemSeekDur">0:00</span>
  </div>
</div>

<div class="progress-wrap" id="stemProgressWrap" style="display:none">
  <div class="progress-header">
    <span class="progress-title">Exporting Stems</span>
    <span class="progress-pct" id="stemProgressPct">0%</span>
  </div>
  <div class="progress-track"><div class="progress-fill" id="stemProgressFill"></div></div>
  <div class="progress-msg" id="stemProgressMsg">Initializing…</div>
</div>

<div class="summary-card" id="stemSummaryCard" style="display:none">
  <div class="summary-header">
    <span class="summary-title">✦ Export Complete</span>
    <button class="summary-close" id="stemSummaryClose">✕</button>
  </div>
  <div class="summary-grid">
    <div class="summary-item"><div class="summary-val" id="stemSumLUFS">—</div><div class="summary-lbl">Integrated LUFS</div></div>
    <div class="summary-item"><div class="summary-val" id="stemSumGained">—</div><div class="summary-lbl">Loudness Gained</div></div>
    <div class="summary-item"><div class="summary-val" id="stemSumPeak">—</div><div class="summary-lbl">True Peak</div></div>
    <div class="summary-item"><div class="summary-val" id="stemSumLRA">—</div><div class="summary-lbl">Dynamic Range</div></div>
    <div class="summary-item"><div class="summary-val" id="stemSumWidth">—</div><div class="summary-lbl">Stereo Width</div></div>
    <div class="summary-item"><div class="summary-val" id="stemSumTime">—</div><div class="summary-lbl">Process Time</div></div>
  </div>
  <div id="stemSumDetail"></div>
</div>

<div class="stem-master-panel" id="stemMasterPanel">
  <div class="stem-master-toggle" id="stemMasterToggle">
    <span class="stem-master-toggle-title">⚡ Master This Mix</span>
    <span class="stem-master-toggle-caret">▼</span>
  </div>
  <div class="stem-master-body">
    <div style="margin-bottom:16px;padding-top:4px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px;">Presets</div>
      <div class="presets-row" id="smtPresetsRow">
        <button class="preset-btn" data-smt-preset="vocalBoost"><span class="preset-icon">⚡</span>Vocal Boost</button>
        <button class="preset-btn" data-smt-preset="hiFiMaster"><span class="preset-icon">✨</span>Hi-Fi Master</button>
        <button class="preset-btn" data-smt-preset="warmth"><span class="preset-icon">🎸</span>Warmth</button>
        <button class="preset-btn" data-smt-preset="broadcast"><span class="preset-icon">📻</span>Broadcast</button>
        <button class="preset-btn" data-smt-preset="maxClarity"><span class="preset-icon">💎</span>Max Clarity</button>
      </div>
    </div>
    <div class="master-grid">
      <div class="mpanel">
        <div class="mpanel-header"><div class="mpanel-title">EQ</div><button class="reset-btn" id="resetSmtEQ">↺ Reset</button></div>
        ${this._slRow('smt-sub',  'Sub Bass', -12,12,0.5,0,'0 dB')}
        ${this._slRow('smt-bass', 'Bass',     -12,12,0.5,0,'0 dB')}
        ${this._slRow('smt-mid',  'Midrange', -12,12,0.5,0,'0 dB')}
        ${this._slRow('smt-highs','Highs',    -12,12,0.5,0,'0 dB')}
        ${this._slRow('smt-pres', 'Presence',   0,12,0.5,0,'0 dB')}
        ${this._slRow('smt-air',  'Air',         0,10,0.5,0,'0 dB')}
        ${this._slRow('smt-demud','De-Mud',      0,100,1, 0,'0%')}
      </div>
      <div class="mpanel">
        <div class="mpanel-header"><div class="mpanel-title">Compression</div><button class="reset-btn" id="resetSmtComp">↺ Reset</button></div>
        ${this._slRow('smt-thr','Threshold',-60,0,  1,  -18,'-18 dB')}
        ${this._slRow('smt-rat','Ratio',      1,20, 0.5,  4,'4:1')}
        ${this._slRow('smt-atk','Attack',   0.1,200,0.1, 10,'10 ms')}
        ${this._slRow('smt-rel','Release',   10,1000,5, 100,'100 ms')}
      </div>
      <div class="mpanel">
        <div class="mpanel-header"><div class="mpanel-title">Output</div><button class="reset-btn" id="resetSmtOutput">↺ Reset</button></div>
        ${this._slRow('smt-width','St. Width',  0,200,1,  100,'100%')}
        ${this._slRow('smt-gain', 'Output Gain',-12,12,0.5,0,'0 dB')}
        <div class="sl-row" style="margin-top:10px;">
          <span class="sl-lbl" style="color:var(--accent-2)">Limiter</span>
          <div style="flex:1;display:flex;align-items:center;gap:9px;">
            <div class="toggle-sw on" id="smt-limiter"></div>
            <span style="font-size:11px;color:var(--text-secondary)">-1 dBFS ceiling</span>
          </div>
        </div>
        <div style="margin-top:14px;">
          <div class="lufs-row">
            <div class="lufs-grp"><div class="lufs-num" id="stemLufsShortTerm">—</div><div class="lufs-lbl">Short-term</div></div>
            <div class="lufs-grp"><div class="lufs-num" id="stemLufsIntegrated">—</div><div class="lufs-lbl">Integrated</div></div>
          </div>
          <div class="lufs-track"><div class="lufs-fill" id="stemLufsFill"></div></div>
        </div>
      </div>
    </div>
    <div class="spectrum-wrap">
      <div class="spectrum-lbl">Spectrum Analyzer</div>
      <canvas id="spectrumCanvas2"></canvas>
    </div>
  </div>
</div>`; }

  // ── Track lane HTML ────────────────────────────────────────────────────────
  _trackHTML(s) {
    const c = s.color;
    const eqR = `
      <div class="exp-sl-row"><span class="exp-sl-lbl">Hi-Pass</span><input type="range" class="stem-slider" data-p="eq.hpf" min="20" max="500" step="5" value="${s.eq.hpf}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="eq.hpf">${_fmtHz(s.eq.hpf)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Low Shelf</span><input type="range" class="stem-slider" data-p="eq.bass" min="-12" max="12" step=".5" value="${s.eq.bass}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="eq.bass">${_fmtDb(s.eq.bass)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Presence</span><input type="range" class="stem-slider" data-p="eq.pres" min="-12" max="12" step=".5" value="${s.eq.pres}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="eq.pres">${_fmtDb(s.eq.pres)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Hi Shelf</span><input type="range" class="stem-slider" data-p="eq.air" min="-12" max="12" step=".5" value="${s.eq.air}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="eq.air">${_fmtDb(s.eq.air)}</span></div>`;
    const cpR = `
      <div class="exp-sl-row"><span class="exp-sl-lbl">Threshold</span><input type="range" class="stem-slider" data-p="comp.thr" min="-60" max="0" step="1" value="${s.comp.thr}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="comp.thr">${s.comp.thr} dB</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Ratio</span><input type="range" class="stem-slider" data-p="comp.rat" min="1" max="20" step=".5" value="${s.comp.rat}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="comp.rat">${_fmtRt(s.comp.rat)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Attack</span><input type="range" class="stem-slider" data-p="comp.atk" min=".1" max="200" step=".1" value="${s.comp.atk}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="comp.atk">${_fmtMs(s.comp.atk)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Release</span><input type="range" class="stem-slider" data-p="comp.rel" min="10" max="1000" step="5" value="${s.comp.rel}" style="--stem-color:${c}"><span class="exp-sl-val" data-v="comp.rel">${_fmtMs(s.comp.rel)}</span></div>`;
    return `
    <div class="track-hdr">
      <span class="t-icon">${STEM_ICONS[s.type]}</span>
      <div class="track-name-col">
        <div class="track-name" style="color:${c}">${s.name}</div>
        <div class="track-file">${s.filename} · ${_fmtB(s.fileSize)}</div>
      </div>
      <div class="track-btns">
        <button class="icon-btn${s.muted?' muted':''}" data-a="mute" title="Mute">M</button>
        <button class="icon-btn${s.soloed?' soloed':''}" data-a="solo" title="Solo">S</button>
        <button class="track-remove" data-a="remove" title="Remove">✕</button>
      </div>
    </div>
    <div class="track-wave">
      <canvas id="wf-${s.id}"></canvas>
      <div class="playhead" id="ph-${s.id}"></div>
      <div class="track-wave-msg" id="wfmsg-${s.id}">Waveform preview</div>
    </div>
    <div class="track-mix">
      <div class="mix-vol">
        <span class="mix-tag">VOL</span>
        <input type="range" class="stem-slider" data-p="volume" min="0" max="150" step="1" value="${s.volume}" style="--stem-color:${c}">
        <span class="mix-num" data-v="volume">${s.volume}%</span>
      </div>
      <div class="mix-pan">
        <span class="mix-tag">PAN</span>
        <div class="pan-wrap">
          <input type="range" class="stem-slider" data-p="pan" min="-100" max="100" step="1" value="${s.pan}" style="--stem-color:${c}">
          <div class="pan-center"></div>
        </div>
        <span class="pan-num" data-v="pan">${_fmtPn(s.pan)}</span>
      </div>
      <button class="stem-rst-btn" data-rst="mix" title="Reset vol &amp; pan">↺</button>
    </div>
    <div class="track-fx">
      <button class="fx-expand-btn${s.eqEnabled?' enabled':''}${s.eqOpen?' open':''}" data-a="toggleEQ"><span class="dot"></span> EQ <span class="chev">▼</span></button>
      <button class="fx-expand-btn${s.compEnabled?' enabled':''}${s.compOpen?' open':''}" data-a="toggleComp"><span class="dot"></span> COMP <span class="chev">▼</span></button>
      <div class="fx-inline">
        <span class="fx-inline-lbl">REV</span>
        <input type="range" class="stem-slider" data-p="reverb" min="0" max="100" step="1" value="${s.reverb}" style="--stem-color:${c}">
        <span class="fx-inline-val" data-v="reverb">${s.reverb}%</span>
        <button class="stem-rst-btn" data-rst="reverb">↺</button>
      </div>
      <div class="fx-inline">
        <span class="fx-inline-lbl">WIDTH</span>
        <input type="range" class="stem-slider" data-p="width" min="0" max="200" step="1" value="${s.width}" style="--stem-color:${c}">
        <span class="fx-inline-val" data-v="width">${s.width}%</span>
        <button class="stem-rst-btn" data-rst="width">↺</button>
      </div>
      <div class="fx-denoise${s.denoise?' on':''}" data-a="toggleDenoise" id="dn-pill-${s.id}" title="AI Denoise (at export)">✨ AI Denoise</div>
      <button class="stem-rst-btn" data-rst="denoise">↺</button>
      <div class="fx-humanize${s.humanize?' on':''}" data-a="toggleHumanize" title="Add subtle imperfections">🎲 Humanize</div>
      <button class="stem-rst-btn" data-rst="humanize">↺</button>
      <div class="fx-inline" id="hum-sl-${s.id}" style="${s.humanize?'':'opacity:.4;pointer-events:none'}">
        <span class="fx-inline-lbl">INT</span>
        <input type="range" class="stem-slider" data-p="humanizeIntensity" min="0" max="100" step="1" value="${s.humanizeIntensity}" style="--stem-color:${c}">
        <span class="fx-inline-val" data-v="humanizeIntensity">${s.humanizeIntensity}%</span>
      </div>
    </div>
    <div class="track-expander${s.eqOpen?' open':''}" id="eq-exp-${s.id}">
      <div class="exp-inner">
        <div class="exp-col">
          <div class="exp-col-hdr"><span class="exp-enable-sw${s.eqEnabled?' on':''}" data-a="enableEQ">${s.eqEnabled?'ON':'OFF'}</span> EQ <button class="stem-rst-btn" data-rst="eq" style="margin-left:auto">↺</button></div>
          ${eqR}
        </div>
        <div class="exp-col" style="opacity:.25;pointer-events:none;">
          <div class="exp-col-hdr" style="color:var(--text-dim)">COMP</div>${cpR}
        </div>
      </div>
    </div>
    <div class="track-expander${s.compOpen?' open':''}" id="comp-exp-${s.id}">
      <div class="exp-inner">
        <div class="exp-col" style="opacity:.25;pointer-events:none;">
          <div class="exp-col-hdr" style="color:var(--text-dim)">EQ</div>${eqR}
        </div>
        <div class="exp-col">
          <div class="exp-col-hdr"><span class="exp-enable-sw${s.compEnabled?' on':''}" data-a="enableComp">${s.compEnabled?'ON':'OFF'}</span> COMP <button class="stem-rst-btn" data-rst="comp" style="margin-left:auto">↺</button></div>
          ${cpR}
        </div>
      </div>
    </div>`;
  }

  // ── Drop zone ──────────────────────────────────────────────────────────────
  _initDrop() {
    const dz=this._q('stemDropZone'), fi=this._q('stemFileInput');
    const addBar=this._q('addStemBar'), addFi=this._q('addFileInput');
    const cab=this._q('clearAllBtn'), sl=this._q('stemsList');
    if (!dz||!fi) return;
    dz.addEventListener('click', ()=>fi.click());
    fi.addEventListener('change', e=>{ if(e.target.files.length) this._addFiles(e.target.files); e.target.value=''; });
    dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', ()=>dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag-over'); if(e.dataTransfer.files.length) this._addFiles(e.dataTransfer.files); });
    if (addBar&&addFi) {
      addBar.addEventListener('click', ()=>addFi.click());
      addFi.addEventListener('change', e=>{ if(e.target.files.length) this._addFiles(e.target.files); e.target.value=''; });
    }
    if (sl&&addBar) {
      sl.addEventListener('dragover', e=>{ e.preventDefault(); addBar.style.borderColor='var(--accent)'; });
      sl.addEventListener('dragleave', ()=>{ addBar.style.borderColor=''; });
      sl.addEventListener('drop', e=>{ e.preventDefault(); addBar.style.borderColor=''; if(e.dataTransfer.files.length) this._addFiles(e.dataTransfer.files); });
    }
    if (cab) cab.addEventListener('click', ()=>{
      this._stopAll(false);
      this._stems.forEach(s=>{ this._cleanup(s); this._stemBuf.delete(s.id); });
      this._stems=[]; this._maxDur=0; this._playOff=0;
      const list=this._q('stemsList'); if(list) list.innerHTML='';
      const card=this._q('stemSummaryCard'); if(card) card.style.display='none';
      this._syncUI();
    });
  }

  _addFiles(files) {
    const toAdd = Array.from(files).slice(0, MAX_STEMS - this._stems.length);
    if (!toAdd.length) return;
    toAdd.forEach(file => {
      const s = makeStem(file);
      this._stems.push(s);
      const el = this._mkTrackEl(s);
      const list = this._q('stemsList'); if(list) list.appendChild(el);
      this._drawPlaceholder(s);
      this._decode(file, s);
    });
    this._syncUI();
  }

  _mkTrackEl(s) {
    const div = document.createElement('div');
    div.className = 'stem-track' + (s.muted?' muted':'');
    div.dataset.stemId = s.id;
    div.style.setProperty('--stem-color', s.color);
    div.innerHTML = this._trackHTML(s);
    this._wireTrack(div, s);
    div.querySelectorAll('.stem-slider').forEach(el=>_fill(el, s.color));
    return div;
  }

  _wireTrack(el, s) {
    el.addEventListener('click', e => {
      const rst = e.target.closest('[data-rst]');
      if (rst) { e.stopPropagation(); this._rstSection(s, el, rst.dataset.rst, rst); return; }
      const btn = e.target.closest('[data-a]');
      if (!btn) return;
      const a = btn.dataset.a;
      if (a==='mute')           this._mute(s);
      else if (a==='solo')      this._solo(s);
      else if (a==='remove')    this._remove(s.id);
      else if (a==='toggleEQ')  this._togEQPanel(s,el);
      else if (a==='toggleComp')this._togCmpPanel(s,el);
      else if (a==='toggleDenoise')  this._togDenoise(s,el);
      else if (a==='toggleHumanize') this._togHumanize(s,el);
      else if (a==='enableEQ')  this._togEQEnable(s,el);
      else if (a==='enableComp')this._togCmpEnable(s,el);
    });
    el.addEventListener('mousedown', ()=>this._select(s.id));
    el.querySelectorAll('.stem-slider').forEach(inp => {
      inp.addEventListener('input', ()=>{
        const p=inp.dataset.p, v=parseFloat(inp.value);
        this._setNested(s,p,v);
        const lbl=el.querySelector(`[data-v="${p}"]`); if(lbl) lbl.textContent=stemFormatParam(p,v);
        _fill(inp, s.color);
        this._updateNodes(s);
      });
    });
  }

  // ── Track actions ─────────────────────────────────────────────────────────
  _mute(s)  { s.muted=!s.muted; const el=this._sEl(s.id); if(!el)return; el.classList.toggle('muted',s.muted); el.querySelector('[data-a="mute"]')?.classList.toggle('muted',s.muted); this._updateNodes(s); }
  _solo(s)  { s.soloed=!s.soloed; this._sEl(s.id)?.querySelector('[data-a="solo"]')?.classList.toggle('soloed',s.soloed); this._stems.forEach(st=>this._updateNodes(st)); }
  _select(id){ this._q('stemsList')?.querySelectorAll('.stem-track').forEach(el=>el.classList.toggle('selected',+el.dataset.stemId===id)); }
  _togEQPanel(s,el)  { s.eqOpen=!s.eqOpen; el.querySelector(`#eq-exp-${s.id}`)?.classList.toggle('open',s.eqOpen); el.querySelector('[data-a="toggleEQ"]')?.classList.toggle('open',s.eqOpen); }
  _togCmpPanel(s,el) { s.compOpen=!s.compOpen; el.querySelector(`#comp-exp-${s.id}`)?.classList.toggle('open',s.compOpen); el.querySelector('[data-a="toggleComp"]')?.classList.toggle('open',s.compOpen); }
  _togDenoise(s,el)  { s.denoise=!s.denoise; el.querySelector('[data-a="toggleDenoise"]')?.classList.toggle('on',s.denoise); }
  _togHumanize(s,el) {
    s.humanize=!s.humanize; el.querySelector('[data-a="toggleHumanize"]')?.classList.toggle('on',s.humanize);
    const hw=el.querySelector(`#hum-sl-${s.id}`); if(hw){hw.style.opacity=s.humanize?'1':'0.4';hw.style.pointerEvents=s.humanize?'':'none';}
    if(this._stemNd.has(s.id)){this._cleanup(s);this._buildNodes(s);}
  }
  _togEQEnable(s,el) { s.eqEnabled=!s.eqEnabled; const sw=el.querySelector('[data-a="enableEQ"]'),btn=el.querySelector('[data-a="toggleEQ"]'); if(sw){sw.classList.toggle('on',s.eqEnabled);sw.textContent=s.eqEnabled?'ON':'OFF';} if(btn)btn.classList.toggle('enabled',s.eqEnabled); this._updateNodes(s); }
  _togCmpEnable(s,el){ s.compEnabled=!s.compEnabled; const sw=el.querySelector('[data-a="enableComp"]'),btn=el.querySelector('[data-a="toggleComp"]'); if(sw){sw.classList.toggle('on',s.compEnabled);sw.textContent=s.compEnabled?'ON':'OFF';} if(btn)btn.classList.toggle('enabled',s.compEnabled); this._updateNodes(s); }

  _remove(id) {
    const s=this._stems.find(st=>st.id===id); if(s){this._cleanup(s);this._stemBuf.delete(s.id);}
    this._stems=this._stems.filter(st=>st.id!==id);
    this._maxDur=this._stems.reduce((mx,st)=>{const b=this._stemBuf.get(st.id);return b?Math.max(mx,b.duration):mx;},0);
    this._sEl(id)?.remove(); this._syncUI();
  }

  _rstSection(s,el,sec,btn) {
    if (sec==='mix') { s.volume=100;s.pan=0;this._rst(el,[['volume',100],['pan',0]],s.color); }
    else if (sec==='eq') { s.eq={hpf:80,bass:0,pres:0,air:0};this._rst(el,[['eq.hpf',80],['eq.bass',0],['eq.pres',0],['eq.air',0]],s.color); }
    else if (sec==='comp') { s.comp={thr:-18,rat:4,atk:10,rel:100};this._rst(el,[['comp.thr',-18],['comp.rat',4],['comp.atk',10],['comp.rel',100]],s.color); }
    else if (sec==='reverb') { s.reverb=0;this._rst(el,[['reverb',0]],s.color); }
    else if (sec==='width') { s.width=100;this._rst(el,[['width',100]],s.color); }
    else if (sec==='denoise') { s.denoise=false;el.querySelector('[data-a="toggleDenoise"]')?.classList.remove('on'); }
    else if (sec==='humanize') { s.humanize=false;s.humanizeIntensity=50;el.querySelector('[data-a="toggleHumanize"]')?.classList.remove('on');this._rst(el,[['humanizeIntensity',50]],s.color);const hw=el.querySelector(`#hum-sl-${s.id}`);if(hw){hw.style.opacity='0.4';hw.style.pointerEvents='none';} }
    this._updateNodes(s); this._flash(btn);
  }
  _rst(el,pairs,color) { pairs.forEach(([p,v])=>{ el.querySelectorAll(`[data-p="${p}"]`).forEach(sl=>{sl.value=v;_fill(sl,color);}); el.querySelectorAll(`[data-v="${p}"]`).forEach(vl=>{vl.textContent=stemFormatParam(p,v);}); }); }
  _rstAll(btn) {
    this._stems.forEach(s=>{
      s.volume=100;s.pan=0;s.eq={hpf:80,bass:0,pres:0,air:0};s.comp={thr:-18,rat:4,atk:10,rel:100};s.reverb=0;s.width=100;s.denoise=false;s.humanize=false;s.humanizeIntensity=50;
      const el=this._sEl(s.id); if(!el)return;
      [['volume',100],['pan',0],['eq.hpf',80],['eq.bass',0],['eq.pres',0],['eq.air',0],['comp.thr',-18],['comp.rat',4],['comp.atk',10],['comp.rel',100],['reverb',0],['width',100],['humanizeIntensity',50]].forEach(([p,v])=>{
        el.querySelectorAll(`[data-p="${p}"]`).forEach(sl=>{sl.value=v;_fill(sl,s.color);});
        el.querySelectorAll(`[data-v="${p}"]`).forEach(vl=>{vl.textContent=stemFormatParam(p,v);});
      });
      el.querySelector('[data-a="toggleDenoise"]')?.classList.remove('on');
      el.querySelector('[data-a="toggleHumanize"]')?.classList.remove('on');
      const hw=el.querySelector(`#hum-sl-${s.id}`); if(hw){hw.style.opacity='0.4';hw.style.pointerEvents='none';}
      this._updateNodes(s);
    });
    this._flash(btn);
  }
  _flash(btn) { if(!btn)return; const o=btn.textContent; btn.textContent='✓'; btn.style.color='var(--accent-2)'; setTimeout(()=>{btn.textContent=o;btn.style.color='';},1500); }

  // ── UI sync ────────────────────────────────────────────────────────────────
  _syncUI() {
    const has=this._stems.length>0, full=this._stems.length>=MAX_STEMS;
    const hasBuf=this._stems.some(s=>this._stemBuf.has(s.id));
    const _v=(id,d)=>{const el=this._q(id);if(el)el.style.display=d;};
    _v('stemDropZone', has?'none':'');
    _v('stemsList', has?'grid':'none');
    _v('clearAllBtn', has?'':'none');
    _v('resetAllStemsBtn', has?'':'none');
    _v('stemTransport', has?'':'none');
    const cnt=this._q('stemCount'); if(cnt)cnt.textContent=`${this._stems.length} / ${MAX_STEMS} stems`;
    if (!has) {
      const sk=this._q('stemSeek'),cur=this._q('stemSeekCur'),dur=this._q('stemSeekDur');
      if(sk){sk.value=0;_fill(sk,'var(--accent)');}
      if(cur)cur.textContent=_fmtT(0); if(dur)dur.textContent=_fmtT(0);
    }
    ['stemPlayBtn','stemExportBtn','stemAbBtn'].forEach(id=>{const el=this._q(id);if(el)el.disabled=!hasBuf;});
    const addBar=this._q('addStemBar'),addLbl=this._q('addStemLabel');
    if (addBar) {
      if (has&&!full) { addBar.classList.add('show'); if(addLbl){const r=MAX_STEMS-this._stems.length;addLbl.textContent=`Add another stem (${r} slot${r===1?'':'s'} remaining)`;} }
      else addBar.classList.remove('show');
    }
  }

  // ── Waveforms ──────────────────────────────────────────────────────────────
  _drawPlaceholder(s) {
    requestAnimationFrame(()=>{
      const cv=document.getElementById(`wf-${s.id}`); if(!cv)return;
      const W=cv.offsetWidth||600,H=52; cv.width=W;cv.height=H;
      const ctx=cv.getContext('2d'),seed=s.id*137.5,pts=[];
      for(let x=0;x<W;x++){const t=x/W,amp=0.25+0.25*Math.abs(Math.sin(t*9+seed))+0.15*Math.abs(Math.sin(t*27+seed*1.7));pts.push(H/2-Math.abs(Math.sin(t*220+seed))*amp*(H/2-3));}
      ctx.beginPath();pts.forEach((y,x)=>x===0?ctx.moveTo(x,y):ctx.lineTo(x,y));for(let x=W-1;x>=0;x--)ctx.lineTo(x,H-pts[x]);ctx.closePath();ctx.fillStyle=s.color+'22';ctx.fill();
      ctx.beginPath();pts.forEach((y,x)=>x===0?ctx.moveTo(x,y):ctx.lineTo(x,y));ctx.strokeStyle=s.color+'88';ctx.lineWidth=1.5;ctx.stroke();
      const msg=document.getElementById(`wfmsg-${s.id}`);if(msg)msg.style.display='none';
    });
  }
  _drawWaveform(s,buf) {
    requestAnimationFrame(()=>{
      const cv=document.getElementById(`wf-${s.id}`); if(!cv||!buf)return;
      const W=cv.offsetWidth||600,H=52; cv.width=W;cv.height=H;
      const ctx=cv.getContext('2d'),d0=buf.getChannelData(0),d1=buf.numberOfChannels>1?buf.getChannelData(1):null;
      const len=d0.length,spp=len/W,tops=new Float32Array(W),bots=new Float32Array(W);
      for(let x=0;x<W;x++){const st=Math.floor(x*spp),en=Math.min(Math.floor((x+1)*spp),len);let mn=0,mx=0;for(let i=st;i<en;i++){const v=d1?(d0[i]+d1[i])*0.5:d0[i];if(v<mn)mn=v;if(v>mx)mx=v;}tops[x]=H/2-mx*(H/2-2);bots[x]=H/2-mn*(H/2-2);}
      ctx.beginPath();tops.forEach((y,x)=>x===0?ctx.moveTo(x,y):ctx.lineTo(x,y));for(let x=W-1;x>=0;x--)ctx.lineTo(x,bots[x]);ctx.closePath();ctx.fillStyle=s.color+'25';ctx.fill();
      ctx.beginPath();tops.forEach((y,x)=>x===0?ctx.moveTo(x,y):ctx.lineTo(x,y));ctx.strokeStyle=s.color+'aa';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;ctx.stroke();
      const msg=document.getElementById(`wfmsg-${s.id}`);if(msg)msg.style.display='none';
    });
  }

  // ── Decode ────────────────────────────────────────────────────────────────
  async _decode(file, s) {
    await this._ae.resume();
    if (!this._master) this._buildMasterBus();
    const wfMsg=document.getElementById(`wfmsg-${s.id}`);
    if(wfMsg){wfMsg.textContent='Decoding…';wfMsg.style.display='';}
    let ab; try{ab=await file.arrayBuffer();}catch(e){if(wfMsg)wfMsg.textContent='Read error';return;}
    let buf; try{buf=await this._ctx.decodeAudioData(ab);}catch(e){if(wfMsg){wfMsg.textContent='Decode error';wfMsg.style.display='';}return;}
    this._stemBuf.set(s.id,buf);
    if(buf.duration>this._maxDur)this._maxDur=buf.duration;
    this._drawWaveform(s,buf);
    this._buildNodes(s);
    this._syncUI();
    const dur=this._q('stemSeekDur');if(dur)dur.textContent=_fmtT(this._maxDur);
  }

  // ── Stem master bus ────────────────────────────────────────────────────────
  _buildMasterBus() {
    if (this._master) return;
    const ctx=this._ctx, m={};
    m.wetBus=ctx.createGain();m.wetBus.gain.value=1;
    m.hpf=ctx.createBiquadFilter();m.hpf.type='highpass';m.hpf.frequency.value=80;m.hpf.Q.value=0.707;
    m.eqSub=ctx.createBiquadFilter();m.eqSub.type='lowshelf';m.eqSub.frequency.value=60;
    m.eqBass=ctx.createBiquadFilter();m.eqBass.type='peaking';m.eqBass.frequency.value=200;m.eqBass.Q.value=1;
    m.eqMid=ctx.createBiquadFilter();m.eqMid.type='peaking';m.eqMid.frequency.value=1000;m.eqMid.Q.value=1;
    m.eqHighs=ctx.createBiquadFilter();m.eqHighs.type='peaking';m.eqHighs.frequency.value=8000;m.eqHighs.Q.value=1;
    m.eqDemud=ctx.createBiquadFilter();m.eqDemud.type='peaking';m.eqDemud.frequency.value=300;m.eqDemud.Q.value=1.5;
    m.eqPres=ctx.createBiquadFilter();m.eqPres.type='peaking';m.eqPres.frequency.value=3500;m.eqPres.Q.value=1.2;
    m.eqAir=ctx.createBiquadFilter();m.eqAir.type='highshelf';m.eqAir.frequency.value=12000;
    m.comp=ctx.createDynamicsCompressor();
    m.limiter=ctx.createDynamicsCompressor();
    m.outputGain=ctx.createGain();
    m.analyser=ctx.createAnalyser();m.analyser.fftSize=4096;m.analyser.smoothingTimeConstant=0.8;
    m.wetBus.connect(m.hpf);m.hpf.connect(m.eqSub);m.eqSub.connect(m.eqBass);m.eqBass.connect(m.eqMid);m.eqMid.connect(m.eqHighs);m.eqHighs.connect(m.eqDemud);m.eqDemud.connect(m.eqPres);m.eqPres.connect(m.eqAir);m.eqAir.connect(m.comp);m.comp.connect(m.limiter);m.limiter.connect(m.outputGain);m.outputGain.connect(m.analyser);m.analyser.connect(this._ctx.destination);
    this._master=m; this._updMaster();
  }
  _updMaster() {
    if(!this._master)return; const m=this._master;
    const gv=id=>{const el=document.getElementById(id);return el?parseFloat(el.value):0;};
    m.eqSub.gain.value=gv('smt-sub'); m.eqBass.gain.value=gv('smt-bass'); m.eqMid.gain.value=gv('smt-mid');
    m.eqHighs.gain.value=gv('smt-highs'); m.eqDemud.gain.value=-(gv('smt-demud')/100)*10;
    m.eqPres.gain.value=gv('smt-pres'); m.eqAir.gain.value=gv('smt-air');
    m.comp.threshold.value=gv('smt-thr'); m.comp.ratio.value=gv('smt-rat');
    m.comp.attack.value=gv('smt-atk')/1000; m.comp.release.value=gv('smt-rel')/1000; m.comp.knee.value=6;
    m.outputGain.gain.value=Math.pow(10,gv('smt-gain')/20);
    const limOn=this._q('smt-limiter')?.classList.contains('on')??true;
    m.limiter.threshold.value=limOn?-1:0; m.limiter.ratio.value=limOn?20:1;
    m.limiter.attack.value=limOn?0.001:0; m.limiter.release.value=limOn?0.05:0; m.limiter.knee.value=0;
  }

  // ── Per-stem nodes ────────────────────────────────────────────────────────
  _effMute(s) { const any=this._stems.some(st=>st.soloed); return any?!s.soloed:s.muted; }
  _ir() {
    if(this._reverbIR)return this._reverbIR;
    const sr=this._ctx.sampleRate,len=Math.floor(1.8*sr),ir=this._ctx.createBuffer(2,len,sr);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(Math.max(0,1-i/len),2.5);}
    this._reverbIR=ir; return ir;
  }
  _buildNodes(s) {
    if(!this._master)this._buildMasterBus();
    const ctx=this._ctx, n={};
    n.gainVol=ctx.createGain(); n.panner=ctx.createStereoPanner();
    n.hpf=ctx.createBiquadFilter();n.hpf.type='highpass';
    n.lowShelf=ctx.createBiquadFilter();n.lowShelf.type='lowshelf';n.lowShelf.frequency.value=200;
    n.presence=ctx.createBiquadFilter();n.presence.type='peaking';n.presence.frequency.value=3000;n.presence.Q.value=1;
    n.hiShelf=ctx.createBiquadFilter();n.hiShelf.type='highshelf';n.hiShelf.frequency.value=10000;
    n.comp=ctx.createDynamicsCompressor();
    n.reverbDry=ctx.createGain(); n.reverbWet=ctx.createGain();
    n.reverb=ctx.createConvolver();n.reverb.buffer=this._ir();
    n.reverbMix=ctx.createGain();n.reverbMix.gain.value=1;
    n.muteGain=ctx.createGain();
    n.gainVol.connect(n.panner);n.panner.connect(n.hpf);n.hpf.connect(n.lowShelf);n.lowShelf.connect(n.presence);n.presence.connect(n.hiShelf);n.hiShelf.connect(n.comp);
    n.comp.connect(n.reverbDry);n.comp.connect(n.reverb);n.reverbDry.connect(n.reverbMix);n.reverb.connect(n.reverbWet);n.reverbWet.connect(n.reverbMix);n.reverbMix.connect(n.muteGain);n.muteGain.connect(this._master.wetBus);
    if(s.humanize){n.lfo=ctx.createOscillator();n.lfo.frequency.value=4+Math.random()*3;n.lfoDepth=ctx.createGain();n.lfoDepth.gain.value=(s.humanizeIntensity/100)*0.03;n.lfo.connect(n.lfoDepth);n.lfoDepth.connect(n.gainVol.gain);n.lfo.start();}
    this._stemNd.set(s.id,n); this._updateNodes(s);
  }
  _updateNodes(s) {
    const n=this._stemNd.get(s.id); if(!n)return;
    n.gainVol.gain.value=s.volume/100; n.panner.pan.value=s.pan/100;
    n.hpf.frequency.value=s.eqEnabled?s.eq.hpf:20; n.hpf.Q.value=0.707;
    n.lowShelf.gain.value=s.eqEnabled?s.eq.bass:0; n.presence.gain.value=s.eqEnabled?s.eq.pres:0; n.hiShelf.gain.value=s.eqEnabled?s.eq.air:0;
    if(s.compEnabled){n.comp.threshold.value=s.comp.thr;n.comp.ratio.value=s.comp.rat;n.comp.attack.value=s.comp.atk/1000;n.comp.release.value=s.comp.rel/1000;n.comp.knee.value=6;}
    else{n.comp.threshold.value=0;n.comp.ratio.value=1;n.comp.attack.value=0;n.comp.release.value=0;}
    const rv=s.reverb/100; n.reverbDry.gain.value=1-rv; n.reverbWet.gain.value=rv*0.8;
    n.muteGain.gain.value=this._effMute(s)?0:1;
    if(n.lfoDepth)n.lfoDepth.gain.value=(s.humanizeIntensity/100)*0.03;
  }
  _cleanup(s) {
    const n=this._stemNd.get(s.id); if(!n)return;
    try{if(n.lfo){try{n.lfo.stop();}catch(e){}n.lfo.disconnect();if(n.lfoDepth)n.lfoDepth.disconnect();}if(n.pitchLfo){try{n.pitchLfo.stop();}catch(e){}n.pitchLfo.disconnect();if(n.pitchLfoDepth)n.pitchLfoDepth.disconnect();}if(n.srcNode){try{n.srcNode.stop();}catch(e){}n.srcNode.disconnect();}Object.values(n).forEach(nd=>{if(nd&&typeof nd.disconnect==='function')try{nd.disconnect();}catch(e){};});}catch(e){}
    this._stemNd.delete(s.id);
  }

  // ── Playback ──────────────────────────────────────────────────────────────
  _playAll() {
    if(!this._master)this._buildMasterBus();
    const now=this._ctx.currentTime;
    this._stems.forEach(s=>{
      const buf=this._stemBuf.get(s.id); if(!buf)return;
      let n=this._stemNd.get(s.id); if(!n){this._buildNodes(s);n=this._stemNd.get(s.id);} if(!n)return;
      if(n.srcNode){try{n.srcNode.stop();}catch(e){}n.srcNode.disconnect();n.srcNode=null;}
      if(n.pitchLfo){try{n.pitchLfo.stop();}catch(e){}n.pitchLfo.disconnect();if(n.pitchLfoDepth)n.pitchLfoDepth.disconnect();n.pitchLfo=null;n.pitchLfoDepth=null;}
      const src=this._ctx.createBufferSource(); src.buffer=buf; n.srcNode=src;
      if(s.humanize){n.pitchLfo=this._ctx.createOscillator();n.pitchLfo.frequency.value=3+Math.random()*2;n.pitchLfoDepth=this._ctx.createGain();n.pitchLfoDepth.gain.value=(s.humanizeIntensity/100)*6;n.pitchLfo.connect(n.pitchLfoDepth);n.pitchLfoDepth.connect(src.detune);n.pitchLfo.start();}
      src.connect(n.gainVol);
      const jit=s.humanize?(Math.random()-0.5)*2*(s.humanizeIntensity/100)*0.018:0;
      src.start(Math.max(now,now+jit),Math.max(0,this._playOff%buf.duration));
    });
    this._playStart=now-this._playOff; this._isPlaying=true;
    const btn=this._q('stemPlayBtn');if(btn)btn.textContent='⏸';
    this._startClock(); this._startSpec(); this._startLUFS(); this._startSeekLoop();
  }
  _stopAll(keepOff) {
    this._stems.forEach(s=>{const n=this._stemNd.get(s.id);if(!n)return;if(n.srcNode){try{n.srcNode.stop();}catch(e){}n.srcNode.disconnect();n.srcNode=null;}if(n.pitchLfo){try{n.pitchLfo.stop();}catch(e){}n.pitchLfo.disconnect();if(n.pitchLfoDepth)n.pitchLfoDepth.disconnect();n.pitchLfo=null;n.pitchLfoDepth=null;}});
    this._isPlaying=false; if(!keepOff)this._playOff=0;
    const btn=this._q('stemPlayBtn');if(btn)btn.textContent='▶';
    this._stopClock(); this._stopSpec(); this._stopLUFS(); this._stopSeekLoop(keepOff?this._playOff:0);
  }
  _toggle() {
    if(!this._stems.some(s=>this._stemBuf.has(s.id)))return;
    if(!this._master)this._buildMasterBus();
    if(this._isPlaying){this._playOff=this._ctx.currentTime-this._playStart;this._stopAll(true);}
    else this._playAll();
  }
  _onEnd() {
    if(!this._isPlaying)return; this._playOff=0; this._stopAll(false); this._playheads();
    const t=this._q('stemTransportTime'),s2=this._q('stemTransportSub');
    if(t)t.textContent=_fmtT(0); if(s2)s2.textContent=_fmtT(0)+' / '+_fmtT(this._maxDur);
    const sk=this._q('stemSeek'),cur=this._q('stemSeekCur');
    if(sk){sk.value=0;_fill(sk,'var(--accent)');}if(cur)cur.textContent=_fmtT(0);
  }

  // ── Clock + playheads ─────────────────────────────────────────────────────
  _startClock() {
    this._stopClock();
    this._clockId=setInterval(()=>{
      if(!this._isPlaying)return;
      const el=this._ctx.currentTime-this._playStart;
      const t=this._q('stemTransportTime'),s2=this._q('stemTransportSub');
      if(t)t.textContent=_fmtT(el);if(s2)s2.textContent=_fmtT(el)+' / '+_fmtT(this._maxDur);
      this._playheads(); if(this._maxDur>0&&el>=this._maxDur)this._onEnd();
    },80);
  }
  _stopClock(){if(this._clockId){clearInterval(this._clockId);this._clockId=null;}}
  _playheads() {
    const el=this._isPlaying?(this._ctx.currentTime-this._playStart):this._playOff;
    this._stems.forEach(s=>{
      const ph=document.getElementById(`ph-${s.id}`),cv=document.getElementById(`wf-${s.id}`),buf=this._stemBuf.get(s.id);
      if(!ph)return;
      if(!cv||!buf||(!this._isPlaying&&el===0)){ph.style.display='none';return;}
      ph.style.display=''; ph.style.left=(Math.min(1,el/buf.duration)*cv.offsetWidth)+'px';
    });
  }

  // ── Seekbar ───────────────────────────────────────────────────────────────
  _initSeekbar() {
    const sk=this._q('stemSeek'),cur=this._q('stemSeekCur'); if(!sk)return;
    sk.addEventListener('pointerdown',()=>{ this._seekDrag=true; this._seekWas=this._isPlaying; if(this._isPlaying){this._playOff=this._ctx.currentTime-this._playStart;this._stopAll(true);}});
    sk.addEventListener('input',()=>{ const pct=sk.value/1000; this._playOff=pct*(this._maxDur||1); if(cur)cur.textContent=_fmtT(this._playOff); _fill(sk,'var(--accent)'); });
    sk.addEventListener('pointerup',()=>{ this._seekDrag=false; if(this._seekWas)this._playAll(); this._seekWas=false; });
    sk.addEventListener('touchend',()=>{ if(!this._seekDrag)return; this._seekDrag=false; if(this._seekWas)this._playAll(); this._seekWas=false; });
  }
  _startSeekLoop() {
    if(this._seekRaf){cancelAnimationFrame(this._seekRaf);this._seekRaf=null;}
    const loop=()=>{
      if(!this._isPlaying)return; this._seekRaf=requestAnimationFrame(loop);
      if(this._seekDrag)return;
      const el=this._ctx.currentTime-this._playStart; if(this._maxDur<=0)return;
      const pct=Math.max(0,Math.min(1,el/this._maxDur))*100;
      const sk=this._q('stemSeek'); if(sk){sk.value=Math.round(pct*10);_fill(sk,'var(--accent)');}
      const cur=this._q('stemSeekCur'); if(cur)cur.textContent=_fmtT(el);
    };
    loop();
  }
  _stopSeekLoop(off=0) {
    if(this._seekRaf){cancelAnimationFrame(this._seekRaf);this._seekRaf=null;}
    if(this._maxDur>0){const pct=Math.max(0,Math.min(1,off/this._maxDur))*100;const sk=this._q('stemSeek');if(sk){sk.value=Math.round(pct*10);_fill(sk,'var(--accent)');}const cur=this._q('stemSeekCur');if(cur)cur.textContent=_fmtT(off);}
  }

  // ── Spectrum ──────────────────────────────────────────────────────────────
  _startSpec() {
    this._stopSpec();
    const cv=document.getElementById('spectrumCanvas2'); if(!cv||!this._master)return;
    const an=this._master.analyser,fd=new Float32Array(an.frequencyBinCount);
    const draw=()=>{ if(!this._isPlaying)return; this._specRaf=requestAnimationFrame(draw);
      an.getFloatFrequencyData(fd); const W=cv.offsetWidth||600,H=cv.offsetHeight||80; cv.width=W;
      const ctx=cv.getContext('2d'); ctx.fillStyle='#0d0d15';ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='#1a1a2e';ctx.lineWidth=1;for(let i=0;i<=3;i++){const y=(i/3)*H;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      const ny=this._ctx.sampleRate/2,bc=fd.length,lMin=Math.log10(20),lMax=Math.log10(20000),nb=Math.min(W,200),bw=W/nb;
      for(let i=0;i<nb;i++){const fr=Math.pow(10,lMin+(i/nb)*(lMax-lMin)),bin=Math.min(Math.floor(fr/ny*bc),bc-1),norm=Math.max(0,(fd[bin]+90)/90),bh=norm*H;ctx.fillStyle=fr<250?`rgba(108,99,255,${0.7+norm*0.3})`:fr<4000?`rgba(0,212,170,${0.7+norm*0.3})`:`rgba(180,220,255,${0.6+norm*0.4})`;ctx.fillRect(i*bw,H-bh,Math.max(1,bw-1),bh);}
    };
    draw();
  }
  _stopSpec() {
    if(this._specRaf){cancelAnimationFrame(this._specRaf);this._specRaf=null;}
    const cv=document.getElementById('spectrumCanvas2'); if(!cv)return;
    const W=cv.offsetWidth||600,H=cv.offsetHeight||80; cv.width=W;
    const ctx=cv.getContext('2d'); ctx.fillStyle='#0d0d15';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#1a1a2e';ctx.lineWidth=1;for(let i=0;i<=3;i++){const y=(i/3)*H;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  }

  // ── LUFS meter ────────────────────────────────────────────────────────────
  _startLUFS() {
    this._stopLUFS(); if(!this._master)return;
    const an=this._master.analyser,td=new Float32Array(an.fftSize); this._lufsHist=[];
    this._lufsInt=setInterval(()=>{
      if(!this._isPlaying)return;
      an.getFloatTimeDomainData(td); let sq=0; for(let i=0;i<td.length;i++)sq+=td[i]*td[i];
      const lufs=-0.691+10*Math.log10(Math.max(sq/td.length,1e-10));
      this._lufsHist.push(lufs); if(this._lufsHist.length>15)this._lufsHist.shift();
      const avg=this._lufsHist.reduce((a,b)=>a+b,0)/this._lufsHist.length;
      const st=this._q('stemLufsShortTerm'),it=this._q('stemLufsIntegrated'),fl=this._q('stemLufsFill');
      if(st){st.textContent=isFinite(avg)?avg.toFixed(1):'—';st.className='lufs-num lit';}
      if(it){it.textContent=isFinite(avg)?avg.toFixed(1):'—';it.className='lufs-num lit';}
      if(fl)fl.style.width=Math.max(0,Math.min(100,((avg+30)/24)*100))+'%';
    },100);
  }
  _stopLUFS() {
    if(this._lufsInt){clearInterval(this._lufsInt);this._lufsInt=null;}
    const st=this._q('stemLufsShortTerm'),it=this._q('stemLufsIntegrated'),fl=this._q('stemLufsFill');
    if(st){st.textContent='—';st.className='lufs-num';}if(it){it.textContent='—';it.className='lufs-num';}if(fl)fl.style.width='0%';
  }

  // ── Transport init ────────────────────────────────────────────────────────
  _initTransport() {
    const pb=this._q('stemPlayBtn'),expBtn=this._q('stemExportBtn'),expMenu=this._q('stemExpMenu'),ab=this._q('stemAbBtn'),sc=this._q('stemSummaryClose');
    if(pb)pb.addEventListener('click',()=>this._ae.resume().then(()=>this._toggle()));
    if(expBtn&&expMenu){expBtn.addEventListener('click',e=>{e.stopPropagation();expMenu.classList.toggle('open');});document.addEventListener('click',()=>expMenu.classList.remove('open'));}
    ['stemExp24','stemExp16','stemExpStems24','stemExpStems16'].forEach(id=>{
      const el=document.getElementById(id); if(!el)return;
      el.addEventListener('click',()=>{ expMenu?.classList.remove('open'); this._export(id.includes('16')?16:24,id.includes('Stems')); });
    });
    if(ab)ab.addEventListener('click',()=>ab.classList.toggle('active'));
    if(sc)sc.addEventListener('click',()=>{const c=this._q('stemSummaryCard');if(c)c.style.display='none';});
  }

  // ── Master panel init ─────────────────────────────────────────────────────
  _initMasterPanel() {
    const tog=this._q('stemMasterToggle'),panel=this._q('stemMasterPanel');
    if(tog&&panel)tog.addEventListener('click',()=>panel.classList.toggle('open'));

    Object.entries(SMT_MAP).forEach(([smtId,masterId])=>{
      const smt=document.getElementById(smtId),smtVal=document.getElementById('sv-'+smtId),master=document.getElementById(masterId);
      if(!smt)return; _fill(smt,'var(--accent)');
      smt.addEventListener('input',()=>{if(master){master.value=smt.value;master.dispatchEvent(new Event('input',{bubbles:true}));}if(smtVal)smtVal.textContent=_fmtSl(masterId,smt.value);_fill(smt,'var(--accent)');this._updMaster();});
      if(master)master.addEventListener('input',()=>{if(smt.value===master.value)return;smt.value=master.value;if(smtVal)smtVal.textContent=_fmtSl(masterId,master.value);_fill(smt,'var(--accent)');this._updMaster();});
    });

    const smtLim=this._q('smt-limiter'),mLim=document.getElementById('toggle-limiter');
    if(smtLim){smtLim.addEventListener('click',()=>{smtLim.classList.toggle('on');if(mLim)mLim.classList.toggle('on',smtLim.classList.contains('on'));this._updMaster();});if(mLim)mLim.addEventListener('click',()=>{smtLim.classList.toggle('on',mLim.classList.contains('on'));this._updMaster();});}

    this._el.querySelectorAll('[data-smt-preset]').forEach(btn=>{
      btn.addEventListener('click',()=>{const key=btn.dataset.smtPreset,vals=PRESETS[key];if(!vals)return;this._applySmtPreset(vals);this._el.querySelectorAll('[data-smt-preset]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');});
    });

    this._syncSMT();
  }
  _applySmtPreset(vals) {
    Object.entries(SMT_MAP).forEach(([smtId,masterId])=>{const v=vals[masterId];if(v===undefined)return;const smt=document.getElementById(smtId),smtVal=document.getElementById('sv-'+smtId),master=document.getElementById(masterId);if(smt){smt.value=v;_fill(smt,'var(--accent)');if(smtVal)smtVal.textContent=_fmtSl(masterId,v);}if(master){master.value=v;master.dispatchEvent(new Event('input',{bubbles:true}));}});
    if(vals.toggles?.limiter!==undefined){const sl=this._q('smt-limiter'),ml=document.getElementById('toggle-limiter');sl?.classList.toggle('on',vals.toggles.limiter);ml?.classList.toggle('on',vals.toggles.limiter);}
    this._updMaster();
  }
  _syncSMT() {
    Object.entries(SMT_MAP).forEach(([smtId,masterId])=>{const master=document.getElementById(masterId),smt=document.getElementById(smtId),smtVal=document.getElementById('sv-'+smtId);if(!master||!smt)return;smt.value=master.value;if(smtVal)smtVal.textContent=_fmtSl(masterId,master.value);_fill(smt,'var(--accent)');});
    const sl=this._q('smt-limiter'),ml=document.getElementById('toggle-limiter');if(sl&&ml)sl.classList.toggle('on',ml.classList.contains('on'));
  }

  // ── Reset buttons ─────────────────────────────────────────────────────────
  _initResets() {
    const rab=this._q('resetAllStemsBtn'); if(rab)rab.addEventListener('click',()=>this._rstAll(rab));
    const rEQ=this._q('resetSmtEQ'); if(rEQ)rEQ.addEventListener('click',()=>{ [['smt-sub',0],['smt-bass',0],['smt-mid',0],['smt-highs',0],['smt-pres',0],['smt-air',0],['smt-demud',0]].forEach(([id,v])=>{const el=document.getElementById(id);if(!el)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}); this._flash(rEQ); });
    const rCp=this._q('resetSmtComp'); if(rCp)rCp.addEventListener('click',()=>{ [['smt-thr',-18],['smt-rat',4],['smt-atk',10],['smt-rel',100]].forEach(([id,v])=>{const el=document.getElementById(id);if(!el)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}); this._flash(rCp); });
    const rOt=this._q('resetSmtOutput'); if(rOt)rOt.addEventListener('click',()=>{ [['smt-width',100],['smt-gain',0]].forEach(([id,v])=>{const el=document.getElementById(id);if(!el)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}); const sl=this._q('smt-limiter');if(sl&&!sl.classList.contains('on'))sl.click(); this._flash(rOt); });
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  _initKeyboard() {
    document.addEventListener('keydown', e => {
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
      const tab=document.getElementById('tab-stem');if(!tab||tab.style.display==='none')return;
      if(e.code==='Space'){e.preventDefault();this._ae.resume().then(()=>this._toggle());}
      else if(e.key==='E'||e.key==='e'){e.preventDefault();if(this._stems.some(s=>this._stemBuf.has(s.id)))this._export(24,false);}
    });
  }

  // ── Offline export ────────────────────────────────────────────────────────
  async _export(bitDepth, separateStems) {
    const ready=this._stems.filter(s=>this._stemBuf.has(s.id)); if(!ready.length)return;
    const t0=performance.now();
    const setP=(pct,msg)=>{ const w=this._q('stemProgressWrap'),f=this._q('stemProgressFill'),p=this._q('stemProgressPct'),m=this._q('stemProgressMsg');if(w)w.style.display='block';if(f)f.style.width=pct+'%';if(p)p.textContent=Math.round(pct)+'%';if(m)m.textContent=msg; };
    const hideP=()=>{ const w=this._q('stemProgressWrap');if(w)w.style.display='none'; };
    setP(0,'Preparing stems…'); this._stopAll(false);

    const processed=[];
    for(let i=0;i<ready.length;i++){
      const s=ready[i]; let buf=this._stemBuf.get(s.id);
      setP((i/ready.length)*40,`Processing ${s.name}… (${i+1}/${ready.length})`);
      if(s.denoise&&this._denoise.isAvailable){try{buf=await this._denoise.process(buf,this._ctx,p=>setP(((i+p)/ready.length)*40,`AI Denoising ${s.name}…`));}catch(e){console.warn('[StemTab] denoise:',e);}}
      if(s.humanize){setP((i/ready.length)*40+2,`Humanizing ${s.name}…`);const copy=this._ctx.createBuffer(buf.numberOfChannels,buf.length,buf.sampleRate);for(let c=0;c<buf.numberOfChannels;c++)copy.copyToChannel(buf.getChannelData(c).slice(),c);_humanize(copy,s);buf=copy;}
      processed.push({s,buf}); await new Promise(r=>setTimeout(r,0));
    }

    const limOn=this._q('smt-limiter')?.classList.contains('on')??true;
    const sr=this._ctx.sampleRate;

    // Explicitly resample any stem not at sr — mirrors how v7 works (decodeAudioData
    // always produces buffers at audioCtx.sampleRate, so no cross-rate issue there).
    // Relying on OfflineAudioContext auto-resampling is not consistent across browsers.
    for(const p of processed){
      if(p.buf.sampleRate!==sr){
        const len=Math.round(p.buf.length*sr/p.buf.sampleRate);
        const rsCtx=new OfflineAudioContext(p.buf.numberOfChannels,len,sr);
        const rsSrc=rsCtx.createBufferSource();rsSrc.buffer=p.buf;rsSrc.connect(rsCtx.destination);rsSrc.start(0);
        p.buf=await rsCtx.startRendering();
      }
    }

    const dur=Math.max(...processed.map(x=>x.buf.duration));
    const widthW=parseFloat(document.getElementById('smt-width')?.value??100)/100;

    if(separateStems){
      if(typeof JSZip==='undefined'){alert('JSZip not loaded.');hideP();return;}
      const zip=new JSZip();
      for(let i=0;i<processed.length;i++){
        const{s,buf}=processed[i]; setP(42+(i/processed.length)*52,`Encoding ${s.name}… (${i+1}/${processed.length})`);
        const nch=Math.max(buf.numberOfChannels,2),offCtx=new OfflineAudioContext(nch,Math.ceil(buf.duration*sr),sr);
        const src=offCtx.createBufferSource();src.buffer=buf;
        const out=this._offStemChain(offCtx,s,src);const mi=offCtx.createGain();out.connect(mi);this._offMasterBus(offCtx,mi,limOn);src.start(0);
        let rendered=await offCtx.startRendering();_stereoWidth(rendered,widthW);
        const blob=encodeWAV(rendered,bitDepth);zip.file(`${s.name}_${bitDepth}bit.wav`,await blob.arrayBuffer());
        await new Promise(r=>setTimeout(r,0));
      }
      setP(97,'Building ZIP…');const zipBlob=await zip.generateAsync({type:'blob'});downloadBlob(zipBlob,`stems_${bitDepth}bit.zip`);hideP();return;
    }

    // Mix export
    setP(42,'Computing pre-master loudness…');
    let rawLufs=-Infinity;
    try{const aLen=Math.min(Math.ceil(dur*sr),Math.floor(60*sr)),rawL=new Float32Array(aLen),rawR=new Float32Array(aLen);for(const{s:st,buf}of processed){if(this._effMute(st))continue;const vol=st.volume/100,ch0=buf.getChannelData(0),ch1=buf.numberOfChannels>1?buf.getChannelData(1):ch0,n2=Math.min(ch0.length,aLen);for(let i=0;i<n2;i++){rawL[i]+=ch0[i]*vol;rawR[i]+=ch1[i]*vol;}}rawLufs=_lufsData(rawL,rawR,sr);}catch(e){}

    setP(46,'Building mix graph…');
    const offCtx=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),mixBus=offCtx.createGain();
    for(const{s:st,buf}of processed){
      const src=offCtx.createBufferSource();src.buffer=buf;this._offStemChain(offCtx,st,src).connect(mixBus);src.start(0);
    }
    this._offMasterBus(offCtx,mixBus,limOn);
    setP(52,'Rendering…'); let rendered=await offCtx.startRendering();
    setP(88,'Stereo width…'); _stereoWidth(rendered,widthW);
    setP(93,'Loudness metrics…'); await new Promise(r=>setTimeout(r,0));
    const lufs=_lufs(rendered),peak=_peak(rendered),lra2=_lra(rendered);
    const lufsGained=isFinite(lufs)&&isFinite(rawLufs)?lufs-rawLufs:null;
    const procTime=((performance.now()-t0)/1000).toFixed(2);
    setP(99,'Encoding WAV…'); downloadBlob(encodeWAV(rendered,bitDepth),`stems_mix_${bitDepth}bit.wav`); hideP();

    const card=this._q('stemSummaryCard');
    if(card){
      const sv=id=>this._q(id);
      const sl=sv('stemSumLUFS'),ge=sv('stemSumGained'),pe=sv('stemSumPeak'),lr=sv('stemSumLRA'),wd=sv('stemSumWidth'),ti=sv('stemSumTime'),dt=sv('stemSumDetail');
      if(sl)sl.textContent=isFinite(lufs)?lufs.toFixed(1)+' LUFS':'—';
      if(ge){ge.textContent=lufsGained!==null?(lufsGained>=0?'+':'')+lufsGained.toFixed(1)+' LU':'—';ge.className='summary-val'+(lufsGained>6?' warn':'');}
      if(pe){pe.textContent=isFinite(peak)?peak.toFixed(1)+' dBTP':'—';pe.className='summary-val'+(peak>-1?' hot':peak>-3?' warn':'');}
      if(lr)lr.textContent=isFinite(lra2)?lra2.toFixed(1)+' LU':'—';
      if(wd)wd.textContent=Math.round(widthW*100)+'%'; if(ti)ti.textContent=procTime+'s';
      if(dt)dt.innerHTML=this._detailSummary(ready);
      card.style.display='block';
    }
  }

  _offStemChain(offCtx,s,srcNode) {
    const vol=offCtx.createGain();vol.gain.value=s.volume/100;
    const pan=offCtx.createStereoPanner();pan.pan.value=s.pan/100;
    const hpf=offCtx.createBiquadFilter();hpf.type='highpass';hpf.frequency.value=s.eqEnabled?s.eq.hpf:20;hpf.Q.value=0.707;
    const low=offCtx.createBiquadFilter();low.type='lowshelf';low.frequency.value=200;low.gain.value=s.eqEnabled?s.eq.bass:0;
    const prs=offCtx.createBiquadFilter();prs.type='peaking';prs.frequency.value=3000;prs.Q.value=1;prs.gain.value=s.eqEnabled?s.eq.pres:0;
    const air=offCtx.createBiquadFilter();air.type='highshelf';air.frequency.value=10000;air.gain.value=s.eqEnabled?s.eq.air:0;
    const comp=offCtx.createDynamicsCompressor();if(s.compEnabled){comp.threshold.value=s.comp.thr;comp.ratio.value=s.comp.rat;comp.attack.value=s.comp.atk/1000;comp.release.value=s.comp.rel/1000;comp.knee.value=6;}else{comp.threshold.value=0;comp.ratio.value=1;comp.attack.value=0;comp.release.value=0;}
    const mute=offCtx.createGain();mute.gain.value=this._effMute(s)?0:1;
    srcNode.connect(vol);vol.connect(pan);pan.connect(hpf);hpf.connect(low);low.connect(prs);prs.connect(air);air.connect(comp);comp.connect(mute);
    return mute;
  }
  _offMasterBus(offCtx,inputNode,limOn) {
    const gv=id=>{const el=document.getElementById(id);return el?parseFloat(el.value):0;};
    const hpf=offCtx.createBiquadFilter();hpf.type='highpass';hpf.frequency.value=80;hpf.Q.value=0.707;
    const sub=offCtx.createBiquadFilter();sub.type='lowshelf';sub.frequency.value=60;sub.gain.value=gv('smt-sub');
    const bass=offCtx.createBiquadFilter();bass.type='peaking';bass.frequency.value=200;bass.Q.value=1;bass.gain.value=gv('smt-bass');
    const mid=offCtx.createBiquadFilter();mid.type='peaking';mid.frequency.value=1000;mid.Q.value=1;mid.gain.value=gv('smt-mid');
    const hi=offCtx.createBiquadFilter();hi.type='peaking';hi.frequency.value=8000;hi.Q.value=1;hi.gain.value=gv('smt-highs');
    const dm=offCtx.createBiquadFilter();dm.type='peaking';dm.frequency.value=300;dm.Q.value=1.5;dm.gain.value=-(gv('smt-demud')/100)*10;
    const pr=offCtx.createBiquadFilter();pr.type='peaking';pr.frequency.value=3500;pr.Q.value=1.2;pr.gain.value=gv('smt-pres');
    const ar=offCtx.createBiquadFilter();ar.type='highshelf';ar.frequency.value=12000;ar.gain.value=gv('smt-air');
    const comp=offCtx.createDynamicsCompressor();comp.threshold.value=gv('smt-thr');comp.ratio.value=gv('smt-rat');comp.attack.value=gv('smt-atk')/1000;comp.release.value=gv('smt-rel')/1000;comp.knee.value=6;
    const lim=offCtx.createDynamicsCompressor();lim.threshold.value=limOn?-1:0;lim.ratio.value=limOn?20:1;lim.attack.value=limOn?0.001:0;lim.release.value=limOn?0.05:0;lim.knee.value=0;
    const out=offCtx.createGain();out.gain.value=Math.pow(10,gv('smt-gain')/20);
    inputNode.connect(hpf);hpf.connect(sub);sub.connect(bass);bass.connect(mid);mid.connect(hi);hi.connect(dm);dm.connect(pr);pr.connect(ar);ar.connect(comp);comp.connect(lim);lim.connect(out);out.connect(offCtx.destination);
  }
  _detailSummary(stemList) {
    let td=0,th=0;
    const rows=stemList.map(s=>{const tags=[];if(s.denoise&&this._denoise.isAvailable){td++;tags.push('<span class="sum-tag sum-tag-denoise">AI Denoise</span>');}if(s.humanize){th++;tags.push(`<span class="sum-tag sum-tag-humanize">Humanize ${s.humanizeIntensity}%</span>`);}if(s.eqEnabled){const p=[];if(s.eq.hpf>20)p.push(`HPF ${s.eq.hpf}Hz`);if(s.eq.bass!==0)p.push(`Bass ${s.eq.bass>0?'+':''}${s.eq.bass}dB`);if(s.eq.pres!==0)p.push(`Pres ${s.eq.pres>0?'+':''}${s.eq.pres}dB`);if(s.eq.air!==0)p.push(`Air ${s.eq.air>0?'+':''}${s.eq.air}dB`);tags.push(`<span class="sum-tag sum-tag-eq">EQ${p.length?': '+p.join(' · '):''}</span>`);}if(s.compEnabled)tags.push(`<span class="sum-tag sum-tag-comp">Comp ${s.comp.rat}:1 @ ${s.comp.thr}dB</span>`);const th2=tags.length?tags.join(''):'<span style="font-size:10px;color:var(--text-dim)">Dry</span>';return `<div class="sum-stem-row"><span class="sum-stem-name" style="color:${s.color}">${s.name}</span><div class="sum-stem-tags">${th2}</div></div>`;}).join('');
    const tot=stemList.length;
    return `<div class="sum-detail"><div class="sum-detail-title">Per-Stem Processing</div>${rows}<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);"><span style="font-size:10px;color:var(--text-dim);font-weight:600;">${tot} stem${tot!==1?'s':''} processed</span>${td?`<span style="font-size:10px;color:var(--accent);font-weight:600;">${td} AI denoised</span>`:''} ${th?`<span style="font-size:10px;color:#ffd700;font-weight:600;">${th} humanized</span>`:''}</div></div>`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _q(id)   { return this._el?this._el.querySelector(`#${id}`):document.getElementById(id); }
  _sEl(id) { const l=this._q('stemsList'); return l?l.querySelector(`[data-stem-id="${id}"]`):null; }
  _setNested(obj,path,val) { const p=path.split('.');let c=obj;for(let i=0;i<p.length-1;i++)c=c[p[i]];c[p[p.length-1]]=val; }
}
