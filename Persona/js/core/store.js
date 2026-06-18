// ===== CENTRAL REACTIVE STORE =====
// Single source of truth. No direct mutations from modules.
// Uses a flat path-based API: store.get('chat.scenario'), store.set('settings.aquaKey', val)

import { db } from '../services/db.js';

const state = {
  screen: 'dashboard',
  dashTab: 'scenarios',
  settTab: 'providers',
  editCharId: null,
  editScenId: null,
  charForm: {},
  scenForm: {},
  settings: {
    pollinationsKey: 'pk_LUy70Tu8OwLI1HrU',
    aquaKey: '',
    customUrl: '',
    customKey: '',
    charModel: 'openai-fast',
    ctrlModel: 'openai',
    imgModel: 'flux',
    ttsModel: 'openai-audio',
    sttModel: 'whisper-large-v3',
    defVoice: 'nova',
    ctrlFreq: 10,
    stWindow: 30,
    streaming: true,
    creativeModel: null,
    creativeImgModel: null,
    customImagePrompt: false,
  },
  rateLimits: { pollinations: { calls: [], warned: false }, aqua: { calls: [], warned: false } },
  chat: {
    scenId: null,
    scenario: null,
    characters: [],
    messages: [],
    rels: {},
    charMems: {},
    activeCharId: null,
    autoChatRunning: false,
    autoChatStop: false,
    msgSinceCtrl: 0,
    panelOpen: true,
    panelTab: 'directive',
    directive: { next: '', details: '' },
    debugLog: [],
    sending: false,
    controllerRunning: false,
    modelsCache: { pollinations: [], aqua: [] },
    sttRecording: false,
    whisper: false,
    whisperWith: [],
    whisperTarget: null,
  },
};

const listeners = new Map(); // path prefix -> Set<callback>
let saveTimer = null;

function getDeep(obj, path) {
  return path.split('.').reduce((o, k) => (o?.[k] !== undefined ? o[k] : undefined), obj);
}

function setDeep(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((o, k) => { o[k] = o[k] || {}; return o[k]; }, obj);
  target[last] = value;
}

export const store = {
  get(path) {
    return getDeep(state, path);
  },

  /** Direct path-based set. Notifies subscribers. */
  set(path, value) {
    setDeep(state, path, value);
    notify(path);
    debounceSave(path);
  },

  /** Merge partial object into a path */
  merge(path, partial) {
    const current = getDeep(state, path) || {};
    setDeep(state, path, { ...current, ...partial });
    notify(path);
    debounceSave(path);
  },

  /** Subscribe to changes at a path prefix */
  on(path, callback) {
    if (!listeners.has(path)) listeners.set(path, new Set());
    listeners.get(path).add(callback);
    return () => listeners.get(path)?.delete(callback);
  },

  /** Get entire state snapshot (read-only) */
  snapshot() {
    return JSON.parse(JSON.stringify(state));
  },

  /** Replace entire chat state (used by Chat.init) */
  replaceChat(partial) {
    Object.assign(state.chat, partial);
    notify('chat');
  },

  /** Reset chat state to defaults */
  resetChat() {
    state.chat = {
      scenId: null, scenario: null, characters: [], messages: [], rels: {},
      charMems: {}, activeCharId: null, autoChatRunning: false, autoChatStop: false,
      msgSinceCtrl: 0, panelOpen: window.innerWidth > 900, panelTab: 'directive',
      directive: { next: '', details: '' }, debugLog: [], sending: false,
      controllerRunning: false, modelsCache: { pollinations: [], aqua: [] },
      sttRecording: false, whisper: false, whisperWith: [], whisperTarget: null,
    };
    notify('chat');
  },
};

function notify(path) {
  for (const [prefix, callbacks] of listeners) {
    if (path === prefix || path.startsWith(prefix + '.') || prefix.startsWith(path + '.')) {
      for (const cb of callbacks) {
        try { cb(getDeep(state, prefix)); } catch (e) { console.error('Store listener error:', e); }
      }
    }
  }
}

// Persist settings to IndexedDB with debounce
function debounceSave(path) {
  if (!path.startsWith('settings.')) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await db.setSetting('app_settings', state.settings); } catch {}
  }, 1200);
}

// Load saved settings on module init
export async function loadSettings() {
  try {
    const saved = await db.getSetting('app_settings');
    if (saved) Object.assign(state.settings, saved);
  } catch {}
}
