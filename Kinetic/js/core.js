/* ============================================================
   KINETIC — CORE MODULE (Diagnostic + Full)
   ============================================================ */

// ==================== DIAGNOSTIC BANNER ====================
console.log('[Kinetic] core.js loaded — ' + new Date().toLocaleTimeString());

function showDiag(msg, type) {
  var el = document.getElementById('kineticDiag');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kineticDiag';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px 16px;font:13px/1.4 monospace;white-space:pre-wrap;max-height:45vh;overflow:auto;pointer-events:auto;';
    document.body.appendChild(el);
  }
  var color = type === 'error' ? '#1a0000' : type === 'warn' ? '#1a1400' : '#001a00';
  var border = type === 'error' ? '#ff4444' : type === 'warn' ? '#ffaa00' : '#44ff44';
  el.style.background = color;
  el.style.borderBottom = '2px solid ' + border;
  el.innerHTML += '<div style="color:' + border + ';margin-bottom:2px;">[' + new Date().toLocaleTimeString() + '] ' + msg + '</div>';
}

// ==================== CONSTANTS ====================

var DB_NAME = 'KineticDB';
var DB_VERSION = 3;

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
  var missing = [];
  for (var i = 0; i < DOM_IDS.length; i++) {
    var el = document.getElementById(DOM_IDS[i]);
    dom[DOM_IDS[i]] = el;
    if (!el) missing.push(DOM_IDS[i]);
  }
  if (missing.length) {
    showDiag('MISSING DOM ELEMENTS:\n' + missing.join(', '), 'error');
    console.warn('[Kinetic] Missing DOM elements:', missing.join(', '));
  } else {
    showDiag('All ' + DOM_IDS.length + ' DOM elements found.', 'ok');
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
    req.onerror = function(e) { console.error('[Kinetic] IndexedDB error:', e.target.error); reject(e.target.error); };
  });
}

function dbGet(store, key) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not initialized'));
    var tx = db.transaction(store, 'readonly');
    var req = tx.objectStore(store).get(key);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbPut(store, data) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not initialized'));
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).put(data);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbRemove(store, key) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not initialized'));
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).delete(key);
    req.onsuccess = function() { resolve(); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbGetAll(store) {
  return new Promise(function(resolve, reject) {
    if (!db) return reject(new Error('DB not initialized'));
    var tx = db.transaction(store, 'readonly');
    var req = tx.objectStore(store).getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

// ==================== CUSTOM SELECT ====================

var selectInstances = [];

function KineticSelect(wrapEl, options, onChange) {
  this._disabled = true;
  if (!wrapEl) {
    showDiag('KineticSelect: wrapper is null', 'warn');
    return;
  }
  this._disabled = false;
  this.wrap = wrapEl;
  this.options = options || [];
  this.value = '';
  if (this.options.length) this.value = this.options[0].value;
  this.onChange = onChange || function() {};
  this.isOpen = false;
  this.el = null;
  this.dropdown = null;
  this.searchInput = null;
  this.labelEl = null;
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
    optHtml += '<div class="cselect-option' + cls + '" data-value="' + esc(o.value) + '">';
    optHtml += '<span>' + esc(o.label) + '</span>';
    if (o.description) optHtml += '<span class="cselect-option-desc">' + esc(o.description) + '</span>';
    optHtml += '</div>';
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
    if (self.isOpen) self.close(); else self.open();
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
  if (!db) {
    showDiag('DB not available, using defaults', 'warn');
    return Promise.resolve();
  }
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
      if (dom.setupModal) { dom.setupModal.classList.add('open'); showDiag('Setup modal OPEN — need API key', 'warn'); }
    } else {
      if (dom.setupModal) dom.setupModal.classList.remove('open');
      showDiag('Settings loaded. API key found. Setup complete: ' + state.setupComplete, 'ok');
    }
  }).catch(function(err) {
    showDiag('loadSettings error: ' + err.message, 'error');
  });
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

// ==================== PWA INSTALL ====================

var deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (dom.installSection) dom.installSection.style.display = '';
});

