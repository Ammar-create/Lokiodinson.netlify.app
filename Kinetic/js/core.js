/* ============================================================
   KINETIC — CORE MODULE
   IndexedDB, state, settings, theme, custom select, toasts,
   utilities, PWA install, sidebar/nav binding, init
   ============================================================ */

// ==================== CONSTANTS ====================

const DB_NAME = 'KineticDB';
const DB_VERSION = 3;

const DEFAULT_IMAGE_MODELS = [
  { id: 'flux-2', name: 'Flux 2', enabled: true, refImages: false, polling: false },
  { id: 'gptimage-1.5', name: 'GPT Image 1.5', enabled: true, refImages: true, polling: false },
  { id: 'gptimage-2', name: 'GPT Image 2', enabled: true, refImages: true, polling: false },
  { id: 'zimage', name: 'Z Image', enabled: true, refImages: false, polling: false },
  { id: 'grok-image', name: 'Grok Image', enabled: true, refImages: false, polling: false },
  { id: 'midjourney', name: 'Midjourney', enabled: true, refImages: false, polling: false },
  { id: 'qwen-image', name: 'Qwen Image', enabled: true, refImages: true, polling: false },
  { id: 'imagen4', name: 'Imagen 4', enabled: true, refImages: false, polling: true },
  { id: 'nanobanana', name: 'NanoBanana', enabled: false, refImages: true, polling: true },
  { id: 'nanobanana-pro', name: 'NanoBanana Pro', enabled: false, refImages: true, polling: true },
  { id: 'seedream', name: 'Seedream', enabled: true, refImages: false, polling: false }
];

const ENHANCEMENT_MODELS = [
  { value: 'mimo-v2.5-pro', label: 'MiMo v2.5 Pro' },
  { value: 'grok', label: 'Grok' },
  { value: 'custom', label: 'Custom Model ID' }
];

const NAMING_MODELS = [
  { value: 'nova', label: 'Nova' },
  { value: 'gemini-2.5', label: 'Gemini 2.5' },
  { value: 'custom', label: 'Custom Model ID' }
];

const REMIX_MODELS = [
  { value: 'mimo-v2.5', label: 'MiMo v2.5' },
  { value: 'step-3.5', label: 'Step 3.5' },
  { value: 'grok-4.2', label: 'Grok 4.2' },
  { value: 'custom', label: 'Custom Model ID' }
];

const DEFAULT_PROMPTS = {
  enhance: 'You are an expert image prompt engineer. Given a user prompt, rewrite it into a more detailed, vivid, and descriptive version optimized for AI image generation. Use web search results if provided for current context. Keep it under 300 characters. Return ONLY the enhanced prompt, nothing else.',
  name: 'Generate a short, catchy title (3-6 words) for an image based on the prompt. Return ONLY the title, nothing else. No quotes.',
  remix: 'You are an image transformation specialist. Given a reference image and a transformation request, generate a detailed prompt describing the desired output. Focus on visual details, style, composition, and mood. You may use web search results for current information. Return ONLY the prompt.'
};

const BUILT_IN_ACTIONS = [
  { icon: '✏️', name: 'Sketch', prompt: 'Redraw as a detailed pencil sketch with fine graphite lines and cross-hatching' },
  { icon: '🎮', name: '3D Render', prompt: 'Transform into a photorealistic 3D rendered scene with volumetric lighting' },
  { icon: '🎨', name: 'Watercolor', prompt: 'Repaint in watercolor style with soft washes and visible brush strokes' },
  { icon: '👾', name: 'Pixel Art', prompt: 'Convert to retro pixel art with limited palette and visible pixels' },
  { icon: '🌸', name: 'Anime', prompt: 'Redraw in anime art style with cel shading and vibrant colors' },
  { icon: '🖼️', name: 'Oil Paint', prompt: 'Repaint as classical oil painting with rich textures and impasto brushwork' },
  { icon: '🔮', name: 'Stained Glass', prompt: 'Convert to stained glass art with bold leading lines and jewel tones' },
  { icon: '🌃', name: 'Cyberpunk', prompt: 'Transform into neon cyberpunk aesthetic with glowing outlines and dark atmosphere' }
];

const RANDOM_PROMPTS = [
  "A majestic dragon perched atop a crystal mountain at sunset, scales reflecting prismatic light, fantasy concept art, highly detailed",
  "Futuristic cyberpunk city at night, neon holographic billboards, flying vehicles, rainy streets, cinematic wide shot",
  "A serene Japanese zen garden in autumn, golden ginkgo leaves falling, koi pond reflecting maple trees, watercolor style",
  "An astronaut discovering a bioluminescent alien garden on a distant planet, volumetric fog, sci-fi concept art",
  "A cozy enchanted cottage deep in a mossy forest, fireflies dancing, warm amber light from windows, storybook illustration",
  "Underwater ancient temple covered in coral and sea life, god rays piercing turquoise water, photorealistic 8K",
  "A steampunk mechanical owl with intricate brass gears and copper feathers, perched on antique books, 3D render",
  "A celestial goddess composed of stars and nebulae, flowing cosmic dress, planets orbiting around her, digital painting",
  "A lone samurai in a vast field of red spider lilies, wind billowing through cloak, cinematic golden hour",
  "Miniature terrarium world on a scientist's desk, tiny mountains and rivers inside glass dome, tilt-shift photography",
  "A massive whale swimming through clouds above a Victorian city, airships nearby, Studio Ghibli inspired",
  "Photorealistic chameleon on tropical branch, incredible skin detail, bokeh background, macro photography"
];

