// ===== ROUTER =====
// Hash-based SPA router. Each screen module exports mount/unmount.

import { store } from './store.js';
import { $, clear } from './dom.js';

const screens = new Map(); // name -> { mount, unmount }
let currentScreen = null;
let currentCleanup = null;

export const router = {
  register(name, module) {
    screens.set(name, module);
  },

  async go(name, params = {}) {
    if (currentScreen && screens.get(currentScreen)?.unmount) {
      try { screens.get(currentScreen).unmount(); } catch (e) { console.error('Unmount error:', e); }
    }
    currentScreen = name;
    store.set('screen', name);

    const container = $('#stage');
    if (!container) return;
    clear(container);

    const mod = screens.get(name);
    if (!mod) { console.error(`Screen "${name}" not registered`); return; }

    const screenEl = document.createElement('div');
    screenEl.className = 'screen active';
    container.append(screenEl);

    try {
      currentCleanup = await mod.mount(screenEl, params);
    } catch (e) {
      console.error(`Mount error for "${name}":`, e);
    }

    // Update header
    const header = $('#app-header');
    if (header) {
      import('../ui/header.js').then(({ Header }) => Header.render(name)).catch(() => {});
    }
  },

  current() { return currentScreen; },
};
