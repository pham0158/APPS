(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function t(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(a){if(a.ep)return;a.ep=!0;const i=t(a);fetch(a.href,i)}})();const A={sub:0,bass:0,mid:0,highs:0,presence:0,air:0,deMud:0};class ve{constructor(e){this._ctx=e,this.highPass=e.createBiquadFilter(),this.highPass.type="highpass",this.highPass.frequency.value=80,this.highPass.Q.value=.707,this.subBass=e.createBiquadFilter(),this.subBass.type="lowshelf",this.subBass.frequency.value=60,this.subBass.gain.value=A.sub,this.bass=e.createBiquadFilter(),this.bass.type="peaking",this.bass.frequency.value=200,this.bass.Q.value=1,this.bass.gain.value=A.bass,this.mid=e.createBiquadFilter(),this.mid.type="peaking",this.mid.frequency.value=1e3,this.mid.Q.value=1,this.mid.gain.value=A.mid,this.highs=e.createBiquadFilter(),this.highs.type="peaking",this.highs.frequency.value=8e3,this.highs.Q.value=1,this.highs.gain.value=A.highs,this.deMud=e.createBiquadFilter(),this.deMud.type="peaking",this.deMud.frequency.value=300,this.deMud.Q.value=1.5,this.deMud.gain.value=0,this.presence=e.createBiquadFilter(),this.presence.type="peaking",this.presence.frequency.value=3500,this.presence.Q.value=1.2,this.presence.gain.value=A.presence,this.air=e.createBiquadFilter(),this.air.type="highshelf",this.air.frequency.value=12e3,this.air.gain.value=A.air,this.highPass.connect(this.subBass),this.subBass.connect(this.bass),this.bass.connect(this.mid),this.mid.connect(this.highs),this.highs.connect(this.deMud),this.deMud.connect(this.presence),this.presence.connect(this.air),this._deMudPct=0}connect(e,t){e.connect(this.highPass),this.air.connect(t)}setSubBass(e){this.subBass.gain.value=e}setBass(e){this.bass.gain.value=e}setMid(e){this.mid.gain.value=e}setHighs(e){this.highs.gain.value=e}setPresence(e){this.presence.gain.value=e}setAir(e){this.air.gain.value=e}setDeMud(e){this._deMudPct=e,this.deMud.gain.value=-(e/100)*10}getValues(){return{sub:this.subBass.gain.value,bass:this.bass.gain.value,mid:this.mid.gain.value,highs:this.highs.gain.value,presence:this.presence.gain.value,air:this.air.gain.value,deMud:this._deMudPct}}reset(){this.setSubBass(A.sub),this.setBass(A.bass),this.setMid(A.mid),this.setHighs(A.highs),this.setPresence(A.presence),this.setAir(A.air),this.setDeMud(A.deMud)}}const T={threshold:-18,ratio:4,attack:10,release:100,knee:6};class ge{constructor(e){this._ctx=e,this.node=e.createDynamicsCompressor(),this.node.threshold.value=T.threshold,this.node.ratio.value=T.ratio,this.node.attack.value=T.attack/1e3,this.node.release.value=T.release/1e3,this.node.knee.value=T.knee}connect(e,t){e.connect(this.node),this.node.connect(t)}setThreshold(e){this.node.threshold.value=e}setRatio(e){this.node.ratio.value=e}setAttack(e){this.node.attack.value=e}setRelease(e){this.node.release.value=e}getValues(){return{threshold:this.node.threshold.value,ratio:this.node.ratio.value,attack:this.node.attack.value,release:this.node.release.value,knee:this.node.knee.value}}reset(){this.node.threshold.value=T.threshold,this.node.ratio.value=T.ratio,this.node.attack.value=T.attack/1e3,this.node.release.value=T.release/1e3,this.node.knee.value=T.knee}}class _e{constructor(e){this._ctx=e,this._width=1,this._gain=e.createGain(),this._gain.gain.value=1}connect(e,t){e.connect(this._gain),this._gain.connect(t)}setWidth(e){this._width=Math.max(0,Math.min(3,e))}get width(){return this._width}processBuffer(e){if(e.numberOfChannels<2)return;const t=this._width,s=e.getChannelData(0),a=e.getChannelData(1);for(let i=0;i<s.length;i++){const n=(s[i]+a[i])*.5,l=(s[i]-a[i])*.5*t;s[i]=n+l,a[i]=n-l}}reset(){this._width=1}}const ae=-1;class ye{constructor(e){this._ctx=e,this._enabled=!0,this._ceiling=ae,this.node=e.createDynamicsCompressor(),this._applyEnabled(!0)}connect(e,t){e.connect(this.node),this.node.connect(t)}setEnabled(e){this._enabled=e,this._applyEnabled(e)}setCeiling(e){this._ceiling=e,this._enabled&&(this.node.threshold.value=e)}getValues(){return{enabled:this._enabled,ceiling:this._ceiling}}reset(){this._ceiling=ae,this.setEnabled(!0)}_applyEnabled(e){e?(this.node.threshold.value=this._ceiling,this.node.ratio.value=20,this.node.attack.value=.001,this.node.release.value=.05,this.node.knee.value=0):(this.node.threshold.value=0,this.node.ratio.value=1,this.node.attack.value=0,this.node.release.value=0,this.node.knee.value=0)}}class be{constructor(){const e=window.AudioContext||window.webkitAudioContext;this._ctx=new e,this.eqNodes=new ve(this._ctx),this.compressor=new ge(this._ctx),this.stereoWidth=new _e(this._ctx),this.limiter=new ye(this._ctx),this.outputGain=this._ctx.createGain(),this.outputGain.gain.value=1,this._analyserTap=this._ctx.createGain(),this._analyserTap.gain.value=1,this._masterInput=this._ctx.createGain(),this._masterInput.gain.value=1,this.eqNodes.connect(this._masterInput,this._compressorInput()),this.compressor.connect(this._compressorInput(),this._stereoWidthInput()),this.stereoWidth.connect(this._stereoWidthInput(),this._limiterInput()),this.limiter.connect(this._limiterInput(),this.outputGain),this.outputGain.connect(this._analyserTap),this._analyserTap.connect(this._ctx.destination)}get context(){return this._ctx}get masterInput(){return this._masterInput}get destination(){return this._ctx.destination}async resume(){this._ctx.state==="suspended"&&await this._ctx.resume()}async suspend(){this._ctx.state==="running"&&await this._ctx.suspend()}createAnalyser({fftSize:e=4096,smoothing:t=.8}={}){const s=this._ctx.createAnalyser();return s.fftSize=e,s.smoothingTimeConstant=t,this._analyserTap.connect(s),s}setOutputGain(e){this.outputGain.gain.value=e}_compressorInput(){return this.__compIn||(this.__compIn=this._ctx.createGain(),this.__compIn.gain.value=1),this.__compIn}_stereoWidthInput(){return this.__widthIn||(this.__widthIn=this._ctx.createGain(),this.__widthIn.gain.value=1),this.__widthIn}_limiterInput(){return this.__limIn||(this.__limIn=this._ctx.createGain(),this.__limIn.gain.value=1),this.__limIn}}class we{constructor(e){this._onTabChange=e||null,this._activeTab="tab-master"}render(){document.querySelectorAll(".tab-btn").forEach(e=>{e.addEventListener("click",()=>this.setActiveTab(e.dataset.tab))}),document.addEventListener("keydown",e=>{e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||(e.key==="1"&&this.setActiveTab("tab-master"),e.key==="2"&&this.setActiveTab("tab-stem"))})}setActiveTab(e){document.querySelectorAll("#tab-master, #tab-stem").forEach(t=>{t.style.display=t.id===e?"":"none"}),document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.toggle("active",t.dataset.tab===e)}),this._activeTab=e,this._onTabChange&&this._onTabChange(e)}get activeTab(){return this._activeTab}}const ke=`
<div id="helpPanel" role="dialog" aria-modal="true" aria-label="SONIQ Help Guide">
  <div class="help-modal">
    <div class="help-modal-head">
      <span class="help-modal-title">📖 SONIQ Help Guide</span>
      <input type="text" class="help-search" id="helpSearch" placeholder="Search controls…" autocomplete="off">
      <button class="help-close" id="helpClose" aria-label="Close help">✕</button>
    </div>
    <div class="help-body">

      <div>
        <div class="help-section-title">Quick Start Guide</div>
        <ol class="help-steps">
          <li>Load your audio file — drag &amp; drop or click the drop zone in the Master tab.</li>
          <li>Choose a preset closest to your goal (Vocal Boost, Hi-Fi Master, Warmth, etc.).</li>
          <li>Fine-tune the EQ bands to shape the frequency balance to taste.</li>
          <li>Adjust Compression — lower the threshold for more punch, raise Ratio for heavier squash.</li>
          <li>Enable AI Denoise ✨ if your recording has background noise or hiss.</li>
          <li>Hit <strong>Enhance</strong> to apply mastering processing via the browser.</li>
          <li>Use <strong>A/B Compare</strong> during playback to judge before vs. after.</li>
          <li>Export at 24-bit WAV when satisfied — or use the Stem Mixer for multi-track projects.</li>
        </ol>
      </div>

      <div>
        <div class="help-section-title">What is Mastering?</div>
        <p class="help-plain">Mastering is the final step in music production — it's the process of taking a finished mix and preparing it for distribution. A mastering engineer listens critically, applies subtle EQ and compression to balance the frequency spectrum, controls the loudness level to hit streaming platform targets, and ensures the audio sounds consistent across all playback systems (headphones, car speakers, club systems, earbuds).<br><br>SONIQ does this automatically in your browser using the Web Audio API. No uploads, no plugins, no subscription — just instant professional-quality results.</p>
      </div>

      <div>
        <div class="help-section-title">Stem Mixer Guide</div>
        <p class="help-plain">The Stem Mixer lets you work with individual instrument tracks (vocals, guitar, bass, drums, keys, etc.) before combining them into a final master.<br><br><strong>Workflow:</strong> Drop each stem file onto the Stem Mixer drop zone, one per instrument. Each stem gets its own volume fader, pan, reverb, stereo width, AI Denoise, and Humanize controls. When you're happy with the balance, click <strong>Master This Mix</strong> to apply a final mastering chain to the combined output and export.<br><br><strong>Humanize</strong> is especially useful for AI-generated stems — it adds subtle micro-timing shifts, pitch drift, and volume fluctuations to make them sound more like a human performance. Start at 20–40% intensity for natural results.</p>
      </div>

      <div>
        <div class="help-section-title">TuneCore / Distribution Loudness Targets</div>
        <p class="help-plain" style="margin-bottom:14px;">Each streaming platform normalizes audio to a target loudness. Mastering louder than their target wastes headroom — the platform just turns it down. Match these targets for the best result:</p>
        <table class="help-lufs-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Integrated LUFS</th>
              <th>True Peak</th>
              <th>Recommended Preset</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Spotify</td><td class="lufs-val">-14 LUFS</td><td>-1 dBTP</td><td>Hi-Fi Master</td></tr>
            <tr><td>Apple Music</td><td class="lufs-val">-16 LUFS</td><td>-1 dBTP</td><td>Hi-Fi Master / Max Clarity</td></tr>
            <tr><td>Amazon Music</td><td class="lufs-val">-14 LUFS</td><td>-2 dBTP</td><td>Hi-Fi Master</td></tr>
            <tr><td>YouTube</td><td class="lufs-val">-14 LUFS</td><td>-1 dBTP</td><td>Broadcast</td></tr>
            <tr><td>TikTok</td><td class="lufs-val">-14 LUFS</td><td>—</td><td>Broadcast / Hi-Fi Master</td></tr>
          </tbody>
        </table>
      </div>

      <div>
        <div class="help-section-title">Master Tab — Controls Reference</div>
        <div class="help-control-list" id="helpControlList">
          <div class="help-control-item" data-search="ai denoise rnnoise noise suppression neural">
            <div class="help-ctrl-name">AI Denoise ✨</div>
            <div class="help-ctrl-desc">Uses RNNoise neural network to remove background hiss, hum, and noise. Works best on vocals and voice recordings. Processing is entirely in-browser — nothing is uploaded.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Toggle</span><span class="help-ctrl-tag tag-default">Default: OFF</span></div>
          </div>
          <div class="help-control-item" data-search="noise gate silence threshold gate">
            <div class="help-ctrl-name">Noise Gate</div>
            <div class="help-ctrl-desc">Automatically silences audio that falls below a volume threshold. Useful for cutting out background noise between sung phrases or spoken words.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Toggle</span><span class="help-ctrl-tag tag-default">Default: OFF</span></div>
          </div>
          <div class="help-control-item" data-search="limiter clipping peak ceiling dbtfs">
            <div class="help-ctrl-name">Limiter</div>
            <div class="help-ctrl-desc">Prevents audio from exceeding -1 dBFS. Acts as a safety net against harsh digital clipping on export.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Toggle</span><span class="help-ctrl-tag tag-default">Default: ON</span></div>
          </div>
          <div class="help-control-item" data-search="sub bass 60hz rumble kick low frequency">
            <div class="help-ctrl-name">Sub Bass (60 Hz)</div>
            <div class="help-ctrl-desc">Controls the deep rumble and sub-bass. Boost for more power in kick drums and bass lines. Cut if the track sounds muddy on small speakers.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">EQ Band</span><span class="help-ctrl-tag tag-default">Default: 0 dB</span></div>
          </div>
          <div class="help-control-item" data-search="bass 200hz warmth body low end boomy">
            <div class="help-ctrl-name">Bass (200 Hz)</div>
            <div class="help-ctrl-desc">Controls warmth and body in the low end. Boost for fullness, cut if the mix sounds boomy or unclear.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">EQ Band</span><span class="help-ctrl-tag tag-default">Default: 0 dB</span></div>
          </div>
          <div class="help-control-item" data-search="midrange 1khz presence vocal instruments scooped">
            <div class="help-ctrl-name">Midrange (1 kHz)</div>
            <div class="help-ctrl-desc">The presence of most instruments and vocals lives here. Cut slightly for a modern scooped sound, boost to bring vocals forward.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">EQ Band</span><span class="help-ctrl-tag tag-default">Default: 0 dB</span></div>
          </div>
          <div class="help-control-item" data-search="presence 3.5khz vocal intelligibility guitar bite">
            <div class="help-ctrl-name">Presence (3.5 kHz)</div>
            <div class="help-ctrl-desc">Key frequency range for vocal intelligibility and guitar bite. Boosting here makes vocals cut through the mix.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">EQ Band</span><span class="help-ctrl-tag tag-default">Default: 0 dB</span></div>
          </div>
          <div class="help-control-item" data-search="highs 8khz brightness clarity harshness sibilance">
            <div class="help-ctrl-name">Highs (8 kHz)</div>
            <div class="help-ctrl-desc">Controls brightness and definition. Boost to add clarity and detail, cut to reduce harshness or sibilance.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">EQ Band</span><span class="help-ctrl-tag tag-default">Default: 0 dB</span></div>
          </div>
          <div class="help-control-item" data-search="air 12khz sparkle openness top end sheen">
            <div class="help-ctrl-name">Air (12 kHz)</div>
            <div class="help-ctrl-desc">Adds sparkle and openness to the top end. A gentle boost makes recordings sound more professional and airy.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">EQ Band</span><span class="help-ctrl-tag tag-default">Default: 0 dB</span></div>
          </div>
          <div class="help-control-item" data-search="de-mud demud 300hz mud congestion acoustic guitar">
            <div class="help-ctrl-name">De-Mud (300 Hz)</div>
            <div class="help-ctrl-desc">Cuts the muddy buildup that clouds mixes. Effective for cleaning up vocals, acoustic guitars, and full mixes that sound congested.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">EQ Band</span><span class="help-ctrl-tag tag-default">Default: 0%</span></div>
          </div>
          <div class="help-control-item" data-search="threshold compression kicks in volume level">
            <div class="help-ctrl-name">Threshold</div>
            <div class="help-ctrl-desc">Sets the volume level at which compression kicks in. Lower = more compression applied.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Compressor</span><span class="help-ctrl-tag tag-default">Default: -18 dB</span></div>
          </div>
          <div class="help-control-item" data-search="ratio compression 4:1 gain reduction">
            <div class="help-ctrl-name">Ratio</div>
            <div class="help-ctrl-desc">How aggressively the compressor clamps the signal above the threshold. 4:1 = gentle; 20:1 = hard limiting.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Compressor</span><span class="help-ctrl-tag tag-default">Default: 4:1</span></div>
          </div>
          <div class="help-control-item" data-search="attack transient punch speed compressor fast slow">
            <div class="help-ctrl-name">Attack</div>
            <div class="help-ctrl-desc">How quickly the compressor responds after the signal crosses the threshold. Faster = tighter. Slower = more punch.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Compressor</span><span class="help-ctrl-tag tag-default">Default: 10 ms</span></div>
          </div>
          <div class="help-control-item" data-search="release compressor let go recover snappy smooth">
            <div class="help-ctrl-name">Release</div>
            <div class="help-ctrl-desc">How quickly compression releases after the signal drops below the threshold. Shorter = snappier, longer = smoother.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Compressor</span><span class="help-ctrl-tag tag-default">Default: 100 ms</span></div>
          </div>
          <div class="help-control-item" data-search="stereo width mid side ms wide narrow mono">
            <div class="help-ctrl-name">Stereo Width</div>
            <div class="help-ctrl-desc">Expands or narrows the stereo image via M/S processing. 100% = original. 150%+ = immersive. Keep above 80% for mono compatibility.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Output</span><span class="help-ctrl-tag tag-default">Default: 100%</span></div>
          </div>
          <div class="help-control-item" data-search="output gain volume loudness final level">
            <div class="help-ctrl-name">Output Gain</div>
            <div class="help-ctrl-desc">The final volume after processing, before the limiter. Raise to hit target loudness, lower if the limiter is clamping too hard.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Output</span><span class="help-ctrl-tag tag-default">Default: 0 dB</span></div>
          </div>
          <div class="help-control-item" data-search="ab compare before after original mastered toggle">
            <div class="help-ctrl-name">A/B Compare</div>
            <div class="help-ctrl-desc">Instantly flip between original (A) and mastered (B) audio during playback. Use to judge if processing is improving the sound.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Playback</span><span class="help-ctrl-tag">Shortcut: A</span></div>
          </div>
        </div>
      </div>

      <div>
        <div class="help-section-title">Stem Mixer — Controls Reference</div>
        <div class="help-control-list">
          <div class="help-control-item" data-search="volume fader level balance 100%">
            <div class="help-ctrl-name">Volume Fader</div>
            <div class="help-ctrl-desc">Sets the volume of this stem relative to others. 100% = original level. Adjust to balance instruments and vocals.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Mix</span><span class="help-ctrl-tag tag-default">Default: 100%</span></div>
          </div>
          <div class="help-control-item" data-search="pan stereo left right center position">
            <div class="help-ctrl-name">Pan</div>
            <div class="help-ctrl-desc">Positions this stem in the stereo field. 0 = center, -100 = full left, +100 = full right.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Mix</span><span class="help-ctrl-tag tag-default">Default: Center</span></div>
          </div>
          <div class="help-control-item" data-search="mute silence stem off">
            <div class="help-ctrl-name">Mute (M)</div>
            <div class="help-ctrl-desc">Silences this stem in the mix without removing it. Click again to unmute. Keyboard shortcut: M (with stem selected).</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Mix</span><span class="help-ctrl-tag">Shortcut: M</span></div>
          </div>
          <div class="help-control-item" data-search="solo isolate stem listen alone">
            <div class="help-ctrl-name">Solo (S)</div>
            <div class="help-ctrl-desc">Plays only this stem, muting all others. Useful for checking an individual track in isolation. Click again to unsolo.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">Mix</span><span class="help-ctrl-tag">Shortcut: S</span></div>
          </div>
          <div class="help-control-item" data-search="reverb room ambience space distance">
            <div class="help-ctrl-name">Reverb</div>
            <div class="help-ctrl-desc">Adds room ambience to this stem. Higher values create a larger, more distant sound. Use sparingly on bass stems to preserve punch.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">FX</span><span class="help-ctrl-tag tag-default">Default: 0%</span></div>
          </div>
          <div class="help-control-item" data-search="stereo width mid side stem narrow wide bass">
            <div class="help-ctrl-name">Per-Stem Stereo Width</div>
            <div class="help-ctrl-desc">Widens or narrows the stereo image of this individual stem. Narrowing bass stems to 80–100% improves mono compatibility.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">FX</span><span class="help-ctrl-tag tag-default">Default: 100%</span></div>
          </div>
          <div class="help-control-item" data-search="denoise rnnoise ai noise vocal stem per track">
            <div class="help-ctrl-name">Per-Stem AI Denoise ✨</div>
            <div class="help-ctrl-desc">Applies RNNoise neural noise suppression to this individual stem before mixing. Most effective on vocal stems. Applied at export time.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">FX</span><span class="help-ctrl-tag tag-default">Default: OFF</span></div>
          </div>
          <div class="help-control-item" data-search="humanize imperfections ai detection human performance timing">
            <div class="help-ctrl-name">Humanize 🎲</div>
            <div class="help-ctrl-desc">Applies subtle random imperfections — micro-timing shifts, pitch drift, volume fluctuations, analog wow/flutter. Makes AI-generated audio sound more like a human performance.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">FX</span><span class="help-ctrl-tag tag-default">Default: OFF</span></div>
          </div>
          <div class="help-control-item" data-search="humanize intensity strength amount 20% 40%">
            <div class="help-ctrl-name">Humanize Intensity</div>
            <div class="help-ctrl-desc">Controls how strong the humanization is. 0% = no effect. 100% = maximum imperfection. Start around 20–40% for natural results.</div>
            <div class="help-ctrl-meta"><span class="help-ctrl-tag">FX</span><span class="help-ctrl-tag tag-default">Default: 0%</span></div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
`;class qe{constructor(){this._panel=null}render(){var t,s,a,i;const e=document.createElement("div");for(e.innerHTML=ke.trim();e.firstChild;)document.body.appendChild(e.firstChild);this._panel=document.getElementById("helpPanel"),(t=document.getElementById("helpClose"))==null||t.addEventListener("click",()=>this.close()),(s=this._panel)==null||s.addEventListener("click",n=>{n.target===this._panel&&this.close()}),document.addEventListener("keydown",n=>{if(n.key==="Escape"){this.close();return}n.target.tagName==="INPUT"||n.target.tagName==="TEXTAREA"||(n.key==="h"||n.key==="H")&&this.toggle()}),(a=document.getElementById("helpBtn"))==null||a.addEventListener("click",()=>this.open()),(i=document.getElementById("helpSearch"))==null||i.addEventListener("input",n=>{var r;const l=n.target.value.trim().toLowerCase();(r=this._panel)==null||r.querySelectorAll(".help-control-item").forEach(o=>{var u,m;const d=((u=o.querySelector(".help-ctrl-name"))==null?void 0:u.textContent.toLowerCase())||"",h=((m=o.querySelector(".help-ctrl-desc"))==null?void 0:m.textContent.toLowerCase())||"",p=o.dataset.search||"";o.hidden=l.length>0&&!d.includes(l)&&!h.includes(l)&&!p.includes(l)})})}open(){var e,t;(e=this._panel)==null||e.classList.add("open"),(t=document.getElementById("helpSearch"))==null||t.focus()}close(){var e;(e=this._panel)==null||e.classList.remove("open")}toggle(){var e;(e=this._panel)!=null&&e.classList.contains("open")?this.close():this.open()}addTooltip(e,t){!e||!t||(e.dataset.tip=t,e.addEventListener("mouseenter",()=>{const s=document.getElementById("tipBubble");s&&(s.textContent=t,s.classList.add("visible"))}),e.addEventListener("mouseleave",()=>{var s;(s=document.getElementById("tipBubble"))==null||s.classList.remove("visible")}),e.addEventListener("mousemove",s=>{const a=document.getElementById("tipBubble");a&&(a.style.left=s.clientX+12+"px",a.style.top=s.clientY-8+"px")}))}addAllTooltips(e){e&&e.querySelectorAll("[data-tip]").forEach(t=>{this.addTooltip(t,t.dataset.tip)})}}class ie{constructor(e,t){this._canvasId=e,this._color=t||"#6c63ff"}get canvas(){return document.getElementById(this._canvasId)}draw(e){const t=this.canvas;if(!t||!e)return;t.width=t.offsetWidth||600,t.height=80;const s=t.getContext("2d"),a=t.width,i=t.height,n=this._color;this._color+"";const l=parseInt(n.slice(1,3),16),r=parseInt(n.slice(3,5),16),o=parseInt(n.slice(5,7),16),d=`rgba(${l},${r},${o},0.12)`;s.fillStyle="#0d0d15",s.fillRect(0,0,a,i);const h=e.numberOfChannels,p=e.getChannelData(0),u=h>1?e.getChannelData(1):null,m=p.length,f=m/a,_=new Float32Array(a),y=new Float32Array(a);for(let v=0;v<a;v++){const b=Math.floor(v*f),x=Math.min(Math.floor((v+1)*f),m);let L=0,F=0;for(let R=b;R<x;R++){const g=u?(p[R]+u[R])*.5:p[R];g<L&&(L=g),g>F&&(F=g)}_[v]=i/2-F*(i/2-2),y[v]=i/2-L*(i/2-2)}s.beginPath(),s.moveTo(0,_[0]);for(let v=1;v<a;v++)s.lineTo(v,_[v]);for(let v=a-1;v>=0;v--)s.lineTo(v,y[v]);s.closePath(),s.fillStyle=d,s.fill(),s.beginPath(),s.moveTo(0,_[0]);for(let v=1;v<a;v++)s.lineTo(v,_[v]);s.strokeStyle=n,s.lineWidth=1.5,s.stroke(),s.beginPath(),s.moveTo(0,i/2),s.lineTo(a,i/2),s.strokeStyle="rgba(255,255,255,0.04)",s.lineWidth=1,s.stroke()}drawPlayhead(e){const t=this.canvas;if(!t)return;const s=t.getContext("2d"),a=Math.round(e*t.width);s.save(),s.strokeStyle="rgba(255,255,255,0.6)",s.lineWidth=1,s.beginPath(),s.moveTo(a,0),s.lineTo(a,t.height),s.stroke(),s.restore()}clear(){const e=this.canvas;if(!e)return;e.width=e.offsetWidth||600,e.height=80;const t=e.getContext("2d");t.fillStyle="#0d0d15",t.fillRect(0,0,e.width,e.height)}}class Be{constructor(e){this._canvasId=e,this._rafId=null,this._sampleRate=44100}get canvas(){return document.getElementById(this._canvasId)}clear(){const e=this.canvas;if(!e)return;e.width=e.offsetWidth||800,e.height=100;const t=e.getContext("2d"),s=e.width,a=e.height;t.fillStyle="#0d0d15",t.fillRect(0,0,s,a),t.strokeStyle="#1a1a2e",t.lineWidth=1;for(let n=0;n<=4;n++){const l=n/4*a;t.beginPath(),t.moveTo(0,l),t.lineTo(s,l),t.stroke()}const i=document.getElementById("spectrumMsg");i&&(i.style.display="")}start(e){this.stop(),this._sampleRate=e.context.sampleRate;const t=this.canvas;if(!t)return;const s=new Float32Array(e.frequencyBinCount),a=document.getElementById("spectrumMsg");a&&(a.style.display="none");const i=()=>{this._rafId=requestAnimationFrame(i),e.getFloatFrequencyData(s);const n=t.offsetWidth||800;t.width=n;const l=t.height,r=t.getContext("2d");r.fillStyle="#0d0d15",r.fillRect(0,0,n,l),r.strokeStyle="#1a1a2e",r.lineWidth=1;for(let f=0;f<=4;f++){const _=f/4*l;r.beginPath(),r.moveTo(0,_),r.lineTo(n,_),r.stroke()}const o=this._sampleRate/2,d=s.length,h=Math.log10(20),p=Math.log10(2e4),u=Math.min(n,300),m=n/u;for(let f=0;f<u;f++){const _=Math.pow(10,h+f/u*(p-h)),y=Math.min(Math.floor(_/o*d),d-1),v=s[y],b=Math.max(0,(v+90)/90),x=b*l,L=f*m;let F;_<250?F=`rgba(108,99,255,${.7+b*.3})`:_<4e3?F=`rgba(0,212,170,${.7+b*.3})`:F=`rgba(180,220,255,${.6+b*.4})`,r.fillStyle=F,r.fillRect(L,l-x,Math.max(1,m-1),x)}};i()}stop(){this._rafId&&(cancelAnimationFrame(this._rafId),this._rafId=null),this.clear()}}class Ee{constructor(){this._rafId=null,this._peakDecayL=0,this._peakDecayR=0,this._lufsHistory=[],this._histLen=15}update(e){const{integrated:t,shortTerm:s,lra:a,truePeak:i}=e;this._setText("lufsIntegrated",(t==null?void 0:t.toFixed(1))??"—"),this._setText("lufsLRA",(a==null?void 0:a.toFixed(1))??"—"),this._setText("lufsTruePeak",(i==null?void 0:i.toFixed(1))??"—");const n=document.getElementById("lufsShortTerm");if(n&&(n.textContent=s!=null&&isFinite(s)?s.toFixed(1):"—",n.className="lufs-number",s>-10?n.classList.add("hot"):s>-14?n.classList.add("warn"):n.classList.add("good")),s!=null){const l=Math.max(0,Math.min(100,(s+30)/24*100)),r=document.getElementById("lufsBarFill");r&&(r.style.width=l+"%")}}startMonitoring(e,t,s){this.stopMonitoring();const a=new Float32Array(e.fftSize);this._lufsHistory=[];const i=t?new Float32Array(t.fftSize):null,n=s?new Float32Array(s.fftSize):null,l=()=>{this._rafId=requestAnimationFrame(l),e.getFloatTimeDomainData(a);let r=0;for(let f=0;f<a.length;f++)r+=a[f]*a[f];const o=Math.sqrt(r/a.length),d=-.691+10*Math.log10(Math.max(o*o,1e-10));this._lufsHistory.push(d),this._lufsHistory.length>this._histLen&&this._lufsHistory.shift();const h=this._lufsHistory.reduce((f,_)=>f+_,0)/this._lufsHistory.length,p=document.getElementById("lufsShortTerm");p&&(p.textContent=isFinite(h)?h.toFixed(1):"—",p.className="lufs-number",h>-10?p.classList.add("hot"):h>-14?p.classList.add("warn"):p.classList.add("good"));const u=Math.max(0,Math.min(100,(h+30)/24*100)),m=document.getElementById("lufsBarFill");if(m&&(m.style.width=u+"%"),t&&i){t.getFloatTimeDomainData(i);let f=0;for(let y=0;y<i.length;y++){const v=Math.abs(i[y]);v>f&&(f=v)}this._peakDecayL=Math.max(f,this._peakDecayL*.88);const _=document.getElementById("peakL");_&&(_.style.height=Math.min(100,this._peakDecayL*130)+"%")}if(s&&n){s.getFloatTimeDomainData(n);let f=0;for(let y=0;y<n.length;y++){const v=Math.abs(n[y]);v>f&&(f=v)}this._peakDecayR=Math.max(f,this._peakDecayR*.88);const _=document.getElementById("peakR");_&&(_.style.height=Math.min(100,this._peakDecayR*130)+"%")}};l()}stopMonitoring(){this._rafId&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._lufsHistory=[],this._peakDecayL=0,this._peakDecayR=0}reset(){this.stopMonitoring(),["lufsIntegrated","lufsShortTerm","lufsLRA","lufsTruePeak"].forEach(a=>{const i=document.getElementById(a);i&&(i.textContent="—",i.className="lufs-number")});const e=document.getElementById("lufsBarFill");e&&(e.style.width="0%");const t=document.getElementById("peakL"),s=document.getElementById("peakR");t&&(t.style.height="0%"),s&&(s.style.height="0%")}_setText(e,t){const s=document.getElementById(e);s&&(s.textContent=t)}}function U(c){(!isFinite(c)||c<0)&&(c=0),c=Math.floor(c);const e=Math.floor(c/3600),t=Math.floor(c%3600/60),s=c%60;return e>0?`${e}:${t.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`:`${t}:${s.toString().padStart(2,"0")}`}function xe(c){return c=parseFloat(c),`${c>0?"+":""}${c.toFixed(1)} dB`}function he(c){return`${parseFloat(c)}:1`}function H(c){return`${Math.round(c)}%`}function pe(c){return`${parseFloat(c)} ms`}function Se(c){return c=parseInt(c),c===0?"C":c>0?`R${c}`:`L${Math.abs(c)}`}function Me(c){return`${parseInt(c)} Hz`}function K(c,e){return c==="volume"?H(e):c==="pan"?Se(e):c==="reverb"||c==="width"?H(e):c==="eq.hpf"?Me(e):c==="eq.bass"||c==="eq.pres"||c==="eq.air"?xe(e):c==="comp.thr"?`${e} dB`:c==="comp.rat"?he(e):c==="comp.atk"||c==="comp.rel"?pe(e):c==="humanizeIntensity"?H(e):String(e)}function Le(c,e){return e=parseFloat(e),c==="eq-demud"?H(e):c==="comp-ratio"?he(e):c==="comp-attack"||c==="comp-release"?pe(e):c==="stereo-width"?H(e):`${e>0?"+":""}${e} dB`}function ne(c){return Math.pow(10,c/20)}class Ie{constructor(e){this._onSeek=e||null,this._duration=0,this._rafId=null,this._dragging=!1,this._wasPlaying=!1,this._container=null,this._input=null,this._curEl=null,this._durEl=null}render({containerId:e,inputId:t,curId:s,durId:a}){this._container=document.getElementById(e),this._input=document.getElementById(t),this._curEl=document.getElementById(s),this._durEl=document.getElementById(a),this._input&&(this._input.addEventListener("pointerdown",()=>{this._dragging=!0,this._wasPlaying=!1,this._onSeek&&this._onSeek(-1)}),this._input.addEventListener("input",()=>{if(!this._duration)return;const i=this._input.value/1e3,n=i*this._duration;this._curEl&&(this._curEl.textContent=U(n)),this._setFill(i*100)}),this._input.addEventListener("pointerup",()=>this._endDrag()),this._input.addEventListener("touchend",()=>this._endDrag()))}_endDrag(){if(!this._dragging||(this._dragging=!1,!this._duration))return;const t=this._input.value/1e3*this._duration;this._onSeek&&this._onSeek(t)}update(e,t){if(this._dragging||!this._input)return;this._duration=t;const s=t>0?Math.max(0,Math.min(1,e/t)):0;this._input.value=Math.round(s*1e3),this._setFill(s*100),this._curEl&&(this._curEl.textContent=U(e))}setDuration(e){this._duration=e,this._durEl&&(this._durEl.textContent=U(e)),this._container&&(this._container.style.display="")}reset(){this.stopAnimation(),this._input&&(this._input.value=0,this._setFill(0)),this._curEl&&(this._curEl.textContent=U(0)),this._duration=0,this._container&&(this._container.style.display="none")}startAnimation(e){this.stopAnimation();const t=()=>{this._rafId=requestAnimationFrame(t),!this._dragging&&this.update(e(),this._duration)};t()}stopAnimation(){this._rafId&&(cancelAnimationFrame(this._rafId),this._rafId=null)}_setFill(e){this._input&&(this._input.style.background=`linear-gradient(to right, var(--accent) ${e}%, var(--knob-track) ${e}%)`)}}const ee={vocalBoost:{"eq-sub":0,"eq-bass":-2,"eq-mid":-3,"eq-highs":4,"eq-presence":8,"eq-air":5,"eq-demud":50,"comp-threshold":-20,"comp-ratio":10,"comp-attack":10,"comp-release":150,"stereo-width":100,"output-gain":0,toggles:{denoise:!0,limiter:!0,gate:!1}},hiFiMaster:{"eq-sub":2,"eq-bass":2,"eq-mid":0,"eq-highs":5,"eq-presence":5,"eq-air":7,"eq-demud":30,"comp-threshold":-18,"comp-ratio":4,"comp-attack":15,"comp-release":200,"stereo-width":150,"output-gain":0,toggles:{denoise:!1,limiter:!0,gate:!1}},warmth:{"eq-sub":4,"eq-bass":5,"eq-mid":1,"eq-highs":-1,"eq-presence":2,"eq-air":1,"eq-demud":20,"comp-threshold":-18,"comp-ratio":8,"comp-attack":25,"comp-release":250,"stereo-width":100,"output-gain":0,toggles:{denoise:!1,limiter:!0,gate:!1}},broadcast:{"eq-sub":0,"eq-bass":0,"eq-mid":-2,"eq-highs":3,"eq-presence":6,"eq-air":4,"eq-demud":60,"comp-threshold":-18,"comp-ratio":14,"comp-attack":5,"comp-release":100,"stereo-width":100,"output-gain":0,toggles:{denoise:!1,limiter:!0,gate:!1}},maxClarity:{"eq-sub":0,"eq-bass":-1,"eq-mid":-4,"eq-highs":6,"eq-presence":10,"eq-air":8,"eq-demud":70,"comp-threshold":-18,"comp-ratio":5,"comp-attack":10,"comp-release":150,"stereo-width":160,"output-gain":0,toggles:{denoise:!1,limiter:!0,gate:!1}}};class Ae{constructor(e){this._onPresetSelect=e||null,this._active=null}render(){document.querySelectorAll(".preset-btn").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.preset;!t||!ee[t]||(this.setActive(t),this._onPresetSelect&&this._onPresetSelect(t,ee[t]))})}),this._syncButtons()}setActive(e){this._active=e,this._syncButtons()}clearActive(){this._active=null,this._syncButtons()}get active(){return this._active}_syncButtons(){document.querySelectorAll(".preset-btn").forEach(e=>{e.classList.toggle("active",e.dataset.preset===this._active)})}}class Ce{constructor(e){this._onReset=e||null}addResetButton(e,t){e&&e.addEventListener("click",()=>{this._onReset&&this._onReset(t,e),this.showConfirmation(e)})}addResetButtonById(e,t){const s=document.getElementById(e);this.addResetButton(s,t)}showConfirmation(e){if(!e)return;const t=e.textContent,s=e.style.color,a=e.style.borderColor;e.textContent="✓ Reset",e.style.color="var(--accent-2)",e.style.borderColor="var(--accent-2)",setTimeout(()=>{e.textContent=t,e.style.color=s,e.style.borderColor=a},1500)}}const X="https://cdn.jsdelivr.net/npm/@jitsi/rnnoise-wasm@0.0.1/dist/rnnoise.js",Fe="https://cdn.jsdelivr.net/npm/@jitsi/rnnoise-wasm@0.0.1/dist/rnnoise.wasm",le=16e3,$=480,re=32768;class ue{constructor(){this._module=null,this._loaded=!1,this._available=!1,this._loading=!1}get isLoaded(){return this._loaded}get isAvailable(){return this._available}get isLoading(){return this._loading}async load(){if(!(this._loaded||this._loading)){this._loading=!0;try{await this._loadScript(X);const e=["createRNNoise","RNNoiseModule","Module","createModule"];let t=null;for(const s of e)if(typeof window[s]=="function"){t=window[s];break}if(!t)try{const s=await import(X);t=s.default||s.createRNNoise||s.Module}catch{}if(typeof t!="function")throw new Error("RNNoise factory not found");if(this._module=await t({locateFile:s=>s.endsWith(".wasm")?Fe:X.replace("rnnoise.js",s)}),typeof this._module._rnnoise_create!="function")throw new Error("RNNoise C API not found in module");this._loaded=!0,this._available=!0,this._loading=!1,console.info("[Denoise] RNNoise WASM ready")}catch(e){console.warn("[Denoise] RNNoise unavailable:",e.message),this._loaded=!1,this._available=!1,this._loading=!1,this._module=null}}}async process(e,t,s){return this._available&&this._module?this._processRNNoise(e,t,s):this._processWiener(e,t)}async _resample(e,t,s){if(e.sampleRate===t)return e;const a=Math.round(e.length*t/e.sampleRate),i=new OfflineAudioContext(e.numberOfChannels,a,t),n=i.createBufferSource();return n.buffer=e,n.connect(i.destination),n.start(0),i.startRendering()}async _processChannelRNN(e,t){const s=this._module,a=s._malloc($*4),i=s._malloc($*4),n=s._rnnoise_create(0),l=new Float32Array(e.length),r=a>>2,o=i>>2,d=Math.ceil(e.length/$);for(let h=0;h*$<e.length;h++){const p=h*$;for(let u=0;u<$;u++)s.HEAPF32[r+u]=(e[p+u]||0)*re;s._rnnoise_process_frame(n,i,a);for(let u=0;u<$&&p+u<e.length;u++)l[p+u]=s.HEAPF32[o+u]/re;h%80===79&&(t&&t((h+1)/d),await new Promise(u=>setTimeout(u,0)))}return s._rnnoise_destroy(n),s._free(a),s._free(i),l}async _processRNNoise(e,t,s){const a=e.sampleRate,i=e.numberOfChannels,n=await this._resample(e,le,t),l=[];for(let o=0;o<i;o++){const d=n.getChannelData(o).slice(),h=await this._processChannelRNN(d,p=>s&&s((o+p)/i));l.push(h)}const r=t.createBuffer(i,n.length,le);for(let o=0;o<i;o++)r.copyToChannel(l[o],o);return this._resample(r,a,t)}async _processWiener(e,t){const s=e.sampleRate,a=Math.min(Math.floor(.2*s),e.length),i=t.createBuffer(e.numberOfChannels,e.length,s);for(let n=0;n<e.numberOfChannels;n++){const l=e.getChannelData(n),r=i.getChannelData(n);r.set(l);let o=0;for(let h=0;h<a;h++)o+=r[h]*r[h];o/=a;const d=Math.sqrt(o)*2.5;for(let h=0;h<r.length;h++){const p=Math.abs(r[h]);r[h]*=Math.max(0,1-d/Math.max(p,1e-10))}}return i}_loadScript(e){return new Promise((t,s)=>{if(document.querySelector(`script[src="${e}"]`)){t();return}const a=document.createElement("script");a.src=e,a.onload=t,a.onerror=()=>s(new Error(`Failed to load ${e}`)),document.head.appendChild(a)})}}function G(c,e,t){for(let s=0;s<t.length;s++)c.setUint8(e+s,t.charCodeAt(s))}function W(c,e){const t=c.numberOfChannels,s=c.sampleRate,a=c.length,i=e===16?2:3,n=t*a*i,l=new ArrayBuffer(44+n),r=new DataView(l);G(r,0,"RIFF"),r.setUint32(4,36+n,!0),G(r,8,"WAVE"),G(r,12,"fmt "),r.setUint32(16,16,!0),r.setUint16(20,1,!0),r.setUint16(22,t,!0),r.setUint32(24,s,!0),r.setUint32(28,s*t*i,!0),r.setUint16(32,t*i,!0),r.setUint16(34,e,!0),G(r,36,"data"),r.setUint32(40,n,!0);let o=0;for(let p=0;p<t;p++){const u=c.getChannelData(p);for(let m=0;m<a;m++){const f=Math.abs(u[m]);f>o&&(o=f)}}o>1&&console.warn(`SONIQ export: peak ${o.toFixed(3)} exceeded 1.0 — normalization applied`);const d=o>.99?.99/o:1;let h=44;for(let p=0;p<a;p++)for(let u=0;u<t;u++){const m=Math.max(-1,Math.min(1,c.getChannelData(u)[p]*d));if(e===16)r.setInt16(h,Math.round(m*32767),!0),h+=2;else{const f=Math.round(m<0?m*8388608:m*8388607);r.setUint8(h,f&255),r.setUint8(h+1,f>>8&255),r.setUint8(h+2,f>>16&255),h+=3}}return new Blob([l],{type:"audio/wav"})}function Q(c,e){const t=URL.createObjectURL(c),s=document.createElement("a");s.href=t,s.download=e,s.click(),setTimeout(()=>URL.revokeObjectURL(t),2e3)}const O={sliders:{"eq-sub":0,"eq-bass":0,"eq-mid":0,"eq-highs":0,"eq-presence":0,"eq-air":0,"eq-demud":0,"comp-threshold":-18,"comp-ratio":4,"comp-attack":10,"comp-release":100,"stereo-width":100,"output-gain":0},toggles:{denoise:!1,limiter:!1,gate:!1}},z=["eq-sub","eq-bass","eq-mid","eq-highs","eq-presence","eq-air","eq-demud","comp-threshold","comp-ratio","comp-attack","comp-release","stereo-width","output-gain"],V=["denoise","limiter","gate"];class Pe{constructor(e,{denoise:t=null}={}){this._ae=e,this._denoise=t||new ue,this._originalBuffer=null,this._masteredBuffer=null,this._currentFile=null,this._isPlaying=!1,this._playSource=null,this._playAnalyser=null,this._playStartTime=0,this._playOffset=0,this._abMode=!1,this._hasFile=!1,this._hasEnhanced=!1,this._seekWasPlaying=!1,this._liveEqNodes=null,this._rnnoiseApplied=!1,this._sliders={...O.sliders},this._toggles={...O.toggles},this._toggles.limiter=!0,this._activePreset=null,this._waveformBefore=new ie("waveformBefore","#6c63ff"),this._waveformAfter=new ie("waveformAfter","#00d4aa"),this._spectrum=new Be("spectrum"),this._lufsMeter=new Ee,this._seekbar=new Ie(s=>this._onSeek(s)),this._presets=new Ae((s,a)=>this._applyPreset(s,a)),this._resetBtns=new Ce((s,a)=>this._onReset(s,a)),this._el=null}render(){const e=document.createElement("div");return e.innerHTML=this._buildHTML(),this._el=e.firstElementChild,this._el}init(){var e,t,s;this._waveformBefore.clear(),this._waveformAfter.clear(),this._spectrum.clear(),this._seekbar.render({containerId:"masterSeekContainer",inputId:"masterSeek",curId:"masterSeekCur",durId:"masterSeekDur"}),this._presets.render(),this._resetBtns.addResetButtonById("resetMasterEQ","eq"),this._resetBtns.addResetButtonById("resetMasterComp","comp"),this._resetBtns.addResetButtonById("resetMasterOutput","output"),this._resetBtns.addResetButtonById("clearPresetBtn","preset"),(e=document.getElementById("resetDenoise"))==null||e.addEventListener("click",a=>{a.stopPropagation(),this._resetToggle("denoise",!1),this._resetBtns.showConfirmation(a.currentTarget)}),(t=document.getElementById("resetLimiter"))==null||t.addEventListener("click",a=>{a.stopPropagation(),this._resetToggle("limiter",!0),this._resetBtns.showConfirmation(a.currentTarget)}),(s=document.getElementById("resetGate"))==null||s.addEventListener("click",a=>{a.stopPropagation(),this._resetToggle("gate",!1),this._resetBtns.showConfirmation(a.currentTarget)}),this._initDropZone(),this._initSliders(),this._initToggles(),this._initActionBar(),this._initKeyboard(),this._initResizeObserver(),this._updateActionBar(),this._initTooltips(),this._updateRNNoiseBadge("loading"),this._denoise.load().then(()=>this._updateRNNoiseBadge(null)).catch(()=>this._updateRNNoiseBadge("unavailable"))}loadState(e){e&&(e.sliders&&(Object.assign(this._sliders,e.sliders),z.forEach(t=>{const s=document.getElementById(t);s&&this._sliders[t]!==void 0&&(s.value=this._sliders[t],this._updateSliderDisplay(t,this._sliders[t]))})),e.toggles&&(Object.assign(this._toggles,e.toggles),V.forEach(t=>{const s=document.getElementById(`toggle-${t}`);s&&(s.classList.toggle("on",!!this._toggles[t]),s.setAttribute("aria-checked",String(!!this._toggles[t])))})),e.activePreset&&(this._activePreset=e.activePreset,this._presets.setActive(this._activePreset)),this._syncAudioEngine())}getState(){return{sliders:{...this._sliders},toggles:{...this._toggles},activePreset:this._activePreset}}_buildHTML(){return`
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
    <button class="btn btn-primary" id="enhanceBtn" disabled>
      <span class="btn-icon">⚡</span>Enhance
    </button>
    <div class="divider"></div>
    <button class="btn btn-secondary" id="playBtn" disabled>
      <span class="play-btn-icon">▶</span>
      <span class="play-btn-text">Preview</span>
    </button>
    <button class="btn btn-secondary" id="abBtn" disabled data-tip="Instantly flip between your original unprocessed audio (A) and the mastered version (B) during playback. Use this to judge if your processing is actually improving the sound.">
      <span class="btn-icon">🔀</span>A/B Compare
    </button>
    <div class="divider"></div>
    <div class="download-group">
      <button class="btn-dl" id="dl16Btn" disabled><span>⬇</span> 16-bit WAV</button>
      <button class="btn-dl" id="dl24Btn" disabled><span>⬇</span> 24-bit WAV</button>
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

</div>`}_initDropZone(){var s;const e=document.getElementById("dropZone"),t=document.getElementById("fileInput");!e||!t||(e.addEventListener("click",a=>{a.target.id!=="fileClear"&&t.click()}),e.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),t.click())}),e.addEventListener("dragover",a=>{a.preventDefault(),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>e.classList.remove("drag-over")),e.addEventListener("drop",a=>{a.preventDefault(),e.classList.remove("drag-over"),a.dataTransfer.files[0]&&this._handleFile(a.dataTransfer.files[0])}),t.addEventListener("change",()=>{t.files[0]&&this._handleFile(t.files[0]),t.value=""}),(s=document.getElementById("fileClear"))==null||s.addEventListener("click",a=>{a.stopPropagation(),this._clearFile()}))}async _handleFile(e){const t=e.name.split(".").pop().toLowerCase();if(!["mp3","wav","flac","ogg"].includes(t)){this._setStatus("Unsupported format — use MP3, WAV, FLAC, or OGG",!1);return}this._setStatus("Decoding audio…",!0,!0),await this._ae.resume();let s;try{s=await e.arrayBuffer()}catch{this._setStatus("Failed to read file",!1);return}let a;try{a=await this._ae.context.decodeAudioData(s)}catch(n){this._setStatus(`Failed to decode audio: ${n.message}`,!1);return}this._originalBuffer=a,this._masteredBuffer=null,this._currentFile=e,this._hasFile=!0,this._hasEnhanced=!1,this._abMode=!1,this._playOffset=0;const i=this._fmtDuration(a.duration);document.getElementById("fileName").textContent=e.name,document.getElementById("fileMeta").textContent=`${this._fmtBytes(e.size)} · ${t.toUpperCase()} · ${a.numberOfChannels}ch · ${(a.sampleRate/1e3).toFixed(1)}kHz`,document.getElementById("fileInfo").classList.add("visible"),document.getElementById("dropZone").classList.add("has-file"),document.getElementById("waveBeforeDuration").textContent=i,document.getElementById("waveAfterDuration").textContent="—",document.getElementById("waveAfterMsg").textContent="Enhance to preview",document.getElementById("waveAfterMsg").style.display="",document.getElementById("waveBeforeMsg").style.display="none",document.getElementById("summaryCard").style.display="none",this._seekbar.setDuration(a.duration),this._seekbar.reset(),document.getElementById("masterSeekContainer").style.display="",this._waveformBefore.draw(a),this._waveformAfter.clear(),this._spectrum.clear(),this._lufsMeter.reset(),this._updateActionBar(),this._setStatus(`Loaded: ${e.name} (${i})`,!0)}_clearFile(){this._stopPlayback(),this._originalBuffer=null,this._masteredBuffer=null,this._currentFile=null,this._hasFile=!1,this._hasEnhanced=!1,this._abMode=!1,this._playOffset=0,document.getElementById("fileInfo").classList.remove("visible"),document.getElementById("dropZone").classList.remove("has-file"),document.getElementById("waveBeforeMsg").style.display="",document.getElementById("waveAfterMsg").textContent="Enhance to preview",document.getElementById("waveAfterMsg").style.display="",document.getElementById("waveBeforeDuration").textContent="—",document.getElementById("waveAfterDuration").textContent="—",document.getElementById("summaryCard").style.display="none",this._seekbar.reset(),this._waveformBefore.clear(),this._waveformAfter.clear(),this._spectrum.clear(),this._lufsMeter.reset(),this._updateActionBar(),this._setStatus("Drop a file to begin",!1)}_initSliders(){z.forEach(e=>{const t=document.getElementById(e);t&&(this._sliders[e]!==void 0?t.value=this._sliders[e]:this._sliders[e]=+t.value,this._updateSliderDisplay(e,t.value),t.addEventListener("input",()=>{this._sliders[e]=+t.value,this._updateSliderDisplay(e,t.value),this._updateLiveEQ(e,t.value),this._syncAESlider(e,+t.value),this._activePreset=null,this._presets.clearActive()}))})}_updateSliderDisplay(e,t){const s=document.getElementById(`val-${e}`);s&&(s.textContent=Le(e,t));const a=document.getElementById(e);if(a){const i=+a.min,n=+a.max,r=(+t-i)/(n-i)*100;a.style.background=`linear-gradient(to right,var(--accent) ${r}%,var(--knob-track) ${r}%)`}}_updateLiveEQ(e,t){if(!this._liveEqNodes)return;const s=parseFloat(t);e==="eq-sub"?this._liveEqNodes.sub.gain.value=s:e==="eq-bass"?this._liveEqNodes.bass.gain.value=s:e==="eq-mid"?this._liveEqNodes.mid.gain.value=s:e==="eq-highs"?this._liveEqNodes.highs.gain.value=s:e==="eq-presence"?this._liveEqNodes.pres.gain.value=s:e==="eq-air"?this._liveEqNodes.air.gain.value=s:e==="eq-demud"&&(this._liveEqNodes.demud.gain.value=-(s/100)*10)}_syncAESlider(e,t){const s=this._ae;e==="eq-sub"?s.eqNodes.setSubBass(t):e==="eq-bass"?s.eqNodes.setBass(t):e==="eq-mid"?s.eqNodes.setMid(t):e==="eq-highs"?s.eqNodes.setHighs(t):e==="eq-presence"?s.eqNodes.setPresence(t):e==="eq-air"?s.eqNodes.setAir(t):e==="eq-demud"?s.eqNodes.setDeMud(t):e==="comp-threshold"?s.compressor.setThreshold(t):e==="comp-ratio"?s.compressor.setRatio(t):e==="comp-attack"?s.compressor.setAttack(t/1e3):e==="comp-release"?s.compressor.setRelease(t/1e3):e==="output-gain"&&s.setOutputGain(ne(t))}_syncAudioEngine(){z.forEach(e=>{this._sliders[e]!==void 0&&this._syncAESlider(e,this._sliders[e])}),this._ae.limiter.setEnabled(!!this._toggles.limiter)}_initToggles(){V.forEach(e=>{const t=document.getElementById(`toggle-${e}`);if(!t)return;const s=e==="limiter"?!0:!!this._toggles[e];this._toggles[e]=s,t.classList.toggle("on",s),t.setAttribute("aria-checked",String(s));const a=()=>{this._toggles[e]=!this._toggles[e],t.classList.toggle("on",this._toggles[e]),t.setAttribute("aria-checked",String(this._toggles[e])),e==="limiter"&&this._ae.limiter.setEnabled(this._toggles.limiter),this._activePreset=null,this._presets.clearActive()};t.addEventListener("click",a),t.addEventListener("keydown",i=>{(i.key===" "||i.key==="Enter")&&(i.preventDefault(),a())})})}_resetToggle(e,t){this._toggles[e]=t;const s=document.getElementById(`toggle-${e}`);s&&(s.classList.toggle("on",t),s.setAttribute("aria-checked",String(t))),e==="limiter"&&this._ae.limiter.setEnabled(t),this._activePreset=null,this._presets.clearActive()}_applyPreset(e,t){z.forEach(s=>{if(t[s]===void 0)return;const a=document.getElementById(s);a&&(a.value=t[s]),this._sliders[s]=t[s],this._updateSliderDisplay(s,t[s]),this._updateLiveEQ(s,t[s]),this._syncAESlider(s,t[s])}),V.forEach(s=>{var n;const a=((n=t.toggles)==null?void 0:n[s])!==void 0?t.toggles[s]:this._toggles[s];this._toggles[s]=a;const i=document.getElementById(`toggle-${s}`);i&&(i.classList.toggle("on",a),i.setAttribute("aria-checked",String(a)))}),this._ae.limiter.setEnabled(!!this._toggles.limiter),this._activePreset=e}_onReset(e){const t=O.sliders;let s=[];if(e==="eq"&&(s=["eq-sub","eq-bass","eq-mid","eq-highs","eq-presence","eq-air","eq-demud"]),e==="comp"&&(s=["comp-threshold","comp-ratio","comp-attack","comp-release"]),e==="output"&&(s=["stereo-width","output-gain"]),e==="preset"){this._activePreset=null,this._presets.clearActive();return}s.forEach(a=>{const i=document.getElementById(a),n=t[a]!==void 0?t[a]:+(i==null?void 0:i.defaultValue);i&&(i.value=n),this._sliders[a]=n,this._updateSliderDisplay(a,n),this._updateLiveEQ(a,n),this._syncAESlider(a,n)}),this._activePreset=null,this._presets.clearActive()}_initResetAll(){var e;(e=document.getElementById("resetAllBtn"))==null||e.addEventListener("click",()=>{z.forEach(t=>{const s=document.getElementById(t);if(!s)return;const a=O.sliders[t]!==void 0?O.sliders[t]:+s.defaultValue;s.value=a,this._sliders[t]=a,this._updateSliderDisplay(t,a),this._updateLiveEQ(t,a),this._syncAESlider(t,a)}),this._toggles={denoise:!1,limiter:!0,gate:!1},V.forEach(t=>{const s=document.getElementById(`toggle-${t}`),a=this._toggles[t];s&&(s.classList.toggle("on",a),s.setAttribute("aria-checked",String(a)))}),this._ae.limiter.setEnabled(!0),this._activePreset=null,this._presets.clearActive(),this._setStatus("Settings reset to defaults",!0)})}_initActionBar(){var e,t,s,a,i,n;(e=document.getElementById("enhanceBtn"))==null||e.addEventListener("click",()=>{this._hasFile&&this._runMastering()}),(t=document.getElementById("playBtn"))==null||t.addEventListener("click",()=>{this._hasFile&&this._togglePlayback()}),(s=document.getElementById("abBtn"))==null||s.addEventListener("click",()=>{this._hasEnhanced&&(this._abMode=!this._abMode,this._isPlaying&&(this._stopPlayback(),this._startPlayback()),this._updateActionBar())}),(a=document.getElementById("dl16Btn"))==null||a.addEventListener("click",()=>{if(!this._masteredBuffer)return;const l=this._baseName()+"_mastered_16bit.wav";this._setStatus("Encoding 16-bit WAV…",!0,!0),setTimeout(()=>{Q(W(this._masteredBuffer,16),l),this._setStatus("Downloaded: "+l,!0)},0)}),(i=document.getElementById("dl24Btn"))==null||i.addEventListener("click",()=>{if(!this._masteredBuffer)return;const l=this._baseName()+"_mastered_24bit.wav";this._setStatus("Encoding 24-bit WAV…",!0,!0),setTimeout(()=>{Q(W(this._masteredBuffer,24),l),this._setStatus("Downloaded: "+l,!0)},0)}),(n=document.getElementById("summaryClose"))==null||n.addEventListener("click",()=>{document.getElementById("summaryCard").style.display="none"})}_updateActionBar(e=!1){const t=s=>document.getElementById(s);t("enhanceBtn").disabled=!this._hasFile||e,t("playBtn").disabled=!this._hasFile||e,t("abBtn").disabled=!this._hasEnhanced||e,t("dl16Btn").disabled=!this._hasEnhanced||e,t("dl24Btn").disabled=!this._hasEnhanced||e,t("abBtn").classList.toggle("active",this._abMode)}_initKeyboard(){document.addEventListener("keydown",e=>{var s;if(!(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||((s=document.getElementById("tab-stem"))==null?void 0:s.style.display)!=="none")){if(e.key===" ")e.preventDefault(),this._hasFile&&this._togglePlayback();else if(e.key==="a"||e.key==="A")this._hasEnhanced&&(this._abMode=!this._abMode,this._isPlaying&&(this._stopPlayback(),this._startPlayback()),this._updateActionBar());else if((e.key==="d"||e.key==="D")&&this._hasEnhanced&&this._masteredBuffer){const a=this._baseName()+"_mastered_24bit.wav";Q(W(this._masteredBuffer,24),a),this._setStatus("Downloaded: "+a,!0)}}})}async _runMastering(){var y,v;if(!this._originalBuffer)return;this._stopPlayback(),document.getElementById("summaryCard").style.display="none",this._rnnoiseApplied=!1;const e=performance.now();this._showProgress(0,"Initializing mastering chain…"),this._setStatus("Mastering in progress…",!0,!0),this._updateActionBar(!0),(y=document.getElementById("masterSeekLoading"))==null||y.classList.add("active");let t=this._originalBuffer;if(this._toggles.denoise)if(this._denoise.isAvailable){this._showProgress(1,"AI Denoise: resampling to 16 kHz…");try{t=await this._denoise.process(this._originalBuffer,this._ae.context,b=>this._showProgress(1+Math.round(b*20),`AI Denoising… ${Math.round(b*100)}%`)),this._rnnoiseApplied=!0,this._showProgress(21,"AI Denoise complete ✨"),await this._sleep(150)}catch(b){console.warn("[MasterTab] RNNoise error:",b.message),t=this._originalBuffer}}else this._denoise.isLoading&&(this._showProgress(1,"AI Denoise: WASM still loading, skipping…"),await this._sleep(300));const s=t.sampleRate,a=t.duration,i=Math.max(t.numberOfChannels,2),n=new OfflineAudioContext(i,Math.ceil(a*s),s),l=n.createBufferSource();if(t.numberOfChannels===1){const b=n.createBuffer(2,t.length,s),x=t.getChannelData(0);b.copyToChannel(x,0),b.copyToChannel(x,1),l.buffer=b}else l.buffer=t;this._buildOfflineChain(n,l),l.start(0);const r=[[8,"Applying high-pass filter (80 Hz)…"],[18,"Equalizing bass frequencies…"],[28,"Applying de-mud notch at 300 Hz…"],[38,"Boosting presence at 3 kHz…"],[46,"Adding air at 12 kHz…"],[55,"Applying dynamics compression…"],[68,"Peak limiting at -1 dBFS…"],[78,"Applying output gain…"],[88,"Rendering offline context…"]];let o=0;const d=setInterval(()=>{if(o<r.length){const[b,x]=r[o++];this._showProgress(b,x)}},180);let h;try{h=await n.startRendering()}catch(b){clearInterval(d),this._hideProgress(),this._setStatus("Mastering failed: "+b.message,!1),this._updateActionBar();return}clearInterval(d),this._showProgress(91,"Applying M/S stereo widening…"),this._applyStereoWidth(h),this._showProgress(94,"Applying noise gate…"),this._applyNoiseGate(h),this._toggles.denoise&&!this._rnnoiseApplied&&(this._showProgress(96,"AI Denoise: applying spectral fallback…"),this._applyWienerFallback(h)),this._showProgress(98,"Computing loudness metrics…"),await this._sleep(0);const p=this._computeIntegratedLUFS(this._originalBuffer),u=this._computeIntegratedLUFS(h),m=this._computeTruePeak(h),f=this._computeLRA(h),_=((performance.now()-e)/1e3).toFixed(2);this._masteredBuffer=h,this._showProgress(100,"Done!"),await this._sleep(250),this._hideProgress(),(v=document.getElementById("masterSeekLoading"))==null||v.classList.remove("active"),this._hasEnhanced=!0,this._waveformAfter.draw(this._masteredBuffer),document.getElementById("waveAfterMsg").style.display="none",document.getElementById("waveAfterDuration").textContent=this._fmtDuration(this._masteredBuffer.duration),this._lufsMeter.update({integrated:u,shortTerm:u,lra:f,truePeak:m}),this._showSummary({masterLUFS:u,lufsGained:u-p,truePeak:m,lra:f,procTime:_}),this._updateActionBar(),this._setStatus(`Mastered — ${u.toFixed(1)} LUFS · ${m.toFixed(1)} dBTP`,!0)}_buildOfflineChain(e,t){const s=this._sliders,a=e.createBiquadFilter();a.type="highpass",a.frequency.value=80,a.Q.value=.707;const i=e.createBiquadFilter();i.type="lowshelf",i.frequency.value=60,i.gain.value=s["eq-sub"]||0;const n=e.createBiquadFilter();n.type="peaking",n.frequency.value=200,n.Q.value=1,n.gain.value=s["eq-bass"]||0;const l=e.createBiquadFilter();l.type="peaking",l.frequency.value=1e3,l.Q.value=1,l.gain.value=s["eq-mid"]||0;const r=e.createBiquadFilter();r.type="peaking",r.frequency.value=8e3,r.Q.value=1,r.gain.value=s["eq-highs"]||0;const o=e.createBiquadFilter();o.type="peaking",o.frequency.value=300,o.Q.value=1.5,o.gain.value=-((s["eq-demud"]||0)/100)*10;const d=e.createBiquadFilter();d.type="peaking",d.frequency.value=3500,d.Q.value=1.2,d.gain.value=s["eq-presence"]||0;const h=e.createBiquadFilter();h.type="highshelf",h.frequency.value=12e3,h.gain.value=s["eq-air"]||0;const p=e.createDynamicsCompressor();p.threshold.value=s["comp-threshold"]||-18,p.ratio.value=s["comp-ratio"]||4,p.attack.value=(s["comp-attack"]||10)/1e3,p.release.value=(s["comp-release"]||100)/1e3,p.knee.value=6;const u=e.createDynamicsCompressor();this._toggles.limiter?(u.threshold.value=-1,u.ratio.value=20,u.attack.value=.001,u.release.value=.05,u.knee.value=0):(u.threshold.value=0,u.ratio.value=1,u.attack.value=0,u.release.value=0,u.knee.value=0);const m=e.createGain();m.gain.value=ne(s["output-gain"]||0),t.connect(a),a.connect(i),i.connect(n),n.connect(l),l.connect(r),r.connect(o),o.connect(d),d.connect(h),h.connect(p),p.connect(u),u.connect(m),m.connect(e.destination)}_applyStereoWidth(e){if(e.numberOfChannels<2)return;const t=(this._sliders["stereo-width"]||100)/100,s=e.getChannelData(0),a=e.getChannelData(1);for(let i=0;i<s.length;i++){const n=(s[i]+a[i])*.5,l=(s[i]-a[i])*.5*t;s[i]=n+l,a[i]=n-l}}_applyNoiseGate(e){if(!this._toggles.gate)return;const t=Math.pow(10,-50/20),s=e.sampleRate,a=Math.exp(-1/(.005*s)),i=Math.exp(-1/(.1*s));for(let n=0;n<e.numberOfChannels;n++){const l=e.getChannelData(n);let r=0;for(let o=0;o<l.length;o++){const d=Math.abs(l[o]);r=d>r?a*r+(1-a)*d:i*r+(1-i)*d,r<t&&(l[o]*=Math.max(0,r/t))}}}_applyWienerFallback(e){const t=e.sampleRate,s=Math.min(Math.floor(.2*t),e.length);for(let a=0;a<e.numberOfChannels;a++){const i=e.getChannelData(a);let n=0;for(let r=0;r<s;r++)n+=i[r]*i[r];n/=s;const l=Math.sqrt(n)*2.5;for(let r=0;r<i.length;r++){const o=Math.abs(i[r]);i[r]*=Math.max(0,1-l/Math.max(o,1e-10))}}}_computeIntegratedLUFS(e){const t=e.sampleRate,s=Math.floor(.4*t),a=Math.floor(.1*t),i=e.length,n=[];for(let p=0;p<Math.min(e.numberOfChannels,2);p++)n.push(e.getChannelData(p));const l=[];for(let p=0;p+s<=i;p+=a){let u=0;for(let m=0;m<n.length;m++)for(let f=p;f<p+s;f++)u+=n[m][f]*n[m][f];l.push(-.691+10*Math.log10(Math.max(u/(s*n.length),1e-10)))}if(!l.length)return-1/0;const r=l.filter(p=>p>=-70);if(!r.length)return-70;const o=r.reduce((p,u)=>p+Math.pow(10,u/10),0)/r.length,d=10*Math.log10(o)-10,h=r.filter(p=>p>=d);return h.length?-.691+10*Math.log10(h.reduce((p,u)=>p+Math.pow(10,u/10),0)/h.length):-1/0}_computeTruePeak(e){let t=0;for(let s=0;s<e.numberOfChannels;s++){const a=e.getChannelData(s);for(let i=0;i<a.length;i++){const n=Math.abs(a[i]);n>t&&(t=n)}}return 20*Math.log10(Math.max(t,1e-10))}_computeLRA(e){const t=e.sampleRate,s=Math.floor(3*t),a=Math.floor(1*t),i=e.length,n=Math.min(e.numberOfChannels,2),l=[];for(let o=0;o+s<=i;o+=a){let d=0;for(let h=0;h<n;h++){const p=e.getChannelData(h);for(let u=o;u<o+s;u++)d+=p[u]*p[u]}l.push(-.691+10*Math.log10(Math.max(d/(s*n),1e-10)))}if(l.length<2)return 0;const r=l.filter(o=>o>=-70).sort((o,d)=>o-d);return r.length<2?0:Math.max(0,r[Math.floor(r.length*.95)]-r[Math.floor(r.length*.1)])}_startPlayback(){const e=this._ae.context;this._ae.resume();const t=this._abMode?this._originalBuffer:this._masteredBuffer||this._originalBuffer;if(!t)return;this._playSource=e.createBufferSource(),this._playSource.buffer=t;const s=e.createBiquadFilter();s.type="lowshelf",s.frequency.value=60,s.gain.value=this._sliders["eq-sub"]||0;const a=e.createBiquadFilter();a.type="peaking",a.frequency.value=200,a.Q.value=1,a.gain.value=this._sliders["eq-bass"]||0;const i=e.createBiquadFilter();i.type="peaking",i.frequency.value=1e3,i.Q.value=1,i.gain.value=this._sliders["eq-mid"]||0;const n=e.createBiquadFilter();n.type="peaking",n.frequency.value=8e3,n.Q.value=1,n.gain.value=this._sliders["eq-highs"]||0;const l=e.createBiquadFilter();l.type="peaking",l.frequency.value=300,l.Q.value=1.5,l.gain.value=-((this._sliders["eq-demud"]||0)/100)*10;const r=e.createBiquadFilter();r.type="peaking",r.frequency.value=3500,r.Q.value=1.2,r.gain.value=this._sliders["eq-presence"]||0;const o=e.createBiquadFilter();o.type="highshelf",o.frequency.value=12e3,o.gain.value=this._sliders["eq-air"]||0,this._liveEqNodes={sub:s,bass:a,mid:i,highs:n,demud:l,pres:r,air:o};const d=e.createChannelSplitter(2),h=e.createAnalyser();h.fftSize=512,h.smoothingTimeConstant=.5;const p=e.createAnalyser();p.fftSize=512,p.smoothingTimeConstant=.5,this._playAnalyser=e.createAnalyser(),this._playAnalyser.fftSize=4096,this._playAnalyser.smoothingTimeConstant=.8,this._playSource.connect(s),s.connect(a),a.connect(i),i.connect(n),n.connect(l),l.connect(r),r.connect(o),o.connect(this._playAnalyser),o.connect(d),d.connect(h,0),d.connect(p,1),this._playAnalyser.connect(e.destination);const u=this._playOffset%t.duration;this._playSource.start(0,u),this._playStartTime=e.currentTime-u,this._playSource.onended=()=>{this._isPlaying&&(this._playOffset=0,this._stopPlayback())},this._isPlaying=!0;const m=document.getElementById("playBtn");m&&(m.querySelector(".play-btn-icon").textContent="⏸",m.querySelector(".play-btn-text").textContent="Pause"),document.getElementById("spectrumMsg").style.display="none",this._spectrum.start(this._playAnalyser),this._lufsMeter.startMonitoring(this._playAnalyser,h,p),this._seekbar.startAnimation(()=>{const f=e.currentTime-this._playStartTime;return Math.max(0,f)})}_stopPlayback(){if(this._spectrum.stop(),this._lufsMeter.stopMonitoring(),this._seekbar.stopAnimation(),this._playSource){try{this._playSource.stop()}catch{}this._playSource=null}this._playAnalyser=null,this._liveEqNodes=null,this._isPlaying=!1;const e=document.getElementById("playBtn");e&&(e.querySelector(".play-btn-icon").textContent="▶",e.querySelector(".play-btn-text").textContent="Preview");const t=this._abMode?this._originalBuffer:this._masteredBuffer||this._originalBuffer;t&&isFinite(this._playOffset)&&this._seekbar.update(this._playOffset,t.duration),this._spectrum.clear()}_togglePlayback(){if(this._isPlaying){const e=this._ae.context;this._playOffset=Math.max(0,e.currentTime-this._playStartTime),this._stopPlayback()}else this._startPlayback()}_onSeek(e){if(e<0){if(this._seekWasPlaying=this._isPlaying,this._isPlaying){const t=this._ae.context;this._playOffset=Math.max(0,t.currentTime-this._playStartTime),this._stopPlayback()}}else this._playOffset=e,this._seekWasPlaying&&this._startPlayback(),this._seekWasPlaying=!1}_updateRNNoiseBadge(e){const t=document.getElementById("rnnoiseStatus"),s=document.getElementById("toggle-denoise"),a=document.getElementById("denoiseDesc");if(!(!t||!s)){if(s.classList.remove("rn-loading","rn-unavailable"),t.style.display="none",t.className="rnnoise-badge",e==="loading")t.innerHTML='<span class="rn-spin">⟳</span> Loading',t.classList.add("badge-loading"),t.style.display="",s.classList.add("rn-loading");else if(e==="unavailable"){t.textContent="Unavailable",t.classList.add("badge-unavail"),t.style.display="",s.classList.add("rn-unavailable"),a&&(a.textContent="Unavailable in this browser"),this._toggles.denoise=!1;const i=document.getElementById("toggle-denoise");i&&(i.classList.remove("on"),i.setAttribute("aria-checked","false"))}}}_initTooltips(){const e=document.getElementById("tipBubble");if(!e)return;let t=null,s=null;const a=n=>{const l=n.dataset.tip;if(!l)return;clearTimeout(s),t&&t!==n&&t.classList.remove("tip-active"),t=n,n.classList.add("tip-active"),e.textContent=l,e.classList.add("visible");const r=n.getBoundingClientRect(),o=e.offsetWidth||260,d=e.offsetHeight||60,h=8;let p=r.left+r.width/2-o/2;p=Math.max(8,Math.min(p,window.innerWidth-o-8));const u=r.top-d-h>=8?r.top-d-h:r.bottom+h;e.style.left=p+"px",e.style.top=u+"px"},i=()=>{s=setTimeout(()=>{e.classList.remove("visible"),t&&(t.classList.remove("tip-active"),t=null)},120)};document.addEventListener("mouseover",n=>{const l=n.target.closest("[data-tip]");l&&a(l)}),document.addEventListener("mouseout",n=>{n.target.closest("[data-tip]")&&i()}),document.addEventListener("click",n=>{const l=n.target.closest(".tip-icon[data-tip]");l&&(n.stopPropagation(),l===t&&e.classList.contains("visible")?i():a(l))}),document.addEventListener("click",n=>{!n.target.closest("[data-tip]")&&e.classList.contains("visible")&&i()})}_initResizeObserver(){let e;window.addEventListener("resize",()=>{clearTimeout(e),e=setTimeout(()=>{this._originalBuffer&&this._waveformBefore.draw(this._originalBuffer),this._masteredBuffer&&this._waveformAfter.draw(this._masteredBuffer),this._isPlaying||this._spectrum.clear()},150)})}_showProgress(e,t){const s=document.getElementById("progressWrap");s&&(s.style.display="block");const a=document.getElementById("progressFill");a&&(a.style.width=e+"%");const i=document.getElementById("progressPct");i&&(i.textContent=Math.round(e)+"%");const n=document.getElementById("progressMsg");n&&(n.textContent=t)}_hideProgress(){const e=document.getElementById("progressWrap");e&&(e.style.display="none")}_showSummary({masterLUFS:e,lufsGained:t,truePeak:s,lra:a,procTime:i}){const n=o=>isFinite(o)?o.toFixed(1):"—";document.getElementById("sumLUFS").textContent=n(e)+" LUFS";const l=document.getElementById("sumGained");l.textContent=(t>=0?"+":"")+n(t)+" LU",l.className="summary-val"+(t>6?" warn":"");const r=document.getElementById("sumPeak");r.textContent=n(s)+" dBTP",r.className="summary-val"+(s>-1?" hot":s>-3?" warn":""),document.getElementById("sumLRA").textContent=n(a)+" LU",document.getElementById("sumWidth").textContent=Math.round(this._sliders["stereo-width"]||100)+"%",document.getElementById("sumTime").textContent=i+"s",document.getElementById("summaryDenoiseNote").style.display=this._rnnoiseApplied?"":"none",document.getElementById("summaryCard").style.display="block"}_setStatus(e,t=!0,s=!1){const a=document.getElementById("statusText");a&&(a.textContent=e);const i=document.getElementById("statusDot");i&&(i.className="status-dot"+(s?" processing":t?" ready":""))}_fmtDuration(e){const t=Math.floor(e/60),s=Math.floor(e%60);return`${t}:${s.toString().padStart(2,"0")}`}_fmtBytes(e){return e<1048576?`${(e/1024).toFixed(1)} KB`:`${(e/1048576).toFixed(2)} MB`}_baseName(){return this._currentFile?this._currentFile.name.replace(/\.[^.]+$/,""):"soniq"}_sleep(e){return new Promise(t=>setTimeout(t,e))}}const j=8,De={vocals:"#ff6b9d",guitar:"#ff9a3c",bass:"#4da6ff",drums:"#ff4d4d",keys:"#ffd700",other:"#8888a8"},Te={vocals:"🎤",guitar:"🎸",bass:"🎵",drums:"🥁",keys:"🎹",other:"🎼"},J={"smt-sub":"eq-sub","smt-bass":"eq-bass","smt-mid":"eq-mid","smt-highs":"eq-highs","smt-pres":"eq-presence","smt-air":"eq-air","smt-demud":"eq-demud","smt-thr":"comp-threshold","smt-rat":"comp-ratio","smt-atk":"comp-attack","smt-rel":"comp-release","smt-width":"stereo-width","smt-gain":"output-gain"};function Re(c){const e=c.toLowerCase();return/vocal|vox|voice|sing|lead|bgv|bv|chorus/.test(e)?"vocals":/guitar|gtr|gtrs/.test(e)?"guitar":/bass|sub|808/.test(e)?"bass":/drum|kick|snare|hihat|perc/.test(e)?"drums":/keys|piano|synth|pad|organ|chord/.test(e)?"keys":"other"}function $e(c){let e=c.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ").trim();return e.length>22?e.slice(0,22)+"…":e}let Ne=1;function Oe(c){const e=Re(c.name);return{id:Ne++,name:$e(c.name),type:e,color:De[e],filename:c.name,fileSize:c.size,volume:100,pan:0,muted:!1,soloed:!1,eqEnabled:!1,eqOpen:!1,eq:{hpf:80,bass:0,pres:0,air:0},compEnabled:!1,compOpen:!1,comp:{thr:-18,rat:4,atk:10,rel:100},reverb:0,width:100,denoise:!1,humanize:!1,humanizeIntensity:50}}const C=c=>((!isFinite(c)||c<0)&&(c=0),c=Math.floor(c),Math.floor(c/60)+":"+String(c%60).padStart(2,"0")),ze=c=>parseInt(c)+" Hz",Y=c=>(c=parseFloat(c),(c>0?"+":"")+c+" dB"),oe=c=>parseFloat(c)+" ms",He=c=>parseFloat(c)+":1",We=c=>(c=parseInt(c),c===0?"C":c>0?"R"+c:"L"+Math.abs(c)),Qe=c=>c<1048576?(c/1024).toFixed(0)+" KB":(c/1048576).toFixed(1)+" MB";function Z(c,e){return e=parseFloat(e),c==="eq-demud"||c==="stereo-width"?Math.round(e)+"%":c==="comp-ratio"?e+":1":c==="comp-attack"||c==="comp-release"?e+" ms":(e>0?"+":"")+e+" dB"}function M(c,e){if(!c)return;const t=(+c.value-+c.min)/(+c.max-+c.min)*100;c.style.background=`linear-gradient(to right,${e||"var(--accent)"} ${t}%,var(--knob-track) ${t}%)`}function Ue(c){const e=c.sampleRate,t=Math.floor(.4*e),s=Math.floor(.1*e),a=c.length,i=[];for(let d=0;d<Math.min(c.numberOfChannels,2);d++)i.push(c.getChannelData(d));const n=[];for(let d=0;d+t<=a;d+=s){let h=0;for(let p=0;p<i.length;p++)for(let u=d;u<d+t;u++)h+=i[p][u]*i[p][u];n.push(-.691+10*Math.log10(Math.max(h/(t*i.length),1e-10)))}if(!n.length)return-1/0;const l=n.filter(d=>d>=-70);if(!l.length)return-70;const r=l.reduce((d,h)=>d+Math.pow(10,h/10),0)/l.length,o=l.filter(d=>d>=10*Math.log10(r)-10);return o.length?-.691+10*Math.log10(o.reduce((d,h)=>d+Math.pow(10,h/10),0)/o.length):-1/0}function Ge(c){let e=0;for(let t=0;t<c.numberOfChannels;t++){const s=c.getChannelData(t);for(let a=0;a<s.length;a++){const i=Math.abs(s[a]);i>e&&(e=i)}}return 20*Math.log10(Math.max(e,1e-10))}function Ve(c){const e=c.sampleRate,t=Math.floor(3*e),s=e,a=c.length,i=Math.min(c.numberOfChannels,2),n=[];for(let r=0;r+t<=a;r+=s){let o=0;for(let d=0;d<i;d++){const h=c.getChannelData(d);for(let p=r;p<r+t;p++)o+=h[p]*h[p]}n.push(-.691+10*Math.log10(Math.max(o/(t*i),1e-10)))}if(n.length<2)return 0;const l=n.filter(r=>r>=-70).sort((r,o)=>r-o);return l.length<2?0:Math.max(0,l[Math.floor(l.length*.95)]-l[Math.floor(l.length*.1)])}function je(c,e,t){const s=Math.floor(.4*t),a=Math.floor(.1*t),i=c.length,n=[];for(let d=0;d+s<=i;d+=a){let h=0;for(let p=d;p<d+s;p++)h+=c[p]*c[p]+e[p]*e[p];n.push(-.691+10*Math.log10(Math.max(h/(s*2),1e-10)))}if(!n.length)return-1/0;const l=n.filter(d=>d>=-70);if(!l.length)return-70;const r=l.reduce((d,h)=>d+Math.pow(10,h/10),0)/l.length,o=l.filter(d=>d>=10*Math.log10(r)-10);return o.length?-.691+10*Math.log10(o.reduce((d,h)=>d+Math.pow(10,h/10),0)/o.length):-1/0}function Ze(c,e){for(let t=0;t<c.numberOfChannels;t++){const s=c.getChannelData(t),a=441;for(let o=0;o<s.length;o+=a){const d=1+(Math.random()-.5)*2*(e.humanizeIntensity/100)*.06,h=Math.min(o+a,s.length);for(let p=o;p<h;p++)s[p]*=d}const i=.3+Math.random()*.4,n=e.humanizeIntensity/100*.003,l=c.sampleRate,r=new Float32Array(s.length);for(let o=0;o<s.length;o++){const d=1+n*Math.sin(2*Math.PI*i*(o/l)),h=Math.floor(o*d),p=o*d-h,u=s[Math.min(h,s.length-1)],m=s[Math.min(h+1,s.length-1)];r[o]=u+p*(m-u)}s.set(r)}}function ce(c,e){if(c.numberOfChannels<2)return;const t=c.getChannelData(0),s=c.getChannelData(1);for(let a=0;a<t.length;a++){const i=(t[a]+s[a])*.5,n=(t[a]-s[a])*.5*e;t[a]=i+n,s[a]=i-n}}async function de(c,e){const t=Math.round(c.length*e/c.sampleRate),s=new OfflineAudioContext(c.numberOfChannels,t,e),a=s.createBufferSource();return a.buffer=c,a.connect(s.destination),a.start(0),s.startRendering()}class Ke{constructor(e,{denoise:t=null}={}){this._ae=e,this._ctx=e.context,this._denoise=t||new ue,this._stems=[],this._stemBuf=new Map,this._stemNd=new Map,this._master=null,this._reverbIR=null,this._isPlaying=!1,this._playOff=0,this._playStart=0,this._maxDur=0,this._seekDrag=!1,this._seekWas=!1,this._lufsHist=[],this._clockId=null,this._seekRaf=null,this._specRaf=null,this._lufsInt=null,this._el=null,this._denoise.load()}render(){const e=document.createElement("div");return e.innerHTML=this._html(),this._el=e,e}init(){this._buildMasterBus(),this._initDrop(),this._initTransport(),this._initSeekbar(),this._initMasterPanel(),this._initResets(),this._initKeyboard()}getState(){return{stems:this._stems.map(e=>({...e,eq:{...e.eq},comp:{...e.comp}}))}}loadState(e){}_slRow(e,t,s,a,i,n,l){return`<div class="sl-row"><span class="sl-lbl">${t}</span><div class="sl-wrap"><input type="range" id="${e}" min="${s}" max="${a}" step="${i}" value="${n}"></div><span class="sl-val" id="sv-${e}">${l}</span></div>`}_html(){return`
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
        ${this._slRow("smt-sub","Sub Bass",-12,12,.5,0,"0 dB")}
        ${this._slRow("smt-bass","Bass",-12,12,.5,0,"0 dB")}
        ${this._slRow("smt-mid","Midrange",-12,12,.5,0,"0 dB")}
        ${this._slRow("smt-highs","Highs",-12,12,.5,0,"0 dB")}
        ${this._slRow("smt-pres","Presence",0,12,.5,0,"0 dB")}
        ${this._slRow("smt-air","Air",0,10,.5,0,"0 dB")}
        ${this._slRow("smt-demud","De-Mud",0,100,1,0,"0%")}
      </div>
      <div class="mpanel">
        <div class="mpanel-header"><div class="mpanel-title">Compression</div><button class="reset-btn" id="resetSmtComp">↺ Reset</button></div>
        ${this._slRow("smt-thr","Threshold",-60,0,1,-18,"-18 dB")}
        ${this._slRow("smt-rat","Ratio",1,20,.5,4,"4:1")}
        ${this._slRow("smt-atk","Attack",.1,200,.1,10,"10 ms")}
        ${this._slRow("smt-rel","Release",10,1e3,5,100,"100 ms")}
      </div>
      <div class="mpanel">
        <div class="mpanel-header"><div class="mpanel-title">Output</div><button class="reset-btn" id="resetSmtOutput">↺ Reset</button></div>
        ${this._slRow("smt-width","St. Width",0,200,1,100,"100%")}
        ${this._slRow("smt-gain","Output Gain",-12,12,.5,0,"0 dB")}
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
</div>`}_trackHTML(e){const t=e.color,s=`
      <div class="exp-sl-row"><span class="exp-sl-lbl">Hi-Pass</span><input type="range" class="stem-slider" data-p="eq.hpf" min="20" max="500" step="5" value="${e.eq.hpf}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="eq.hpf">${ze(e.eq.hpf)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Low Shelf</span><input type="range" class="stem-slider" data-p="eq.bass" min="-12" max="12" step=".5" value="${e.eq.bass}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="eq.bass">${Y(e.eq.bass)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Presence</span><input type="range" class="stem-slider" data-p="eq.pres" min="-12" max="12" step=".5" value="${e.eq.pres}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="eq.pres">${Y(e.eq.pres)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Hi Shelf</span><input type="range" class="stem-slider" data-p="eq.air" min="-12" max="12" step=".5" value="${e.eq.air}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="eq.air">${Y(e.eq.air)}</span></div>`,a=`
      <div class="exp-sl-row"><span class="exp-sl-lbl">Threshold</span><input type="range" class="stem-slider" data-p="comp.thr" min="-60" max="0" step="1" value="${e.comp.thr}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="comp.thr">${e.comp.thr} dB</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Ratio</span><input type="range" class="stem-slider" data-p="comp.rat" min="1" max="20" step=".5" value="${e.comp.rat}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="comp.rat">${He(e.comp.rat)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Attack</span><input type="range" class="stem-slider" data-p="comp.atk" min=".1" max="200" step=".1" value="${e.comp.atk}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="comp.atk">${oe(e.comp.atk)}</span></div>
      <div class="exp-sl-row"><span class="exp-sl-lbl">Release</span><input type="range" class="stem-slider" data-p="comp.rel" min="10" max="1000" step="5" value="${e.comp.rel}" style="--stem-color:${t}"><span class="exp-sl-val" data-v="comp.rel">${oe(e.comp.rel)}</span></div>`;return`
    <div class="track-hdr">
      <span class="t-icon">${Te[e.type]}</span>
      <div class="track-name-col">
        <div class="track-name" style="color:${t}">${e.name}</div>
        <div class="track-file">${e.filename} · ${Qe(e.fileSize)}</div>
      </div>
      <div class="track-btns">
        <button class="icon-btn${e.muted?" muted":""}" data-a="mute" title="Mute">M</button>
        <button class="icon-btn${e.soloed?" soloed":""}" data-a="solo" title="Solo">S</button>
        <button class="track-remove" data-a="remove" title="Remove">✕</button>
      </div>
    </div>
    <div class="track-wave">
      <canvas id="wf-${e.id}"></canvas>
      <div class="playhead" id="ph-${e.id}"></div>
      <div class="track-wave-msg" id="wfmsg-${e.id}">Waveform preview</div>
    </div>
    <div class="track-mix">
      <div class="mix-vol">
        <span class="mix-tag">VOL</span>
        <input type="range" class="stem-slider" data-p="volume" min="0" max="150" step="1" value="${e.volume}" style="--stem-color:${t}">
        <span class="mix-num" data-v="volume">${e.volume}%</span>
      </div>
      <div class="mix-pan">
        <span class="mix-tag">PAN</span>
        <div class="pan-wrap">
          <input type="range" class="stem-slider" data-p="pan" min="-100" max="100" step="1" value="${e.pan}" style="--stem-color:${t}">
          <div class="pan-center"></div>
        </div>
        <span class="pan-num" data-v="pan">${We(e.pan)}</span>
      </div>
      <button class="stem-rst-btn" data-rst="mix" title="Reset vol &amp; pan">↺</button>
    </div>
    <div class="track-fx">
      <button class="fx-expand-btn${e.eqEnabled?" enabled":""}${e.eqOpen?" open":""}" data-a="toggleEQ"><span class="dot"></span> EQ <span class="chev">▼</span></button>
      <button class="fx-expand-btn${e.compEnabled?" enabled":""}${e.compOpen?" open":""}" data-a="toggleComp"><span class="dot"></span> COMP <span class="chev">▼</span></button>
      <div class="fx-inline">
        <span class="fx-inline-lbl">REV</span>
        <input type="range" class="stem-slider" data-p="reverb" min="0" max="100" step="1" value="${e.reverb}" style="--stem-color:${t}">
        <span class="fx-inline-val" data-v="reverb">${e.reverb}%</span>
        <button class="stem-rst-btn" data-rst="reverb">↺</button>
      </div>
      <div class="fx-inline">
        <span class="fx-inline-lbl">WIDTH</span>
        <input type="range" class="stem-slider" data-p="width" min="0" max="200" step="1" value="${e.width}" style="--stem-color:${t}">
        <span class="fx-inline-val" data-v="width">${e.width}%</span>
        <button class="stem-rst-btn" data-rst="width">↺</button>
      </div>
      <div class="fx-denoise${e.denoise?" on":""}" data-a="toggleDenoise" id="dn-pill-${e.id}" title="AI Denoise (at export)">✨ AI Denoise</div>
      <button class="stem-rst-btn" data-rst="denoise">↺</button>
      <div class="fx-humanize${e.humanize?" on":""}" data-a="toggleHumanize" title="Add subtle imperfections">🎲 Humanize</div>
      <button class="stem-rst-btn" data-rst="humanize">↺</button>
      <div class="fx-inline" id="hum-sl-${e.id}" style="${e.humanize?"":"opacity:.4;pointer-events:none"}">
        <span class="fx-inline-lbl">INT</span>
        <input type="range" class="stem-slider" data-p="humanizeIntensity" min="0" max="100" step="1" value="${e.humanizeIntensity}" style="--stem-color:${t}">
        <span class="fx-inline-val" data-v="humanizeIntensity">${e.humanizeIntensity}%</span>
      </div>
    </div>
    <div class="track-expander${e.eqOpen?" open":""}" id="eq-exp-${e.id}">
      <div class="exp-inner">
        <div class="exp-col">
          <div class="exp-col-hdr"><span class="exp-enable-sw${e.eqEnabled?" on":""}" data-a="enableEQ">${e.eqEnabled?"ON":"OFF"}</span> EQ <button class="stem-rst-btn" data-rst="eq" style="margin-left:auto">↺</button></div>
          ${s}
        </div>
        <div class="exp-col" style="opacity:.25;pointer-events:none;">
          <div class="exp-col-hdr" style="color:var(--text-dim)">COMP</div>${a}
        </div>
      </div>
    </div>
    <div class="track-expander${e.compOpen?" open":""}" id="comp-exp-${e.id}">
      <div class="exp-inner">
        <div class="exp-col" style="opacity:.25;pointer-events:none;">
          <div class="exp-col-hdr" style="color:var(--text-dim)">EQ</div>${s}
        </div>
        <div class="exp-col">
          <div class="exp-col-hdr"><span class="exp-enable-sw${e.compEnabled?" on":""}" data-a="enableComp">${e.compEnabled?"ON":"OFF"}</span> COMP <button class="stem-rst-btn" data-rst="comp" style="margin-left:auto">↺</button></div>
          ${a}
        </div>
      </div>
    </div>`}_initDrop(){const e=this._q("stemDropZone"),t=this._q("stemFileInput"),s=this._q("addStemBar"),a=this._q("addFileInput"),i=this._q("clearAllBtn"),n=this._q("stemsList");!e||!t||(e.addEventListener("click",()=>t.click()),t.addEventListener("change",l=>{l.target.files.length&&this._addFiles(l.target.files),l.target.value=""}),e.addEventListener("dragover",l=>{l.preventDefault(),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>e.classList.remove("drag-over")),e.addEventListener("drop",l=>{l.preventDefault(),e.classList.remove("drag-over"),l.dataTransfer.files.length&&this._addFiles(l.dataTransfer.files)}),s&&a&&(s.addEventListener("click",()=>a.click()),a.addEventListener("change",l=>{l.target.files.length&&this._addFiles(l.target.files),l.target.value=""})),n&&s&&(n.addEventListener("dragover",l=>{l.preventDefault(),s.style.borderColor="var(--accent)"}),n.addEventListener("dragleave",()=>{s.style.borderColor=""}),n.addEventListener("drop",l=>{l.preventDefault(),s.style.borderColor="",l.dataTransfer.files.length&&this._addFiles(l.dataTransfer.files)})),i&&i.addEventListener("click",()=>{this._stopAll(!1),this._stems.forEach(o=>{this._cleanup(o),this._stemBuf.delete(o.id)}),this._stems=[],this._maxDur=0,this._playOff=0;const l=this._q("stemsList");l&&(l.innerHTML="");const r=this._q("stemSummaryCard");r&&(r.style.display="none"),this._syncUI()}))}_addFiles(e){const t=Array.from(e).slice(0,j-this._stems.length);t.length&&(t.forEach(s=>{const a=Oe(s);this._stems.push(a);const i=this._mkTrackEl(a),n=this._q("stemsList");n&&n.appendChild(i),this._drawPlaceholder(a),this._decode(s,a)}),this._syncUI())}_mkTrackEl(e){const t=document.createElement("div");return t.className="stem-track"+(e.muted?" muted":""),t.dataset.stemId=e.id,t.style.setProperty("--stem-color",e.color),t.innerHTML=this._trackHTML(e),this._wireTrack(t,e),t.querySelectorAll(".stem-slider").forEach(s=>M(s,e.color)),t}_wireTrack(e,t){e.addEventListener("click",s=>{const a=s.target.closest("[data-rst]");if(a){s.stopPropagation(),this._rstSection(t,e,a.dataset.rst,a);return}const i=s.target.closest("[data-a]");if(!i)return;const n=i.dataset.a;n==="mute"?this._mute(t):n==="solo"?this._solo(t):n==="remove"?this._remove(t.id):n==="toggleEQ"?this._togEQPanel(t,e):n==="toggleComp"?this._togCmpPanel(t,e):n==="toggleDenoise"?this._togDenoise(t,e):n==="toggleHumanize"?this._togHumanize(t,e):n==="enableEQ"?this._togEQEnable(t,e):n==="enableComp"&&this._togCmpEnable(t,e)}),e.addEventListener("mousedown",()=>this._select(t.id)),e.querySelectorAll(".stem-slider").forEach(s=>{s.addEventListener("input",()=>{const a=s.dataset.p,i=parseFloat(s.value);this._setNested(t,a,i);const n=e.querySelector(`[data-v="${a}"]`);n&&(n.textContent=K(a,i)),M(s,t.color),this._updateNodes(t)})})}_mute(e){var s;e.muted=!e.muted;const t=this._sEl(e.id);t&&(t.classList.toggle("muted",e.muted),(s=t.querySelector('[data-a="mute"]'))==null||s.classList.toggle("muted",e.muted),this._updateNodes(e))}_solo(e){var t,s;e.soloed=!e.soloed,(s=(t=this._sEl(e.id))==null?void 0:t.querySelector('[data-a="solo"]'))==null||s.classList.toggle("soloed",e.soloed),this._stems.forEach(a=>this._updateNodes(a))}_select(e){var t;(t=this._q("stemsList"))==null||t.querySelectorAll(".stem-track").forEach(s=>s.classList.toggle("selected",+s.dataset.stemId===e))}_togEQPanel(e,t){var s,a;e.eqOpen=!e.eqOpen,(s=t.querySelector(`#eq-exp-${e.id}`))==null||s.classList.toggle("open",e.eqOpen),(a=t.querySelector('[data-a="toggleEQ"]'))==null||a.classList.toggle("open",e.eqOpen)}_togCmpPanel(e,t){var s,a;e.compOpen=!e.compOpen,(s=t.querySelector(`#comp-exp-${e.id}`))==null||s.classList.toggle("open",e.compOpen),(a=t.querySelector('[data-a="toggleComp"]'))==null||a.classList.toggle("open",e.compOpen)}_togDenoise(e,t){var s;e.denoise=!e.denoise,(s=t.querySelector('[data-a="toggleDenoise"]'))==null||s.classList.toggle("on",e.denoise)}_togHumanize(e,t){var a;e.humanize=!e.humanize,(a=t.querySelector('[data-a="toggleHumanize"]'))==null||a.classList.toggle("on",e.humanize);const s=t.querySelector(`#hum-sl-${e.id}`);s&&(s.style.opacity=e.humanize?"1":"0.4",s.style.pointerEvents=e.humanize?"":"none"),this._stemNd.has(e.id)&&(this._cleanup(e),this._buildNodes(e))}_togEQEnable(e,t){e.eqEnabled=!e.eqEnabled;const s=t.querySelector('[data-a="enableEQ"]'),a=t.querySelector('[data-a="toggleEQ"]');s&&(s.classList.toggle("on",e.eqEnabled),s.textContent=e.eqEnabled?"ON":"OFF"),a&&a.classList.toggle("enabled",e.eqEnabled),this._updateNodes(e)}_togCmpEnable(e,t){e.compEnabled=!e.compEnabled;const s=t.querySelector('[data-a="enableComp"]'),a=t.querySelector('[data-a="toggleComp"]');s&&(s.classList.toggle("on",e.compEnabled),s.textContent=e.compEnabled?"ON":"OFF"),a&&a.classList.toggle("enabled",e.compEnabled),this._updateNodes(e)}_remove(e){var s;const t=this._stems.find(a=>a.id===e);t&&(this._cleanup(t),this._stemBuf.delete(t.id)),this._stems=this._stems.filter(a=>a.id!==e),this._maxDur=this._stems.reduce((a,i)=>{const n=this._stemBuf.get(i.id);return n?Math.max(a,n.duration):a},0),(s=this._sEl(e))==null||s.remove(),this._syncUI()}_rstSection(e,t,s,a){var i,n;if(s==="mix")e.volume=100,e.pan=0,this._rst(t,[["volume",100],["pan",0]],e.color);else if(s==="eq")e.eq={hpf:80,bass:0,pres:0,air:0},this._rst(t,[["eq.hpf",80],["eq.bass",0],["eq.pres",0],["eq.air",0]],e.color);else if(s==="comp")e.comp={thr:-18,rat:4,atk:10,rel:100},this._rst(t,[["comp.thr",-18],["comp.rat",4],["comp.atk",10],["comp.rel",100]],e.color);else if(s==="reverb")e.reverb=0,this._rst(t,[["reverb",0]],e.color);else if(s==="width")e.width=100,this._rst(t,[["width",100]],e.color);else if(s==="denoise")e.denoise=!1,(i=t.querySelector('[data-a="toggleDenoise"]'))==null||i.classList.remove("on");else if(s==="humanize"){e.humanize=!1,e.humanizeIntensity=50,(n=t.querySelector('[data-a="toggleHumanize"]'))==null||n.classList.remove("on"),this._rst(t,[["humanizeIntensity",50]],e.color);const l=t.querySelector(`#hum-sl-${e.id}`);l&&(l.style.opacity="0.4",l.style.pointerEvents="none")}this._updateNodes(e),this._flash(a)}_rst(e,t,s){t.forEach(([a,i])=>{e.querySelectorAll(`[data-p="${a}"]`).forEach(n=>{n.value=i,M(n,s)}),e.querySelectorAll(`[data-v="${a}"]`).forEach(n=>{n.textContent=K(a,i)})})}_rstAll(e){this._stems.forEach(t=>{var i,n;t.volume=100,t.pan=0,t.eq={hpf:80,bass:0,pres:0,air:0},t.comp={thr:-18,rat:4,atk:10,rel:100},t.reverb=0,t.width=100,t.denoise=!1,t.humanize=!1,t.humanizeIntensity=50;const s=this._sEl(t.id);if(!s)return;[["volume",100],["pan",0],["eq.hpf",80],["eq.bass",0],["eq.pres",0],["eq.air",0],["comp.thr",-18],["comp.rat",4],["comp.atk",10],["comp.rel",100],["reverb",0],["width",100],["humanizeIntensity",50]].forEach(([l,r])=>{s.querySelectorAll(`[data-p="${l}"]`).forEach(o=>{o.value=r,M(o,t.color)}),s.querySelectorAll(`[data-v="${l}"]`).forEach(o=>{o.textContent=K(l,r)})}),(i=s.querySelector('[data-a="toggleDenoise"]'))==null||i.classList.remove("on"),(n=s.querySelector('[data-a="toggleHumanize"]'))==null||n.classList.remove("on");const a=s.querySelector(`#hum-sl-${t.id}`);a&&(a.style.opacity="0.4",a.style.pointerEvents="none"),this._updateNodes(t)}),this._flash(e)}_flash(e){if(!e)return;const t=e.textContent;e.textContent="✓",e.style.color="var(--accent-2)",setTimeout(()=>{e.textContent=t,e.style.color=""},1500)}_syncUI(){const e=this._stems.length>0,t=this._stems.length>=j,s=this._stems.some(r=>this._stemBuf.has(r.id)),a=(r,o)=>{const d=this._q(r);d&&(d.style.display=o)};a("stemDropZone",e?"none":""),a("stemsList",e?"grid":"none"),a("clearAllBtn",e?"":"none"),a("resetAllStemsBtn",e?"":"none"),a("stemTransport",e?"":"none");const i=this._q("stemCount");if(i&&(i.textContent=`${this._stems.length} / ${j} stems`),!e){const r=this._q("stemSeek"),o=this._q("stemSeekCur"),d=this._q("stemSeekDur");r&&(r.value=0,M(r,"var(--accent)")),o&&(o.textContent=C(0)),d&&(d.textContent=C(0))}["stemPlayBtn","stemExportBtn","stemAbBtn"].forEach(r=>{const o=this._q(r);o&&(o.disabled=!s)});const n=this._q("addStemBar"),l=this._q("addStemLabel");if(n)if(e&&!t){if(n.classList.add("show"),l){const r=j-this._stems.length;l.textContent=`Add another stem (${r} slot${r===1?"":"s"} remaining)`}}else n.classList.remove("show")}_drawPlaceholder(e){requestAnimationFrame(()=>{const t=document.getElementById(`wf-${e.id}`);if(!t)return;const s=t.offsetWidth||600,a=52;t.width=s,t.height=a;const i=t.getContext("2d"),n=e.id*137.5,l=[];for(let o=0;o<s;o++){const d=o/s,h=.25+.25*Math.abs(Math.sin(d*9+n))+.15*Math.abs(Math.sin(d*27+n*1.7));l.push(a/2-Math.abs(Math.sin(d*220+n))*h*(a/2-3))}i.beginPath(),l.forEach((o,d)=>d===0?i.moveTo(d,o):i.lineTo(d,o));for(let o=s-1;o>=0;o--)i.lineTo(o,a-l[o]);i.closePath(),i.fillStyle=e.color+"22",i.fill(),i.beginPath(),l.forEach((o,d)=>d===0?i.moveTo(d,o):i.lineTo(d,o)),i.strokeStyle=e.color+"88",i.lineWidth=1.5,i.stroke();const r=document.getElementById(`wfmsg-${e.id}`);r&&(r.style.display="none")})}_drawWaveform(e,t){requestAnimationFrame(()=>{const s=document.getElementById(`wf-${e.id}`);if(!s||!t)return;const a=s.offsetWidth||600,i=52;s.width=a,s.height=i;const n=s.getContext("2d"),l=t.getChannelData(0),r=t.numberOfChannels>1?t.getChannelData(1):null,o=l.length,d=o/a,h=new Float32Array(a),p=new Float32Array(a);for(let m=0;m<a;m++){const f=Math.floor(m*d),_=Math.min(Math.floor((m+1)*d),o);let y=0,v=0;for(let b=f;b<_;b++){const x=r?(l[b]+r[b])*.5:l[b];x<y&&(y=x),x>v&&(v=x)}h[m]=i/2-v*(i/2-2),p[m]=i/2-y*(i/2-2)}n.beginPath(),h.forEach((m,f)=>f===0?n.moveTo(f,m):n.lineTo(f,m));for(let m=a-1;m>=0;m--)n.lineTo(m,p[m]);n.closePath(),n.fillStyle=e.color+"25",n.fill(),n.beginPath(),h.forEach((m,f)=>f===0?n.moveTo(f,m):n.lineTo(f,m)),n.strokeStyle=e.color+"aa",n.lineWidth=1.5,n.stroke(),n.beginPath(),n.moveTo(0,i/2),n.lineTo(a,i/2),n.strokeStyle="rgba(255,255,255,0.04)",n.lineWidth=1,n.stroke();const u=document.getElementById(`wfmsg-${e.id}`);u&&(u.style.display="none")})}async _decode(e,t){await this._ae.resume(),this._master||this._buildMasterBus();const s=document.getElementById(`wfmsg-${t.id}`);s&&(s.textContent="Decoding…",s.style.display="");let a;try{a=await e.arrayBuffer()}catch{s&&(s.textContent="Read error");return}let i;try{i=await this._ctx.decodeAudioData(a)}catch{s&&(s.textContent="Decode error",s.style.display="");return}this._stemBuf.set(t.id,i),i.duration>this._maxDur&&(this._maxDur=i.duration),this._drawWaveform(t,i),this._buildNodes(t),this._syncUI();const n=this._q("stemSeekDur");n&&(n.textContent=C(this._maxDur))}_buildMasterBus(){if(this._master)return;const e=this._ctx,t={};t.wetBus=e.createGain(),t.wetBus.gain.value=1,t.hpf=e.createBiquadFilter(),t.hpf.type="highpass",t.hpf.frequency.value=80,t.hpf.Q.value=.707,t.eqSub=e.createBiquadFilter(),t.eqSub.type="lowshelf",t.eqSub.frequency.value=60,t.eqBass=e.createBiquadFilter(),t.eqBass.type="peaking",t.eqBass.frequency.value=200,t.eqBass.Q.value=1,t.eqMid=e.createBiquadFilter(),t.eqMid.type="peaking",t.eqMid.frequency.value=1e3,t.eqMid.Q.value=1,t.eqHighs=e.createBiquadFilter(),t.eqHighs.type="peaking",t.eqHighs.frequency.value=8e3,t.eqHighs.Q.value=1,t.eqDemud=e.createBiquadFilter(),t.eqDemud.type="peaking",t.eqDemud.frequency.value=300,t.eqDemud.Q.value=1.5,t.eqPres=e.createBiquadFilter(),t.eqPres.type="peaking",t.eqPres.frequency.value=3500,t.eqPres.Q.value=1.2,t.eqAir=e.createBiquadFilter(),t.eqAir.type="highshelf",t.eqAir.frequency.value=12e3,t.comp=e.createDynamicsCompressor(),t.limiter=e.createDynamicsCompressor(),t.outputGain=e.createGain(),t.analyser=e.createAnalyser(),t.analyser.fftSize=4096,t.analyser.smoothingTimeConstant=.8,t.wetBus.connect(t.hpf),t.hpf.connect(t.eqSub),t.eqSub.connect(t.eqBass),t.eqBass.connect(t.eqMid),t.eqMid.connect(t.eqHighs),t.eqHighs.connect(t.eqDemud),t.eqDemud.connect(t.eqPres),t.eqPres.connect(t.eqAir),t.eqAir.connect(t.comp),t.comp.connect(t.limiter),t.limiter.connect(t.outputGain),t.outputGain.connect(t.analyser),t.analyser.connect(this._ctx.destination),this._master=t,this._updMaster()}_updMaster(){var a;if(!this._master)return;const e=this._master,t=i=>{const n=document.getElementById(i);return n?parseFloat(n.value):0};e.eqSub.gain.value=t("smt-sub"),e.eqBass.gain.value=t("smt-bass"),e.eqMid.gain.value=t("smt-mid"),e.eqHighs.gain.value=t("smt-highs"),e.eqDemud.gain.value=-(t("smt-demud")/100)*10,e.eqPres.gain.value=t("smt-pres"),e.eqAir.gain.value=t("smt-air"),e.comp.threshold.value=t("smt-thr"),e.comp.ratio.value=t("smt-rat"),e.comp.attack.value=t("smt-atk")/1e3,e.comp.release.value=t("smt-rel")/1e3,e.comp.knee.value=6,e.outputGain.gain.value=Math.pow(10,t("smt-gain")/20);const s=((a=this._q("smt-limiter"))==null?void 0:a.classList.contains("on"))??!0;e.limiter.threshold.value=s?-1:0,e.limiter.ratio.value=s?20:1,e.limiter.attack.value=s?.001:0,e.limiter.release.value=s?.05:0,e.limiter.knee.value=0}_effMute(e){return this._stems.some(s=>s.soloed)?!e.soloed:e.muted}_ir(){if(this._reverbIR)return this._reverbIR;const e=this._ctx.sampleRate,t=Math.floor(1.8*e),s=this._ctx.createBuffer(2,t,e);for(let a=0;a<2;a++){const i=s.getChannelData(a);for(let n=0;n<t;n++)i[n]=(Math.random()*2-1)*Math.pow(Math.max(0,1-n/t),2.5)}return this._reverbIR=s,s}_buildNodes(e){this._master||this._buildMasterBus();const t=this._ctx,s={};s.gainVol=t.createGain(),s.panner=t.createStereoPanner(),s.hpf=t.createBiquadFilter(),s.hpf.type="highpass",s.lowShelf=t.createBiquadFilter(),s.lowShelf.type="lowshelf",s.lowShelf.frequency.value=200,s.presence=t.createBiquadFilter(),s.presence.type="peaking",s.presence.frequency.value=3e3,s.presence.Q.value=1,s.hiShelf=t.createBiquadFilter(),s.hiShelf.type="highshelf",s.hiShelf.frequency.value=1e4,s.comp=t.createDynamicsCompressor(),s.reverbDry=t.createGain(),s.reverbWet=t.createGain(),s.reverb=t.createConvolver(),s.reverb.buffer=this._ir(),s.reverbMix=t.createGain(),s.reverbMix.gain.value=1,s.muteGain=t.createGain(),s.gainVol.connect(s.panner),s.panner.connect(s.hpf),s.hpf.connect(s.lowShelf),s.lowShelf.connect(s.presence),s.presence.connect(s.hiShelf),s.hiShelf.connect(s.comp),s.comp.connect(s.reverbDry),s.comp.connect(s.reverb),s.reverbDry.connect(s.reverbMix),s.reverb.connect(s.reverbWet),s.reverbWet.connect(s.reverbMix),s.reverbMix.connect(s.muteGain),s.muteGain.connect(this._master.wetBus),e.humanize&&(s.lfo=t.createOscillator(),s.lfo.frequency.value=4+Math.random()*3,s.lfoDepth=t.createGain(),s.lfoDepth.gain.value=e.humanizeIntensity/100*.03,s.lfo.connect(s.lfoDepth),s.lfoDepth.connect(s.gainVol.gain),s.lfo.start()),this._stemNd.set(e.id,s),this._updateNodes(e)}_updateNodes(e){const t=this._stemNd.get(e.id);if(!t)return;t.gainVol.gain.value=e.volume/100,t.panner.pan.value=e.pan/100,t.hpf.frequency.value=e.eqEnabled?e.eq.hpf:20,t.hpf.Q.value=.707,t.lowShelf.gain.value=e.eqEnabled?e.eq.bass:0,t.presence.gain.value=e.eqEnabled?e.eq.pres:0,t.hiShelf.gain.value=e.eqEnabled?e.eq.air:0,e.compEnabled?(t.comp.threshold.value=e.comp.thr,t.comp.ratio.value=e.comp.rat,t.comp.attack.value=e.comp.atk/1e3,t.comp.release.value=e.comp.rel/1e3,t.comp.knee.value=6):(t.comp.threshold.value=0,t.comp.ratio.value=1,t.comp.attack.value=0,t.comp.release.value=0);const s=e.reverb/100;t.reverbDry.gain.value=1-s,t.reverbWet.gain.value=s*.8,t.muteGain.gain.value=this._effMute(e)?0:1,t.lfoDepth&&(t.lfoDepth.gain.value=e.humanizeIntensity/100*.03)}_cleanup(e){const t=this._stemNd.get(e.id);if(t){try{if(t.lfo){try{t.lfo.stop()}catch{}t.lfo.disconnect(),t.lfoDepth&&t.lfoDepth.disconnect()}if(t.pitchLfo){try{t.pitchLfo.stop()}catch{}t.pitchLfo.disconnect(),t.pitchLfoDepth&&t.pitchLfoDepth.disconnect()}if(t.srcNode){try{t.srcNode.stop()}catch{}t.srcNode.disconnect()}Object.values(t).forEach(s=>{if(s&&typeof s.disconnect=="function")try{s.disconnect()}catch{}})}catch{}this._stemNd.delete(e.id)}}_playAll(){this._master||this._buildMasterBus();const e=this._ctx.currentTime;this._stems.forEach(s=>{const a=this._stemBuf.get(s.id);if(!a)return;let i=this._stemNd.get(s.id);if(i||(this._buildNodes(s),i=this._stemNd.get(s.id)),!i)return;if(i.srcNode){try{i.srcNode.stop()}catch{}i.srcNode.disconnect(),i.srcNode=null}if(i.pitchLfo){try{i.pitchLfo.stop()}catch{}i.pitchLfo.disconnect(),i.pitchLfoDepth&&i.pitchLfoDepth.disconnect(),i.pitchLfo=null,i.pitchLfoDepth=null}const n=this._ctx.createBufferSource();n.buffer=a,i.srcNode=n,s.humanize&&(i.pitchLfo=this._ctx.createOscillator(),i.pitchLfo.frequency.value=3+Math.random()*2,i.pitchLfoDepth=this._ctx.createGain(),i.pitchLfoDepth.gain.value=s.humanizeIntensity/100*6,i.pitchLfo.connect(i.pitchLfoDepth),i.pitchLfoDepth.connect(n.detune),i.pitchLfo.start()),n.connect(i.gainVol);const l=s.humanize?(Math.random()-.5)*2*(s.humanizeIntensity/100)*.018:0;n.start(Math.max(e,e+l),Math.max(0,this._playOff%a.duration))}),this._playStart=e-this._playOff,this._isPlaying=!0;const t=this._q("stemPlayBtn");t&&(t.textContent="⏸"),this._startClock(),this._startSpec(),this._startLUFS(),this._startSeekLoop()}_stopAll(e){this._stems.forEach(s=>{const a=this._stemNd.get(s.id);if(a){if(a.srcNode){try{a.srcNode.stop()}catch{}a.srcNode.disconnect(),a.srcNode=null}if(a.pitchLfo){try{a.pitchLfo.stop()}catch{}a.pitchLfo.disconnect(),a.pitchLfoDepth&&a.pitchLfoDepth.disconnect(),a.pitchLfo=null,a.pitchLfoDepth=null}}}),this._isPlaying=!1,e||(this._playOff=0);const t=this._q("stemPlayBtn");t&&(t.textContent="▶"),this._stopClock(),this._stopSpec(),this._stopLUFS(),this._stopSeekLoop(e?this._playOff:0)}_toggle(){this._stems.some(e=>this._stemBuf.has(e.id))&&(this._master||this._buildMasterBus(),this._isPlaying?(this._playOff=this._ctx.currentTime-this._playStart,this._stopAll(!0)):this._playAll())}_onEnd(){if(!this._isPlaying)return;this._playOff=0,this._stopAll(!1),this._playheads();const e=this._q("stemTransportTime"),t=this._q("stemTransportSub");e&&(e.textContent=C(0)),t&&(t.textContent=C(0)+" / "+C(this._maxDur));const s=this._q("stemSeek"),a=this._q("stemSeekCur");s&&(s.value=0,M(s,"var(--accent)")),a&&(a.textContent=C(0))}_startClock(){this._stopClock(),this._clockId=setInterval(()=>{if(!this._isPlaying)return;const e=this._ctx.currentTime-this._playStart,t=this._q("stemTransportTime"),s=this._q("stemTransportSub");t&&(t.textContent=C(e)),s&&(s.textContent=C(e)+" / "+C(this._maxDur)),this._playheads(),this._maxDur>0&&e>=this._maxDur&&this._onEnd()},80)}_stopClock(){this._clockId&&(clearInterval(this._clockId),this._clockId=null)}_playheads(){const e=this._isPlaying?this._ctx.currentTime-this._playStart:this._playOff;this._stems.forEach(t=>{const s=document.getElementById(`ph-${t.id}`),a=document.getElementById(`wf-${t.id}`),i=this._stemBuf.get(t.id);if(s){if(!a||!i||!this._isPlaying&&e===0){s.style.display="none";return}s.style.display="",s.style.left=Math.min(1,e/i.duration)*a.offsetWidth+"px"}})}_initSeekbar(){const e=this._q("stemSeek"),t=this._q("stemSeekCur");e&&(e.addEventListener("pointerdown",()=>{this._seekDrag=!0,this._seekWas=this._isPlaying,this._isPlaying&&(this._playOff=this._ctx.currentTime-this._playStart,this._stopAll(!0))}),e.addEventListener("input",()=>{const s=e.value/1e3;this._playOff=s*(this._maxDur||1),t&&(t.textContent=C(this._playOff)),M(e,"var(--accent)")}),e.addEventListener("pointerup",()=>{this._seekDrag=!1,this._seekWas&&this._playAll(),this._seekWas=!1}),e.addEventListener("touchend",()=>{this._seekDrag&&(this._seekDrag=!1,this._seekWas&&this._playAll(),this._seekWas=!1)}))}_startSeekLoop(){this._seekRaf&&(cancelAnimationFrame(this._seekRaf),this._seekRaf=null);const e=()=>{if(!this._isPlaying||(this._seekRaf=requestAnimationFrame(e),this._seekDrag))return;const t=this._ctx.currentTime-this._playStart;if(this._maxDur<=0)return;const s=Math.max(0,Math.min(1,t/this._maxDur))*100,a=this._q("stemSeek");a&&(a.value=Math.round(s*10),M(a,"var(--accent)"));const i=this._q("stemSeekCur");i&&(i.textContent=C(t))};e()}_stopSeekLoop(e=0){if(this._seekRaf&&(cancelAnimationFrame(this._seekRaf),this._seekRaf=null),this._maxDur>0){const t=Math.max(0,Math.min(1,e/this._maxDur))*100,s=this._q("stemSeek");s&&(s.value=Math.round(t*10),M(s,"var(--accent)"));const a=this._q("stemSeekCur");a&&(a.textContent=C(e))}}_startSpec(){this._stopSpec();const e=document.getElementById("spectrumCanvas2");if(!e||!this._master)return;const t=this._master.analyser,s=new Float32Array(t.frequencyBinCount),a=()=>{if(!this._isPlaying)return;this._specRaf=requestAnimationFrame(a),t.getFloatFrequencyData(s);const i=e.offsetWidth||600,n=e.offsetHeight||80;e.width=i;const l=e.getContext("2d");l.fillStyle="#0d0d15",l.fillRect(0,0,i,n),l.strokeStyle="#1a1a2e",l.lineWidth=1;for(let m=0;m<=3;m++){const f=m/3*n;l.beginPath(),l.moveTo(0,f),l.lineTo(i,f),l.stroke()}const r=this._ctx.sampleRate/2,o=s.length,d=Math.log10(20),h=Math.log10(2e4),p=Math.min(i,200),u=i/p;for(let m=0;m<p;m++){const f=Math.pow(10,d+m/p*(h-d)),_=Math.min(Math.floor(f/r*o),o-1),y=Math.max(0,(s[_]+90)/90),v=y*n;l.fillStyle=f<250?`rgba(108,99,255,${.7+y*.3})`:f<4e3?`rgba(0,212,170,${.7+y*.3})`:`rgba(180,220,255,${.6+y*.4})`,l.fillRect(m*u,n-v,Math.max(1,u-1),v)}};a()}_stopSpec(){this._specRaf&&(cancelAnimationFrame(this._specRaf),this._specRaf=null);const e=document.getElementById("spectrumCanvas2");if(!e)return;const t=e.offsetWidth||600,s=e.offsetHeight||80;e.width=t;const a=e.getContext("2d");a.fillStyle="#0d0d15",a.fillRect(0,0,t,s),a.strokeStyle="#1a1a2e",a.lineWidth=1;for(let i=0;i<=3;i++){const n=i/3*s;a.beginPath(),a.moveTo(0,n),a.lineTo(t,n),a.stroke()}}_startLUFS(){if(this._stopLUFS(),!this._master)return;const e=this._master.analyser,t=new Float32Array(e.fftSize);this._lufsHist=[],this._lufsInt=setInterval(()=>{if(!this._isPlaying)return;e.getFloatTimeDomainData(t);let s=0;for(let o=0;o<t.length;o++)s+=t[o]*t[o];const a=-.691+10*Math.log10(Math.max(s/t.length,1e-10));this._lufsHist.push(a),this._lufsHist.length>15&&this._lufsHist.shift();const i=this._lufsHist.reduce((o,d)=>o+d,0)/this._lufsHist.length,n=this._q("stemLufsShortTerm"),l=this._q("stemLufsIntegrated"),r=this._q("stemLufsFill");n&&(n.textContent=isFinite(i)?i.toFixed(1):"—",n.className="lufs-num lit"),l&&(l.textContent=isFinite(i)?i.toFixed(1):"—",l.className="lufs-num lit"),r&&(r.style.width=Math.max(0,Math.min(100,(i+30)/24*100))+"%")},100)}_stopLUFS(){this._lufsInt&&(clearInterval(this._lufsInt),this._lufsInt=null);const e=this._q("stemLufsShortTerm"),t=this._q("stemLufsIntegrated"),s=this._q("stemLufsFill");e&&(e.textContent="—",e.className="lufs-num"),t&&(t.textContent="—",t.className="lufs-num"),s&&(s.style.width="0%")}_initTransport(){const e=this._q("stemPlayBtn"),t=this._q("stemExportBtn"),s=this._q("stemExpMenu"),a=this._q("stemAbBtn"),i=this._q("stemSummaryClose");e&&e.addEventListener("click",()=>this._ae.resume().then(()=>this._toggle())),t&&s&&(t.addEventListener("click",n=>{n.stopPropagation(),s.classList.toggle("open")}),document.addEventListener("click",()=>s.classList.remove("open"))),["stemExp24","stemExp16","stemExpStems24","stemExpStems16"].forEach(n=>{const l=document.getElementById(n);l&&l.addEventListener("click",()=>{s==null||s.classList.remove("open"),this._export(n.includes("16")?16:24,n.includes("Stems"))})}),a&&a.addEventListener("click",()=>a.classList.toggle("active")),i&&i.addEventListener("click",()=>{const n=this._q("stemSummaryCard");n&&(n.style.display="none")})}_initMasterPanel(){const e=this._q("stemMasterToggle"),t=this._q("stemMasterPanel");e&&t&&e.addEventListener("click",()=>t.classList.toggle("open")),Object.entries(J).forEach(([i,n])=>{const l=document.getElementById(i),r=document.getElementById("sv-"+i),o=document.getElementById(n);l&&(M(l,"var(--accent)"),l.addEventListener("input",()=>{o&&(o.value=l.value,o.dispatchEvent(new Event("input",{bubbles:!0}))),r&&(r.textContent=Z(n,l.value)),M(l,"var(--accent)"),this._updMaster()}),o&&o.addEventListener("input",()=>{l.value!==o.value&&(l.value=o.value,r&&(r.textContent=Z(n,o.value)),M(l,"var(--accent)"),this._updMaster())}))});const s=this._q("smt-limiter"),a=document.getElementById("toggle-limiter");s&&(s.addEventListener("click",()=>{s.classList.toggle("on"),a&&a.classList.toggle("on",s.classList.contains("on")),this._updMaster()}),a&&a.addEventListener("click",()=>{s.classList.toggle("on",a.classList.contains("on")),this._updMaster()})),this._el.querySelectorAll("[data-smt-preset]").forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.smtPreset,l=ee[n];l&&(this._applySmtPreset(l),this._el.querySelectorAll("[data-smt-preset]").forEach(r=>r.classList.remove("active")),i.classList.add("active"))})}),this._syncSMT()}_applySmtPreset(e){var t;if(Object.entries(J).forEach(([s,a])=>{const i=e[a];if(i===void 0)return;const n=document.getElementById(s),l=document.getElementById("sv-"+s),r=document.getElementById(a);n&&(n.value=i,M(n,"var(--accent)"),l&&(l.textContent=Z(a,i))),r&&(r.value=i,r.dispatchEvent(new Event("input",{bubbles:!0})))}),((t=e.toggles)==null?void 0:t.limiter)!==void 0){const s=this._q("smt-limiter"),a=document.getElementById("toggle-limiter");s==null||s.classList.toggle("on",e.toggles.limiter),a==null||a.classList.toggle("on",e.toggles.limiter)}this._updMaster()}_syncSMT(){Object.entries(J).forEach(([s,a])=>{const i=document.getElementById(a),n=document.getElementById(s),l=document.getElementById("sv-"+s);!i||!n||(n.value=i.value,l&&(l.textContent=Z(a,i.value)),M(n,"var(--accent)"))});const e=this._q("smt-limiter"),t=document.getElementById("toggle-limiter");e&&t&&e.classList.toggle("on",t.classList.contains("on"))}_initResets(){const e=this._q("resetAllStemsBtn");e&&e.addEventListener("click",()=>this._rstAll(e));const t=this._q("resetSmtEQ");t&&t.addEventListener("click",()=>{[["smt-sub",0],["smt-bass",0],["smt-mid",0],["smt-highs",0],["smt-pres",0],["smt-air",0],["smt-demud",0]].forEach(([i,n])=>{const l=document.getElementById(i);l&&(l.value=n,l.dispatchEvent(new Event("input",{bubbles:!0})))}),this._flash(t)});const s=this._q("resetSmtComp");s&&s.addEventListener("click",()=>{[["smt-thr",-18],["smt-rat",4],["smt-atk",10],["smt-rel",100]].forEach(([i,n])=>{const l=document.getElementById(i);l&&(l.value=n,l.dispatchEvent(new Event("input",{bubbles:!0})))}),this._flash(s)});const a=this._q("resetSmtOutput");a&&a.addEventListener("click",()=>{[["smt-width",100],["smt-gain",0]].forEach(([n,l])=>{const r=document.getElementById(n);r&&(r.value=l,r.dispatchEvent(new Event("input",{bubbles:!0})))});const i=this._q("smt-limiter");i&&!i.classList.contains("on")&&i.click(),this._flash(a)})}_initKeyboard(){document.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")return;const t=document.getElementById("tab-stem");!t||t.style.display==="none"||(e.code==="Space"?(e.preventDefault(),this._ae.resume().then(()=>this._toggle())):(e.key==="E"||e.key==="e")&&(e.preventDefault(),this._stems.some(s=>this._stemBuf.has(s.id))&&this._export(24,!1)))})}async _export(e,t){var F,R;const s=this._stems.filter(g=>this._stemBuf.has(g.id));if(!s.length)return;const a=performance.now(),i=(g,B)=>{const w=this._q("stemProgressWrap"),k=this._q("stemProgressFill"),q=this._q("stemProgressPct"),E=this._q("stemProgressMsg");w&&(w.style.display="block"),k&&(k.style.width=g+"%"),q&&(q.textContent=Math.round(g)+"%"),E&&(E.textContent=B)},n=()=>{const g=this._q("stemProgressWrap");g&&(g.style.display="none")};i(0,"Preparing stems…"),this._stopAll(!1);const l=[];for(let g=0;g<s.length;g++){const B=s[g];let w=this._stemBuf.get(B.id);if(i(g/s.length*40,`Processing ${B.name}… (${g+1}/${s.length})`),B.denoise&&this._denoise.isAvailable)try{w=await this._denoise.process(w,this._ctx,k=>i((g+k)/s.length*40,`AI Denoising ${B.name}…`))}catch(k){console.warn("[StemTab] denoise:",k)}if(B.humanize){i(g/s.length*40+2,`Humanizing ${B.name}…`);const k=this._ctx.createBuffer(w.numberOfChannels,w.length,w.sampleRate);for(let q=0;q<w.numberOfChannels;q++)k.copyToChannel(w.getChannelData(q).slice(),q);Ze(k,B),w=k}l.push({s:B,buf:w}),await new Promise(k=>setTimeout(k,0))}const r=((F=this._q("smt-limiter"))==null?void 0:F.classList.contains("on"))??!0,o=Math.max(...l.map(g=>g.buf.sampleRate)),d=Math.max(...l.map(g=>g.buf.duration)),h=parseFloat(((R=document.getElementById("smt-width"))==null?void 0:R.value)??100)/100;if(t){if(typeof JSZip>"u"){alert("JSZip not loaded."),n();return}const g=new JSZip;for(let w=0;w<l.length;w++){const{s:k,buf:q}=l[w];i(42+w/l.length*52,`Encoding ${k.name}… (${w+1}/${l.length})`);const E=q.sampleRate!==o?await de(q,o):q,S=Math.max(E.numberOfChannels,2),I=new OfflineAudioContext(S,Math.ceil(E.duration*o),o),P=I.createBuffer(S,Math.ceil(E.duration*o),o);for(let N=0;N<E.numberOfChannels;N++)P.copyToChannel(E.getChannelData(N),N);E.numberOfChannels===1&&P.copyToChannel(E.getChannelData(0),1);const D=I.createBufferSource();D.buffer=P;const me=this._offStemChain(I,k,D),te=I.createGain();me.connect(te),this._offMasterBus(I,te,r),D.start(0);let se=await I.startRendering();ce(se,h);const fe=W(se,e);g.file(`${k.name}_${e}bit.wav`,await fe.arrayBuffer()),await new Promise(N=>setTimeout(N,0))}i(97,"Building ZIP…");const B=await g.generateAsync({type:"blob"});Q(B,`stems_${e}bit.zip`),n();return}i(42,"Computing pre-master loudness…");let p=-1/0;try{const g=Math.min(Math.ceil(d*o),Math.floor(60*o)),B=new Float32Array(g),w=new Float32Array(g);for(const{s:k,buf:q}of l){if(this._effMute(k))continue;const E=k.volume/100,S=q.getChannelData(0),I=q.numberOfChannels>1?q.getChannelData(1):S,P=Math.min(S.length,g);for(let D=0;D<P;D++)B[D]+=S[D]*E,w[D]+=I[D]*E}p=je(B,w,o)}catch{}i(46,"Building mix graph…");const u=new OfflineAudioContext(2,Math.ceil(d*o),o),m=u.createGain();for(const{s:g,buf:B}of l){const w=B.sampleRate!==o?await de(B,o):B,k=Math.ceil(d*o),q=u.createBuffer(Math.max(w.numberOfChannels,2),k,o);for(let S=0;S<w.numberOfChannels;S++){const I=q.getChannelData(S),P=w.getChannelData(S);I.set(P.subarray(0,Math.min(P.length,k)))}w.numberOfChannels===1&&q.copyToChannel(q.getChannelData(0),1);const E=u.createBufferSource();E.buffer=q,this._offStemChain(u,g,E).connect(m),E.start(0)}this._offMasterBus(u,m,r),i(52,"Rendering…");let f=await u.startRendering();i(88,"Stereo width…"),ce(f,h),i(93,"Loudness metrics…"),await new Promise(g=>setTimeout(g,0));const _=Ue(f),y=Ge(f),v=Ve(f),b=isFinite(_)&&isFinite(p)?_-p:null,x=((performance.now()-a)/1e3).toFixed(2);i(99,"Encoding WAV…"),Q(W(f,e),`stems_mix_${e}bit.wav`),n();const L=this._q("stemSummaryCard");if(L){const g=P=>this._q(P),B=g("stemSumLUFS"),w=g("stemSumGained"),k=g("stemSumPeak"),q=g("stemSumLRA"),E=g("stemSumWidth"),S=g("stemSumTime"),I=g("stemSumDetail");B&&(B.textContent=isFinite(_)?_.toFixed(1)+" LUFS":"—"),w&&(w.textContent=b!==null?(b>=0?"+":"")+b.toFixed(1)+" LU":"—",w.className="summary-val"+(b>6?" warn":"")),k&&(k.textContent=isFinite(y)?y.toFixed(1)+" dBTP":"—",k.className="summary-val"+(y>-1?" hot":y>-3?" warn":"")),q&&(q.textContent=isFinite(v)?v.toFixed(1)+" LU":"—"),E&&(E.textContent=Math.round(h*100)+"%"),S&&(S.textContent=x+"s"),I&&(I.innerHTML=this._detailSummary(s)),L.style.display="block"}}_offStemChain(e,t,s){const a=e.createGain();a.gain.value=t.volume/100;const i=e.createStereoPanner();i.pan.value=t.pan/100;const n=e.createBiquadFilter();n.type="highpass",n.frequency.value=t.eqEnabled?t.eq.hpf:20,n.Q.value=.707;const l=e.createBiquadFilter();l.type="lowshelf",l.frequency.value=200,l.gain.value=t.eqEnabled?t.eq.bass:0;const r=e.createBiquadFilter();r.type="peaking",r.frequency.value=3e3,r.Q.value=1,r.gain.value=t.eqEnabled?t.eq.pres:0;const o=e.createBiquadFilter();o.type="highshelf",o.frequency.value=1e4,o.gain.value=t.eqEnabled?t.eq.air:0;const d=e.createDynamicsCompressor();t.compEnabled&&(d.threshold.value=t.comp.thr,d.ratio.value=t.comp.rat,d.attack.value=t.comp.atk/1e3,d.release.value=t.comp.rel/1e3,d.knee.value=6);const h=e.createGain();if(h.gain.value=this._effMute(t)?0:1,s.connect(a),a.connect(i),i.connect(n),n.connect(l),l.connect(r),r.connect(o),o.connect(d),t.reverb>0){const p=t.reverb/100,u=Math.floor(1.8*e.sampleRate),m=e.createBuffer(2,u,e.sampleRate);for(let b=0;b<2;b++){const x=m.getChannelData(b);for(let L=0;L<u;L++)x[L]=(Math.random()*2-1)*Math.pow(Math.max(0,1-L/u),2.5)}const f=e.createConvolver();f.buffer=m;const _=e.createGain();_.gain.value=1-p;const y=e.createGain();y.gain.value=p*.8;const v=e.createGain();v.gain.value=1,d.connect(_),d.connect(f),_.connect(v),f.connect(y),y.connect(v),v.connect(h)}else d.connect(h);return h}_offMasterBus(e,t,s){const a=(_,y=0)=>{const v=document.getElementById(_);return v?parseFloat(v.value):y},i=e.createBiquadFilter();i.type="highpass",i.frequency.value=80,i.Q.value=.707;const n=e.createBiquadFilter();n.type="lowshelf",n.frequency.value=60,n.gain.value=a("smt-sub");const l=e.createBiquadFilter();l.type="peaking",l.frequency.value=200,l.Q.value=1,l.gain.value=a("smt-bass");const r=e.createBiquadFilter();r.type="peaking",r.frequency.value=1e3,r.Q.value=1,r.gain.value=a("smt-mid");const o=e.createBiquadFilter();o.type="peaking",o.frequency.value=8e3,o.Q.value=1,o.gain.value=a("smt-highs");const d=e.createBiquadFilter();d.type="peaking",d.frequency.value=300,d.Q.value=1.5,d.gain.value=-(a("smt-demud")/100)*10;const h=e.createBiquadFilter();h.type="peaking",h.frequency.value=3500,h.Q.value=1.2,h.gain.value=a("smt-pres");const p=e.createBiquadFilter();p.type="highshelf",p.frequency.value=12e3,p.gain.value=a("smt-air");const u=e.createDynamicsCompressor();u.threshold.value=a("smt-thr",-18),u.ratio.value=a("smt-rat",4),u.attack.value=a("smt-atk",10)/1e3,u.release.value=a("smt-rel",100)/1e3,u.knee.value=6;const m=e.createDynamicsCompressor();m.threshold.value=s?-1:0,m.ratio.value=s?20:1,m.attack.value=s?.001:0,m.release.value=s?.05:0,m.knee.value=0;const f=e.createGain();f.gain.value=Math.pow(10,a("smt-gain")/20),t.connect(i),i.connect(n),n.connect(l),l.connect(r),r.connect(o),o.connect(d),d.connect(h),h.connect(p),p.connect(u),u.connect(m),m.connect(f),f.connect(e.destination)}_detailSummary(e){let t=0,s=0;const a=e.map(n=>{const l=[];if(n.denoise&&this._denoise.isAvailable&&(t++,l.push('<span class="sum-tag sum-tag-denoise">AI Denoise</span>')),n.humanize&&(s++,l.push(`<span class="sum-tag sum-tag-humanize">Humanize ${n.humanizeIntensity}%</span>`)),n.eqEnabled){const o=[];n.eq.hpf>20&&o.push(`HPF ${n.eq.hpf}Hz`),n.eq.bass!==0&&o.push(`Bass ${n.eq.bass>0?"+":""}${n.eq.bass}dB`),n.eq.pres!==0&&o.push(`Pres ${n.eq.pres>0?"+":""}${n.eq.pres}dB`),n.eq.air!==0&&o.push(`Air ${n.eq.air>0?"+":""}${n.eq.air}dB`),l.push(`<span class="sum-tag sum-tag-eq">EQ${o.length?": "+o.join(" · "):""}</span>`)}n.compEnabled&&l.push(`<span class="sum-tag sum-tag-comp">Comp ${n.comp.rat}:1 @ ${n.comp.thr}dB</span>`);const r=l.length?l.join(""):'<span style="font-size:10px;color:var(--text-dim)">Dry</span>';return`<div class="sum-stem-row"><span class="sum-stem-name" style="color:${n.color}">${n.name}</span><div class="sum-stem-tags">${r}</div></div>`}).join(""),i=e.length;return`<div class="sum-detail"><div class="sum-detail-title">Per-Stem Processing</div>${a}<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);"><span style="font-size:10px;color:var(--text-dim);font-weight:600;">${i} stem${i!==1?"s":""} processed</span>${t?`<span style="font-size:10px;color:var(--accent);font-weight:600;">${t} AI denoised</span>`:""} ${s?`<span style="font-size:10px;color:#ffd700;font-weight:600;">${s} humanized</span>`:""}</div></div>`}_q(e){return this._el?this._el.querySelector(`#${e}`):document.getElementById(e)}_sEl(e){const t=this._q("stemsList");return t?t.querySelector(`[data-stem-id="${e}"]`):null}_setNested(e,t,s){const a=t.split(".");let i=e;for(let n=0;n<a.length-1;n++)i=i[a[n]];i[a[a.length-1]]=s}}function Xe(){const c=document.getElementById("app");c&&(c.innerHTML=`
    <!-- ══ HEADER ══════════════════════════════════════════════════════════ -->
    <header>
      <div class="header-left">
        <a href="https://gogreenvue.com/" class="home-btn" title="gogreenvue.com">🏠</a>
        <div class="logo">
          <div class="logo-mark">SQ</div>
          <div class="logo-text">
            <span class="brand">SONIQ</span>
            <span class="sub">Audio Lab v10</span>
          </div>
        </div>
      </div>
      <div class="header-meta">
        <div class="status-strip">
          <div class="status-dot" id="statusDot"></div>
          <span id="statusText">Drop a file to begin</span>
        </div>
        <button
          id="resetAllBtn"
          style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-dim);font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;cursor:pointer;transition:all .15s;letter-spacing:.3px;"
          title="Reset all settings to defaults"
        >↺ Reset</button>
        <button id="helpBtn" class="help-btn" title="Help &amp; Guide (H)">? Help</button>
        <div class="version-badge">v10</div>
      </div>
    </header>

    <!-- ══ TAB BAR ═════════════════════════════════════════════════════════ -->
    <nav class="tab-bar">
      <button class="tab-btn active" data-tab="tab-master">⚡ Master</button>
      <button class="tab-btn" data-tab="tab-stem">🎛️ Stem Mixer</button>
    </nav>

    <!-- ══ MAIN ════════════════════════════════════════════════════════════ -->
    <main>
      <!-- Master Tab -->
      <div id="tab-master">
        <!-- TODO: populated by MasterTab in Phase 2 -->
        <div style="padding:60px;text-align:center;color:var(--text-dim);font-size:13px;letter-spacing:.5px;">
          SONIQ v10 — Phase 1 scaffold ✓<br>
          <span style="font-size:11px;margin-top:8px;display:block;">Master Tab renders in Phase 2</span>
        </div>
      </div>

      <!-- Stem Mixer Tab -->
      <div id="tab-stem" style="display:none">
        <!-- TODO: populated by StemTab in Phase 4 -->
        <div style="padding:60px;text-align:center;color:var(--text-dim);font-size:13px;letter-spacing:.5px;">
          Stem Mixer renders in Phase 4
        </div>
      </div>

      <!-- Keyboard hints (shared) -->
      <div class="kbd-hints">
        <span class="kbd-hint"><span class="kbd">Space</span> Play / Pause</span>
        <span class="kbd-hint"><span class="kbd">A</span> A/B Toggle</span>
        <span class="kbd-hint"><span class="kbd">D</span> Download 24-bit</span>
        <span class="kbd-hint"><span class="kbd">E</span> Export Stems ZIP</span>
        <span class="kbd-hint"><span class="kbd">1</span> / <span class="kbd">2</span> Switch Tabs</span>
        <span class="kbd-hint"><span class="kbd">M</span> Mute Stem</span>
        <span class="kbd-hint"><span class="kbd">S</span> Solo Stem</span>
        <span class="kbd-hint"><span class="kbd">H</span> Help</span>
      </div>
    </main>

    <!-- Tooltip bubble (singleton) -->
    <div id="tipBubble"></div>
  `)}function Je(){Xe(),new qe().render(),new we().render();const t=new be,s=new Pe(t),a=s.render(),i=document.getElementById("tab-master");i.innerHTML="",i.appendChild(a),s.init();const n=new Ke(t),l=n.render(),r=document.getElementById("tab-stem");r.innerHTML="",r.appendChild(l),n.init()}document.addEventListener("DOMContentLoaded",Je);