// ==================== STATE ====================

const state = {
  apiKey: null,
  userName: '',
  avatarData: null,
  setupComplete: false,
  theme: 'orange',
  animationsEnabled: true,
  defaultModel: 'gptimage-2',
  selectedModel: 'gptimage-2',
  selectedRatio: 'landscape',
  customRatioW: '',
  customRatioH: '',
  selectedStyle: '',
  selectedCount: 1,
  parallelGeneration: false,
  backgroundGeneration: false,
  recentLimit: 30,
  enhanceEnabled: false,
  enhanceManual: false,
  enhanceModel: 'mimo-v2.5-pro',
  enhanceWebSearch: false,
  enhancePrompt: DEFAULT_PROMPTS.enhance,
  nameEnabled: false,
  nameModel: 'nova',
  namePrompt: DEFAULT_PROMPTS.name,
  remixModel: 'mimo-v2.5',
  remixAutoMode: true,
  remixWebSearch: false,
  remixPrompt: DEFAULT_PROMPTS.remix,
  imageModels: JSON.parse(JSON.stringify(DEFAULT_IMAGE_MODELS)),
  customModels: [],
  customRemixActions: [],
  images: [],
  currentFilter: 'all',
  refImageData: null,
  refPreviewUrl: null,
  isGenerating: false,
  completedCount: 0,
  totalCount: 0,
  recentRemixes: [],
  remixRefImageData: null,
  remixRefPreviewUrl: null,
  remixRefSource: 'gallery',
  remixSelectedRatio: 'landscape',
  remixCustomRatioW: '',
  remixCustomRatioH: '',
  remixSelectedCount: 1,
  ready: false // <-- NEW: flag indicating init complete
};

// ==================== DOM REFS ====================

const $ = (id) => document.getElementById(id);
const dom = {};

function cacheDom() {
  const ids = [
    'setupModal','setupAvatarWrap','setupAvatarPreview','setupAvatarFile',
    'setupName','setupApiKey','setupEyeToggle','setupSaveBtn',
    'settingsModal','settingsCloseBtn','settingsAvatarWrap','settingsAvatarPreview',
    'settingsAvatarFile','settingsName','settingsApiKey','settingsEyeToggle',
    'settingsDefaultModelWrap','settingsRecentLimit','settingsParallel',
    'settingsBackground','settingsAnimations',
    'themeOrange','themeBlue',
    'settingsEnhanceToggle','enhanceSub','settingsEnhanceManual',
    'settingsEnhanceWeb','settingsEnhanceModelWrap',
    'settingsNameToggle','nameSub','settingsNameModelWrap',
    'settingsRemixModelWrap','settingsRemixAuto','settingsRemixWeb',
    'imageModelList','addCustomModelBtn','addModelForm',
    'customModelId','customModelName','customModelRef','customModelPoll',
    'confirmAddModel','cancelAddModel',
    'installSection','installBtn','settingsSaveBtn',
    'genOverlay','genParticles','genOrb','genBoxes',
    'genPromptText','genBarFill','genStatusText','genCurrentCount','genTotalCount',
    'bgIndicator','bgCount','bgBoxes',
    'sidebar','sidebarOverlay','menuToggle',
    'galleryView','promptView',
    'tabRecentCount','tabFavCount','imageCount',
    'searchInput','galleryArea','galleryGrid','emptyState',
    'psEnhancePrompt','psNamePrompt','psRemixPrompt','psResetBtn',
    'genPanel','panelClose',
    'promptInput','charCount','shuffleBtn',
    'enhanceBtn','refSection','refDrop','refDropInner',
    'refPreview','refFileInput','refUrlInput','refUrlBtn','clearRefBtn',
    'modelSelectWrap','customRatio','customRatioW','customRatioH',
    'styleChips','addStyleBtn','addStyleRow','customStyleInput','addStyleConfirm',
    'generateBtn',
    'remixPanel','remixPanelClose','remixGalleryPick','remixPickGrid',
    'remixUploadPick','remixDrop','remixDropInner','remixPreview','remixFileInput',
    'remixSelected','remixSelectedImg','clearRemixRef',
    'remixPrompt','actionGrid','addRemixAction','addActionForm',
    'actionName','actionPrompt','confirmAddAction','cancelAddAction',
    'remixCustomRatio','remixRatioW','remixRatioH','remixManualHint',
    'remixBtn','recentRemixes','remixResults',
    'imageModal','viewerFullscreen','viewerClose','spotlight',
    'compareWrap','compareContainer','compareInput','compareOutput',
    'compareSlider','compareClose',
    'viewerPrompt','viewerMeta','viewerRemix',
    'viewerDownload','viewerFav','viewerCopy','viewerDelete','viewerCompare',
    'fullscreenView','fullscreenMinimize','fullscreenImgWrap','fullscreenImg',
    'imagePickerModal','pickerClose','pickerSearch','pickerGrid',
    'toastWrap','fabBtn','topbarAvatar','topbarAvatarLetter'
  ];
  let missing = [];
  ids.forEach(id => {
    const el = document.getElementById(id);
    dom[id] = el;
    if (!el) missing.push(id);
  });
  if (missing.length) console.warn('[Kinetic] Missing DOM elements:', missing.join(', '));
}

