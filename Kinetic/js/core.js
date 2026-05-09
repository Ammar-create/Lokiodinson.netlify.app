/* ============================================================
   KINETIC — COMPLETE SINGLE-FILE APP
   ============================================================ */

// ==================== CONSTANTS ====================

var DB_NAME = 'KineticDB';
var DB_VERSION = 3;
var API_BASE = 'https://api.aquadevs.com';

var DEFAULT_IMAGE_MODELS = [
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

var ENHANCEMENT_MODELS = [
  { value: 'mimo-v2.5-pro', label: 'MiMo v2.5 Pro' },
  { value: 'grok', label: 'Grok' },
  { value: 'custom', label: 'Custom Model ID' }
];

var NAMING_MODELS = [
  { value: 'nova', label: 'Nova' },
  { value: 'gemini-2.5', label: 'Gemini 2.5' },
  { value: 'custom', label: 'Custom Model ID' }
];

var REMIX_MODELS = [
  { value: 'mimo-v2.5', label: 'MiMo v2.5' },
  { value: 'step-3.5', label: 'Step 3.5' },
  { value: 'grok-4.2', label: 'Grok 4.2' },
  { value: 'custom', label: 'Custom Model ID' }
];

var DEFAULT_PROMPTS = {
  enhance: 'You are an expert image prompt engineer. Given a user prompt, rewrite it into a more detailed, vivid, and descriptive version optimized for AI image generation. Use web search results if provided for current context. Keep it under 300 characters. Return ONLY the enhanced prompt, nothing else.',
  name: 'Generate a short, catchy title (3-6 words) for an image based on the prompt. Return ONLY the title, nothing else. No quotes.',
  remix: 'You are an image transformation specialist. Given a reference image and a transformation request, generate a detailed prompt describing the desired output. Focus on visual details, style, composition, and mood. You may use web search results for current information. Return ONLY the prompt.'
};

var BUILT_IN_ACTIONS = [
  { icon: '\u270F\uFE0F', name: 'Sketch', prompt: 'Redraw as a detailed pencil sketch with fine graphite lines and cross-hatching' },
  { icon: '\uD83C\uDFAE', name: '3D Render', prompt: 'Transform into a photorealistic 3D rendered scene with volumetric lighting' },
  { icon: '\uD83C\uDFA8', name: 'Watercolor', prompt: 'Repaint in watercolor style with soft washes and visible brush strokes' },
  { icon: '\uD83D\uDC7E', name: 'Pixel Art', prompt: 'Convert to retro pixel art with limited palette and visible pixels' },
  { icon: '\uD83C\uDF38', name: 'Anime', prompt: 'Redraw in anime art style with cel shading and vibrant colors' },
  { icon: '\uD83D\uDDBC\uFE0F', name: 'Oil Paint', prompt: 'Repaint as classical oil painting with rich textures and impasto brushwork' },
  { icon: '\uD83D\uDD2E', name: 'Stained Glass', prompt: 'Convert to stained glass art with bold leading lines and jewel tones' },
  { icon: '\uD83C\uDF03', name: 'Cyberpunk', prompt: 'Transform into neon cyberpunk aesthetic with glowing outlines and dark atmosphere' }
];

var RANDOM_PROMPTS = [
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

var state = {
  apiKey: null, userName: '', avatarData: null, setupComplete: false,
  theme: 'orange', animationsEnabled: true,
  defaultModel: 'gptimage-2', selectedModel: 'gptimage-2',
  selectedRatio: 'landscape', customRatioW: '', customRatioH: '',
  selectedStyle: '', selectedCount: 1,
  parallelGeneration: false, backgroundGeneration: false, recentLimit: 30,
  enhanceEnabled: false, enhanceManual: false, enhanceModel: 'mimo-v2.5-pro',
  enhanceWebSearch: false, enhancePrompt: DEFAULT_PROMPTS.enhance,
  nameEnabled: false, nameModel: 'nova', namePrompt: DEFAULT_PROMPTS.name,
  remixModel: 'mimo-v2.5', remixAutoMode: true, remixWebSearch: false,
  remixPrompt: DEFAULT_PROMPTS.remix,
  imageModels: JSON.parse(JSON.stringify(DEFAULT_IMAGE_MODELS)),
  customModels: [], customRemixActions: [],
  images: [], currentFilter: 'all',
  refImageData: null, refPreviewUrl: null,
  isGenerating: false, completedCount: 0, totalCount: 0,
  recentRemixes: [],
  remixRefImageData: null, remixRefPreviewUrl: null, remixRefSource: 'gallery',
  remixSelectedRatio: 'landscape', remixCustomRatioW: '', remixCustomRatioH: '',
  remixSelectedCount: 1, ready: false
};

// ==================== DOM REFS ====================

var dom = {};
var DOM_IDS = [
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

function cacheDom() {
  for (var i = 0; i < DOM_IDS.length; i++) {
    dom[DOM_IDS[i]] = document.getElementById(DOM_IDS[i]);
  }
}

// ==================== INDEXEDDB ====================

var db = null;

function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      var d = e.target.result;
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('gallery')) {
        var s = d.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
        s.createIndex('timestamp', 'timestamp', { unique: false });
        s.createIndex('batchId', 'batchId', { unique: false });
      }
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
    };
    req.onsuccess = function(e) { db = e.target.result; resolve(db); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function dbGet(store, key) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not init'));
    var tx = db.transaction(store, 'readonly');
    var req = tx.objectStore(store).get(key);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbPut(store, data) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not init'));
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).put(data);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbRemove(store, key) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not init'));
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).delete(key);
    req.onsuccess = function() { resolve(); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbGetAll(store) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not init'));
    var tx = db.transaction(store, 'readonly');
    var req = tx.objectStore(store).getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

// ==================== UTILITIES ====================

function esc(text) {
  if (!text) return '';
  var d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function timeAgo(ts) {
  var s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function copyText(text) {
  if (navigator.clipboard) { navigator.clipboard.writeText(text); return; }
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
}

function sanitizeFilename(text) {
  return (text || 'image').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 80) || 'image';
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx'.replace(/x/g, function() { return (Math.random() * 16 | 0).toString(16); });
}

function getEnabledModels() {
  return state.imageModels.filter(function(m) { return m.enabled; });
}

function getModelInfo(id) {
  for (var i = 0; i < state.imageModels.length; i++) { if (state.imageModels[i].id === id) return state.imageModels[i]; }
  for (var j = 0; j < state.customModels.length; j++) { if (state.customModels[j].id === id) return state.customModels[j]; }
  return null;
}

function modelSupportsRef(id) { var m = getModelInfo(id); return m ? m.refImages : false; }
function modelUsesPolling(id) { var m = getModelInfo(id); return m ? m.polling : false; }

function getRatio() {
  if (state.selectedRatio === 'custom' && state.customRatioW && state.customRatioH) return state.customRatioW + ':' + state.customRatioH;
  return state.selectedRatio;
}

function getRemixRatio() {
  if (state.remixSelectedRatio === 'custom' && state.remixCustomRatioW && state.remixCustomRatioH) return state.remixCustomRatioW + ':' + state.remixCustomRatioH;
  return state.remixSelectedRatio;
}

// ==================== TOAST ====================

function toast(type, title, msg) {
  var icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  if (!dom.toastWrap) return;
  var el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<div class="toast-icon ' + type + '">' + (icons[type] || icons.info) + '</div><div class="toast-body"><div class="toast-title">' + esc(title) + '</div>' + (msg ? '<div class="toast-msg">' + esc(msg) + '</div>' : '') + '</div>';
  dom.toastWrap.appendChild(el);
  requestAnimationFrame(function() { el.classList.add('show'); });
  setTimeout(function() { el.classList.remove('show'); setTimeout(function() { el.remove(); }, 400); }, 3500);
}

// ==================== CUSTOM SELECT ====================

var selectInstances = [];

function KineticSelect(wrapEl, options, onChange) {
  this._disabled = false;
  this._null = false;
  if (!wrapEl) { this._disabled = true; this._null = true; return; }
  this.wrap = wrapEl;
  this.options = options || [];
  this.value = this.options.length ? this.options[0].value : '';
  this.onChange = onChange || function() {};
  this.isOpen = false;
  this.render();
  this.bind();
  selectInstances.push(this);
}

KineticSelect.prototype.render = function() {
  if (this._disabled) return;
  var self = this;
  var sel = null;
  for (var i = 0; i < this.options.length; i++) {
    if (this.options[i].value === this.value) { sel = this.options[i]; break; }
  }
  var optHtml = '';
  for (var j = 0; j < this.options.length; j++) {
    var o = this.options[j];
    var cls = o.value === this.value ? ' selected' : '';
    optHtml += '<div class="cselect-option' + cls + '" data-value="' + esc(o.value) + '"><span>' + esc(o.label) + '</span></div>';
  }
  this.wrap.innerHTML =
    '<div class="cselect" tabindex="0">' +
    '<span class="cselect-label">' + (sel ? esc(sel.label) : 'Select...') + '</span>' +
    '<svg class="cselect-arrow" viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '<div class="cselect-dropdown">' +
    '<div class="cselect-search"><input type="text" placeholder="Search..."></div>' +
    optHtml +
    '</div></div>';
  this.el = this.wrap.querySelector('.cselect');
  this.dropdown = this.wrap.querySelector('.cselect-dropdown');
  this.searchInput = this.wrap.querySelector('.cselect-search input');
  this.labelEl = this.wrap.querySelector('.cselect-label');
};

KineticSelect.prototype.bind = function() {
  if (this._disabled || !this.el) return;
  var self = this;
  this.el.addEventListener('click', function(e) {
    if (e.target.closest('.cselect-search')) return;
    self.isOpen ? self.close() : self.open();
  });
  this.dropdown.addEventListener('click', function(e) {
    var opt = e.target.closest('.cselect-option');
    if (opt) self.select(opt.dataset.value);
  });
  this.searchInput.addEventListener('input', function() {
    var q = self.searchInput.value.toLowerCase();
    var opts = self.dropdown.querySelectorAll('.cselect-option');
    for (var i = 0; i < opts.length; i++) {
      opts[i].style.display = opts[i].textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
    }
  });
  document.addEventListener('click', function(e) {
    if (!self.wrap.contains(e.target)) self.close();
  });
};

KineticSelect.prototype.open = function() {
  if (this._disabled) return;
  for (var i = 0; i < selectInstances.length; i++) {
    if (selectInstances[i] !== this) selectInstances[i].close();
  }
  this.isOpen = true;
  this.el.classList.add('open');
  this.searchInput.value = '';
  var opts = this.dropdown.querySelectorAll('.cselect-option');
  for (var i = 0; i < opts.length; i++) opts[i].style.display = '';
  var self = this;
  setTimeout(function() { self.searchInput.focus(); }, 50);
};

KineticSelect.prototype.close = function() {
  if (this._disabled) return;
  this.isOpen = false;
  if (this.el) this.el.classList.remove('open');
};

KineticSelect.prototype.select = function(value) {
  if (this._disabled) return;
  this.value = value;
  var sel = null;
  for (var i = 0; i < this.options.length; i++) {
    if (this.options[i].value === value) { sel = this.options[i]; break; }
  }
  if (sel && this.labelEl) this.labelEl.textContent = sel.label;
  if (this.dropdown) {
    var opts = this.dropdown.querySelectorAll('.cselect-option');
    for (var j = 0; j < opts.length; j++) {
      opts[j].classList.toggle('selected', opts[j].dataset.value === value);
    }
  }
  this.close();
  this.onChange(value);
};

KineticSelect.prototype.getValue = function() {
  return this._disabled ? '' : this.value;
};

KineticSelect.prototype.setValue = function(val) {
  if (this._disabled) return;
  this.value = val;
  var sel = null;
  for (var i = 0; i < this.options.length; i++) {
    if (this.options[i].value === val) { sel = this.options[i]; break; }
  }
  if (sel && this.labelEl) this.labelEl.textContent = sel.label;
  if (this.dropdown) {
    var opts = this.dropdown.querySelectorAll('.cselect-option');
    for (var j = 0; j < opts.length; j++) {
      opts[j].classList.toggle('selected', opts[j].dataset.value === val);
    }
  }
};

KineticSelect.prototype.setOptions = function(opts) {
  if (this._disabled) return;
  this.options = opts;
  this.render();
  this.bind();
  if (this.value) this.setValue(this.value);
};

// ==================== SETTINGS ====================

function loadSettings() {
  if (!db) return Promise.resolve();
  return dbGetAll('settings').then(function(rows) {
    var map = {};
    for (var i = 0; i < rows.length; i++) map[rows[i].key] = rows[i].value;
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
  }).catch(function() {});
}

function saveSetting(key, value) {
  return dbPut('settings', { key: key, value: value }).catch(function() {});
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
  if (state.avatarData && dom.topbarAvatar) {
    dom.topbarAvatar.innerHTML = '<img src="' + state.avatarData + '" alt="">';
  } else if (state.userName && dom.topbarAvatarLetter) {
    dom.topbarAvatarLetter.textContent = state.userName.charAt(0).toUpperCase();
  }
  if (state.avatarData && dom.setupAvatarPreview) {
    dom.setupAvatarPreview.src = state.avatarData;
    dom.setupAvatarPreview.style.display = 'block';
    var ph = dom.setupAvatarWrap ? dom.setupAvatarWrap.querySelector('.setup-avatar-ph') : null;
    if (ph) ph.style.display = 'none';
  }
  if (state.avatarData && dom.settingsAvatarPreview) {
    dom.settingsAvatarPreview.src = state.avatarData;
    dom.settingsAvatarPreview.style.display = 'block';
    var sph = dom.settingsAvatarWrap ? dom.settingsAvatarWrap.querySelector('.settings-avatar-ph') : null;
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

// ==================== IMAGE BLOB STORAGE ====================

function storeImageBlob(id, url) {
  return fetch(url).then(function(res) { return res.blob(); }).then(function(blob) {
    return dbPut('blobs', { id: id, blob: blob, url: url });
  }).catch(function() { return null; });
}

function getImageUrl(id) {
  return dbGet('blobs', id).then(function(rec) {
    if (rec && rec.blob) return URL.createObjectURL(rec.blob);
    var img = null;
    for (var i = 0; i < state.images.length; i++) { if (state.images[i].id === id) { img = state.images[i]; break; } }
    return img ? img.url : '';
  }).catch(function() { return ''; });
}

// ==================== GALLERY ====================

function loadGallery() {
  if (!db) return Promise.resolve();
  return dbGetAll('gallery').then(function(rows) {
    state.images = rows.sort(function(a, b) { return b.timestamp - a.timestamp; });
    renderGallery();
  }).catch(function() {});
}

function renderGallery() {
  var filtered = state.images;
  var f = state.currentFilter;
  var now = Date.now();
  var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  if (f === 'recent') filtered = state.images.filter(function(img) { return img.timestamp > weekAgo; });
  else if (f === 'favorites') filtered = state.images.filter(function(img) { return img.favorite; });
  if (dom.searchInput && dom.searchInput.value) {
    var q = dom.searchInput.value.toLowerCase();
    filtered = filtered.filter(function(img) {
      return (img.prompt && img.prompt.toLowerCase().indexOf(q) !== -1) || (img.model && img.model.toLowerCase().indexOf(q) !== -1);
    });
  }
  var favCount = state.images.filter(function(i) { return i.favorite; }).length;
  var weekCount = state.images.filter(function(i) { return i.timestamp > weekAgo; }).length;
  if (dom.imageCount) dom.imageCount.textContent = state.images.length;
  if (dom.tabFavCount) dom.tabFavCount.textContent = favCount > 0 ? '(' + favCount + ')' : '';
  if (dom.tabRecentCount) dom.tabRecentCount.textContent = weekCount > 0 ? '(' + weekCount + ')' : '';
  if (filtered.length === 0) {
    if (dom.emptyState) dom.emptyState.style.display = '';
    if (dom.galleryGrid) dom.galleryGrid.innerHTML = '';
    return;
  }
  if (dom.emptyState) dom.emptyState.style.display = 'none';
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var img = filtered[i];
    var favCls = img.favorite ? ' favorited' : '';
    html += '<div class="gallery-card' + favCls + '" data-id="' + img.id + '">';
    html += '<div class="gc-image"><img src="' + esc(img.url) + '" alt="" loading="lazy"></div>';
    html += '<div class="gc-info"><div class="gc-prompt">' + esc(img.prompt) + '</div>';
    html += '<div class="gc-meta"><span class="gc-model">' + esc(img.model) + '</span>';
    html += '<span class="gc-time">' + timeAgo(img.timestamp) + '</span></div></div>';
    html += '<button class="gc-fav" data-fav="' + img.id + '" type="button"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="' + (img.favorite ? 'var(--accent)' : 'none') + '" stroke="currentColor" stroke-width="2"/></svg></button>';
    html += '</div>';
  }
  if (dom.galleryGrid) dom.galleryGrid.innerHTML = html;
}

function toggleFavorite(id) {
  for (var i = 0; i < state.images.length; i++) {
    if (state.images[i].id === id) {
      state.images[i].favorite = !state.images[i].favorite;
      dbPut('gallery', state.images[i]).catch(function() {});
      renderGallery();
      return;
    }
  }
}

function deleteImage(id) {
  for (var i = 0; i < state.images.length; i++) {
    if (state.images[i].id === id) {
      state.images.splice(i, 1);
      dbRemove('gallery', id).catch(function() {});
      dbRemove('blobs', id).catch(function() {});
      renderGallery();
      closeViewer();
      toast('info', 'Deleted', 'Image removed from gallery.');
      return;
    }
  }
}

// ==================== IMAGE VIEWER ====================

var viewerIndex = -1;
var viewerImages = [];

function openViewer(imageId) {
  viewerImages = getFilteredImages();
  viewerIndex = -1;
  for (var i = 0; i < viewerImages.length; i++) {
    if (viewerImages[i].id === imageId) { viewerIndex = i; break; }
  }
  if (viewerIndex === -1) return;
  updateViewer();
  if (dom.imageModal) dom.imageModal.classList.add('open');
}

function closeViewer() {
  if (dom.imageModal) dom.imageModal.classList.remove('open');
  if (dom.compareWrap) dom.compareWrap.style.display = 'none';
}

function updateViewer() {
  if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
  var img = viewerImages[viewerIndex];
  if (dom.viewerPrompt) dom.viewerPrompt.textContent = img.prompt || '';
  if (dom.viewerMeta) dom.viewerMeta.textContent = img.model + ' \u2022 ' + img.ratio + ' \u2022 ' + timeAgo(img.timestamp);
  if (dom.viewerFav) {
    dom.viewerFav.classList.toggle('favorited', !!img.favorite);
  }
  if (dom.viewerCompare) {
    dom.viewerCompare.style.display = img.inputImageUrl ? '' : 'none';
  }
  // Spot center
  var sc = document.getElementById('spotCenter');
  if (sc) sc.innerHTML = '<img src="' + esc(img.url) + '" alt="" draggable="false">';
  // Spot left
  var sl = document.getElementById('spotLeft');
  if (sl) {
    if (viewerIndex > 0) {
      sl.innerHTML = '<img src="' + esc(viewerImages[viewerIndex - 1].url) + '" alt="" draggable="false">';
      sl.style.display = '';
    } else { sl.style.display = 'none'; }
  }
  // Spot right
  var sr = document.getElementById('spotRight');
  if (sr) {
    if (viewerIndex < viewerImages.length - 1) {
      sr.innerHTML = '<img src="' + esc(viewerImages[viewerIndex + 1].url) + '" alt="" draggable="false">';
      sr.style.display = '';
    } else { sr.style.display = 'none'; }
  }
}

function getFilteredImages() {
  var filtered = state.images;
  var f = state.currentFilter;
  var now = Date.now();
  if (f === 'recent') filtered = state.images.filter(function(img) { return img.timestamp > now - 7 * 24 * 60 * 60 * 1000; });
  else if (f === 'favorites') filtered = state.images.filter(function(img) { return img.favorite; });
  return filtered;
}

// ==================== FULLSCREEN ====================

function openFullscreen(url) {
  if (!dom.fullscreenView || !dom.fullscreenImg) return;
  dom.fullscreenImg.src = url;
  dom.fullscreenView.classList.add('open');
}

function closeFullscreen() {
  if (dom.fullscreenView) dom.fullscreenView.classList.remove('open');
}

// ==================== PWA INSTALL ====================

var deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (dom.installSection) dom.installSection.style.display = '';
});

// ==================== NAVIGATION ====================

function openSidebar() {
  if (!dom.sidebar || !dom.sidebarOverlay) return;
  dom.sidebar.classList.add('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '450';
}

function closeSidebar() {
  if (!dom.sidebar || !dom.sidebarOverlay) return;
  dom.sidebar.classList.remove('open');
  var pa = (dom.genPanel && dom.genPanel.classList.contains('open')) || (dom.remixPanel && dom.remixPanel.classList.contains('open'));
  if (!pa) { dom.sidebarOverlay.classList.remove('active'); dom.sidebarOverlay.style.zIndex = ''; }
}

function openGenPanel() {
  if (!dom.genPanel || !dom.remixPanel || !dom.sidebarOverlay) return;
  dom.genPanel.classList.add('open');
  dom.remixPanel.classList.remove('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '750';
  closeSidebar();
  updateModelSelect();
}

function closeGenPanel() {
  if (!dom.genPanel || !dom.sidebarOverlay) return;
  dom.genPanel.classList.remove('open');
  var so = dom.sidebar && dom.sidebar.classList.contains('open');
  if (!so) { dom.sidebarOverlay.classList.remove('active'); dom.sidebarOverlay.style.zIndex = ''; }
}

function openRemixPanel() {
  if (!dom.remixPanel || !dom.genPanel || !dom.sidebarOverlay) return;
  dom.remixPanel.classList.add('open');
  dom.genPanel.classList.remove('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '750';
  closeSidebar();
  populateRemixGrid();
}

function closeRemixPanel() {
  if (!dom.remixPanel || !dom.sidebarOverlay) return;
  dom.remixPanel.classList.remove('open');
  var so = dom.sidebar && dom.sidebar.classList.contains('open');
  if (!so) { dom.sidebarOverlay.classList.remove('active'); dom.sidebarOverlay.style.zIndex = ''; }
}

function showView(view) {
  if (dom.galleryView) dom.galleryView.style.display = view === 'images' ? '' : 'none';
  if (dom.promptView) dom.promptView.style.display = view === 'prompts' ? '' : 'none';
  var navs = document.querySelectorAll('.nav-item');
  for (var i = 0; i < navs.length; i++) navs[i].classList.toggle('active', navs[i].dataset.view === view);
}

function openSettings() {
  if (dom.settingsModal) dom.settingsModal.classList.add('open');
  closeSidebar();
  renderModelList();
}

// ==================== MODEL LIST IN SETTINGS ====================

function renderModelList() {
  if (!dom.imageModelList) return;
  var html = '';
  for (var i = 0; i < state.imageModels.length; i++) {
    var m = state.imageModels[i];
    html += '<div class="model-item"><label><input type="checkbox" data-idx="' + i + '" ' + (m.enabled ? 'checked' : '') + '> <span>' + esc(m.name || m.id) + '</span></label>';
    if (m.refImages) html += '<span class="model-badge">ref</span>';
    if (m.polling) html += '<span class="model-badge">poll</span>';
    html += '</div>';
  }
  for (var j = 0; j < state.customModels.length; j++) {
    var cm = state.customModels[j];
    html += '<div class="model-item"><label><input type="checkbox" data-cidx="' + j + '" ' + (cm.enabled !== false ? 'checked' : '') + '> <span>' + esc(cm.name || cm.id) + '</span></label>';
    html += '<button class="model-remove" data-remove="' + j + '"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>';
  }
  dom.imageModelList.innerHTML = html;
  var cbs = dom.imageModelList.querySelectorAll('input[type="checkbox"]');
  for (var k = 0; k < cbs.length; k++) {
    (function(cb) {
      cb.addEventListener('change', function() {
        if (cb.dataset.idx !== undefined) state.imageModels[parseInt(cb.dataset.idx)].enabled = cb.checked;
        else if (cb.dataset.cidx !== undefined) state.customModels[parseInt(cb.dataset.cidx)].enabled = cb.checked;
      });
    })(cbs[k]);
  }
  var rmBtns = dom.imageModelList.querySelectorAll('.model-remove');
  for (var l = 0; l < rmBtns.length; l++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        state.customModels.splice(parseInt(btn.dataset.remove), 1);
        renderModelList();
      });
    })(rmBtns[l]);
  }
}

