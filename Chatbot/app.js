/* =====================================================
   AQUADEVS STUDIO — APP LOGIC v3
   ===================================================== */

// ==================== CONSTANTS ====================

var DB_NAME = 'AquaDevsStudio';
var DB_VERSION = 2;

var REF_IMAGE_MODELS = [
  'gptimage-2', 'gptimage-1.5', 'flux-2',
  'qwen-image', 'nanobanana', 'nanobanana-pro'
];

var POLLING_MODELS = ['imagen4', 'nanobanana', 'nanobanana-pro'];

var RANDOM_PROMPTS = [
  "A majestic dragon perched atop a crystal mountain at sunset, scales reflecting prismatic light, fantasy concept art, highly detailed",
  "Futuristic cyberpunk city at night, neon holographic billboards, flying vehicles, rainy streets reflecting colorful lights, cinematic wide shot",
  "A serene Japanese zen garden in autumn, golden ginkgo leaves falling gently, koi pond reflecting maple trees, watercolor painting style",
  "An astronaut discovering a bioluminescent alien garden on a distant planet, volumetric fog, sci-fi concept art, dramatic lighting",
  "A cozy enchanted cottage deep in a mossy forest, fireflies dancing, warm amber light glowing from arched windows, storybook illustration",
  "Underwater ancient temple covered in coral and sea life, god rays piercing through turquoise water, photorealistic, 8K detail",
  "A steampunk mechanical owl with intricate brass gears and copper feathers, perched on a stack of antique leather-bound books, 3D render",
  "A rift between two dimensions splitting a scene — one side modern cityscape, the other mystical forest with floating islands",
  "A celestial goddess composed of stars and nebulae, flowing cosmic dress made of galaxies, planets orbiting around her, digital painting",
  "A lone samurai standing in a vast field of red spider lilies, wind billowing through his cloak, cinematic composition, golden hour lighting",
  "An ancient library floating in the void of space, books orbiting like planets, magical dust particles swirling, ethereal atmosphere",
  "Miniature terrarium world on a scientist's desk, tiny mountains and rivers inside a glass dome, tilt-shift photography style",
  "A glowing crystal cave deep underground, formations reflecting rainbow light, underground lake with perfect mirror reflections, fantasy art",
  "A massive whale swimming through clouds above a Victorian city, airships nearby, people looking up in wonder, Studio Ghibli inspired",
  "Photorealistic close-up of a chameleon on a tropical branch, incredible skin detail, bokeh background, macro photography, National Geographic style"
];

// ==================== STATE ====================

var state = {
  apiKey: null,
  userName: '',
  avatarData: null,
  setupComplete: false,
  theme: 'orange',
  defaultModel: 'gptimage-2',
  enhanceEnabled: false,
  enhanceModel: 'gpt-5.4-mini',
  enhanceManual: false,       // NEW
  enhanceWebSearch: false,    // NEW
  nameEnabled: false,
  nameModel: 'gpt-5.4-mini',
  parallelGeneration: false,  // NEW
  images: [],
  currentFilter: 'all',
  selectedModel: 'gptimage-2',
  selectedRatio: 'square',
  selectedStyle: '',
  selectedCount: 1,
  refImageData: null,
  refPreviewUrl: null,
  isGenerating: false,
  genMinimized: false,        // NEW
  genStartTime: 0,            // NEW
  genElapsedTimer: null       // NEW
};

var blobUrlCache = {};

// ==================== DOM REFS ====================

var $ = function(id) { return document.getElementById(id); };

var dom = {
  setupModal: $('setupModal'),
  setupAvatarWrap: $('setupAvatarWrap'),
  setupAvatarPreview: $('setupAvatarPreview'),
  setupAvatarFile: $('setupAvatarFile'),
  setupName: $('setupName'),
  setupApiKey: $('setupApiKey'),
  setupEyeToggle: $('setupEyeToggle'),
  setupSaveBtn: $('setupSaveBtn'),
  settingsModal: $('settingsModal'),
  settingsCloseBtn: $('settingsCloseBtn'),
  settingsAvatarWrap: $('settingsAvatarWrap'),
  settingsAvatarPreview: $('settingsAvatarPreview'),
  settingsAvatarFile: $('settingsAvatarFile'),
  settingsName: $('settingsName'),
  settingsApiKey: $('settingsApiKey'),
  settingsEyeToggle: $('settingsEyeToggle'),
  settingsDefaultModel: $('settingsDefaultModel'),
  settingsEnhanceToggle: $('settingsEnhanceToggle'),
  settingsEnhanceModel: $('settingsEnhanceModel'),
  // NEW
  settingsEnhanceManual: $('settingsEnhanceManual'),
  settingsEnhanceWeb: $('settingsEnhanceWeb'),
  settingsNameToggle: $('settingsNameToggle'),
  settingsNameModel: $('settingsNameModel'),
  // NEW
  settingsParallel: $('settingsParallel'),
  themeOrange: $('themeOrange'),
  themeBlue: $('themeBlue'),
  settingsSaveBtn: $('settingsSaveBtn'),
  genOverlay: $('genOverlay'),
  genPromptText: $('genPromptText'),
  genBarFill: $('genBarFill'),
  genStatusText: $('genStatusText'),
  genCurrentCount: $('genCurrentCount'),
  genTotalCount: $('genTotalCount'),
  // NEW
  genSlots: $('genSlots'),
  genMinimizeBtn: $('genMinimizeBtn'),
  genMini: $('genMini'),
  genMiniText: $('genMiniText'),
  genMiniTime: $('genMiniTime'),
  genMiniShow: $('genMiniShow'),
  sidebar: $('sidebar'),
  sidebarOverlay: $('sidebarOverlay'),
  sidebarSettingsBtn: $('sidebarSettingsBtn'),
  menuToggle: $('menuToggle'),
  searchInput: $('searchInput'),
  galleryArea: $('galleryArea'),
  galleryGrid: $('galleryGrid'),
  emptyState: $('emptyState'),
  panel: $('panel'),
  panelClose: $('panelClose'),
  promptInput: $('promptInput'),
  charCount: $('charCount'),
  shuffleBtn: $('shuffleBtn'),
  refSection: $('refSection'),
  refDrop: $('refDrop'),
  refDropInner: $('refDropInner'),
  refPreview: $('refPreview'),
  refFileInput: $('refFileInput'),
  refUrlInput: $('refUrlInput'),
  refUrlBtn: $('refUrlBtn'),
  clearRefBtn: $('clearRefBtn'),
  modelSelect: $('modelSelect'),
  styleChips: $('styleChips'),
  addStyleBtn: $('addStyleBtn'),
  addStyleRow: $('addStyleRow'),
  customStyleInput: $('customStyleInput'),
  addStyleConfirm: $('addStyleConfirm'),
  // NEW
  customRatioWrap: $('customRatioWrap'),
  customRatioInput: $('customRatioInput'),
  customRatioApply: $('customRatioApply'),
  customRatioBtn: $('customRatioBtn'),
  // NEW
  enhanceSection: $('enhanceSection'),
  enhanceBtn: $('enhanceBtn'),
  generateBtn: $('generateBtn'),
  imageModal: $('imageModal'),
  viewerImg: $('viewerImg'),
  viewerPrompt: $('viewerPrompt'),
  viewerMeta: $('viewerMeta'),
  viewerClose: $('viewerClose'),
  viewerDownload: $('viewerDownload'),
  viewerCopy: $('viewerCopy'),
  viewerFav: $('viewerFav'),
  viewerDelete: $('viewerDelete'),
  fabBtn: $('fabBtn'),
  topbarAvatar: $('topbarAvatar'),
  topbarAvatarLetter: $('topbarAvatarLetter'),
  toastWrap: $('toastWrap'),
  tabAll: $('tabAll'),
  tabRecent: $('tabRecent'),
  tabFav: $('tabFav'),
  imageCount: $('imageCount')
};

