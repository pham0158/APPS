// SONIQ Audio Lab v10 — Entry Point
import './styles/base.css';
import './styles/tabs.css';
import './styles/controls.css';
import './styles/panels.css';

import AudioEngine from './audio/AudioEngine.js';
import TabManager  from './ui/TabManager.js';
import HelpPanel   from './ui/HelpPanel.js';
import MasterTab   from './tabs/MasterTab.js';
import StemTab from './tabs/StemTab.js';
import { loadState, STORAGE_KEY } from './utils/storage.js';

// ─── App Shell HTML ───────────────────────────────────────────────────────────
function renderShell() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
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
  `;
}


// ─── Boot ─────────────────────────────────────────────────────────────────────
function init() {
  renderShell();

  // ── Shared infrastructure ─────────────────────────────────────────────────
  const helpPanel  = new HelpPanel();
  helpPanel.render();                // injects #helpPanel, wires H/Esc/search

  const tabManager = new TabManager();
  tabManager.render();               // wires tab buttons + 1/2 keyboard shortcuts

  const audioEngine = new AudioEngine();

  // ── Master Tab ────────────────────────────────────────────────────────────
  const masterTab = new MasterTab(audioEngine);
  const masterEl  = masterTab.render();

  const tabMasterPane = document.getElementById('tab-master');
  tabMasterPane.innerHTML = '';
  tabMasterPane.appendChild(masterEl);

  masterTab.init();
  masterTab.loadState(loadState(STORAGE_KEY));

  // ── Stem Tab ──────────────────────────────────────────────────────────────
  const stemTab = new StemTab(audioEngine);
  const stemEl  = stemTab.render();

  const tabStemPane = document.getElementById('tab-stem');
  tabStemPane.innerHTML = '';
  tabStemPane.appendChild(stemEl);

  stemTab.init();
}

document.addEventListener('DOMContentLoaded', init);