// ==================== CUSTOM SELECT INSTANCES ====================

var defaultModelSelect, enhanceModelSelect, nameModelSelect, remixModelSelect, modelSelect;

function createCustomSelects() {
  var modelOpts = getEnabledModels().map(function(m) { return { value: m.id, label: m.name || m.id }; });
  if (modelOpts.length === 0) {
    modelOpts = DEFAULT_IMAGE_MODELS.filter(function(m) { return m.enabled; }).map(function(m) { return { value: m.id, label: m.name }; });
  }

  defaultModelSelect = new KineticSelect(dom.settingsDefaultModelWrap, modelOpts);
  if (!defaultModelSelect._disabled) defaultModelSelect.setValue(state.defaultModel);

  enhanceModelSelect = new KineticSelect(dom.settingsEnhanceModelWrap, ENHANCEMENT_MODELS);
  if (!enhanceModelSelect._disabled) enhanceModelSelect.setValue(state.enhanceModel);

  nameModelSelect = new KineticSelect(dom.settingsNameModelWrap, NAMING_MODELS);
  if (!nameModelSelect._disabled) nameModelSelect.setValue(state.nameModel);

  remixModelSelect = new KineticSelect(dom.settingsRemixModelWrap, REMIX_MODELS);
  if (!remixModelSelect._disabled) remixModelSelect.setValue(state.remixModel);

  // GEN PANEL MODEL SELECT - THE MISSING PIECE!
  modelSelect = new KineticSelect(dom.modelSelectWrap, modelOpts);
  if (!modelSelect._disabled) {
    modelSelect.setValue(state.selectedModel);
    modelSelect.onChange = function(val) {
      state.selectedModel = val;
      updateRefSection();
    };
  }

  updateRefSection();
}