var currentViewerImage = null;
var db = null;

// ==================== INDEXEDDB ====================

function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      var database = e.target.result;
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains('gallery')) {
        var store = database.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = function(e) { db = e.target.result; resolve(db); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function dbGet(store, key) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(store, 'readonly');
    var req = tx.objectStore(store).get(key);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbPut(store, data) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).put(data);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbRemove(store, key) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).delete(key);
    req.onsuccess = function() { resolve(); };
    req.onerror = function() { reject(req.error); };
  });
}

function dbGetAll(store) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(store, 'readonly');
    var req = tx.objectStore(store).getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

// ==================== IMAGE BLOB STORAGE (NEW) ====================

async function fetchAndStoreBlob(imageUrl) {
  try {
    var res = await fetch(imageUrl);
    if (!res.ok) throw new Error('Fetch failed');
    return await res.blob();
  } catch (e) {
    console.warn('Could not fetch image blob:', e);
    return null;
  }
}

function getDisplayUrl(img) {
  if (blobUrlCache[img.id]) return blobUrlCache[img.id];
  if (img.blob) {
    var url = URL.createObjectURL(img.blob);
    blobUrlCache[img.id] = url;
    return url;
  }
  return img.url;
}

function revokeAllBlobUrls() {
  Object.keys(blobUrlCache).forEach(function(key) {
    URL.revokeObjectURL(blobUrlCache[key]);
    delete blobUrlCache[key];
  });
}

// ==================== SETTINGS ====================

async function loadSettings() {
  try {
    var rows = await dbGetAll('settings');
    var map = {};
    rows.forEach(function(r) { map[r.key] = r.value; });

    state.setupComplete = !!map.setupComplete;
    state.apiKey = map.apiKey || null;
    state.userName = map.userName || '';
    state.avatarData = map.avatarData || null;
    state.theme = map.theme || 'orange';
    state.defaultModel = map.defaultModel || 'gptimage-2';
    state.enhanceEnabled = !!map.enhanceEnabled;
    state.enhanceModel = map.enhanceModel || 'gpt-5.4-mini';
    state.enhanceManual = !!map.enhanceManual;       // NEW
    state.enhanceWebSearch = !!map.enhanceWebSearch; // NEW
    state.nameEnabled = !!map.nameEnabled;
    state.nameModel = map.nameModel || 'gpt-5.4-mini';
    state.parallelGeneration = !!map.parallelGeneration; // NEW

    applyTheme(state.theme);
    applyProfileUI();
    updateEnhanceButton();  // NEW

    if (!state.setupComplete || !state.apiKey) {
      showSetupModal();
    } else {
      hideSetupModal();
      await loadGallery();
    }
  } catch (err) {
    console.error('loadSettings error:', err);
    showSetupModal();
  }
}

async function saveSetting(key, value) {
  await dbPut('settings', { key: key, value: value });
  state[key] = value;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeOrange.classList.toggle('active', theme === 'orange');
  dom.themeBlue.classList.toggle('active', theme === 'blue');
}

function applyProfileUI() {
  if (state.avatarData) {
    dom.setupAvatarPreview.src = state.avatarData;
    dom.setupAvatarPreview.style.display = 'block';
    var ph = dom.setupAvatarWrap.querySelector('.setup-avatar-placeholder');
    if (ph) ph.style.display = 'none';

    dom.settingsAvatarPreview.src = state.avatarData;
    dom.settingsAvatarPreview.style.display = 'block';
    var sph = dom.settingsAvatarWrap.querySelector('.settings-avatar-ph');
    if (sph) sph.style.display = 'none';
  }

  if (state.avatarData) {
    dom.topbarAvatar.innerHTML = '<img src="' + state.avatarData + '" alt="">';
  } else if (state.userName) {
    dom.topbarAvatarLetter.textContent = state.userName.charAt(0).toUpperCase();
  }

  dom.settingsName.value = state.userName;
  dom.settingsApiKey.value = state.apiKey || '';
  dom.settingsDefaultModel.value = state.defaultModel;
  dom.settingsEnhanceToggle.checked = state.enhanceEnabled;
  dom.settingsEnhanceModel.value = state.enhanceModel;
  // NEW
  dom.settingsEnhanceManual.checked = state.enhanceManual;
  dom.settingsEnhanceWeb.checked = state.enhanceWebSearch;
  dom.settingsNameToggle.checked = state.nameEnabled;
  dom.settingsNameModel.value = state.nameModel;
  // NEW
  dom.settingsParallel.checked = state.parallelGeneration;
}

// NEW: Show/hide the Enhance button based on manual mode
function updateEnhanceButton() {
  if (dom.enhanceSection) {
    dom.enhanceSection.style.display = (state.enhanceEnabled && state.enhanceManual) ? 'block' : 'none';
  }
}

// ==================== MODALS ====================

function showSetupModal() { dom.setupModal.classList.add('open'); }
function hideSetupModal() { dom.setupModal.classList.remove('open'); }