// ==================== INDEXEDDB ====================

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('gallery')) {
        const s = d.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
        s.createIndex('timestamp', 'timestamp', { unique: false });
        s.createIndex('batchId', 'batchId', { unique: false });
      }
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => { console.error('[Kinetic] IndexedDB error:', e.target.error); reject(e.target.error); };
  });
}

function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, data) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbRemove(store, key) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ==================== CUSTOM SELECT ====================

const selectInstances = [];

class KineticSelect {
  constructor(wrapEl, options, onChange) {
    this._disabled = true;
    if (!wrapEl) { console.warn('[Kinetic] KineticSelect: null wrapper'); return; }
    this._disabled = false;
    this.wrap = wrapEl;
    this.options = options || [];
    this.value = (wrapEl.dataset && wrapEl.dataset.value) || '';
    if (!this.value && this.options.length) this.value = this.options[0].value;
    this.onChange = onChange || (() => {});
    this.isOpen = false;
    this.render();
    this.bind();
    selectInstances.push(this);
  }

  render() {
    if (this._disabled) return;
    const sel = this.options.find(o => o.value === this.value);
    this.wrap.innerHTML = `
      <div class="cselect" tabindex="0">
        <span class="cselect-label">${sel ? esc(sel.label) : 'Select...'}</span>
        <svg class="cselect-arrow" viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <div class="cselect-dropdown">
          <div class="cselect-search"><input type="text" placeholder="Search..."></div>
          ${this.options.map(o => `
            <div class="cselect-option${o.value === this.value ? ' selected' : ''}" data-value="${esc(o.value)}">
              <span>${esc(o.label)}</span>
              ${o.description ? '<span class="cselect-option-desc">' + esc(o.description) + '</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>`;
    this.el = this.wrap.querySelector('.cselect');
    this.dropdown = this.wrap.querySelector('.cselect-dropdown');
    this.searchInput = this.wrap.querySelector('.cselect-search input');
    this.labelEl = this.wrap.querySelector('.cselect-label');
  }

  bind() {
    if (this._disabled || !this.el) return;
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('.cselect-search')) return;
      this.isOpen ? this.close() : this.open();
    });
    this.dropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.cselect-option');
      if (opt) this.select(opt.dataset.value);
    });
    this.searchInput.addEventListener('input', () => {
      const q = this.searchInput.value.toLowerCase();
      this.dropdown.querySelectorAll('.cselect-option').forEach(o => {
        o.style.display = o.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    document.addEventListener('click', (e) => { if (!this.wrap.contains(e.target)) this.close(); });
  }

  open() {
    if (this._disabled) return;
    selectInstances.forEach(s => { if (s !== this) s.close(); });
    this.isOpen = true;
    this.el.classList.add('open');
    this.searchInput.value = '';
    this.dropdown.querySelectorAll('.cselect-option').forEach(o => o.style.display = '');
    setTimeout(() => this.searchInput.focus(), 50);
  }

  close() {
    if (this._disabled) return;
    this.isOpen = false;
    if (this.el) this.el.classList.remove('open');
  }

  select(value) {
    if (this._disabled) return;
    this.value = value;
    const sel = this.options.find(o => o.value === value);
    if (this.labelEl) this.labelEl.textContent = sel ? sel.label : 'Select...';
    if (this.dropdown) {
      this.dropdown.querySelectorAll('.cselect-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.value === value);
      });
    }
    this.close();
    this.onChange(value);
  }

  getValue() { return this._disabled ? '' : this.value; }

  setValue(val) {
    if (this._disabled) return;
    this.value = val;
    const sel = this.options.find(o => o.value === val);
    if (sel && this.labelEl) this.labelEl.textContent = sel.label;
    if (this.dropdown) {
      this.dropdown.querySelectorAll('.cselect-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.value === val);
      });
    }
  }

  setOptions(opts) {
    if (this._disabled) return;
    this.options = opts;
    this.render();
    this.bind();
    if (this.value) this.setValue(this.value);
  }
}

// ==================== SETTINGS ====================