function updateModelSelect() {
  if (!modelSelect || modelSelect._disabled) return;
  var modelOpts = getEnabledModels().map(function(m) { return { value: m.id, label: m.name || m.id }; });
  if (modelOpts.length === 0) {
    modelOpts = DEFAULT_IMAGE_MODELS.filter(function(m) { return m.enabled; }).map(function(m) { return { value: m.id, label: m.name }; });
  }
  modelSelect.setOptions(modelOpts);
  modelSelect.setValue(state.selectedModel);
}

function updateRefSection() {
  var showRef = modelSupportsRef(state.selectedModel);
  if (dom.refSection) dom.refSection.style.display = showRef ? '' : 'none';
  if (!showRef) {
    state.refImageData = null;
    state.refPreviewUrl = null;
    if (dom.refPreview) dom.refPreview.style.display = 'none';
    if (dom.refDropInner) dom.refDropInner.style.display = '';
    if (dom.clearRefBtn) dom.clearRefBtn.style.display = 'none';
  }
}

// ==================== PROMPT ENHANCEMENT ====================

var enhanceInterval = null;

async function enhancePrompt() {
  if (!state.apiKey) return;
  if (!dom.promptInput) return;
  var prompt = dom.promptInput.value.trim();
  if (!prompt) { toast('warn', 'Empty', 'Type a prompt first.'); return; }
  if (dom.enhanceBtn) dom.enhanceBtn.classList.add('loading');
  try {
    var msgs = [{ role: 'user', content: state.enhancePrompt + '\n\nUser prompt: ' + prompt }];
    var model = state.enhanceModel === 'custom' ? 'grok' : state.enhanceModel;
    var res = await fetch(API_BASE + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.apiKey },
      body: JSON.stringify({ model: model, messages: msgs, max_tokens: 300 })
    });
    var data = await res.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      var enhanced = data.choices[0].message.content.trim();
      if (dom.promptInput) dom.promptInput.value = enhanced;
      if (dom.charCount) dom.charCount.textContent = enhanced.length;
      toast('success', 'Enhanced', 'Prompt improved.');
    } else {
      toast('error', 'Failed', 'No response from enhancement model.');
    }
  } catch (e) {
    toast('error', 'Error', e.message);
  }
  if (dom.enhanceBtn) dom.enhanceBtn.classList.remove('loading');
}

