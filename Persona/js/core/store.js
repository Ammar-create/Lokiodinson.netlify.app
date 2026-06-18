/***** REACTIVE STORE *****/
const LISTENERS = new Map();
let STATE = {
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
  rateLimits: {
    pollinations: { calls: [], warned: false },
    aqua: { calls: [], warned: false },
  },
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
  }
};

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (target[keys[i]] == null) target[keys[i]] = {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

export const store = {
  get(path) {
    return clone(getPath(STATE, path));
  },
  set(path, value) {
    setPath(STATE, path, clone(value));
    this.notify(path);
  },
  merge(path, obj) {
    const current = getPath(STATE, path);
    setPath(STATE, path, { ...current, ...clone(obj) });
    this.notify(path);
  },
  notify(path) {
    for (const [pattern, cbs] of LISTENERS) {
      if (path === pattern || path.startsWith(pattern + '.')) {
        for (const cb of cbs) {
          try { cb(this.get(pattern)); } catch (e) {}
        }
      }
    }
  },
  subscribe(path, callback) {
    if (!LISTENERS.has(path)) LISTENERS.set(path, new Set());
    LISTENERS.get(path).add(callback);
    return () => LISTENERS.get(path).delete(callback);
  },
  raw() {
    return STATE;
  }
};
