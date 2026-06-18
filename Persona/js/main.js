import { store } from './core/store.js';
import { router } from './core/router.js';
import { db } from './services/db.js';
import { toast } from './ui/toast.js';
import { header } from './ui/header.js';
import * as dashboard from './screens/dashboard.js';
import * as charEdit from './screens/char-edit.js';
import * as scenEdit from './screens/scen-edit.js';
import * as chat from './screens/chat.js';
import * as settings from './screens/settings.js';

async function init() {
  try {
    await db.open();
    const saved = await db.getSetting('app_settings');
    if (saved) store.merge('settings', saved);

    router.register({
      dashboard: dashboard,
      'char-create': charEdit,
      'char-edit': charEdit,
      'scenario-create': scenEdit,
      'scenario-edit': scenEdit,
      chat: chat,
      settings: settings
    });

    header.mount(document.getElementById('app-header'));
    router.go('dashboard');

    // onboarding banner (if no aqua key and not dismissed)
    const dismissed = await db.getSetting('banner_dismissed');
    if (!store.get('settings.aquaKey') && !dismissed) {
      showOnboardBanner();
    }

    const chars = await db.getAll('characters');
    if (!chars.length) {
      setTimeout(() => toast.info('Welcome to Persona! Create characters, then build a scenario to begin.', 8000), 600);
    }
  } catch (e) {
    console.error('Boot failed:', e);
    toast.error('Initialization failed. Check console.', 8000);
  }
}

function showOnboardBanner() {
  const app = document.getElementById('app');
  if (!app) return;
  const banner = document.createElement('div');
  banner.className = 'onboard';
  banner.innerHTML = `
    <div class="onboard-inner">
      <svg class="icon" style="width:20px;height:20px;flex-shrink:0;color:var(--gold)"><use href="assets/icons.svg#key"/></svg>
      <div class="onboard-text"><strong>Unlock premium models</strong> — Add your Aqua API key for enhanced controllers and premium characters.</div>
      <button class="btn btn-primary btn-sm" onclick="router.go('settings');this.closest('.onboard').remove()">Add Key</button>
      <button class="onboard-close" onclick="db.setSetting('banner_dismissed',true);this.closest('.onboard').remove()">
        <svg class="icon" style="width:16px;height:16px"><use href="assets/icons.svg#x"/></svg>
      </button>
    </div>
  `;
  app.insertBefore(banner, app.children[1] || null);
}

init();