// ==================== AUTO-NAMING ====================

async function generateName(prompt) {
  if (!state.apiKey || !state.nameEnabled) return null;
  try {
    var msgs = [{ role: 'user', content: state.namePrompt + '\n\nPrompt: ' + prompt }];
    var model = state.nameModel === 'custom' ? 'grok' : state.nameModel;
    var res = await fetch(API_BASE + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.apiKey },
      body: JSON.stringify({ model: model, messages: msgs, max_tokens: 30 })
    });
    var data = await res.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    }
  } catch (e) {}
  return null;
}

// ==================== IMAGE GENERATION ====================

async function generateImages() {
  if (state.isGenerating) return;
  if (!state.apiKey) { toast('error', 'No API Key', 'Please set your API key in settings.'); return; }

  var prompt = dom.promptInput ? dom.promptInput.value.trim() : '';
  if (!prompt) { toast('warn', 'Empty Prompt', 'Please describe what you want to create.'); return; }

  var model = modelSelect && !modelSelect._disabled ? modelSelect.getValue() : state.selectedModel;
  if (!model) { toast('error', 'No Model', 'Please select a model.'); return; }

  var count = state.selectedCount || 1;
  var ratio = getRatio();
  var style = state.selectedStyle || '';

  state.isGenerating = true;
  state.completedCount = 0;
  state.totalCount = count;

  if (dom.genOverlay) dom.genOverlay.classList.add('open');
  if (dom.genPromptText) dom.genPromptText.textContent = prompt;
  if (dom.genBarFill) dom.genBarFill.style.width = '0%';
  if (dom.genStatusText) dom.genStatusText.textContent = 'Generating...';
  if (dom.genCurrentCount) dom.genCurrentCount.textContent = '0';
  if (dom.genTotalCount) dom.genTotalCount.textContent = '' + count;

  // Build full prompt with style
  var fullPrompt = prompt;
  if (style) fullPrompt = prompt + ', ' + style + ' style';

  var imageNames = {};
  if (state.nameEnabled) {
    for (var n = 0; n < count; n++) {
      imageNames[n] = generateName(prompt);
    }
    var nameResults = await Promise.all(Object.values(imageNames));
    var nameIdx = 0;
    for (var k in imageNames) { imageNames[k] = nameResults[nameIdx++]; }
  }

  var results = [];

  if (state.parallelGeneration && count > 1) {
    var promises = [];
    for (var p = 0; p < count; p++) {
      promises.push(generateOneImage(model, fullPrompt, ratio, state.refImageData, p, imageNames[p]));
    }
    results = await Promise.allSettled(promises);
  } else {
    for (var i = 0; i < count; i++) {
      var result = await generateOneImage(model, fullPrompt, ratio, state.refImageData, i, imageNames[i]);
      results.push(result);
      state.completedCount = i + 1;
      if (dom.genCurrentCount) dom.genCurrentCount.textContent = '' + state.completedCount;
      if (dom.genBarFill) dom.genBarFill.style.width = Math.round((state.completedCount / count) * 100) + '%';
    }
  }

  var savedCount = 0;
  for (var r = 0; r < results.length; r++) {
    var res = results[r];
    var value = res.status === 'fulfilled' ? res.value : null;
    if (value && value.url) {
      savedCount++;
    }
  }

  state.isGenerating = false;
  if (dom.genOverlay) dom.genOverlay.classList.remove('open');
  if (dom.genStatusText) dom.genStatusText.textContent = 'Done!';

  if (savedCount > 0) {
    toast('success', 'Generated', savedCount + ' image' + (savedCount > 1 ? 's' : '') + ' created.');
    await loadGallery();
  } else {
    toast('error', 'Failed', 'No images were generated. Check your prompt and model.');
  }
}