async function loadSettings() {
  if (!db) { console.warn('[Kinetic] DB not available, using defaults.'); return; }
  let rows = [];
  try { rows = await dbGetAll('settings'); } catch (e) { console.error('[Kinetic] loadSettings:', e); return; }
  const map = {};
  rows.forEach(r => map[r.key] = r.value);
  state.setupComplete = !!map.setupComplete;
  state.apiKey = map.apiKey || null;
  state.userName = map.userName || '';
  state.avatarData = map.avatarData || null;
  state.theme = map.theme || 'orange';
  state.animationsEnabled = map.animationsEnabled !== false;
  state.defaultModel = map.defaultModel || 'gptimage-2';
  state.selectedModel = state.defaultModel;
  state.recentLimit = map.recentLimit || 30;
  state.parallelGeneration = !!map.parallelGeneration;
  state.backgroundGeneration = !!map.backgroundGeneration;
  state.enhanceEnabled = !!map.enhanceEnabled;
  state.enhanceManual = !!map.enhanceManual;
  state.enhanceModel = map.enhanceModel || 'mimo-v2.5-pro';
  state.enhanceWebSearch = !!map.enhanceWebSearch;
  state.enhancePrompt = map.enhancePrompt || DEFAULT_PROMPTS.enhance;
  state.nameEnabled = !!map.nameEnabled;
  state.nameModel = map.nameModel || 'nova';
  state.namePrompt = map.namePrompt || DEFAULT_PROMPTS.name;
  state.remixModel = map.remixModel || 'mimo-v2.5';
  state.remixAutoMode = map.remixAutoMode !== false;
  state.remixWebSearch = !!map.remixWebSearch;
  state.remixPrompt = map.remixPrompt || DEFAULT_PROMPTS.remix;
  state.imageModels = map.imageModels || JSON.parse(JSON.stringify(DEFAULT_IMAGE_MODELS));
  state.customModels = map.customModels || [];
  state.customRemixActions = map.customRemixActions || [];
  applyTheme(state.theme);
  applyAnimations(state.animationsEnabled);
  if (!state.setupComplete || !state.apiKey) {
    if (dom.setupModal) dom.setupModal.classList.add('open');
  } else {
    if (dom.setupModal) dom.setupModal.classList.remove('open');
  }
}

async function saveSetting(key, value) {
  try { await dbPut('settings', { key, value }); } catch (e) { console.warn('[Kinetic] saveSetting', key, e); }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (dom.themeOrange) dom.themeOrange.classList.toggle('active', theme === 'orange');
  if (dom.themeBlue) dom.themeBlue.classList.toggle('active', theme === 'blue');
}

function applyAnimations(enabled) {
  document.body.classList.toggle('animated-effects', enabled);
  if (dom.settingsAnimations) dom.settingsAnimations.checked = enabled;
}

function applyProfileUI() {
  if (state.avatarData) {
    if (dom.topbarAvatar) dom.topbarAvatar.innerHTML = '<img src="' + state.avatarData + '" alt="">';
  } else if (state.userName && dom.topbarAvatarLetter) {
    dom.topbarAvatarLetter.textContent = state.userName.charAt(0).toUpperCase();
  }
  if (state.avatarData && dom.setupAvatarPreview) {
    dom.setupAvatarPreview.src = state.avatarData;
    dom.setupAvatarPreview.style.display = 'block';
    const ph = dom.setupAvatarWrap ? dom.setupAvatarWrap.querySelector('.setup-avatar-ph') : null;
    if (ph) ph.style.display = 'none';
  }
  if (state.avatarData && dom.settingsAvatarPreview) {
    dom.settingsAvatarPreview.src = state.avatarData;
    dom.settingsAvatarPreview.style.display = 'block';
    const sph = dom.settingsAvatarWrap ? dom.settingsAvatarWrap.querySelector('.settings-avatar-ph') : null;
    if (sph) sph.style.display = 'none';
  }
  if (dom.settingsName) dom.settingsName.value = state.userName;
  if (dom.settingsApiKey) dom.settingsApiKey.value = state.apiKey || '';
  if (dom.settingsRecentLimit) dom.settingsRecentLimit.value = state.recentLimit;
  if (dom.settingsParallel) dom.settingsParallel.checked = state.parallelGeneration;
  if (dom.settingsBackground) dom.settingsBackground.checked = state.backgroundGeneration;
  if (dom.settingsAnimations) dom.settingsAnimations.checked = state.animationsEnabled;
  if (dom.settingsEnhanceToggle) dom.settingsEnhanceToggle.checked = state.enhanceEnabled;
  if (dom.enhanceSub) dom.enhanceSub.style.display = state.enhanceEnabled ? '' : 'none';
  if (dom.settingsEnhanceManual) dom.settingsEnhanceManual.checked = state.enhanceManual;
  if (dom.settingsEnhanceWeb) dom.settingsEnhanceWeb.checked = state.enhanceWebSearch;
  if (dom.settingsNameToggle) dom.settingsNameToggle.checked = state.nameEnabled;
  if (dom.nameSub) dom.nameSub.style.display = state.nameEnabled ? '' : 'none';
  if (dom.settingsRemixAuto) dom.settingsRemixAuto.checked = state.remixAutoMode;
  if (dom.settingsRemixWeb) dom.settingsRemixWeb.checked = state.remixWebSearch;
  if (dom.psEnhancePrompt) dom.psEnhancePrompt.value = state.enhancePrompt;
  if (dom.psNamePrompt) dom.psNamePrompt.value = state.namePrompt;
  if (dom.psRemixPrompt) dom.psRemixPrompt.value = state.remixPrompt;
}

// ==================== TOAST ====================

function toast(type, title, msg) {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  if (!dom.toastWrap) { console.log('[Toast]', type, title, msg); return; }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-icon ${type}">${icons[type] || icons.info}</div><div class="toast-body"><div class="toast-title">${esc(title)}</div>${msg ? '<div class="toast-msg">' + esc(msg) + '</div>' : ''}</div>`;
  dom.toastWrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3500);
}

