import { events } from './events.js';

const screens = new Map();
let currentScreen = null;
let currentModule = null;

export const router = {
  register(mapping) {
    for (const [name, module] of Object.entries(mapping)) {
      screens.set(name, module);
    }
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },
  resolve() {
    const hash = location.hash.slice(1) || 'dashboard';
    this.go(hash);
  },
  go(name, params = {}) {
    const module = screens.get(name);
    if (!module) {
      console.warn('No screen registered:', name);
      return;
    }
    const stage = document.getElementById('stage');
    if (!stage) return;

    if (currentModule?.unmount) {
      try { currentModule.unmount(stage); } catch (e) {}
    }

    stage.innerHTML = '';

    const container = document.createElement('div');
    container.className = `screen active`;
    container.id = `${name}-screen`;
    stage.appendChild(container);

    currentScreen = name;
    currentModule = module;

    if (module.mount) {
      module.mount(container, params);
    }

    events.emit('screen:changed', name);
  },
  current() {
    return currentScreen;
  }
};