async function generateOneImage(model, prompt, ratio, refImageData, index, namePromise) {
  var body = { model: model, prompt: prompt, n: 1, size: ratio };
  if (refImageData) body.image = refImageData;

  var usePolling = modelUsesPolling(model);

  try {
    var res = await fetch(API_BASE + '/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.apiKey },
      body: JSON.stringify(body)
    });

    var data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ? data.error.message : 'API returned ' + res.status);
    }

    var imageUrl = null;

    if (usePolling && data.task_id) {
      imageUrl = await pollForImage(data.task_id);
    } else if (data.data && data.data[0]) {
      imageUrl = data.data[0].url || data.data[0].b64_json;
    }

    if (!imageUrl) throw new Error('No image URL in response');

    var name = null;
    if (namePromise) name = await namePromise;

    var record = {
      id: uuid(),
      prompt: prompt,
      model: model,
      ratio: ratio,
      url: imageUrl,
      timestamp: Date.now(),
      favorite: false,
      batchId: uuid(),
      name: name || sanitizeFilename(prompt)
    };

    state.images.unshift(record);
    await dbPut('gallery', record);

    // Store blob for offline access
    storeImageBlob(record.id, imageUrl);

    return record;

  } catch (err) {
    toast('error', 'Generation Failed', err.message);
    return null;
  }
}

async function pollForImage(taskId) {
  var maxAttempts = 120;
  var delay = 3000;
  for (var i = 0; i < maxAttempts; i++) {
    await sleep(delay);
    try {
      var res = await fetch(API_BASE + '/v1/images/tasks/' + taskId, {
        headers: { 'Authorization': 'Bearer ' + state.apiKey }
      });
      var data = await res.json();
      if (data.status === 'completed' && data.data && data.data[0]) {
        return data.data[0].url;
      }
      if (data.status === 'failed') {
        throw new Error(data.error || 'Task failed');
      }
      if (dom.genStatusText) dom.genStatusText.textContent = 'Processing... (' + (i + 1) + ')';
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
    }
  }
  throw new Error('Polling timed out');
}

// ==================== REMIX ====================

function populateRemixGrid() {
  if (!dom.actionGrid) return;
  var allActions = BUILT_IN_ACTIONS.concat(state.customRemixActions);
  var html = '';
  for (var i = 0; i < allActions.length; i++) {
    var a = allActions[i];
    html += '<button class="action-chip" data-action="' + i + '" type="button">';
    html += '<span class="action-chip-icon">' + (a.icon || '\u2699\uFE0F') + '</span>';
    html += '<span>' + esc(a.name) + '</span></button>';
  }
  dom.actionGrid.innerHTML = html;
  // Bind action chips
  var chips = dom.actionGrid.querySelectorAll('.action-chip');
  for (var j = 0; j < chips.length; j++) {
    (function(chip) {
      chip.addEventListener('click', function() {
        var idx = parseInt(chip.dataset.action);
        var action = allActions[idx];
        if (action && dom.remixPrompt) {
          dom.remixPrompt.value = action.prompt;
        }
      });
    })(chips[j]);
  }
}

async function doRemix() {
  if (state.isGenerating) return;
  if (!state.apiKey) { toast('error', 'No API Key', 'Set your API key.'); return; }
  if (!dom.remixPrompt) return;
  var prompt = dom.remixPrompt.value.trim();
  if (!prompt) { toast('warn', 'Empty', 'Enter a remix prompt.'); return; }
  if (!state.remixRefImageData) { toast('warn', 'No Image', 'Select a reference image first.'); return; }

  state.isGenerating = true;
  if (dom.genOverlay) dom.genOverlay.classList.add('open');
  if (dom.genStatusText) dom.genStatusText.textContent = 'Remixing...';

  try {
    var model = state.remixModel === 'custom' ? 'grok' : state.remixModel;
    var fullPrompt = prompt;
    if (state.remixAutoMode) {
      var enhanceRes = await fetch(API_BASE + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.apiKey },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: state.remixPrompt },
            { role: 'user', content: 'Transform request: ' + prompt + '\nGenerate a detailed image generation prompt.' }
          ],
          max_tokens: 300
        })
      });
      var enhanceData = await enhanceRes.json();
      if (enhanceData.choices && enhanceData.choices[0]) {
        fullPrompt = enhanceData.choices[0].message.content.trim();
      }
    }

    var ratio = getRemixRatio();
    var result = await generateOneImage('gptimage-2', fullPrompt, ratio, state.remixRefImageData, 0, null);

    state.isGenerating = false;
    if (dom.genOverlay) dom.genOverlay.classList.remove('open');

    if (result) {
      toast('success', 'Remix Complete', 'Image transformed successfully.');
      await loadGallery();
    } else {
      toast('error', 'Failed', 'Remix generation failed.');
    }
  } catch (e) {
    state.isGenerating = false;
    if (dom.genOverlay) dom.genOverlay.classList.remove('open');
    toast('error', 'Error', e.message);
  }
}

// ==================== BINDING ====================

function safeBind(id, event, handler) {
  var el = dom[id];
  if (el) el.addEventListener(event, handler);
}