function openSettings() {
  dom.settingsApiKey.value = state.apiKey || '';
  dom.settingsName.value = state.userName;
  dom.settingsDefaultModel.value = state.defaultModel;
  dom.settingsEnhanceToggle.checked = state.enhanceEnabled;
  dom.settingsEnhanceModel.value = state.enhanceModel;
  dom.settingsEnhanceManual.checked = state.enhanceManual;
  dom.settingsEnhanceWeb.checked = state.enhanceWebSearch;
  dom.settingsNameToggle.checked = state.nameEnabled;
  dom.settingsNameModel.value = state.nameModel;
  dom.settingsParallel.checked = state.parallelGeneration;
  dom.settingsModal.classList.add('open');
}

function closeSettings() { dom.settingsModal.classList.remove('open'); }

function openPanel() {
  dom.panel.classList.add('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '750';
}

function closePanel() {
  dom.panel.classList.remove('open');
  if (!dom.sidebar.classList.contains('open')) {
    dom.sidebarOverlay.classList.remove('active');
    dom.sidebarOverlay.style.zIndex = '';
  }
}

function openSidebar() {
  dom.sidebar.classList.add('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '499';
}

function closeSidebar() {
  dom.sidebar.classList.remove('open');
  if (!dom.panel.classList.contains('open')) {
    dom.sidebarOverlay.classList.remove('active');
    dom.sidebarOverlay.style.zIndex = '';
  }
}

// ==================== GALLERY ====================

async function loadGallery() {
  try {
    state.images = await dbGetAll('gallery');
    state.images.sort(function(a, b) { return b.timestamp - a.timestamp; });
    renderGallery();
  } catch (err) {
    console.error('loadGallery error:', err);
  }
}

function renderGallery() {
  var search = dom.searchInput.value.toLowerCase().trim();
  var filtered = state.images.slice();

  if (state.currentFilter === 'favorites') {
    filtered = filtered.filter(function(i) { return i.favorite; });
  } else if (state.currentFilter === 'recent') {
    var day = Date.now() - 86400000;
    filtered = filtered.filter(function(i) { return i.timestamp > day; });
  }

  if (search) {
    filtered = filtered.filter(function(i) {
      return (i.prompt || '').toLowerCase().indexOf(search) !== -1 ||
             (i.name || '').toLowerCase().indexOf(search) !== -1 ||
             (i.model || '').toLowerCase().indexOf(search) !== -1;
    });
  }

  var total = state.images.length;
  var recent = state.images.filter(function(i) { return i.timestamp > Date.now() - 86400000; }).length;
  var favs = state.images.filter(function(i) { return i.favorite; }).length;

  dom.tabAll.textContent = total ? '(' + total + ')' : '';
  dom.tabRecent.textContent = recent ? '(' + recent + ')' : '';
  dom.tabFav.textContent = favs ? '(' + favs + ')' : '';
  dom.imageCount.textContent = total || '0';

  if (filtered.length === 0) {
    dom.emptyState.style.display = 'flex';
    dom.galleryGrid.innerHTML = '';
  } else {
    dom.emptyState.style.display = 'none';
    dom.galleryGrid.innerHTML = filtered.map(function(img, i) {
      var imgSrc = getDisplayUrl(img); // NEW: use blob URL if available
      return '<div class="gcard" data-id="' + img.id + '" style="animation-delay:' + Math.min(i * 40, 240) + 'ms">' +
        '<img src="' + esc(imgSrc) + '" alt="' + esc(img.name || img.prompt) + '" loading="lazy">' +
        '<div class="gcard-badge">' + esc(img.model) + '</div>' +
        '<div class="gcard-actions">' +
          '<button class="gcard-dl" data-id="' + img.id + '" title="Download">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
          '</button>' +
          '<button class="gcard-fav' + (img.favorite ? ' active' : '') + '" data-id="' + img.id + '" title="Favorite">' +
            '<svg viewBox="0 0 24 24" fill="' + (img.favorite ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
          '</button>' +
          '<button class="gcard-copy" data-id="' + img.id + '" title="Copy Prompt">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="gcard-overlay">' +
          '<div class="gcard-name">' + esc(img.name || img.prompt) + '</div>' +
          '<div class="gcard-meta">' +
            '<span>' + timeAgo(img.timestamp) + '</span>' +
            '<span>' + esc(img.ratio || '1:1') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

function findImage(id) {
  return state.images.find(function(i) { return i.id === id; });
}

// ==================== IMAGE VIEWER ====================

function openViewer(img) {
  currentViewerImage = img;
  var imgSrc = getDisplayUrl(img); // NEW: use blob
  dom.viewerImg.src = imgSrc;
  dom.viewerPrompt.textContent = img.prompt;
  dom.viewerMeta.innerHTML =
    '<span>' + esc(img.model) + '</span>' +
    '<span>' + esc(img.ratio || '1:1') + '</span>' +
    (img.style ? '<span>' + esc(img.style) + '</span>' : '') +
    '<span>' + timeAgo(img.timestamp) + '</span>';
  dom.viewerFav.classList.toggle('active', !!img.favorite);
  dom.imageModal.classList.add('open');
}

function closeViewer() {
  dom.imageModal.classList.remove('open');
  currentViewerImage = null;
}

// ==================== REFERENCE IMAGE ====================

async function compressImage(file, maxDim, quality) {
  maxDim = maxDim || 1024;
  quality = quality || 0.82;
  return new Promise(function(resolve, reject) {
    var img = new Image();
    var objUrl = URL.createObjectURL(file);
    img.onload = function() {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        var ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(function(blob) {
        URL.revokeObjectURL(objUrl);
        if (blob) resolve(blob);
        else reject(new Error('Canvas compression failed'));
      }, 'image/jpeg', quality);
    };
    img.onerror = function() {
      URL.revokeObjectURL(objUrl);
      reject(new Error('Image load failed'));
    };
    img.src = objUrl;
  });
}

function blobToDataURL(blob) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { reject(reader.error); };
    reader.readAsDataURL(blob);
  });
}

async function uploadToCatbox(fileBlob) {
  var formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', fileBlob, 'reference.jpg');

  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 20000);

  try {
    var res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var url = (await res.text()).trim();
    if (url.startsWith('http') && url.length < 500) return url;
    throw new Error('Invalid URL response');
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function handleRefFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    toast('error', 'Invalid File', 'Please select an image file (PNG, JPG, WEBP).');
    return;
  }

  if (state.refPreviewUrl) URL.revokeObjectURL(state.refPreviewUrl);
  var previewUrl = URL.createObjectURL(file);
  state.refPreviewUrl = previewUrl;
  dom.refPreview.src = previewUrl;
  dom.refPreview.style.display = 'block';
  dom.refDrop.classList.add('has-image');
  dom.clearRefBtn.style.display = 'flex';

  toast('info', 'Processing...', 'Compressing reference image');

  var compressedBlob;
  try {
    compressedBlob = await compressImage(file, 1024, 0.82);
  } catch (e) {
    console.warn('Compression failed, using original:', e);
    compressedBlob = file;
  }

  try {
    var publicUrl = await uploadToCatbox(compressedBlob);
    state.refImageData = publicUrl;
    toast('success', 'Reference Ready', 'Image uploaded — public URL acquired');
    return;
  } catch (hostErr) {
    console.warn('Catbox upload failed, falling back to base64:', hostErr);
  }

  try {
    var dataUrl = await blobToDataURL(compressedBlob);
    state.refImageData = dataUrl;
    toast('success', 'Reference Ready', 'Image ready (base64 mode)');
  } catch (e) {
    console.error('Base64 fallback failed:', e);
    toast('error', 'Reference Error', 'Could not process image.');
    clearRefImage();
  }
}

function clearRefImage() {
  if (state.refPreviewUrl) {
    URL.revokeObjectURL(state.refPreviewUrl);
    state.refPreviewUrl = null;
  }
  state.refImageData = null;
  dom.refPreview.style.display = 'none';
  dom.refPreview.src = '';
  dom.refDrop.classList.remove('has-image');
  dom.refDropInner.style.display = '';
  dom.refFileInput.value = '';
  dom.refUrlInput.value = '';
  dom.clearRefBtn.style.display = 'none';
}

function updateRefSection() {
  var show = REF_IMAGE_MODELS.indexOf(state.selectedModel) !== -1;
  dom.refSection.style.display = show ? 'block' : 'none';
  if (!show) clearRefImage();
}

// ==================== ENHANCEMENT (UPDATED) ====================

async function enhancePrompt(prompt, style) {
  var systemMsg = 'You are an expert image prompt engineer. Given a user prompt, rewrite it into a more detailed, vivid, and descriptive version optimized for AI image generation. Keep it under 300 characters. Return ONLY the enhanced prompt, nothing else.';
  if (style) {
    systemMsg += ' The user wants this in a "' + style + '" style. Incorporate this style naturally and seamlessly into the enhanced prompt rather than just appending it.';
  }

  var res = await fetch('https://api.aquadevs.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + state.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: state.enhanceModel,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    })
  });

  var data = await res.json();
  return data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content.trim()
    : null;
}

// NEW: Web search enhancement with tool calling
async function enhanceWithWebSearch(prompt, style) {
  var systemMsg = 'You are an expert image prompt engineer with access to a web_search tool. Your job is to enhance prompts for AI image generation. If the prompt references current events, real-world facts, people, or anything you are not fully confident about, use the web_search tool to get accurate information first. Then craft a single, vivid, descriptive enhanced prompt. Keep it under 400 characters. Return ONLY the final enhanced prompt, nothing else.';
  if (style) {
    systemMsg += ' The user wants this in a "' + style + '" style. Incorporate this style naturally into the result.';
  }

  var messages = [
    { role: 'system', content: systemMsg },
    { role: 'user', content: prompt }
  ];

  var tools = [{
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current, factual information to help create accurate and detailed image prompts.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to find relevant information' }
        },
        required: ['query']
      }
    }
  }];

  // First call — model decides if it needs to search
  var res1 = await fetch('https://api.aquadevs.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + state.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: state.enhanceModel,
      messages: messages,
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 400,
      temperature: 0.7
    })
  });

  var data1 = await res1.json();
  var choice = data1.choices ? data1.choices[0] : null;

  if (choice && choice.finish_reason === 'tool_calls' && choice.message && choice.message.tool_calls) {
    // Model wants to search
    messages.push(choice.message);

    for (var t = 0; t < choice.message.tool_calls.length; t++) {
      var toolCall = choice.message.tool_calls[t];
      if (toolCall.function && toolCall.function.name === 'web_search') {
        var args = JSON.parse(toolCall.function.arguments);
        dom.genStatusText && (dom.genStatusText.textContent = 'Searching: "' + args.query + '"...');

        var searchResult = await webSearch(args.query);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(searchResult).substring(0, 3000)
        });
      }
    }

    // Second call — model returns enhanced prompt using search results
    var res2 = await fetch('https://api.aquadevs.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + state.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: state.enhanceModel,
        messages: messages,
        max_tokens: 400,
        temperature: 0.7
      })
    });

    var data2 = await res2.json();
    return data2.choices && data2.choices[0] && data2.choices[0].message
      ? data2.choices[0].message.content.trim()
      : null;
  }

  // No tool call — return direct enhancement
  return choice && choice.message ? choice.message.content.trim() : null;
}