// ==================== UTILITIES ====================

function esc(text) { if (!text) return ''; const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function timeAgo(ts) { const s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return 'Just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }
function copyText(text) { if (navigator.clipboard) { navigator.clipboard.writeText(text); } else { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } }
function sanitizeFilename(text) { return (text || 'image').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 80) || 'image'; }
function uuid() { return 'xxxxxxxx-xxxx-4xxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)); }
function getEnabledModels() { return state.imageModels.filter(m => m.enabled); }
function getModelInfo(id) { return state.imageModels.find(m => m.id === id) || state.customModels.find(m => m.id === id) || null; }
function modelSupportsRef(id) { const m = getModelInfo(id); return m ? m.refImages : false; }
function modelUsesPolling(id) { const m = getModelInfo(id); return m ? m.polling : false; }
function getRatio() { if (state.selectedRatio === 'custom' && state.customRatioW && state.customRatioH) return state.customRatioW + ':' + state.customRatioH; return state.selectedRatio; }
function getRemixRatio() { if (state.remixSelectedRatio === 'custom' && state.remixCustomRatioW && state.remixCustomRatioH) return state.remixCustomRatioW + ':' + state.remixCustomRatioH; return state.remixSelectedRatio; }

// ==================== IMAGE BLOB STORAGE ====================

async function storeImageBlob(id, url) { try { const res = await fetch(url); const blob = await res.blob(); await dbPut('blobs', { id, blob, url }); return blob; } catch (e) { return null; } }
async function getImageUrl(id) { try { const rec = await dbGet('blobs', id); if (rec && rec.blob) return URL.createObjectURL(rec.blob); } catch (e) { /* */ } const img = state.images.find(i => i.id === id); return img ? img.url : ''; }

// ==================== PWA INSTALL ====================

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstallPrompt = e; if (dom.installSection) dom.installSection.style.display = ''; });

// ==================== NAVIGATION & SIDEBAR ====================

function openSidebar() { if (!dom.sidebar || !dom.sidebarOverlay) return; dom.sidebar.classList.add('open'); dom.sidebarOverlay.classList.add('active'); dom.sidebarOverlay.style.zIndex = '450'; }
function closeSidebar() { if (!dom.sidebar || !dom.sidebarOverlay) return; dom.sidebar.classList.remove('open'); const pa = (dom.genPanel && dom.genPanel.classList.contains('open')) || (dom.remixPanel && dom.remixPanel.classList.contains('open')); if (!pa) { dom.sidebarOverlay.classList.remove('active'); dom.sidebarOverlay.style.zIndex = ''; } }
function openGenPanel() { if (!dom.genPanel || !dom.remixPanel || !dom.sidebarOverlay) return; dom.genPanel.classList.add('open'); dom.remixPanel.classList.remove('open'); dom.sidebarOverlay.classList.add('active'); dom.sidebarOverlay.style.zIndex = '750'; closeSidebar(); }
function closeGenPanel() { if (!dom.genPanel || !dom.sidebarOverlay) return; dom.genPanel.classList.remove('open'); const so = dom.sidebar && dom.sidebar.classList.contains('open'); if (!so) { dom.sidebarOverlay.classList.remove('active'); dom.sidebarOverlay.style.zIndex = ''; } }
function openRemixPanel() { if (!dom.remixPanel || !dom.genPanel || !dom.sidebarOverlay) return; dom.remixPanel.classList.add('open'); dom.genPanel.classList.remove('open'); dom.sidebarOverlay.classList.add('active'); dom.sidebarOverlay.style.zIndex = '750'; closeSidebar(); if (typeof initRemixPanel === 'function') initRemixPanel(); }
function closeRemixPanel() { if (!dom.remixPanel || !dom.sidebarOverlay) return; dom.remixPanel.classList.remove('open'); const so = dom.sidebar && dom.sidebar.classList.contains('open'); if (!so) { dom.sidebarOverlay.classList.remove('active'); dom.sidebarOverlay.style.zIndex = ''; } }
function showView(view) { if (dom.galleryView) dom.galleryView.style.display = view === 'images' ? '' : 'none'; if (dom.promptView) dom.promptView.style.display = view === 'prompts' ? '' : 'none'; document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view)); }
function openSettings() { if (dom.settingsModal) dom.settingsModal.classList.add('open'); closeSidebar(); renderModelList(); }

// ==================== IMAGE MODEL LIST ====================