function bindAllEvents() {
  // Setup modal
  safeBind('setupAvatarWrap', 'click', function() { if (dom.setupAvatarFile) dom.setupAvatarFile.click(); });
  safeBind('setupAvatarFile', 'change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      if (dom.setupAvatarPreview) { dom.setupAvatarPreview.src = ev.target.result; dom.setupAvatarPreview.style.display = 'block'; }
      var ph = dom.setupAvatarWrap ? dom.setupAvatarWrap.querySelector('.setup-avatar-ph') : null;
      if (ph) ph.style.display = 'none';
      state.avatarData = ev.target.result;
    };
    r.readAsDataURL(f);
  });
  safeBind('setupEyeToggle', 'click', function() { if (dom.setupApiKey) dom.setupApiKey.type = dom.setupApiKey.type === 'password' ? 'text' : 'password'; });
  safeBind('setupApiKey', 'input', function() { if (dom.setupSaveBtn) dom.setupSaveBtn.disabled = !dom.setupApiKey.value.trim(); });
  safeBind('setupSaveBtn', 'click', function() {
    var key = dom.setupApiKey ? dom.setupApiKey.value.trim() : '';
    if (!key) return;
    dom.setupSaveBtn.disabled = true;
    dom.setupSaveBtn.innerHTML = '<span>Connecting...</span>';
    fetch(API_BASE + '/health', { headers: { 'Authorization': 'Bearer ' + key } }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.status === 'online') {
        state.apiKey = key;
        state.userName = dom.setupName ? dom.setupName.value.trim() : '';
        state.setupComplete = true;
        return Promise.all([
          saveSetting('apiKey', key),
          saveSetting('userName', state.userName),
          state.avatarData ? saveSetting('avatarData', state.avatarData) : Promise.resolve(),
          saveSetting('setupComplete', true)
        ]).then(function() {
          applyProfileUI();
          if (dom.setupModal) dom.setupModal.classList.remove('open');
          return loadGallery();
        }).then(function() {
          toast('success', 'Welcome!', 'Your workspace is ready.');
        });
      } else {
        toast('error', 'Connection Failed', 'Invalid response from API.');
      }
    }).catch(function() {
      toast('error', 'Connection Error', 'Could not reach AquaDevs API.');
    }).finally(function() {
      dom.setupSaveBtn.disabled = false;
      dom.setupSaveBtn.innerHTML = '<span>Get Started</span>';
    });
  });

  // Settings modal
  safeBind('settingsCloseBtn', 'click', function() { if (dom.settingsModal) dom.settingsModal.classList.remove('open'); });
  if (dom.settingsModal) {
    dom.settingsModal.addEventListener('click', function(e) { if (e.target === dom.settingsModal) dom.settingsModal.classList.remove('open'); });
  }
  safeBind('settingsAvatarWrap', 'click', function() { if (dom.settingsAvatarFile) dom.settingsAvatarFile.click(); });
  safeBind('settingsAvatarFile', 'change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) {
      state.avatarData = ev.target.result;
      if (dom.settingsAvatarPreview) { dom.settingsAvatarPreview.src = ev.target.result; dom.settingsAvatarPreview.style.display = 'block'; }
      var sph = dom.settingsAvatarWrap ? dom.settingsAvatarWrap.querySelector('.settings-avatar-ph') : null;
      if (sph) sph.style.display = 'none';
    };
    r.readAsDataURL(f);
  });
  safeBind('settingsEyeToggle', 'click', function() { if (dom.settingsApiKey) dom.settingsApiKey.type = dom.settingsApiKey.type === 'password' ? 'text' : 'password'; });
  safeBind('themeOrange', 'click', function() { state.theme = 'orange'; applyTheme('orange'); });
  safeBind('themeBlue', 'click', function() { state.theme = 'blue'; applyTheme('blue'); });
  safeBind('settingsEnhanceToggle', 'change', function() { if (dom.enhanceSub) dom.enhanceSub.style.display = dom.settingsEnhanceToggle.checked ? '' : 'none'; });
  safeBind('settingsNameToggle', 'change', function() { if (dom.nameSub) dom.nameSub.style.display = dom.settingsNameToggle.checked ? '' : 'none'; });

  var rlBtns = document.querySelectorAll('.rl-btn');
  for (var i = 0; i < rlBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        var all = document.querySelectorAll('.rl-btn');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
        btn.classList.add('active');
        if (dom.settingsRecentLimit) dom.settingsRecentLimit.value = btn.dataset.limit;
      });
    })(rlBtns[i]);
  }

  safeBind('settingsSaveBtn', 'click', function() {
    var key = dom.settingsApiKey ? dom.settingsApiKey.value.trim() : '';
    if (key) state.apiKey = key;
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

    var saves = [
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

    Promise.all(saves).then(function() {
      applyProfileUI();
      applyAnimations(state.animationsEnabled);
      renderGallery();
      updateModelSelect();
      if (dom.settingsModal) dom.settingsModal.classList.remove('open');
      toast('success', 'Settings Saved', 'Your preferences have been updated.');
    });
  });

  // Model management
  safeBind('addCustomModelBtn', 'click', function() { if (dom.addModelForm) dom.addModelForm.style.display = dom.addModelForm.style.display === 'none' ? '' : 'none'; });
  safeBind('cancelAddModel', 'click', function() {
    if (dom.addModelForm) dom.addModelForm.style.display = 'none';
    if (dom.customModelId) dom.customModelId.value = '';
    if (dom.customModelName) dom.customModelName.value = '';
  });
  safeBind('confirmAddModel', 'click', function() {
    var id = dom.customModelId ? dom.customModelId.value.trim() : '';
    if (!id) { toast('error', 'Missing ID', 'Enter a model ID.'); return; }
    state.customModels.push({
      id: id,
      name: dom.customModelName ? (dom.customModelName.value.trim() || id) : id,
      enabled: true,
      refImages: dom.customModelRef ? dom.customModelRef.checked : false,
      polling: dom.customModelPoll ? dom.customModelPoll.checked : false
    });
    if (dom.addModelForm) dom.addModelForm.style.display = 'none';
    if (dom.customModelId) dom.customModelId.value = '';
    if (dom.customModelName) dom.customModelName.value = '';
    renderModelList();
    updateModelSelect();
    toast('success', 'Model Added', id + ' is now available.');
  });

  // PWA install
  safeBind('installBtn', 'click', function() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') {
        toast('success', 'Installed!', 'Kinetic added to home screen.');
        if (dom.installSection) dom.installSection.style.display = 'none';
      }
      deferredInstallPrompt = null;
    });
  });

  // Sidebar
  safeBind('menuToggle', 'click', function() {
    if (dom.sidebar && dom.sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
  });
// ... CONTINUATION — paste starting from dom.sidebarOverlay.addEventListener ...
  if (dom.sidebarOverlay) {
    dom.sidebarOverlay.addEventListener('click', function() {
      closeSidebar();
      if (dom.genPanel && dom.genPanel.classList.contains('open')) closeGenPanel();
      if (dom.remixPanel && dom.remixPanel.classList.contains('open')) closeRemixPanel();
    });
  }

  // Nav items
  var navItems = document.querySelectorAll('.nav-item[data-view]');
  for (var n = 0; n < navItems.length; n++) {
    (function(item) {
      item.addEventListener('click', function() {
        var view = item.dataset.view;
        if (view === 'settings') { openSettings(); return; }
        showView(view);
        closeSidebar();
      });
    })(navItems[n]);
  }

  // Topbar avatar → open settings
  safeBind('topbarAvatar', 'click', function() { openSettings(); });

  // Gallery tabs
  var gTabs = document.querySelectorAll('.g-tab');
  for (var gt = 0; gt < gTabs.length; gt++) {
    (function(tab) {
      tab.addEventListener('click', function() {
        for (var k = 0; k < gTabs.length; k++) gTabs[k].classList.remove('active');
        tab.classList.add('active');
        state.currentFilter = tab.dataset.filter;
        renderGallery();
      });
    })(gTabs[gt]);
  }

  // Search
  safeBind('searchInput', 'input', function() { renderGallery(); });

  // Gallery card clicks (delegation)
  if (dom.galleryGrid) {
    dom.galleryGrid.addEventListener('click', function(e) {
      // Favorite button
      var favBtn = e.target.closest('.gc-fav');
      if (favBtn) { e.stopPropagation(); toggleFavorite(parseInt(favBtn.dataset.fav)); return; }
      // Card → open viewer
      var card = e.target.closest('.gallery-card');
      if (card) openViewer(parseInt(card.dataset.id));
    });
  }

  // Prompt settings
  safeBind('psResetBtn', 'click', function() {
    state.enhancePrompt = DEFAULT_PROMPTS.enhance;
    state.namePrompt = DEFAULT_PROMPTS.name;
    state.remixPrompt = DEFAULT_PROMPTS.remix;
    if (dom.psEnhancePrompt) dom.psEnhancePrompt.value = state.enhancePrompt;
    if (dom.psNamePrompt) dom.psNamePrompt.value = state.namePrompt;
    if (dom.psRemixPrompt) dom.psRemixPrompt.value = state.remixPrompt;
    toast('info', 'Reset', 'All prompts restored to defaults.');
  });

  // Gen panel
  safeBind('panelClose', 'click', function() { closeGenPanel(); });
  safeBind('fabBtn', 'click', function() { openGenPanel(); });

  // Prompt input
  safeBind('promptInput', 'input', function() {
    if (dom.charCount && dom.promptInput) dom.charCount.textContent = dom.promptInput.value.length;
  });

  // Shuffle / random prompt
  safeBind('shuffleBtn', 'click', function() {
    var idx = Math.floor(Math.random() * RANDOM_PROMPTS.length);
    if (dom.promptInput) dom.promptInput.value = RANDOM_PROMPTS[idx];
    if (dom.charCount) dom.charCount.textContent = dom.promptInput.value.length;
    toast('info', 'Random Prompt', 'Shuffled!');
  });

  // Enhance button
  safeBind('enhanceBtn', 'click', function() { enhancePrompt(); });

  // Generate button
  safeBind('generateBtn', 'click', function() { generateImages(); });

  // Reference image — drag & drop
  safeBind('refDrop', 'click', function(e) {
    if (!e.target.closest('.ref-preview')) dom.refFileInput && dom.refFileInput.click();
  });
  safeBind('refDrop', 'dragover', function(e) { e.preventDefault(); dom.refDrop && dom.refDrop.classList.add('dragover'); });
  safeBind('refDrop', 'dragleave', function() { dom.refDrop && dom.refDrop.classList.remove('dragover'); });
  safeBind('refDrop', 'drop', function(e) {
    e.preventDefault();
    dom.refDrop && dom.refDrop.classList.remove('dragover');
    var f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) readRefFile(f);
  });
  safeBind('refFileInput', 'change', function(e) { if (e.target.files[0]) readRefFile(e.target.files[0]); });
  safeBind('refUrlBtn', 'click', function() {
    var url = dom.refUrlInput ? dom.refUrlInput.value.trim() : '';
    if (!url) return;
    loadRefFromUrl(url);
  });
  safeBind('clearRefBtn', 'click', function() {
    state.refImageData = null;
    state.refPreviewUrl = null;
    if (dom.refPreview) { dom.refPreview.src = ''; dom.refPreview.style.display = 'none'; }
    if (dom.refDropInner) dom.refDropInner.style.display = '';
    if (dom.clearRefBtn) dom.clearRefBtn.style.display = 'none';
  });

  // Ratio buttons (gen panel)
  var ratioBtns = document.querySelectorAll('#genPanel .ratio-btn');
  for (var rb = 0; rb < ratioBtns.length; rb++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var x = 0; x < ratioBtns.length; x++) ratioBtns[x].classList.remove('active');
        btn.classList.add('active');
        state.selectedRatio = btn.dataset.ratio;
        if (dom.customRatio) dom.customRatio.style.display = state.selectedRatio === 'custom' ? '' : 'none';
      });
    })(ratioBtns[rb]);
  }
  safeBind('customRatioW', 'input', function() { state.customRatioW = dom.customRatioW.value; });
  safeBind('customRatioH', 'input', function() { state.customRatioH = dom.customRatioH.value; });

  // Style chips
  if (dom.styleChips) {
    dom.styleChips.addEventListener('click', function(e) {
      var chip = e.target.closest('.schip');
      if (!chip) return;
      var chips = dom.styleChips.querySelectorAll('.schip');
      for (var sc = 0; sc < chips.length; sc++) chips[sc].classList.remove('active');
      chip.classList.add('active');
      state.selectedStyle = chip.dataset.style || '';
    });
  }
  safeBind('addStyleBtn', 'click', function() { if (dom.addStyleRow) dom.addStyleRow.style.display = dom.addStyleRow.style.display === 'none' ? '' : 'none'; });
  safeBind('addStyleConfirm', 'click', function() {
    var val = dom.customStyleInput ? dom.customStyleInput.value.trim() : '';
    if (!val) return;
    var newChip = document.createElement('button');
    newChip.className = 'schip';
    newChip.dataset.style = val.toLowerCase();
    newChip.textContent = val;
    newChip.type = 'button';
    if (dom.addStyleBtn) dom.styleChips.insertBefore(newChip, dom.addStyleBtn);
    if (dom.addStyleRow) dom.addStyleRow.style.display = 'none';
    if (dom.customStyleInput) dom.customStyleInput.value = '';
    toast('success', 'Style Added', val);
  });

  // Count buttons (gen panel)
  var countBtns = document.querySelectorAll('#genPanel .cbtn');
  for (var cb = 0; cb < countBtns.length; cb++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var x = 0; x < countBtns.length; x++) countBtns[x].classList.remove('active');
        btn.classList.add('active');
        state.selectedCount = parseInt(btn.dataset.count);
      });
    })(countBtns[cb]);
  }

  // ==================== REMIX PANEL EVENTS ====================

  safeBind('remixPanelClose', 'click', function() { closeRemixPanel(); });

  // Remix source tabs
  var rstabs = document.querySelectorAll('.rstab');
  for (var rs = 0; rs < rstabs.length; rs++) {
    (function(tab) {
      tab.addEventListener('click', function() {
        for (var x = 0; x < rstabs.length; x++) rstabs[x].classList.remove('active');
        tab.classList.add('active');
        state.remixRefSource = tab.dataset.source;
        if (dom.remixGalleryPick) dom.remixGalleryPick.style.display = state.remixRefSource === 'gallery' ? '' : 'none';
        if (dom.remixUploadPick) dom.remixUploadPick.style.display = state.remixRefSource === 'upload' ? '' : 'none';
      });
    })(rstabs[rs]);
  }

  // Remix gallery pick grid (delegation)
  if (dom.remixPickGrid) {
    dom.remixPickGrid.addEventListener('click', function(e) {
      var card = e.target.closest('.gallery-card');
      if (!card) return;
      var id = parseInt(card.dataset.id);
      var img = null;
      for (var i = 0; i < state.images.length; i++) { if (state.images[i].id === id) { img = state.images[i]; break; } }
      if (!img) return;
      state.remixRefImageData = img.url;
      state.remixRefPreviewUrl = img.url;
      showRemixSelected(img.url);
    });
  }

  // Remix upload drag & drop
  safeBind('remixDrop', 'click', function(e) {
    if (!e.target.closest('.ref-preview')) dom.remixFileInput && dom.remixFileInput.click();
  });
  safeBind('remixDrop', 'dragover', function(e) { e.preventDefault(); dom.remixDrop && dom.remixDrop.classList.add('dragover'); });
  safeBind('remixDrop', 'dragleave', function() { dom.remixDrop && dom.remixDrop.classList.remove('dragover'); });
  safeBind('remixDrop', 'drop', function(e) {
    e.preventDefault();
    dom.remixDrop && dom.remixDrop.classList.remove('dragover');
    var f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) readRemixFile(f);
  });
  safeBind('remixFileInput', 'change', function(e) { if (e.target.files[0]) readRemixFile(e.target.files[0]); });

  // Clear remix ref
  safeBind('clearRemixRef', 'click', function() {
    state.remixRefImageData = null;
    state.remixRefPreviewUrl = null;
    if (dom.remixSelected) dom.remixSelected.style.display = 'none';
  });

  // Add custom remix action
  safeBind('addRemixAction', 'click', function() { if (dom.addActionForm) dom.addActionForm.style.display = dom.addActionForm.style.display === 'none' ? '' : 'none'; });
  safeBind('cancelAddAction', 'click', function() {
    if (dom.addActionForm) dom.addActionForm.style.display = 'none';
    if (dom.actionName) dom.actionName.value = '';
    if (dom.actionPrompt) dom.actionPrompt.value = '';
  });
  safeBind('confirmAddAction', 'click', function() {
    var name = dom.actionName ? dom.actionName.value.trim() : '';
    var prompt = dom.actionPrompt ? dom.actionPrompt.value.trim() : '';
    if (!name || !prompt) { toast('warn', 'Missing', 'Name and prompt required.'); return; }
    state.customRemixActions.push({ icon: '\u2699\uFE0F', name: name, prompt: prompt });
    saveSetting('customRemixActions', state.customRemixActions);
    if (dom.addActionForm) dom.addActionForm.style.display = 'none';
    if (dom.actionName) dom.actionName.value = '';
    if (dom.actionPrompt) dom.actionPrompt.value = '';
    populateRemixGrid();
    toast('success', 'Action Added', name);
  });

  // Remix ratio buttons
  var remixRatioBtns = document.querySelectorAll('#remixPanel .ratio-btn');
  for (var rrb = 0; rrb < remixRatioBtns.length; rrb++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var x = 0; x < remixRatioBtns.length; x++) remixRatioBtns[x].classList.remove('active');
        btn.classList.add('active');
        state.remixSelectedRatio = btn.dataset.ratio;
        if (dom.remixCustomRatio) dom.remixCustomRatio.style.display = state.remixSelectedRatio === 'custom' ? '' : 'none';
      });
    })(remixRatioBtns[rrb]);
  }
  safeBind('remixRatioW', 'input', function() { state.remixCustomRatioW = dom.remixRatioW.value; });
  safeBind('remixRatioH', 'input', function() { state.remixCustomRatioH = dom.remixRatioH.value; });

  // Remix count buttons
  var remixCountBtns = document.querySelectorAll('#remixPanel .cbtn');
  for (var rcb = 0; rcb < remixCountBtns.length; rcb++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var x = 0; x < remixCountBtns.length; x++) remixCountBtns[x].classList.remove('active');
        btn.classList.add('active');
        state.remixSelectedCount = parseInt(btn.dataset.count);
      });
    })(remixCountBtns[rcb]);
  }

  // Remix button
  safeBind('remixBtn', 'click', function() { doRemix(); });

  // ==================== IMAGE VIEWER EVENTS ====================

  safeBind('viewerClose', 'click', function() { closeViewer(); });
  if (dom.imageModal) {
    dom.imageModal.addEventListener('click', function(e) { if (e.target === dom.imageModal) closeViewer(); });
  }

  // Fullscreen
  safeBind('viewerFullscreen', 'click', function() {
    if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
    openFullscreen(viewerImages[viewerIndex].url);
  });
  safeBind('fullscreenMinimize', 'click', function() { closeFullscreen(); });

  // Viewer download
  safeBind('viewerDownload', 'click', function() {
    if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
    var img = viewerImages[viewerIndex];
    var a = document.createElement('a');
    a.href = img.url;
    a.download = (img.name || 'kinetic-image') + '.png';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  });

  // Viewer favorite
  safeBind('viewerFav', 'click', function() {
    if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
    toggleFavorite(viewerImages[viewerIndex].id);
    // Re-find in updated array
    for (var i = 0; i < viewerImages.length; i++) {
      for (var j = 0; j < state.images.length; j++) {
        if (state.images[j].id === viewerImages[i].id) { viewerImages[i] = state.images[j]; break; }
      }
    }
    updateViewer();
  });

  // Viewer copy prompt
  safeBind('viewerCopy', 'click', function() {
    if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
    copyText(viewerImages[viewerIndex].prompt || '');
    toast('success', 'Copied', 'Prompt copied to clipboard.');
  });

  // Viewer delete
  safeBind('viewerDelete', 'click', function() {
    if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
    deleteImage(viewerImages[viewerIndex].id);
  });

  // Viewer remix
  safeBind('viewerRemix', 'click', function() {
    if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
    var img = viewerImages[viewerIndex];
    state.remixRefImageData = img.url;
    state.remixRefPreviewUrl = img.url;
    state.remixRefSource = 'gallery';
    showRemixSelected(img.url);
    closeViewer();
    openRemixPanel();
  });

  // Viewer compare
  safeBind('viewerCompare', 'click', function() {
    if (viewerIndex < 0 || viewerIndex >= viewerImages.length) return;
    var img = viewerImages[viewerIndex];
    if (!img.inputImageUrl) return;
    if (dom.compareInput) dom.compareInput.src = img.inputImageUrl;
    if (dom.compareOutput) dom.compareOutput.src = img.url;
    if (dom.compareWrap) dom.compareWrap.style.display = '';
  });
  safeBind('compareClose', 'click', function() {
    if (dom.compareWrap) dom.compareWrap.style.display = 'none';
  });

  // Compare slider drag
  if (dom.compareSlider) {
    var compareDragging = false;
    dom.compareSlider.addEventListener('mousedown', function() { compareDragging = true; });
    dom.compareSlider.addEventListener('touchstart', function() { compareDragging = true; });
    document.addEventListener('mousemove', moveCompare);
    document.addEventListener('touchmove', moveCompare);
    document.addEventListener('mouseup', function() { compareDragging = false; });
    document.addEventListener('touchend', function() { compareDragging = false; });

    function moveCompare(e) {
      if (!compareDragging || !dom.compareContainer) return;
      var rect = dom.compareContainer.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      dom.compareSlider.style.left = pct + '%';
      if (dom.compareOutput) dom.compareOutput.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
    }
  }

  // Spotlight swipe (mobile-friendly viewer navigation)
  if (dom.spotlight) {
    var spotStartX = 0;
    dom.spotlight.addEventListener('touchstart', function(e) { spotStartX = e.touches[0].clientX; });
    dom.spotlight.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - spotStartX;
      if (Math.abs(dx) < 50) return;
      if (dx < 0 && viewerIndex < viewerImages.length - 1) { viewerIndex++; updateViewer(); }
      else if (dx > 0 && viewerIndex > 0) { viewerIndex--; updateViewer(); }
    });
  }

  // ==================== IMAGE PICKER MODAL ====================

  safeBind('pickerClose', 'click', function() { if (dom.imagePickerModal) dom.imagePickerModal.classList.remove('open'); });
  safeBind('pickerSearch', 'input', function() { populatePickerGrid(); });

  // ==================== INSTALL SECTION VISIBILITY ====================

  if (dom.installSection) {
    // Show if we have deferred prompt (handled by beforeinstallprompt above)
    // On iOS, show manually
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
      dom.installSection.style.display = '';
      var installBtn = dom.installBtn;
      if (installBtn) installBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Add to Home Screen';
    }
  }

  // ==================== KEYBOARD SHORTCUTS ====================

  document.addEventListener('keydown', function(e) {
    // Escape closes modals/panels
    if (e.key === 'Escape') {
      if (dom.fullscreenView && dom.fullscreenView.classList.contains('open')) { closeFullscreen(); return; }
      if (dom.imageModal && dom.imageModal.classList.contains('open')) { closeViewer(); return; }
      if (dom.settingsModal && dom.settingsModal.classList.contains('open')) { dom.settingsModal.classList.remove('open'); return; }
      if (dom.imagePickerModal && dom.imagePickerModal.classList.contains('open')) { dom.imagePickerModal.classList.remove('open'); return; }
      if (dom.genPanel && dom.genPanel.classList.contains('open')) { closeGenPanel(); return; }
      if (dom.remixPanel && dom.remixPanel.classList.contains('open')) { closeRemixPanel(); return; }
      if (dom.sidebar && dom.sidebar.classList.contains('open')) { closeSidebar(); return; }
    }
    // Enter in prompt → generate (if not multiline)
    if (e.key === 'Enter' && !e.shiftKey && document.activeElement === dom.promptInput) {
      e.preventDefault();
      generateImages();
    }
  });
}