// NEW: Execute web search via AquaDevs API
async function webSearch(query) {
  try {
    var res = await fetch('https://api.aquadevs.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + state.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: query })
    });
    return await res.json();
  } catch (e) {
    console.warn('Web search failed:', e);
    return { error: 'Search unavailable', results: [] };
  }
}

// NEW: Manual enhance — fills textarea with enhanced prompt
async function manualEnhance() {
  var prompt = dom.promptInput.value.trim();
  if (!prompt) {
    toast('error', 'Empty Prompt', 'Write a prompt first, then enhance it.');
    return;
  }
  if (!state.apiKey) {
    toast('error', 'No API Key', 'Set your API key in settings.');
    return;
  }

  dom.enhanceBtn.classList.add('enhancing');
  dom.enhanceBtn.querySelector('span').textContent = 'Enhancing...';

  try {
    var enhanced = null;
    if (state.enhanceWebSearch) {
      enhanced = await enhanceWithWebSearch(prompt, state.selectedStyle);
    } else {
      enhanced = await enhancePrompt(prompt, state.selectedStyle);
    }

    if (enhanced) {
      dom.promptInput.value = enhanced;
      dom.charCount.textContent = enhanced.length;
      toast('success', 'Prompt Enhanced', 'Review and edit as needed, then generate.');
    } else {
      toast('error', 'Enhancement Failed', 'Could not enhance prompt.');
    }
  } catch (err) {
    console.error('Enhance error:', err);
    toast('error', 'Enhancement Error', err.message);
  }

  dom.enhanceBtn.classList.remove('enhancing');
  dom.enhanceBtn.querySelector('span').textContent = 'Enhance Prompt';
}

