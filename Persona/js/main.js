import { store } from './core/store.js';
import { router } from './core/router.js';
import { db } from './services/db.js';
import { toast } from './ui/toast.js';
import { header } from './ui/header.js';
import * as dashboard from './screens/dashboard.js';
import * as charEdit from './screens/char-edit.js';
import * as scenEdit from './screens/scen-edit.js';
import * as chatScreen from './screens/chat.js';
import * as settings from './screens/settings.js';

/* Bridge engine exports to window so HTML-string contexts
   inside parseRP / audio player / message actions can reach them.
   We still use createEl + addEventListener for 99% of UI. */
import * as ChatCore from './engine/chat-core.js';
import * as ChatActions from './engine/chat-actions.js';
import * as ChatSession from './engine/chat-session.js';
import * as ChatRender from './engine/chat-render.js';
import * as Ctrl from './engine/controllers.js';

window.ChatEngine = {
  ...ChatCore,
  ...ChatActions,
  saveSession: ChatSession.saveSession,
  loadSession: ChatSession.loadSession,
  toggleSTT: ChatSession.toggleSTT,
  apToggle: ChatCore.apToggle,
  apSeek: ChatCore.apSeek,
  renderMsg: ChatRender.renderMsg,
  addCtrlMsg: ChatRender.addCtrlMsg,
  renderRels: ChatRender.renderRels,
  renderCast: ChatRender.renderCast,
  scrollEnd: ChatRender.scrollEnd,
  addThinking: ChatRender.addThinking,
  createStreamEl: ChatRender.createStreamEl,
  updateStreamEl: ChatRender.updateStreamEl,
  finalizeEl: ChatRender.finalizeEl,
  setupScrollWatcher: ChatRender.setupScrollWatcher,
  runMain: Ctrl.runMain,
  runScenario: Ctrl.runScenario,
  runCreative: Ctrl.runCreative,
  createScenario: Ctrl.createScenario,
  generateCharacterImages: Ctrl.generateCharacterImages,
  genImagePrompt: Ctrl.genImagePrompt,
  genVoiceHint: Ctrl.genVoiceHint,
  autoImprove: Ctrl.autoImprove,
  buildSysPrompt: Ctrl.buildSysPrompt,
  buildConvo: Ctrl.buildConvo,
  addMemory: Ctrl.addMemory,
  loadMemories: Ctrl.loadMemories,
  dlog: Ctrl.dlog,
};

window.store = store;
window.db = db;
window.router = router;
window.toast = toast;

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
      chat: chatScreen,
      settings: settings
    });

    header.mount(document.getElementById('app-header'));
    router.go('dashboard');

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
      <button class="btn btn-primary btn-sm" id="ob-add">Add Key</button>
      <button class="onboard-close" id="ob-close">&times;</button>
    </div>
  `;
  app.insertBefore(banner, app.children[1] || null);

  banner.querySelector('#ob-add').addEventListener('click', () => {
    router.go('settings');
    banner.remove();
  });
  banner.querySelector('#ob-close').addEventListener('click', () => {
    db.setSetting('banner_dismissed', true);
    banner.remove();
  });
}

init();