function renderModelList() {
  if (!dom.imageModelList) return;
  let html = '';
  state.imageModels.forEach((m, i) => {
    html += `<div class="model-item"><label><input type="checkbox" data-idx="${i}" ${m.enabled ? 'checked' : ''}> <span>${esc(m.name || m.id)}</span></label>${m.refImages ? '<span class="model-badge">ref</span>' : ''}${m.polling ? '<span class="model-badge">poll</span>' : ''}</div>`;
  });
  state.customModels.forEach((m, i) => {
    html += `<div class="model-item"><label><input type="checkbox" data-cidx="${i}" ${m.enabled !== false ? 'checked' : ''}> <span>${esc(m.name || m.id)}</span></label>${m.refImages ? '<span class="model-badge">ref</span>' : ''}${m.polling ? '<span class="model-badge">poll</span>' : ''}<button class="model-remove" data-remove="${i}"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>`;
  });
  dom.imageModelList.innerHTML = html;
  dom.imageModelList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.dataset.idx !== undefined) state.imageModels[parseInt(cb.dataset.idx)].enabled = cb.checked;
      else if (cb.dataset.cidx !== undefined) state.customModels[parseInt(cb.dataset.cidx)].enabled = cb.checked;
    });
  });
  dom.imageModelList.querySelectorAll('.model-remove').forEach(btn => {
    btn.addEventListener('click', () => { state.customModels.splice(parseInt(btn.dataset.remove), 1); renderModelList(); });
  });
}

// ==================== BIND CORE EVENTS ====================