// ==================== GENERATION (UPDATED) ====================

async function generateImages() {
  if (state.isGenerating) return;

  if (!state.apiKey) {
    openSettings();
    toast('error', 'No API Key', 'Please set your API key in settings.');
    return;
  }

  var prompt = dom.promptInput.value.trim();
  if (!prompt) {
    toast('error', 'Empty Prompt', 'Please describe what you want to create.');
    dom.promptInput.focus();
    return;
  }

  state.isGenerating = true;
  dom.generateBtn.disabled = true;

  // Auto-enhance (only when NOT manual mode)
  if (state.enhanceEnabled && !state.enhanceManual) {
    try {
      dom.genPromptText.textContent = state.enhanceWebSearch ? 'Searching & enhancing...' : 'Enhancing your prompt...';
      showGenOverlay();
      var enhanced;
      if (state.enhanceWebSearch) {
        enhanced = await enhanceWithWebSearch(prompt, state.selectedStyle);
      } else {
        enhanced = await enhancePrompt(prompt, state.selectedStyle);
      }
      if (enhanced) prompt = enhanced;
    } catch (err) {
      console.error('Enhance error:', err);
    }
  }

  // Build full prompt (style already integrated if enhancement was on)
  var fullPrompt;
  if (state.enhanceEnabled) {
    fullPrompt = prompt; // Style already baked in by enhancer
  } else {
    fullPrompt = state.selectedStyle ? prompt + ', ' + state.selectedStyle + ' style' : prompt;
  }

  // Prepare ratio value
  var ratioValue = state.selectedRatio;

  showGenOverlay();
  startGenTimer();
  dom.genPromptText.textContent = fullPrompt;
  dom.genTotalCount.textContent = state.selectedCount;
  dom.genCurrentCount.textContent = '0';
  dom.genBarFill.style.width = '0%';
  dom.genStatusText.textContent = 'Generating...';

  // Parallel or sequential
  if (state.parallelGeneration && state.selectedCount > 1) {
    await generateParallel(fullPrompt, ratioValue);
  } else {
    await generateSequential(fullPrompt, ratioValue);
  }

  hideGenOverlay();
  stopGenTimer();
  state.isGenerating = false;
  dom.generateBtn.disabled = false;
}

// NEW: Sequential generation (original behavior)
async function generateSequential(fullPrompt, ratioValue) {
  var results = [];
  var done = 0;

  for (var i = 0; i < state.selectedCount; i++) {
    try {
      dom.genStatusText.textContent = 'Generating image ' + (i + 1) + ' of ' + state.selectedCount + '...';
      var imageUrl = await callImageAPI(fullPrompt, ratioValue);
      if (imageUrl) {
        var blob = await fetchAndStoreBlob(imageUrl);
        var name = '';
        if (state.nameEnabled) {
          try { name = await autoName(dom.promptInput.value.trim()); } catch (e) {}
        }
        var imgData = {
          url: imageUrl,
          blob: blob,
          prompt: fullPrompt,
          originalPrompt: dom.promptInput.value.trim(),
          name: name || '',
          model: state.selectedModel,
          ratio: ratioValue,
          style: state.selectedStyle,
          timestamp: Date.now(),
          favorite: false
        };
        var id = await dbPut('gallery', imgData);
        imgData.id = id;
        results.push(imgData);
      }
    } catch (err) {
      console.error('Generation ' + (i + 1) + ' error:', err);
      toast('error', 'Generation Failed', err.message);
    }
    done++;
    dom.genCurrentCount.textContent = done;
    dom.genBarFill.style.width = Math.round((done / state.selectedCount) * 100) + '%';
  }

  if (results.length) {
    state.images = results.concat(state.images);
    renderGallery();
    toast('success', 'Generation Complete', 'Created ' + results.length + ' image' + (results.length > 1 ? 's' : ''));
  }
}

// NEW: Parallel generation
async function generateParallel(fullPrompt, ratioValue) {
  dom.genSlots.innerHTML = '';
  for (var s = 0; s < state.selectedCount; s++) {
    dom.genSlots.innerHTML += '<div class="gen-slot waiting" data-slot="' + s + '">' + (s + 1) + '</div>';
  }

  var completed = 0;
  var results = [];

  var promises = [];
  for (var i = 0; i < state.selectedCount; i++) {
    promises.push(
      (async function(index) {
        var slotEl = dom.genSlots.querySelector('[data-slot="' + index + '"]');
        try {
          slotEl.className = 'gen-slot active';
          dom.genStatusText.textContent = 'Processing ' + state.selectedCount + ' images...';

          var imageUrl = await callImageAPI(fullPrompt, ratioValue);
          if (imageUrl) {
            var blob = await fetchAndStoreBlob(imageUrl);
            var name = '';
            if (state.nameEnabled) {
              try { name = await autoName(dom.promptInput.value.trim()); } catch (e) {}
            }
            var imgData = {
              url: imageUrl,
              blob: blob,
              prompt: fullPrompt,
              originalPrompt: dom.promptInput.value.trim(),
              name: name || '',
              model: state.selectedModel,
              ratio: ratioValue,
              style: state.selectedStyle,
              timestamp: Date.now(),
              favorite: false
            };
            var id = await dbPut('gallery', imgData);
            imgData.id = id;
            results.push(imgData);
            slotEl.className = 'gen-slot done';
            slotEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>';
          } else {
            slotEl.className = 'gen-slot fail';
            slotEl.textContent = '!';
          }
        } catch (err) {
          console.error('Parallel gen ' + index + ' error:', err);
          slotEl.className = 'gen-slot fail';
          slotEl.textContent = '!';
        }
        completed++;
        dom.genCurrentCount.textContent = completed;
        dom.genBarFill.style.width = Math.round((completed / state.selectedCount) * 100) + '%';
      })(i)
    );
  }

  await Promise.allSettled(promises);

  if (results.length) {
    state.images = results.concat(state.images);
    renderGallery();
    toast('success', 'Generation Complete', 'Created ' + results.length + ' image' + (results.length > 1 ? 's' : ''));
  }
}