// ==================== NAVIGATION & SIDEBAR ====================

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
  showDiag('openGenPanel called', 'ok');
  if (!dom.genPanel) { showDiag('ERROR: #genPanel not found!', 'error'); return; }
  if (!dom.remixPanel) { showDiag('ERROR: #remixPanel not found!', 'error'); return; }
  if (!dom.sidebarOverlay) { showDiag('ERROR: #sidebarOverlay not found!', 'error'); return; }
  dom.genPanel.classList.add('open');
  dom.remixPanel.classList.remove('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '750';
  closeSidebar();
  showDiag('Gen panel should now be visible', 'ok');
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
  if (typeof initRemixPanel === 'function') initRemixPanel();
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

// ==================== IMAGE MODEL LIST ====================

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
    if (cm.refImages) html += '<span class="model-badge">ref</span>';
    if (cm.polling) html += '<span class="model-badge">poll</span>';
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

// ==================== SAFE BIND ====================

function safeBind(id, event, handler) {
  var el = dom[id];
  if (el) {
    el.addEventListener(event, handler);
  } else {
    showDiag('safeBind SKIP: #' + id + ' not found (for ' + event + ')', 'warn');
  }
}

// ==================== BIND CORE EVENTS ====================

function bindCoreEvents() {
  showDiag('bindCoreEvents starting...', 'ok');

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
  safeBind('setupEyeToggle', 'click', function() {
    if (dom.setupApiKey) dom.setupApiKey.type = dom.setupApiKey.type === 'password' ? 'text' : 'password';
  });
  safeBind('setupApiKey', 'input', function() {
    if (dom.setupSaveBtn) dom.setupSaveBtn.disabled = !dom.setupApiKey.value.trim();
  });
  safeBind('setupSaveBtn', 'click', function() {
    var key = dom.setupApiKey ? dom.setupApiKey.value.trim() : '';
    if (!key) return;
    dom.setupSaveBtn.disabled = true;
    dom.setupSaveBtn.innerHTML = '<span>Connecting...</span>';

    fetch('https://api.aquadevs.com/health', { headers: { 'Authorization': 'Bearer ' + key } }).then(function(res) {
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
          if (typeof loadGallery === 'function') return loadGallery();
        }).then(function() {
          toast('success', 'Welcome!', 'Your workspace is ready.');
          showDiag('Setup complete! API key saved.', 'ok');
        });
      } else {
        toast('error', 'Connection Failed', 'Invalid response from API.');
      }
    }).catch(function(err) {
      toast('error', 'Connection Error', 'Could not reach AquaDevs API.');
      showDiag('Setup error: ' + err.message, 'error');
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
  safeBind('settingsEyeToggle', 'click', function() {
    if (dom.settingsApiKey) dom.settingsApiKey.type = dom.settingsApiKey.type === 'password' ? 'text' : 'password';
  });
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

  // Settings save
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
      if (typeof renderGallery === 'function') renderGallery();
      if (typeof updateModelSelect === 'function') updateModelSelect();
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
    if (dom.customModelRef) dom.customModelRef.checked = false;
    if (dom.customModelPoll) dom.customModelPoll.checked = false;
  });
  safeBind('confirmAddModel', 'click', function() {
    var id = dom.customModelId ? dom.customModelId.value.trim() : '';
    if (!id) { toast('error', 'Missing ID', 'Please enter a model ID.'); return; }
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
    if (dom.customModelRef) dom.customModelRef.checked = false;
    if (dom.customModelPoll) dom.customModelPoll.checked = false;
    renderModelList();
    toast('success', 'Model Added', id + ' is now available.');
  });

  // PWA install
  safeBind('installBtn', 'click', function() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') {
        toast('success', 'Installed!', 'Kinetic has been added to your home screen.');
        if (dom.installSection) dom.installSection.style.display = 'none';
      }
      deferredInstallPrompt = null;
    });
  });

  // Sidebar
  safeBind('menuToggle', 'click', function() {
    if (dom.sidebar && dom.sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
  });
  if (dom.sidebarOverlay) {
    dom.sidebarOverlay.addEventListener('click', function() {
      closeSidebar();
      if (dom.genPanel && dom.genPanel.classList.contains('open')) closeGenPanel();
      if (dom.remixPanel && dom.remixPanel.classList.contains('open')) closeRemixPanel();
    });
  }

  // Navigation
  var navItems = document.querySelectorAll('.nav-item');
  for (var n = 0; n < navItems.length; n++) {
    (function(item) {
      item.addEventListener('click', function() {
        var v = item.dataset.view;
        if (v === 'settings') { openSettings(); return; }
        showView(v);
        closeSidebar();
      });
    })(navItems[n]);
  }

  // FAB + panel close
  safeBind('fabBtn', 'click', function() {
    showDiag('FAB clicked!', 'ok');
    openGenPanel();
  });
  safeBind('panelClose', 'click', closeGenPanel);
  safeBind('remixPanelClose', 'click', closeRemixPanel);

  // Topbar avatar
  safeBind('topbarAvatar', 'click', openSettings);

  // Prompt settings
  safeBind('psResetBtn', 'click', function() {
    if (dom.psEnhancePrompt) dom.psEnhancePrompt.value = DEFAULT_PROMPTS.enhance;
    if (dom.psNamePrompt) dom.psNamePrompt.value = DEFAULT_PROMPTS.name;
    if (dom.psRemixPrompt) dom.psRemixPrompt.value = DEFAULT_PROMPTS.remix;
    state.enhancePrompt = DEFAULT_PROMPTS.enhance;
    state.namePrompt = DEFAULT_PROMPTS.name;
    state.remixPrompt = DEFAULT_PROMPTS.remix;
    saveSetting('enhancePrompt', state.enhancePrompt);
    saveSetting('namePrompt', state.namePrompt);
    saveSetting('remixPrompt', state.remixPrompt);
    toast('success', 'Reset', 'Prompts restored to defaults.');
  });
  safeBind('psEnhancePrompt', 'change', function() { state.enhancePrompt = dom.psEnhancePrompt.value; saveSetting('enhancePrompt', state.enhancePrompt); });
  safeBind('psNamePrompt', 'change', function() { state.namePrompt = dom.psNamePrompt.value; saveSetting('namePrompt', state.namePrompt); });
  safeBind('psRemixPrompt', 'change', function() { state.remixPrompt = dom.psRemixPrompt.value; saveSetting('remixPrompt', state.remixPrompt); });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (dom.fullscreenView && dom.fullscreenView.classList.contains('open')) closeFullscreen();
      else if (dom.imageModal && dom.imageModal.classList.contains('open')) closeViewer();
      else if (dom.imagePickerModal && dom.imagePickerModal.classList.contains('open')) dom.imagePickerModal.classList.remove('open');
      else if (dom.settingsModal && dom.settingsModal.classList.contains('open')) dom.settingsModal.classList.remove('open');
      else if (dom.genPanel && dom.genPanel.classList.contains('open')) closeGenPanel();
      else if (dom.remixPanel && dom.remixPanel.classList.contains('open')) closeRemixPanel();
    }
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      openGenPanel();
      if (dom.promptInput) setTimeout(function() { dom.promptInput.focus(); }, 100);
    }
  });

  showDiag('bindCoreEvents DONE', 'ok');
}