function bindCoreEvents() {
  // Setup modal
  safeBind('setupAvatarWrap', 'click', () => { if (dom.setupAvatarFile) dom.setupAvatarFile.click(); });
  safeBind('setupAvatarFile', 'change', (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { if (dom.setupAvatarPreview) { dom.setupAvatarPreview.src = ev.target.result; dom.setupAvatarPreview.style.display = 'block'; } const ph = dom.setupAvatarWrap ? dom.setupAvatarWrap.querySelector('.setup-avatar-ph') : null; if (ph) ph.style.display = 'none'; state.avatarData = ev.target.result; }; r.readAsDataURL(f); });
  safeBind('setupEyeToggle', 'click', () => { if (dom.setupApiKey) dom.setupApiKey.type = dom.setupApiKey.type === 'password' ? 'text' : 'password'; });
  safeBind('setupApiKey', 'input', () => { if (dom.setupSaveBtn) dom.setupSaveBtn.disabled = !dom.setupApiKey.value.trim(); });
  safeBind('setupSaveBtn', 'click', async () => {
    const key = dom.setupApiKey ? dom.setupApiKey.value.trim() : '';
    if (!key) return;
    dom.setupSaveBtn.disabled = true;
    dom.setupSaveBtn.innerHTML = '<span>Connecting...</span>';
    try {
      const res = await fetch('https://api.aquadevs.com/health', { headers: { 'Authorization': 'Bearer ' + key } });
      const data = await res.json();
      if (data.status === 'online') {
        state.apiKey = key;
        state.userName = dom.setupName ? dom.setupName.value.trim() : '';
        state.setupComplete = true;
        await saveSetting('apiKey', key);
        await saveSetting('userName', state.userName);
        if (state.avatarData) await saveSetting('avatarData', state.avatarData);
        await saveSetting('setupComplete', true);
        applyProfileUI();
        if (dom.setupModal) dom.setupModal.classList.remove('open');
        if (typeof loadGallery === 'function') await loadGallery();
        toast('success', 'Welcome!', 'Your workspace is ready.');
      } else { toast('error', 'Connection Failed', 'Invalid response from API.'); }
    } catch (err) { toast('error', 'Connection Error', 'Could not reach AquaDevs API.'); }
    dom.setupSaveBtn.disabled = false;
    dom.setupSaveBtn.innerHTML = '<span>Get Started</span>';
  });

  // Settings modal
  safeBind('settingsCloseBtn', 'click', () => { if (dom.settingsModal) dom.settingsModal.classList.remove('open'); });
  if (dom.settingsModal) dom.settingsModal.addEventListener('click', (e) => { if (e.target === dom.settingsModal) dom.settingsModal.classList.remove('open'); });
  safeBind('settingsAvatarWrap', 'click', () => { if (dom.settingsAvatarFile) dom.settingsAvatarFile.click(); });
  safeBind('settingsAvatarFile', 'change', (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { state.avatarData = ev.target.result; if (dom.settingsAvatarPreview) { dom.settingsAvatarPreview.src = ev.target.result; dom.settingsAvatarPreview.style.display = 'block'; } const sph = dom.settingsAvatarWrap ? dom.settingsAvatarWrap.querySelector('.settings-avatar-ph') : null; if (sph) sph.style.display = 'none'; }; r.readAsDataURL(f); });
  safeBind('settingsEyeToggle', 'click', () => { if (dom.settingsApiKey) dom.settingsApiKey.type = dom.settingsApiKey.type === 'password' ? 'text' : 'password'; });
  safeBind('themeOrange', 'click', () => { state.theme = 'orange'; applyTheme('orange'); });
  safeBind('themeBlue', 'click', () => { state.theme = 'blue'; applyTheme('blue'); });
  safeBind('settingsEnhanceToggle', 'change', () => { if (dom.enhanceSub) dom.enhanceSub.style.display = dom.settingsEnhanceToggle.checked ? '' : 'none'; });
  safeBind('settingsNameToggle', 'change', () => { if (dom.nameSub) dom.nameSub.style.display = dom.settingsNameToggle.checked ? '' : 'none'; });

  // Recent limit presets
  document.querySelectorAll('.rl-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.rl-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); if (dom.settingsRecentLimit) dom.settingsRecentLimit.value = btn.dataset.limit; });
  });

  // Settings save
  safeBind('settingsSaveBtn', 'click', async () => {
    const key = dom.settingsApiKey ? dom.settingsApiKey.value.trim() : ''; if (key) state.apiKey = key;
    state.userName = dom.settingsName ? dom.settingsName.value.trim() : '';
    state.defaultModel = (defaultModelSelect && !defaultModelSelect._disabled) ? defaultModelSelect.getValue() : 'gptimage-2';
    state.selectedModel = state.defaultModel;
    state.recentLimit = dom.settingsRecentLimit ? (parseInt(dom.settingsRecentLimit.value) || 30) : 30;
    state.parallelGeneration = dom.settingsParallel ? dom.settingsParallel.checked : false;
    state.backgroundGeneration = dom.settingsBackground ? dom.settingsBackground.checked : false;
    state.animationsEnabled = dom.settingsAnimations ? dom.settingsAnimations.checked : true;
    state.enhanceEnabled = dom.settingsEnhanceToggle ? dom.settingsEnhanceToggle.checked : false;
    state.enhanceManual = dom.settingsEnhanceManual ? dom.settingsEnhanceManual.checked : false;
    state.enhanceWebSearch = dom.settingsEnhanceWeb ? dom.settingsEnhanceWeb.checked : false;
    state.enhanceModel = (enhanceModelSelect && !enhanceModelSelect._disabled) ? enhanceModelSelect.getValue() : 'mimo-v2.5-pro';
    state.nameEnabled = dom.settingsNameToggle ? dom.settingsNameToggle.checked : false;
    state.nameModel = (nameModelSelect && !nameModelSelect._disabled) ? nameModelSelect.getValue() : 'nova';
    state.remixModel = (remixModelSelect && !remixModelSelect._disabled) ? remixModelSelect.getValue() : 'mimo-v2.5';
    state.remixAutoMode = dom.settingsRemixAuto ? dom.settingsRemixAuto.checked : true;
    state.remixWebSearch = dom.settingsRemixWeb ? dom.settingsRemixWeb.checked : false;
    const saves = [
      saveSetting('apiKey', state.apiKey), saveSetting('userName', state.userName), saveSetting('defaultModel', state.defaultModel),
      saveSetting('recentLimit', state.recentLimit), saveSetting('parallelGeneration', state.parallelGeneration),
      saveSetting('backgroundGeneration', state.backgroundGeneration), saveSetting('animationsEnabled', state.animationsEnabled),
      saveSetting('enhanceEnabled', state.enhanceEnabled), saveSetting('enhanceManual', state.enhanceManual),
      saveSetting('enhanceWebSearch', state.enhanceWebSearch), saveSetting('enhanceModel', state.enhanceModel),
      saveSetting('nameEnabled', state.nameEnabled), saveSetting('nameModel', state.nameModel),
      saveSetting('remixModel', state.remixModel), saveSetting('remixAutoMode', state.remixAutoMode),
      saveSetting('remixWebSearch', state.remixWebSearch), saveSetting('theme', state.theme),
      saveSetting('imageModels', state.imageModels), saveSetting('customModels', state.customModels)
    ];
    if (state.avatarData) saves.push(saveSetting('avatarData', state.avatarData));
    await Promise.all(saves);
    applyProfileUI(); applyAnimations(state.animationsEnabled);
    if (typeof renderGallery === 'function') renderGallery();
    if (typeof updateModelSelect === 'function') updateModelSelect();
    if (dom.settingsModal) dom.settingsModal.classList.remove('open');
    toast('success', 'Settings Saved', 'Your preferences have been updated.');
  });

  // Model management
  safeBind('addCustomModelBtn', 'click', () => { if (dom.addModelForm) dom.addModelForm.style.display = dom.addModelForm.style.display === 'none' ? '' : 'none'; });
  safeBind('cancelAddModel', 'click', () => { if (dom.addModelForm) dom.addModelForm.style.display = 'none'; if (dom.customModelId) dom.customModelId.value = ''; if (dom.customModelName) dom.customModelName.value = ''; if (dom.customModelRef) dom.customModelRef.checked = false; if (dom.customModelPoll) dom.customModelPoll.checked = false; });
  safeBind('confirmAddModel', 'click', () => { const id = dom.customModelId ? dom.customModelId.value.trim() : ''; if (!id) { toast('error', 'Missing ID', 'Please enter a model ID.'); return; } state.customModels.push({ id, name: dom.customModelName ? (dom.customModelName.value.trim() || id) : id, enabled: true, refImages: dom.customModelRef ? dom.customModelRef.checked : false, polling: dom.customModelPoll ? dom.customModelPoll.checked : false }); if (dom.addModelForm) dom.addModelForm.style.display = 'none'; if (dom.customModelId) dom.customModelId.value = ''; if (dom.customModelName) dom.customModelName.value = ''; if (dom.customModelRef) dom.customModelRef.checked = false; if (dom.customModelPoll) dom.customModelPoll.checked = false; renderModelList(); toast('success', 'Model Added', id + ' is now available.'); });

  // PWA install
  safeBind('installBtn', 'click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); const r = await deferredInstallPrompt.userChoice; if (r.outcome === 'accepted') { toast('success', 'Installed!', 'Kinetic has been added to your home screen.'); if (dom.installSection) dom.installSection.style.display = 'none'; } deferredInstallPrompt = null; });

  // Sidebar
  safeBind('menuToggle', 'click', () => { dom.sidebar && dom.sidebar.classList.contains('open') ? closeSidebar() : openSidebar(); });
  if (dom.sidebarOverlay) dom.sidebarOverlay.addEventListener('click', () => { closeSidebar(); if (dom.genPanel && dom.genPanel.classList.contains('open')) closeGenPanel(); if (dom.remixPanel && dom.remixPanel.classList.contains('open')) closeRemixPanel(); });

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => { item.addEventListener('click', () => { const v = item.dataset.view; if (v === 'settings') { openSettings(); return; } showView(v); closeSidebar(); }); });

  // FAB + panel close
  safeBind('fabBtn', 'click', openGenPanel);
  safeBind('panelClose', 'click', closeGenPanel);
  safeBind('remixPanelClose', 'click', closeRemixPanel);

  // Topbar avatar
  safeBind('topbarAvatar', 'click', openSettings);

  // Prompt settings
  safeBind('psResetBtn', 'click', () => { if (dom.psEnhancePrompt) dom.psEnhancePrompt.value = DEFAULT_PROMPTS.enhance; if (dom.psNamePrompt) dom.psNamePrompt.value = DEFAULT_PROMPTS.name; if (dom.psRemixPrompt) dom.psRemixPrompt.value = DEFAULT_PROMPTS.remix; state.enhancePrompt = DEFAULT_PROMPTS.enhance; state.namePrompt = DEFAULT_PROMPTS.name; state.remixPrompt = DEFAULT_PROMPTS.remix; saveSetting('enhancePrompt', state.enhancePrompt); saveSetting('namePrompt', state.namePrompt); saveSetting('remixPrompt', state.remixPrompt); toast('success', 'Reset', 'Prompts restored to defaults.'); });
  safeBind('psEnhancePrompt', 'change', () => { state.enhancePrompt = dom.psEnhancePrompt.value; saveSetting('enhancePrompt', state.enhancePrompt); });
  safeBind('psNamePrompt', 'change', () => { state.namePrompt = dom.psNamePrompt.value; saveSetting('namePrompt', state.namePrompt); });
  safeBind('psRemixPrompt', 'change', () => { state.remixPrompt = dom.psRemixPrompt.value; saveSetting('remixPrompt', state.remixPrompt); });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.fullscreenView && dom.fullscreenView.classList.contains('open')) closeFullscreen();
      else if (dom.imageModal && dom.imageModal.classList.contains('open')) closeViewer();
      else if (dom.imagePickerModal && dom.imagePickerModal.classList.contains('open')) dom.imagePickerModal.classList.remove('open');
      else if (dom.settingsModal && dom.settingsModal.classList.contains('open')) dom.settingsModal.classList.remove('open');
      else if (dom.genPanel && dom.genPanel.classList.contains('open')) closeGenPanel();
      else if (dom.remixPanel && dom.remixPanel.classList.contains('open')) closeRemixPanel();
    }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openGenPanel(); if (dom.promptInput) setTimeout(() => dom.promptInput.focus(), 100); }
  });
}