// NEW: Shared API call
async function callImageAPI(fullPrompt, ratioValue) {
  var body = {
    model: state.selectedModel,
    prompt: fullPrompt,
    ratio: ratioValue
  };

  if (state.refImageData && REF_IMAGE_MODELS.indexOf(state.selectedModel) !== -1) {
    body.image = state.refImageData;
  }

  var res = await fetch('https://api.aquadevs.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + state.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  var data = await res.json();
  if (!data.success) throw new Error(data.error || 'Generation failed');

  if (POLLING_MODELS.indexOf(state.selectedModel) !== -1 && (data.task_id || data.url)) {
    var pollUrl = data.url || ('https://api.aquadevs.com/v1/images/tasks/' + data.task_id);
    return await pollForImage(pollUrl);
  }

  return data.url;
}

async function pollForImage(url, maxTime) {
  maxTime = maxTime || 120000;
  var start = Date.now();
  var interval = 3000;

  while (Date.now() - start < maxTime) {
    await sleep(interval);
    var res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + state.apiKey }
    });
    var data = await res.json();

    if (data.status === 'completed' && data.result && data.result.url) {
      return data.result.url;
    }
    if (data.status === 'failed') throw new Error('Async generation failed');

    var elapsed = Math.round((Date.now() - start) / 1000);
    dom.genStatusText.textContent = 'Processing... (' + elapsed + 's elapsed)';
    dom.genBarFill.style.width = Math.min(85, elapsed * 3) + '%';
  }

  throw new Error('Generation timed out');
}

async function autoName(prompt) {
  var res = await fetch('https://api.aquadevs.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + state.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: state.nameModel,
      messages: [
        { role: 'system', content: 'Generate a short, catchy title (3-6 words) for an image based on the prompt. Return ONLY the title, nothing else. No quotes.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 30,
      temperature: 0.8
    })
  });
  var data = await res.json();
  var result = (data.choices && data.choices[0] && data.choices[0].message)
    ? data.choices[0].message.content.trim() : '';
  return result.replace(/^["']|["']$/g, '');
}

// ---- Gen overlay helpers ----

function showGenOverlay() {
  dom.genOverlay.classList.add('active');
  dom.genBarFill.style.width = '0%';
  dom.genSlots.innerHTML = '';
  state.genMinimized = false;
  dom.genMini.classList.remove('visible');
}

function hideGenOverlay() {
  dom.genOverlay.classList.remove('active');
  dom.genMini.classList.remove('visible');
  state.genMinimized = false;
  if (state.genElapsedTimer) clearInterval(state.genElapsedTimer);
}

// NEW: Timer
function startGenTimer() {
  state.genStartTime = Date.now();
  if (state.genElapsedTimer) clearInterval(state.genElapsedTimer);
  state.genElapsedTimer = setInterval(function() {
    var s = Math.round((Date.now() - state.genStartTime) / 1000);
    if (dom.genMiniTime) dom.genMiniTime.textContent = s + 's';
  }, 1000);
}

function stopGenTimer() {
  if (state.genElapsedTimer) {
    clearInterval(state.genElapsedTimer);
    state.genElapsedTimer = null;
  }
}

// NEW: Minimize
function minimizeGen() {
  state.genMinimized = true;
  dom.genOverlay.classList.remove('active');
  dom.genMini.classList.add('visible');
  dom.genMiniText.textContent = 'Generating...';
}

function expandGen() {
  state.genMinimized = false;
  dom.genMini.classList.remove('visible');
  dom.genOverlay.classList.add('active');
}

// ==================== DOWNLOAD ====================

function downloadImage(url, prompt) {
  var sanitized = sanitizeFilename(prompt || 'aquadevs-image');
  var filename = sanitized + '.png';

  fetch(url)
    .then(function(r) { return r.blob(); })
    .then(function(blob) {
      var blobUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast('success', 'Downloaded', filename);
    })
    .catch(function() {
      window.open(url, '_blank');
      toast('success', 'Opened', 'Image opened in new tab');
    });
}

function sanitizeFilename(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 80) || 'image';
}

// ==================== TOAST ====================

function toast(type, title, msg) {
  var icon = type === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : type === 'info'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  var el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML =
    '<div class="toast-icon ' + type + '">' + icon + '</div>' +
    '<div class="toast-body">' +
      '<div class="toast-title">' + esc(title) + '</div>' +
      (msg ? '<div class="toast-msg">' + esc(msg) + '</div>' : '') +
    '</div>';

  dom.toastWrap.appendChild(el);
  requestAnimationFrame(function() { el.classList.add('show'); });

  setTimeout(function() {
    el.classList.remove('show');
    setTimeout(function() { el.remove(); }, 400);
  }, 3500);
}

// ==================== UTILITIES ====================