// ==================== REF IMAGE HELPERS ====================

function readRefFile(file) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var result = ev.target.result;
    state.refImageData = result;
    state.refPreviewUrl = result;
    if (dom.refPreview) { dom.refPreview.src = result; dom.refPreview.style.display = ''; }
    if (dom.refDropInner) dom.refDropInner.style.display = 'none';
    if (dom.clearRefBtn) dom.clearRefBtn.style.display = '';
  };
  reader.readAsDataURL(file);
}

function loadRefFromUrl(url) {
  // Test if URL loads
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    state.refImageData = url;
    state.refPreviewUrl = url;
    if (dom.refPreview) { dom.refPreview.src = url; dom.refPreview.style.display = ''; }
    if (dom.refDropInner) dom.refDropInner.style.display = 'none';
    if (dom.clearRefBtn) dom.clearRefBtn.style.display = '';
    toast('success', 'Loaded', 'Reference image loaded from URL.');
  };
  img.onerror = function() { toast('error', 'Failed', 'Could not load image from URL.'); };
  img.src = url;
}

function readRemixFile(file) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var result = ev.target.result;
    state.remixRefImageData = result;
    state.remixRefPreviewUrl = result;
    showRemixSelected(result);
  };
  reader.readAsDataURL(file);
}

function showRemixSelected(url) {
  if (dom.remixSelectedImg) dom.remixSelectedImg.src = url;
  if (dom.remixSelected) dom.remixSelected.style.display = '';
  if (dom.remixGalleryPick) dom.remixGalleryPick.style.display = 'none';
  if (dom.remixUploadPick) dom.remixUploadPick.style.display = 'none';
}