// ==================== INIT ====================

var defaultModelSelect, enhanceModelSelect, nameModelSelect, remixModelSelect;

function init() {
  showDiag('init() starting...', 'ok');
  cacheDom();

  openDB().then(function() {
    showDiag('IndexedDB opened', 'ok');
    return loadSettings();
  }).then(function() {
    showDiag('Settings loaded', 'ok');

    // Safe custom selects for settings modal
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

    showDiag('Custom selects created', 'ok');

    bindCoreEvents();
    applyProfileUI();

    showDiag('Core events bound. Setup=' + state.setupComplete + ' Key=' + (state.apiKey ? 'YES' : 'NO'), 'ok');

    // Initialize gallery AFTER settings are loaded
    if (state.setupComplete && state.apiKey && typeof loadGallery === 'function') {
      showDiag('Loading gallery...', 'ok');
      return loadGallery().then(function() {
        showDiag('Gallery loaded. ' + state.images.length + ' images.', 'ok');
      });
    }
  }).then(function() {
    state.ready = true;
    document.dispatchEvent(new Event('kinetic:ready'));
    showDiag('INIT COMPLETE — App is ready!', 'ok');
    setTimeout(function() {
      var diag = document.getElementById('kineticDiag');
      if (diag) { diag.style.transition = 'opacity 1s'; diag.style.opacity = '0'; setTimeout(function() { diag.remove(); }, 1200); }
    }, 8000);
  }).catch(function(err) {
    showDiag('INIT ERROR: ' + err.message, 'error');
    console.error('[Kinetic] Init error:', err);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  showDiag('DOMContentLoaded fired', 'ok');
  setTimeout(init, 0);
});