function esc(text) {
  if (!text) return '';
  var d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

function timeAgo(ts) {
  var s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function addCustomStyle() {
  var val = dom.customStyleInput.value.trim();
  if (!val) return;
  var btn = document.createElement('button');
  btn.className = 'schip';
  btn.dataset.style = val.toLowerCase();
  btn.textContent = val;
  btn.type = 'button';
  dom.styleChips.appendChild(btn);
  dom.customStyleInput.value = '';
  dom.addStyleRow.style.display = 'none';
  document.querySelectorAll('.schip').forEach(function(c) { c.classList.remove('active'); });
  btn.classList.add('active');
  state.selectedStyle = val.toLowerCase();
  toast('success', 'Style Added', '"' + val + '" added to your styles');
}

// ==================== EVENT BINDING ====================

function bindEvents() {

  // ---- Setup Modal ----
  dom.setupAvatarWrap.addEventListener('click', function() { dom.setupAvatarFile.click(); });
  dom.setupAvatarFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      dom.setupAvatarPreview.src = ev.target.result;
      dom.setupAvatarPreview.style.display = 'block';
      var ph = dom.setupAvatarWrap.querySelector('.setup-avatar-placeholder');
      if (ph) ph.style.display = 'none';
      state.avatarData = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  dom.setupEyeToggle.addEventListener('click', function() {
    dom.setupApiKey.type = dom.setupApiKey.type === 'password' ? 'text' : 'password';
  });

  dom.setupApiKey.addEventListener('input', function() {
    dom.setupSaveBtn.disabled = !dom.setupApiKey.value.trim();
  });

  dom.setupSaveBtn.addEventListener('click', async function() {
    var key = dom.setupApiKey.value.trim();
    if (!key) return;
    dom.setupSaveBtn.disabled = true;
    dom.setupSaveBtn.innerHTML = '<span>Connecting...</span>';

    try {
      var res = await fetch('https://api.aquadevs.com/health', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      var data = await res.json();

      if (data.status === 'online') {
        state.apiKey = key;
        state.userName = dom.setupName.value.trim();
        state.setupComplete = true;
        await saveSetting('apiKey', key);
        await saveSetting('userName', state.userName);
        if (state.avatarData) await saveSetting('avatarData', state.avatarData);
        await saveSetting('setupComplete', true);
        applyProfileUI();
        hideSetupModal();
        await loadGallery();
        toast('success', 'Welcome!', 'Your workspace is ready.');
      } else {
        toast('error', 'Connection Failed', 'Invalid response from API.');
      }
    } catch (err) {
      toast('error', 'Connection Error', 'Could not reach AquaDevs API.');
    }

    dom.setupSaveBtn.disabled = false;
    dom.setupSaveBtn.innerHTML = '<span>Get Started</span>';
  });

  // ---- Settings ----
  dom.settingsCloseBtn.addEventListener('click', closeSettings);
  dom.sidebarSettingsBtn.addEventListener('click', openSettings);

  dom.settingsAvatarWrap.addEventListener('click', function() { dom.settingsAvatarFile.click(); });
  dom.settingsAvatarFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      state.avatarData = ev.target.result;
      dom.settingsAvatarPreview.src = ev.target.result;
      dom.settingsAvatarPreview.style.display = 'block';
      var sph = dom.settingsAvatarWrap.querySelector('.settings-avatar-ph');
      if (sph) sph.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  dom.settingsEyeToggle.addEventListener('click', function() {
    dom.settingsApiKey.type = dom.settingsApiKey.type === 'password' ? 'text' : 'password';
  });

  dom.themeOrange.addEventListener('click', function() { state.theme = 'orange'; applyTheme('orange'); });
  dom.themeBlue.addEventListener('click', function() { state.theme = 'blue'; applyTheme('blue'); });

  dom.settingsModal.addEventListener('click', function(e) {
    if (e.target === dom.settingsModal) closeSettings();
  });

  dom.settingsSaveBtn.addEventListener('click', async function() {
    var key = dom.settingsApiKey.value.trim();
    if (key) state.apiKey = key;

    state.userName = dom.settingsName.value.trim();
    state.defaultModel = dom.settingsDefaultModel.value;
    state.enhanceEnabled = dom.settingsEnhanceToggle.checked;
    state.enhanceModel = dom.settingsEnhanceModel.value;
    state.enhanceManual = dom.settingsEnhanceManual.checked;    // NEW
    state.enhanceWebSearch = dom.settingsEnhanceWeb.checked;    // NEW
    state.nameEnabled = dom.settingsNameToggle.checked;
    state.nameModel = dom.settingsNameModel.value;
    state.parallelGeneration = dom.settingsParallel.checked;    // NEW

    await saveSetting('apiKey', state.apiKey);
    await saveSetting('userName', state.userName);
    if (state.avatarData) await saveSetting('avatarData', state.avatarData);
    await saveSetting('theme', state.theme);
    await saveSetting('defaultModel', state.defaultModel);
    await saveSetting('enhanceEnabled', state.enhanceEnabled);
    await saveSetting('enhanceModel', state.enhanceModel);
    await saveSetting('enhanceManual', state.enhanceManual);    // NEW
    await saveSetting('enhanceWebSearch', state.enhanceWebSearch); // NEW
    await saveSetting('nameEnabled', state.nameEnabled);
    await saveSetting('nameModel', state.nameModel);
    await saveSetting('parallelGeneration', state.parallelGeneration); // NEW

    applyProfileUI();
    updateEnhanceButton();
    dom.modelSelect.value = state.defaultModel;
    state.selectedModel = state.defaultModel;
    updateRefSection();

    closeSettings();
    toast('success', 'Settings Saved', 'Your preferences have been updated.');
  });

  // ---- Sidebar ----
  dom.menuToggle.addEventListener('click', function() {
    dom.sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  dom.sidebarOverlay.addEventListener('click', function() {
    closeSidebar();
    closePanel();
  });

  // ---- Navigation ----
  document.querySelectorAll('.nav-item, .mnav').forEach(function(item) {
    item.addEventListener('click', function() {
      var view = item.dataset.view;
      if (view === 'settings') { openSettings(); closeSidebar(); return; }
      document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
      document.querySelectorAll('.mnav').forEach(function(n) { n.classList.remove('active'); });
      document.querySelectorAll('[data-view="' + view + '"]').forEach(function(n) { n.classList.add('active'); });
      state.currentFilter = view === 'favorites' ? 'favorites' : 'all';
      renderGallery();
      closeSidebar();
    });
  });

  // ---- Search ----
  dom.searchInput.addEventListener('input', renderGallery);

  // ---- Gallery Tabs ----
  document.querySelectorAll('.g-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.g-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      state.currentFilter = tab.dataset.filter;
      renderGallery();
    });
  });

  // ---- Gallery Card Clicks ----
  dom.galleryGrid.addEventListener('click', function(e) {
    var dlBtn = e.target.closest('.gcard-dl');
    var favBtn = e.target.closest('.gcard-fav');
    var copyBtn = e.target.closest('.gcard-copy');
    var card = e.target.closest('.gcard');

    if (dlBtn) {
      e.stopPropagation();
      var img = findImage(Number(dlBtn.dataset.id));
      if (img) downloadImage(img.url, img.name || img.originalPrompt || img.prompt);
      return;
    }
    if (favBtn) {
      e.stopPropagation();
      var img2 = findImage(Number(favBtn.dataset.id));
      if (img2) {
        img2.favorite = !img2.favorite;
        dbPut('gallery', img2).then(renderGallery);
        toast('success', img2.favorite ? 'Added to Favorites' : 'Removed from Favorites');
      }
      return;
    }
    if (copyBtn) {
      e.stopPropagation();
      var img3 = findImage(Number(copyBtn.dataset.id));
      if (img3) { copyText(img3.originalPrompt || img3.prompt); toast('success', 'Prompt Copied', 'Ready to paste'); }
      return;
    }
    if (card) {
      var img4 = findImage(Number(card.dataset.id));
      if (img4) openViewer(img4);
    }
  });

  // ---- Panel ----
  dom.panelClose.addEventListener('click', closePanel);
  dom.fabBtn.addEventListener('click', openPanel);

  // ---- Prompt ----
  dom.promptInput.addEventListener('input', function() {
    dom.charCount.textContent = dom.promptInput.value.length;
  });

  dom.shuffleBtn.addEventListener('click', function() {
    var p = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    dom.promptInput.value = p;
    dom.charCount.textContent = p.length;
    dom.promptInput.focus();
  });

  // ---- Model Select ----
  dom.modelSelect.addEventListener('change', function() {
    state.selectedModel = dom.modelSelect.value;
    updateRefSection();
  });
  dom.modelSelect.value = state.defaultModel;
  state.selectedModel = state.defaultModel;
  updateRefSection();

  // ---- Reference Image ----
  dom.refDrop.addEventListener('click', function() { dom.refFileInput.click(); });
  dom.refDrop.addEventListener('dragover', function(e) { e.preventDefault(); dom.refDrop.classList.add('dragover'); });
  dom.refDrop.addEventListener('dragleave', function() { dom.refDrop.classList.remove('dragover'); });
  dom.refDrop.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation();
    dom.refDrop.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleRefFile(e.dataTransfer.files[0]);
  });
  dom.refFileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleRefFile(e.target.files[0]);
  });
  dom.refUrlBtn.addEventListener('click', function() {
    var url = dom.refUrlInput.value.trim();
    if (!url) return;
    if (!url.startsWith('http')) {
      toast('error', 'Invalid URL', 'Enter a valid URL starting with http:// or https://');
      return;
    }
    state.refImageData = url;
    dom.refPreview.src = url;
    dom.refPreview.style.display = 'block';
    dom.refDrop.classList.add('has-image');
    dom.clearRefBtn.style.display = 'flex';
    toast('success', 'Reference Set', 'URL loaded as reference');
  });
  dom.refUrlInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') dom.refUrlBtn.click(); });
  dom.clearRefBtn.addEventListener('click', clearRefImage);

  // ---- Ratio ----
  document.querySelectorAll('.ratio-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.ratio-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.selectedRatio = btn.dataset.ratio;
      // NEW: clear custom ratio
      dom.customRatioWrap.classList.remove('show');
      dom.customRatioInput.value = '';
    });
  });

  // NEW: Custom ratio
  dom.customRatioBtn.addEventListener('click', function() {
    dom.customRatioWrap.classList.toggle('show');
    if (dom.customRatioWrap.classList.contains('show')) dom.customRatioInput.focus();
  });

  dom.customRatioApply.addEventListener('click', function() {
    var val = dom.customRatioInput.value.trim();
    if (!val) return;
    // Validate format: number:number
    if (!/^\d+:\d+$/.test(val)) {
      toast('error', 'Invalid Ratio', 'Use format like 4:7 or 21:9');
      return;
    }
    document.querySelectorAll('.ratio-btn').forEach(function(b) { b.classList.remove('active'); });
    state.selectedRatio = val;
    toast('success', 'Custom Ratio Set', val);
  });

  dom.customRatioInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') dom.customRatioApply.click(); });

  // ---- Style Chips ----
  dom.styleChips.addEventListener('click', function(e) {
    var chip = e.target.closest('.schip');
    if (!chip) return;
    document.querySelectorAll('.schip').forEach(function(c) { c.classList.remove('active'); });
    chip.classList.add('active');
    state.selectedStyle = chip.dataset.style;
  });

  dom.addStyleBtn.addEventListener('click', function() {
    var show = dom.addStyleRow.style.display === 'none';
    dom.addStyleRow.style.display = show ? 'flex' : 'none';
    if (show) dom.customStyleInput.focus();
  });
  dom.addStyleConfirm.addEventListener('click', addCustomStyle);
  dom.customStyleInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') addCustomStyle(); });

  // ---- Count ----
  document.querySelectorAll('.cbtn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.cbtn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.selectedCount = parseInt(btn.dataset.count, 10);
    });
  });

  // NEW: Enhance button (manual mode)
  dom.enhanceBtn.addEventListener('click', manualEnhance);

  // ---- Generate ----
  dom.generateBtn.addEventListener('click', generateImages);

  // NEW: Minimize / Expand
  dom.genMinimizeBtn.addEventListener('click', minimizeGen);
  dom.genMiniShow.addEventListener('click', expandGen);
  dom.genMini.addEventListener('click', function(e) {
    if (e.target === dom.genMini || e.target === dom.genMiniInfo || e.target === dom.genMiniText) expandGen();
  });

  // ---- Viewer ----
  dom.viewerClose.addEventListener('click', closeViewer);
  dom.imageModal.addEventListener('click', function(e) { if (e.target === dom.imageModal) closeViewer(); });

  dom.viewerDownload.addEventListener('click', function() {
    if (currentViewerImage) downloadImage(currentViewerImage.url, currentViewerImage.name || currentViewerImage.originalPrompt || currentViewerImage.prompt);
  });

  dom.viewerCopy.addEventListener('click', function() {
    if (currentViewerImage) { copyText(currentViewerImage.originalPrompt || currentViewerImage.prompt); toast('success', 'Prompt Copied'); }
  });

  dom.viewerFav.addEventListener('click', async function() {
    if (!currentViewerImage) return;
    currentViewerImage.favorite = !currentViewerImage.favorite;
    await dbPut('gallery', currentViewerImage);
    dom.viewerFav.classList.toggle('active', currentViewerImage.favorite);
    renderGallery();
    toast('success', currentViewerImage.favorite ? 'Added to Favorites' : 'Removed from Favorites');
  });

  dom.viewerDelete.addEventListener('click', async function() {
    if (!currentViewerImage) return;
    await dbRemove('gallery', currentViewerImage.id);
    state.images = state.images.filter(function(i) { return i.id !== currentViewerImage.id; });
    if (blobUrlCache[currentViewerImage.id]) {
      URL.revokeObjectURL(blobUrlCache[currentViewerImage.id]);
      delete blobUrlCache[currentViewerImage.id];
    }
    renderGallery();
    closeViewer();
    toast('success', 'Image Deleted');
  });

  // ---- Topbar Avatar ----
  dom.topbarAvatar.addEventListener('click', openSettings);

  // ---- Keyboard Shortcuts ----
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      openPanel();
      setTimeout(function() { dom.promptInput.focus(); }, 100);
    }
    if (e.key === 'Escape') {
      if (dom.imageModal.classList.contains('open')) {
        closeViewer();
      } else if (dom.settingsModal.classList.contains('open')) {
        closeSettings();
      } else if (dom.panel.classList.contains('open')) {
        closePanel();
      }
    }
  });
}

// ==================== INITIALIZATION ====================

async function init() {
  try {
    await openDB();
    await loadSettings();
  } catch (err) {
    console.error('Init error:', err);
    showSetupModal();
  }
  bindEvents();
}

init();