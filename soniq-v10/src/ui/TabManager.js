// ── TabManager ────────────────────────────────────────────────────────────────
// Manages tab switching between Master and Stem Mixer tabs.
// Keyboard shortcuts 1/2 for tab navigation.

export default class TabManager {
  /**
   * @param {function(string):void} [onTabChange]  Called with the new tab ID
   */
  constructor(onTabChange) {
    this._onTabChange = onTabChange || null;
    this._activeTab   = 'tab-master';
  }

  /** Wire tab-btn click listeners and keyboard (1/2) shortcuts. */
  render() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setActiveTab(btn.dataset.tab));
    });

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '1') this.setActiveTab('tab-master');
      if (e.key === '2') this.setActiveTab('tab-stem');
    });
  }

  /**
   * Show the specified tab pane and mark its button active.
   * @param {string} tabId  'tab-master' | 'tab-stem'
   */
  setActiveTab(tabId) {
    document.querySelectorAll('#tab-master, #tab-stem').forEach(pane => {
      pane.style.display = pane.id === tabId ? '' : 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this._activeTab = tabId;
    this._onTabChange && this._onTabChange(tabId);
  }

  /** @returns {string} Currently active tab ID */
  get activeTab() { return this._activeTab; }
}