function safeBind(id, event, handler) {
  const el = dom[id];
  if (el) { el.addEventListener(event, handler); }
  else { console.warn('[Kinetic] Cannot bind ' + event + ' — missing #' + id); }
}

// ==================== INIT ====================

let defaultModelSelect, enhanceModelSelect, nameModelSelect, remixModelSelect;

async function init() {
  console.log('[Kinetic] Initializing...');
  cacheDom();

  try { await openDB(); } catch (e) { console.error('[Kinetic] DB init failed:', e); }
  await loadSettings();

  // Custom selects for settings modal (safe)
  const modelOpts = getEnabledModels().map(m => ({ value: m.id, label: m.name || m.id }));
  defaultModelSelect = new KineticSelect(dom.settingsDefaultModelWrap, modelOpts);
  if (!defaultModelSelect._disabled) defaultModelSelect.setValue(state.defaultModel);

  enhanceModelSelect = new KineticSelect(dom.settingsEnhanceModelWrap, ENHANCEMENT_MODELS);
  if (!enhanceModelSelect._disabled) enhanceModelSelect.setValue(state.enhanceModel);

  nameModelSelect = new KineticSelect(dom.settingsNameModelWrap, NAMING_MODELS);
  if (!nameModelSelect._disabled) nameModelSelect.setValue(state.nameModel);

  remixModelSelect = new KineticSelect(dom.settingsRemixModelWrap, REMIX_MODELS);
  if (!remixModelSelect._disabled) remixModelSelect.setValue(state.remixModel);

  bindCoreEvents();
  applyProfileUI();

  // Initialize gallery AFTER settings are loaded
  if (state.setupComplete && state.apiKey && typeof loadGallery === 'function') {
    try { await loadGallery(); } catch (e) { console.warn('[Kinetic] loadGallery:', e); }
  }

  state.ready = true;
  document.dispatchEvent(new Event('kinetic:ready'));
  console.log('[Kinetic] Init complete. Ready.');
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(init, 0); });