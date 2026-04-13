// ── HelpPanel ─────────────────────────────────────────────────────────────────
// Modal help overlay with search filter.
// Sections: Quick Start, What is Mastering, Stem Mixer Guide,
//           Loudness Targets table, Master Controls Reference, Stem Controls Reference.

const HELP_HTML = `
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
`;

export default class HelpPanel {
  constructor() {
    this._panel = null;
  }

  /**
   * Inject the help panel HTML into the document body and wire all listeners.
   * Safe to call once after DOMContentLoaded.
   */
  render() {
    // Inject markup
    const tmp = document.createElement('div');
    tmp.innerHTML = HELP_HTML.trim();
    while (tmp.firstChild) document.body.appendChild(tmp.firstChild);

    this._panel = document.getElementById('helpPanel');

    // Close button
    document.getElementById('helpClose')?.addEventListener('click', () => this.close());

    // Backdrop click to close
    this._panel?.addEventListener('click', e => {
      if (e.target === this._panel) this.close();
    });

    // Keyboard: H toggles, Escape closes
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.close(); return; }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'h' || e.key === 'H') this.toggle();
    });

    // Help button in header
    document.getElementById('helpBtn')?.addEventListener('click', () => this.open());

    // Search filter
    document.getElementById('helpSearch')?.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      this._panel?.querySelectorAll('.help-control-item').forEach(item => {
        const name = item.querySelector('.help-ctrl-name')?.textContent.toLowerCase() || '';
        const desc = item.querySelector('.help-ctrl-desc')?.textContent.toLowerCase() || '';
        const tags = item.dataset.search || '';
        item.hidden = q.length > 0 && !name.includes(q) && !desc.includes(q) && !tags.includes(q);
      });
    });
  }

  /** Open the help panel. */
  open() {
    this._panel?.classList.add('open');
    document.getElementById('helpSearch')?.focus();
  }

  /** Close the help panel. */
  close() {
    this._panel?.classList.remove('open');
  }

  /** Toggle open/closed. */
  toggle() {
    if (this._panel?.classList.contains('open')) this.close();
    else this.open();
  }

  /**
   * Add a tooltip to an element via the #tipBubble singleton.
   * @param {HTMLElement} el           Element to attach the tooltip to
   * @param {string}      tipText      Tooltip string
   */
  addTooltip(el, tipText) {
    if (!el || !tipText) return;
    el.dataset.tip = tipText;
    el.addEventListener('mouseenter', () => {
      const bubble = document.getElementById('tipBubble');
      if (!bubble) return;
      bubble.textContent = tipText;
      bubble.classList.add('visible');
    });
    el.addEventListener('mouseleave', () => {
      document.getElementById('tipBubble')?.classList.remove('visible');
    });
    el.addEventListener('mousemove', e => {
      const bubble = document.getElementById('tipBubble');
      if (!bubble) return;
      bubble.style.left = (e.clientX + 12) + 'px';
      bubble.style.top  = (e.clientY - 8)  + 'px';
    });
  }

  /**
   * Wire tooltips for all [data-tip] elements inside a container.
   * @param {HTMLElement} containerEl
   */
  addAllTooltips(containerEl) {
    if (!containerEl) return;
    containerEl.querySelectorAll('[data-tip]').forEach(el => {
      this.addTooltip(el, el.dataset.tip);
    });
  }
}