// ==================== PICKER MODAL ====================

function openPicker(callback) {
  pickerCallback = callback;
  populatePickerGrid();
  if (dom.imagePickerModal) dom.imagePickerModal.classList.add('open');
}

var pickerCallback = null;

function populatePickerGrid() {
  if (!dom.pickerGrid) return;
  var q = dom.pickerSearch ? dom.pickerSearch.value.toLowerCase() : '';
  var imgs = state.images;
  if (q) {
    imgs = imgs.filter(function(i) {
      return (i.prompt && i.prompt.toLowerCase().indexOf(q) !== -1) || (i.model && i.model.toLowerCase().indexOf(q) !== -1);
    });
  }
  var html = '';
  for (var i = 0; i < Math.min(imgs.length, 50); i++) {
    html += '<div class="picker-card" data-id="' + imgs[i].id + '"><img src="' + esc(imgs[i].url) + '" alt="" loading="lazy"></div>';
  }
  dom.pickerGrid.innerHTML = html;
  dom.pickerGrid.onclick = function(e) {
    var card = e.target.closest('.picker-card');
    if (!card) return;
    var id = parseInt(card.dataset.id);
    if (pickerCallback) pickerCallback(id);
    if (dom.imagePickerModal) dom.imagePickerModal.classList.remove('open');
    pickerCallback = null;
  };
}

// ==================== INIT ====================

async function init() {
  cacheDom();

  try { await openDB(); } catch (e) { toast('error', 'Database Error', e.message); return; }

  await loadSettings();
  applyProfileUI();
  createCustomSelects();
  bindAllEvents();
  state.ready = true;

  if (state.setupComplete && state.apiKey) {
    await loadGallery();
    toast('info', 'Welcome' + (state.userName ? ', ' + state.userName : '') + '!', 'Ready to create.');
  }
}

// ==================== BOOT ====================

document.addEventListener('DOMContentLoaded', function() { init(); });