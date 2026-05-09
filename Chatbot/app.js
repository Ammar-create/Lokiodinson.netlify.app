/* =====================================================
   AQUADEVS STUDIO — APPLICATION LOGIC (v3)
   ===================================================== */

// ==================== CONSTANTS ====================
var DB_NAME = 'AquaDevsStudio';
var DB_VERSION = 3;
var REF_IMAGE_MODELS = ['gptimage-2','gptimage-1.5','flux-2','qwen-image','nanobanana','nanobanana-pro'];
var POLLING_MODELS = ['imagen4','nanobanana','nanobanana-pro'];
var BUILT_IN_MODELS = [
  {id:'gptimage-2',name:'GPT Image 2',badge:'Direct'},
  {id:'gptimage-1.5',name:'GPT Image 1.5',badge:'Direct'},
  {id:'flux-2',name:'Flux 2',badge:'Direct'},
  {id:'zimage',name:'Z Image',badge:'Direct'},
  {id:'grok-image',name:'Grok Image',badge:'Direct'},
  {id:'midjourney',name:'Midjourney',badge:'Direct'},
  {id:'qwen-image',name:'Qwen Image',badge:'Direct'},
  {id:'imagen4',name:'Imagen 4',badge:'Poll'},
  {id:'nanobanana',name:'NanoBanana',badge:'Poll+Ref'},
  {id:'nanobanana-pro',name:'NanoBanana Pro',badge:'Poll+Ref'},
  {id:'seedream',name:'Seedream',badge:'Direct'}
];
var RANDOM_PROMPTS = [
  "A majestic dragon perched atop a crystal mountain at sunset, scales reflecting prismatic light, fantasy concept art, highly detailed",
  "Futuristic cyberpunk city at night, neon holographic billboards, flying vehicles, rainy streets, cinematic wide shot",
  "A serene Japanese zen garden in autumn, golden ginkgo leaves falling, koi pond reflecting maple trees, watercolor style",
  "An astronaut discovering a bioluminescent alien garden on a distant planet, volumetric fog, dramatic lighting",
  "A cozy enchanted cottage deep in a mossy forest, fireflies dancing, warm amber light, storybook illustration",
  "Underwater ancient temple covered in coral and sea life, god rays piercing turquoise water, photorealistic 8K",
  "A steampunk mechanical owl with intricate brass gears, perched on antique leather-bound books, 3D render",
  "A celestial goddess composed of stars and nebulae, flowing cosmic dress made of galaxies, digital painting",
  "A lone samurai in a vast field of red spider lilies, wind billowing through his cloak, golden hour lighting",
  "Miniature terrarium world on a scientist's desk, tiny mountains and rivers inside a glass dome, tilt-shift",
  "A glowing crystal cave deep underground, formations reflecting rainbow light, mirror-still underground lake",
  "A massive whale swimming through clouds above a Victorian city, airships nearby, Studio Ghibli inspired",
  "Photorealistic close-up of a chameleon on a tropical branch, bokeh background, macro photography",
  "A rift between two dimensions — modern cityscape one side, mystical floating islands the other",
  "An ancient library floating in the void of space, books orbiting like planets, ethereal atmosphere"
];

// ==================== STATE ====================
var state = {
  apiKey: null, userName: '', avatarData: null, setupComplete: false,
  theme: 'orange', defaultModel: 'gptimage-2',
  enhanceEnabled: false, enhanceModel: 'gpt-5.4-mini',
  nameEnabled: false, nameModel: 'gpt-5.4-mini',
  bgGenEnabled: false, simGenEnabled: false,
  customModels: [],
  images: [], currentFilter: 'all',
  selectedModel: 'gptimage-2', selectedRatio: 'landscape',
  selectedStyle: '', selectedCount: 1,
  refImageData: null, refPreviewUrl: null,
  isGenerating: false,
  batches: {},
  pwaDeferredPrompt: null
};

// ==================== DOM CACHE ====================
var $ = function(id){ return document.getElementById(id); };
var dom = {};

function cacheDom(){
  [
    'setupModal','setupAvatarWrap','setupAvatarPreview','setupAvatarFile','setupName','setupApiKey','setupEyeToggle','setupSaveBtn',
    'settingsModal','settingsCloseBtn','settingsAvatarWrap','settingsAvatarPreview','settingsAvatarFile','settingsName','settingsApiKey','settingsEyeToggle',
    'settingsDefaultModel','settingsEnhanceToggle','settingsEnhanceModel','settingsNameToggle','settingsNameModel','settingsBgToggle','settingsSimToggle',
    'themeOrange','themeBlue','settingsSaveBtn',
    'customModelsList','customModelId','customModelRef','customModelPoll','customModelAddBtn',
    'pwaInstallBtn','pwaHint',
    'genOverlay','genPromptText','genBarFill','genStatusText','genCurrentCount','genTotalCount',
    'bgIndicator','bgCount','bgPboxes','bgDetails',
    'fsOverlay','fsContainer','fsImage','fsMinimize',
    'sidebar','sidebarOverlay','sidebarSettingsBtn','menuToggle',
    'searchInput','galleryArea','galleryGrid','emptyState',
    'panel','panelClose','promptInput','charCount','shuffleBtn',
    'refSection','refDrop','refDropInner','refPreview','refFileInput','refUrlInput','refUrlBtn','clearRefBtn',
    'modelSelect','styleChips','addStyleBtn','addStyleRow','customStyleInput','addStyleConfirm',
    'ratioCustomBtn','ratioCustomRow','ratioCustomInput','ratioCustomApply',
    'generateBtn',
    'imageModal','viewerImg','viewerPrompt','viewerMeta','viewerClose','viewerMaximize','viewerRemix','viewerDownload','viewerCopy','viewerFav','viewerDelete',
    'fabBtn','topbarAvatar','topbarAvatarLetter','toastWrap',
    'tabAll','tabRecent','tabFav','imageCount'
  ].forEach(function(id){ dom[id] = $(id); });
}

var currentViewerImage = null;
var db = null;
var bgProgressState = [];

// ==================== INDEXEDDB ====================
function openDB(){
  return new Promise(function(resolve, reject){
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e){
      var d = e.target.result;
      if(!d.objectStoreNames.contains('settings')) d.createObjectStore('settings',{keyPath:'key'});
      if(!d.objectStoreNames.contains('gallery')){
        var s = d.createObjectStore('gallery',{keyPath:'id',autoIncrement:true});
        s.createIndex('timestamp','timestamp',{unique:false});
        s.createIndex('batchId','batchId',{unique:false});
      }
    };
    req.onsuccess = function(e){ db = e.target.result; resolve(db); };
    req.onerror = function(e){ reject(e.target.error); };
  });
}

function dbGet(store,key){
  return new Promise(function(resolve,reject){
    var tx = db.transaction(store,'readonly');
    var r = tx.objectStore(store).get(key);
    r.onsuccess = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
  });
}

function dbPut(store,data){
  return new Promise(function(resolve,reject){
    var tx = db.transaction(store,'readwrite');
    var r = tx.objectStore(store).put(data);
    r.onsuccess = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
  });
}

function dbRemove(store,key){
  return new Promise(function(resolve,reject){
    var tx = db.transaction(store,'readwrite');
    var r = tx.objectStore(store).delete(key);
    r.onsuccess = function(){ resolve(); };
    r.onerror = function(){ reject(r.error); };
  });
}

function dbGetAll(store){
  return new Promise(function(resolve,reject){
    var tx = db.transaction(store,'readonly');
    var r = tx.objectStore(store).getAll();
    r.onsuccess = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
  });
}

// ==================== SETTINGS ====================
async function loadSettings(){
  try{
    var rows = await dbGetAll('settings');
    var map = {};
    rows.forEach(function(r){ map[r.key] = r.value; });

    state.setupComplete = !!map.setupComplete;
    state.apiKey = map.apiKey || null;
    state.userName = map.userName || '';
    state.avatarData = map.avatarData || null;
    state.theme = map.theme || 'orange';
    state.defaultModel = map.defaultModel || 'gptimage-2';
    state.enhanceEnabled = !!map.enhanceEnabled;
    state.enhanceModel = map.enhanceModel || 'gpt-5.4-mini';
    state.nameEnabled = !!map.nameEnabled;
    state.nameModel = map.nameModel || 'gpt-5.4-mini';
    state.bgGenEnabled = !!map.bgGenEnabled;
    state.simGenEnabled = !!map.simGenEnabled;
    state.customModels = map.customModels || [];

    state.selectedModel = state.defaultModel;
    applyTheme(state.theme);
    applyProfileUI();
    populateModelSelect();

    if(!state.setupComplete || !state.apiKey){
      showSetupModal();
    } else {
      hideSetupModal();
      await loadGallery();
    }
  } catch(e){
    console.error('loadSettings:', e);
    showSetupModal();
  }
}

async function saveSetting(key, val){
  await dbPut('settings',{key:key, value:val});
  state[key] = val;
}

function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  dom.themeOrange.classList.toggle('active', t==='orange');
  dom.themeBlue.classList.toggle('active', t==='blue');
}

function applyProfileUI(){
  if(state.avatarData){
    dom.topbarAvatar.innerHTML = '<img src="'+state.avatarData+'" alt="">';
  } else if(state.userName){
    dom.topbarAvatar.innerHTML = '<span id="topbarAvatarLetter">'+esc(state.userName.charAt(0).toUpperCase())+'</span>';
  }
  dom.settingsName.value = state.userName;
  dom.settingsApiKey.value = state.apiKey || '';
  dom.settingsDefaultModel.value = state.defaultModel;
  dom.settingsEnhanceToggle.checked = state.enhanceEnabled;
  dom.settingsEnhanceModel.value = state.enhanceModel;
  dom.settingsNameToggle.checked = state.nameEnabled;
  dom.settingsNameModel.value = state.nameModel;
  dom.settingsBgToggle.checked = state.bgGenEnabled;
  dom.settingsSimToggle.checked = state.simGenEnabled;
}

function populateModelSelect(){
  var sel = dom.modelSelect;
  sel.innerHTML = '';
  BUILT_IN_MODELS.forEach(function(m){
    var o = document.createElement('option');
    o.value = m.id;
    o.textContent = m.name + ' — ' + m.badge;
    sel.appendChild(o);
  });
  if(state.customModels.length){
    var grp = document.createElement('optgroup');
    grp.label = 'Custom Models';
    state.customModels.forEach(function(m){
      var o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.id + (m.supportsRef?' ★':'') + (m.usesPolling?' ⟳':'');
      grp.appendChild(o);
    });
    sel.appendChild(grp);
  }
  sel.value = state.selectedModel;
  renderCustomModelsList();
}

function renderCustomModelsList(){
  var wrap = dom.customModelsList;
  if(!state.customModels.length){
    wrap.innerHTML = '<div class="cm-empty">No custom models yet</div>';
    return;
  }
  wrap.innerHTML = state.customModels.map(function(m){
    return '<div class="cm-item">' +
      '<span class="cm-item-name">'+esc(m.id)+'</span>' +
      '<span class="cm-item-badges">' +
        (m.supportsRef?'<span class="cm-badge">Ref</span>':'') +
        (m.usesPolling?'<span class="cm-badge">Poll</span>':'') +
      '</span>' +
      '<button class="cm-remove" data-cmid="'+esc(m.id)+'" title="Remove">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button></div>';
  }).join('');
}

// ==================== MODALS ====================
function showSetupModal(){ dom.setupModal.classList.add('open'); }
function hideSetupModal(){ dom.setupModal.classList.remove('open'); }
function openSettings(){ applyProfileUI(); dom.settingsModal.classList.add('open'); }
function closeSettings(){ dom.settingsModal.classList.remove('open'); }

function openPanel(){
  dom.panel.classList.add('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '750';
}
function closePanel(){
  dom.panel.classList.remove('open');
  if(!dom.sidebar.classList.contains('open')){
    dom.sidebarOverlay.classList.remove('active');
    dom.sidebarOverlay.style.zIndex = '';
  }
}
function openSidebar(){
  dom.sidebar.classList.add('open');
  dom.sidebarOverlay.classList.add('active');
  dom.sidebarOverlay.style.zIndex = '499';
}
function closeSidebar(){
  dom.sidebar.classList.remove('open');
  if(!dom.panel.classList.contains('open')){
    dom.sidebarOverlay.classList.remove('active');
    dom.sidebarOverlay.style.zIndex = '';
  }
}

// ==================== FULLSCREEN VIEWER ====================
var fsState = {zoom:1,panX:0,panY:0,dragging:false,lastX:0,lastY:0,startDist:0,startZoom:1};

function openFullscreen(src){
  dom.fsImage.src = src;
  dom.fsOverlay.classList.add('active');
  resetFs();
}
function closeFullscreen(){
  dom.fsOverlay.classList.remove('active');
  resetFs();
}
function resetFs(){
  fsState.zoom = 1; fsState.panX = 0; fsState.panY = 0;
  applyFs();
}
function applyFs(){
  dom.fsImage.style.transform = 'scale('+fsState.zoom+') translate('+fsState.panX/fsState.zoom+'px,'+fsState.panY/fsState.zoom+'px)';
}

function fsWheel(e){
  e.preventDefault();
  var delta = e.deltaY > 0 ? -0.15 : 0.15;
  fsState.zoom = Math.max(0.5, Math.min(8, fsState.zoom + delta));
  if(fsState.zoom <= 1){ fsState.panX = 0; fsState.panY = 0; }
  applyFs();
}

function fsPointerDown(e){
  if(e.pointerType === 'touch' && e.isPrimary === false) return;
  fsState.dragging = true;
  fsState.lastX = e.clientX;
  fsState.lastY = e.clientY;
  dom.fsOverlay.style.cursor = 'grabbing';
}

function fsPointerMove(e){
  if(!fsState.dragging) return;
  var dx = e.clientX - fsState.lastX;
  var dy = e.clientY - fsState.lastY;
  fsState.lastX = e.clientX;
  fsState.lastY = e.clientY;
  if(fsState.zoom > 1){
    fsState.panX += dx;
    fsState.panY += dy;
    applyFs();
  }
}

function fsPointerUp(){
  fsState.dragging = false;
  dom.fsOverlay.style.cursor = 'grab';
}

function fsDblClick(){
  if(fsState.zoom > 1){
    resetFs();
  } else {
    fsState.zoom = 2.5;
    applyFs();
  }
}

// ==================== GALLERY ====================
async function loadGallery(){
  try{
    state.images = await dbGetAll('gallery');
    state.images.sort(function(a,b){ return b.timestamp - a.timestamp; });
    renderGallery();
  } catch(e){ console.error('loadGallery:', e); }
}

function renderGallery(){
  var search = dom.searchInput.value.toLowerCase().trim();
  var filtered = state.images.slice();

  if(state.currentFilter === 'favorites'){
    filtered = filtered.filter(function(i){ return i.favorite; });
  } else if(state.currentFilter === 'recent'){
    var day = Date.now() - 86400000;
    filtered = filtered.filter(function(i){ return i.timestamp > day; });
  }
  if(search){
    filtered = filtered.filter(function(i){
      return (i.prompt||'').toLowerCase().indexOf(search)!==-1 ||
             (i.name||'').toLowerCase().indexOf(search)!==-1 ||
             (i.model||'').toLowerCase().indexOf(search)!==-1;
    });
  }

  var total = state.images.length;
  var recent = state.images.filter(function(i){ return i.timestamp > Date.now()-86400000; }).length;
  var favs = state.images.filter(function(i){ return i.favorite; }).length;
  dom.tabAll.textContent = total ? '('+total+')' : '';
  dom.tabRecent.textContent = recent ? '('+recent+')' : '';
  dom.tabFav.textContent = favs ? '('+favs+')' : '';
  dom.imageCount.textContent = total || '0';

  // Group by batchId
  var batchMap = {};
  var singles = [];
  filtered.forEach(function(img){
    if(img.batchId){
      if(!batchMap[img.batchId]) batchMap[img.batchId] = [];
      batchMap[img.batchId].push(img);
    } else {
      singles.push(img);
    }
  });

  var html = '';

  // Render batches
  Object.keys(batchMap).forEach(function(bid){
    var imgs = batchMap[bid];
    if(imgs.length < 2){
      singles = singles.concat(imgs);
      return;
    }
    imgs.sort(function(a,b){ return a.timestamp - b.timestamp; });
    var first = imgs[0];
    var promptShort = (first.originalPrompt||first.prompt||'');
    if(promptShort.length > 45) promptShort = promptShort.substring(0,45)+'...';
    var ci = state.batches[bid] || 0;
    if(ci >= imgs.length) ci = 0;
    var li = (ci - 1 + imgs.length) % imgs.length;
    var ri = (ci + 1) % imgs.length;

    html += '<div class="batch-group" data-batch="'+bid+'">';
    html += '<div class="batch-header" data-batch-h="'+bid+'">';
    html += '<svg class="batch-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    html += '<span class="batch-prompt">'+esc(promptShort)+'</span>';
    html += '<span class="batch-meta">'+esc(first.model)+' · '+imgs.length+' · '+timeAgo(first.timestamp)+'</span>';
    html += '</div>';
    html += '<div class="batch-carousel">';
    html += '<div class="carousel-track">';
    html += '<div class="carousel-item left" data-cid="'+imgs[li].id+'"><img src="'+esc(imgs[li].url)+'" alt=""></div>';
    html += '<div class="carousel-item center" data-cid="'+imgs[ci].id+'"><img src="'+esc(imgs[ci].url)+'" alt=""></div>';
    html += '<div class="carousel-item right" data-cid="'+imgs[ri].id+'"><img src="'+esc(imgs[ri].url)+'" alt=""></div>';
    html += '<button class="carousel-arrow carousel-prev" data-cb="'+bid+'" data-dir="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>';
    html += '<button class="carousel-arrow carousel-next" data-cb="'+bid+'" data-dir="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>';
    html += '</div></div></div>';
  });

  // Render singles
  singles.forEach(function(img, i){
    html += '<div class="gcard" data-id="'+img.id+'" style="animation-delay:'+Math.min(i*40,240)+'ms">';
    html += '<img src="'+esc(img.url)+'" alt="" loading="lazy">';
    html += '<div class="gcard-badge">'+esc(img.model)+'</div>';
    html += '<div class="gcard-actions">';
    html += '<button class="gcard-dl" data-dlid="'+img.id+'" title="Download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>';
    html += '<button class="gcard-fav'+(img.favorite?' active':'')+'" data-favid="'+img.id+'" title="Favorite"><svg viewBox="0 0 24 24" fill="'+(img.favorite?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>';
    html += '<button class="gcard-copy" data-cpid="'+img.id+'" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>';
    html += '</div>';
    html += '<div class="gcard-overlay">';
    html += '<div class="gcard-name">'+esc(img.name||img.prompt)+'</div>';
    html += '<div class="gcard-meta"><span>'+timeAgo(img.timestamp)+'</span><span>'+esc(img.ratio||'16:9')+'</span></div>';
    html += '</div></div>';
  });

  if(!filtered.length){
    dom.emptyState.style.display = 'flex';
    dom.galleryGrid.innerHTML = '';
  } else {
    dom.emptyState.style.display = 'none';
    dom.galleryGrid.innerHTML = html;
  }
}

function findImage(id){
  return state.images.find(function(i){ return i.id === id; });
}

// ==================== IMAGE VIEWER ====================
function openViewer(img){
  currentViewerImage = img;
  dom.viewerImg.src = img.url;
  dom.viewerPrompt.textContent = img.prompt;
  dom.viewerMeta.innerHTML =
    '<span>'+esc(img.model)+'</span>' +
    '<span>'+esc(img.ratio||'16:9')+'</span>' +
    (img.style ? '<span>'+esc(img.style)+'</span>' : '') +
    '<span>'+timeAgo(img.timestamp)+'</span>';
  dom.viewerFav.classList.toggle('active', !!img.favorite);
  dom.imageModal.classList.add('open');
}

function closeViewer(){
  dom.imageModal.classList.remove('open');
  currentViewerImage = null;
}

function remixImage(img){
  if(!img) return;
  closeViewer();
  openPanel();
  dom.promptInput.value = img.originalPrompt || img.prompt;
  dom.charCount.textContent = dom.promptInput.value.length;

  // Set model
  var found = false;
  for(var i = 0; i < dom.modelSelect.options.length; i++){
    if(dom.modelSelect.options[i].value === img.model){ found = true; break; }
  }
  if(found){
    dom.modelSelect.value = img.model;
    state.selectedModel = img.model;
    updateRefSection();
  }

  // Set ratio
  var rb = document.querySelector('.ratio-btn[data-ratio="'+img.ratio+'"]');
  if(!rb) rb = document.querySelector('.ratio-btn[data-ratio="landscape"]');
  document.querySelectorAll('.ratio-btn').forEach(function(b){ b.classList.remove('active'); });
  if(rb) rb.classList.add('active');
  state.selectedRatio = img.ratio || 'landscape';
  dom.ratioCustomRow.style.display = 'none';
  dom.ratioCustomBtn.classList.remove('active');

  // Load image as reference
  if(img.url && (REF_IMAGE_MODELS.indexOf(state.selectedModel) !== -1)){
    state.refImageData = img.url;
    dom.refPreview.src = img.url;
    dom.refPreview.style.display = 'block';
    dom.refDrop.classList.add('has-image');
    dom.clearRefBtn.style.display = 'flex';
  }

  toast('info', 'Remix Ready', 'Prompt and reference loaded. Edit and generate!');
}

// ==================== REFERENCE IMAGE ====================
async function compressImage(file, maxDim, quality){
  maxDim = maxDim || 1024;
  quality = quality || 0.82;
  return new Promise(function(resolve, reject){
    var img = new Image();
    var objUrl = URL.createObjectURL(file);
    img.onload = function(){
      var w = img.naturalWidth, h = img.naturalHeight;
      if(w > maxDim || h > maxDim){
        var r = Math.min(maxDim/w, maxDim/h);
        w = Math.round(w*r); h = Math.round(h*r);
      }
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(function(b){
        URL.revokeObjectURL(objUrl);
        b ? resolve(b) : reject(new Error('compress fail'));
      }, 'image/jpeg', quality);
    };
    img.onerror = function(){ URL.revokeObjectURL(objUrl); reject(new Error('load fail')); };
    img.src = objUrl;
  });
}

function blobToDataURL(blob){
  return new Promise(function(resolve, reject){
    var r = new FileReader();
    r.onload = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
    r.readAsDataURL(blob);
  });
}

async function uploadToCatbox(blob){
  var fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append('fileToUpload', blob, 'reference.jpg');
  var ctrl = new AbortController();
  var t = setTimeout(function(){ ctrl.abort(); }, 20000);
  try{
    var res = await fetch('https://catbox.moe/user/api.php', {method:'POST', body:fd, signal:ctrl.signal});
    clearTimeout(t);
    if(!res.ok) throw new Error('HTTP '+res.status);
    var url = (await res.text()).trim();
    if(url.startsWith('http') && url.length < 500) return url;
    throw new Error('bad response');
  } catch(e){ clearTimeout(t); throw e; }
}

async function handleRefFile(file){
  if(!file || !file.type.startsWith('image/')){
    toast('error', 'Invalid File', 'Select an image.');
    return;
  }
  if(state.refPreviewUrl) URL.revokeObjectURL(state.refPreviewUrl);
  var prevUrl = URL.createObjectURL(file);
  state.refPreviewUrl = prevUrl;
  dom.refPreview.src = prevUrl;
  dom.refPreview.style.display = 'block';
  dom.refDrop.classList.add('has-image');
  dom.clearRefBtn.style.display = 'flex';
  toast('info', 'Processing...', 'Compressing reference image');

  var compressed;
  try{ compressed = await compressImage(file); } catch(e){ compressed = file; }

  try{
    var publicUrl = await uploadToCatbox(compressed);
    state.refImageData = publicUrl;
    toast('success', 'Reference Ready', 'Image uploaded — public URL acquired');
    return;
  } catch(e){ console.warn('Catbox failed:', e); }

  try{
    var dUrl = await blobToDataURL(compressed);
    state.refImageData = dUrl;
    toast('success', 'Reference Ready', 'Image ready (base64 mode)');
  } catch(e){
    toast('error', 'Reference Error', 'Could not process.');
    clearRefImage();
  }
}

function clearRefImage(){
  if(state.refPreviewUrl){ URL.revokeObjectURL(state.refPreviewUrl); state.refPreviewUrl = null; }
  state.refImageData = null;
  dom.refPreview.style.display = 'none';
  dom.refPreview.src = '';
  dom.refDrop.classList.remove('has-image');
  dom.refFileInput.value = '';
  dom.refUrlInput.value = '';
  dom.clearRefBtn.style.display = 'none';
}

function updateRefSection(){
  var show = REF_IMAGE_MODELS.indexOf(state.selectedModel) !== -1;
  var cm = state.customModels.find(function(m){ return m.id === state.selectedModel; });
  if(cm && cm.supportsRef) show = true;
  dom.refSection.style.display = show ? 'block' : 'none';
  if(!show) clearRefImage();
}

// ==================== GENERATION ====================
function genId(){
  return Date.now().toString(36) + Math.random().toString(36).substr(2,6);
}

async function generateImages(){
  if(state.isGenerating) return;
  if(!state.apiKey){
    openSettings();
    toast('error', 'No API Key', 'Set your key in settings.');
    return;
  }
  var prompt = dom.promptInput.value.trim();
  if(!prompt){
    toast('error', 'Empty Prompt', 'Describe what you want.');
    dom.promptInput.focus();
    return;
  }

  state.isGenerating = true;
  dom.generateBtn.disabled = true;

  // Enhance prompt
  if(state.enhanceEnabled){
    try{
      if(!state.bgGenEnabled){
        dom.genPromptText.textContent = 'Enhancing your prompt...';
        showGenOverlay();
      }
      var enhanced = await enhancePrompt(prompt);
      if(enhanced) prompt = enhanced;
    } catch(e){ console.error('Enhance:', e); }
  }

  var fullPrompt = state.selectedStyle ? prompt + ', ' + state.selectedStyle + ' style' : prompt;
  var batchId = genId();
  var total = state.selectedCount;

  // Show appropriate UI
  if(state.bgGenEnabled){
    showBgIndicator(total, fullPrompt);
  } else {
    showGenOverlay();
    dom.genPromptText.textContent = fullPrompt;
    dom.genTotalCount.textContent = total;
    dom.genCurrentCount.textContent = '0';
    dom.genBarFill.style.width = '0%';
    dom.genStatusText.textContent = 'Generating...';
  }

  var results = [];
  var done = 0;

  async function genOne(idx){
    try{
      if(!state.bgGenEnabled){
        dom.genStatusText.textContent = 'Generating image '+(idx+1)+' of '+total+'...';
      }
      updateBgProgress(idx, 'active');

      var body = {
        model: state.selectedModel,
        prompt: fullPrompt,
        ratio: state.selectedRatio
      };

      // Attach reference
      if(state.refImageData){
        var isRef = REF_IMAGE_MODELS.indexOf(state.selectedModel) !== -1;
        var cm = state.customModels.find(function(m){ return m.id === state.selectedModel; });
        if(cm && cm.supportsRef) isRef = true;
        if(isRef) body.image = state.refImageData;
      }

      var res = await fetch('https://api.aquadevs.com/v1/images/generations', {
        method: 'POST',
        headers: {'Authorization':'Bearer '+state.apiKey, 'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      var data = await res.json();
      if(!data.success) throw new Error(data.error || 'Generation failed');

      var imageUrl = null;
      var isPoll = POLLING_MODELS.indexOf(state.selectedModel) !== -1;
      var cmPoll = state.customModels.find(function(m){ return m.id === state.selectedModel; });
      if(cmPoll && cmPoll.usesPolling) isPoll = true;

      if(isPoll && (data.task_id || data.url)){
        var pollUrl = data.url || ('https://api.aquadevs.com/v1/images/tasks/'+data.task_id);
        imageUrl = await pollForImage(pollUrl, idx);
      } else {
        imageUrl = data.url;
      }

      if(imageUrl){
        var name = '';
        if(state.nameEnabled){
          try{ name = await autoName(prompt); } catch(e){}
        }
        var imgData = {
          url: imageUrl,
          prompt: fullPrompt,
          originalPrompt: dom.promptInput.value.trim(),
          name: name || '',
          model: state.selectedModel,
          ratio: state.selectedRatio,
          style: state.selectedStyle,
          timestamp: Date.now(),
          favorite: false,
          batchId: total > 1 ? batchId : null
        };
        var id = await dbPut('gallery', imgData);
        imgData.id = id;
        results.push(imgData);
        updateBgProgress(idx, 'done');
      }
    } catch(err){
      console.error('Gen '+(idx+1)+':', err);
      if(!state.bgGenEnabled) toast('error', 'Generation Failed', err.message);
      updateBgProgress(idx, 'error');
    }
    done++;
    if(!state.bgGenEnabled){
      dom.genCurrentCount.textContent = done;
      dom.genBarFill.style.width = Math.round((done/total)*100)+'%';
    }
    updateBgCount();
  }

  // Simultaneous or sequential
  if(state.simGenEnabled){
    var promises = [];
    for(var i = 0; i < total; i++) promises.push(genOne(i));
    await Promise.all(promises);
  } else {
    for(var i = 0; i < total; i++) await genOne(i);
  }

  if(results.length){
    state.images = results.concat(state.images);
    renderGallery();
    toast('success', 'Generation Complete', 'Created '+results.length+' image'+(results.length>1?'s':''));
  }

  if(state.bgGenEnabled) hideBgIndicator();
  else hideGenOverlay();

  state.isGenerating = false;
  dom.generateBtn.disabled = false;
}

async function pollForImage(url, idx, maxTime){
  maxTime = maxTime || 120000;
  var start = Date.now();
  while(Date.now()-start < maxTime){
    await sleep(3000);
    var res = await fetch(url, {headers:{'Authorization':'Bearer '+state.apiKey}});
    var data = await res.json();
    if(data.status === 'completed' && data.result && data.result.url) return data.result.url;
    if(data.status === 'failed') throw new Error('Async generation failed');
    var elapsed = Math.round((Date.now()-start)/1000);
    if(!state.bgGenEnabled) dom.genStatusText.textContent = 'Processing... ('+elapsed+'s)';
    updateBgProgress(idx, 'active', Math.min(85, elapsed*3));
  }
  throw new Error('Generation timed out');
}

async function enhancePrompt(prompt){
  var res = await fetch('https://api.aquadevs.com/v1/chat/completions', {
    method: 'POST',
    headers: {'Authorization':'Bearer '+state.apiKey, 'Content-Type':'application/json'},
    body: JSON.stringify({
      model: state.enhanceModel,
      messages: [
        {role:'system',content:'Rewrite the user prompt into a more detailed, vivid version for AI image generation. Under 300 chars. Return ONLY the enhanced prompt.'},
        {role:'user',content:prompt}
      ],
      max_tokens: 200, temperature: 0.7
    })
  });
  var data = await res.json();
  return data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content.trim() : null;
}

async function autoName(prompt){
  var res = await fetch('https://api.aquadevs.com/v1/chat/completions', {
    method: 'POST',
    headers: {'Authorization':'Bearer '+state.apiKey, 'Content-Type':'application/json'},
    body: JSON.stringify({
      model: state.nameModel,
      messages: [
        {role:'system',content:'Generate a short catchy title (3-6 words). Return ONLY the title, no quotes.'},
        {role:'user',content:prompt}
      ],
      max_tokens: 30, temperature: 0.8
    })
  });
  var data = await res.json();
  var r = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content.trim() : '';
  return r.replace(/^["']|["']$/g, '');
}

function showGenOverlay(){
  dom.genOverlay.classList.add('active');
  dom.genBarFill.style.width = '0%';
}
function hideGenOverlay(){
  dom.genOverlay.classList.remove('active');
}

// ==================== BG INDICATOR ====================
function showBgIndicator(total){
  bgProgressState = [];
  dom.bgPboxes.innerHTML = '';
  for(var i = 0; i < total; i++){
    bgProgressState.push({status:'pending', progress:0});
    var b = document.createElement('div');
    b.className = 'bg-pbox';
    b.dataset.idx = i;
    dom.bgPboxes.appendChild(b);
  }
  dom.bgCount.textContent = total + ' active';
  dom.bgDetails.innerHTML = '';
  dom.bgIndicator.classList.add('active');
  dom.bgIndicator.classList.remove('expanded');
}

function updateBgProgress(idx, status, progress){
  if(idx >= bgProgressState.length) return;
  bgProgressState[idx].status = status;
  if(progress !== undefined) bgProgressState[idx].progress = progress;
  var boxes = dom.bgPboxes.querySelectorAll('.bg-pbox');
  if(boxes[idx]){
    boxes[idx].className = 'bg-pbox' + (status==='done'?' done':'') + (status==='active'?' active':'') + (status==='error'?' error':'');
  }
  // Update details
  var html = '';
  bgProgressState.forEach(function(s, i){
    html += '<div class="bg-detail">';
    html += '<span class="bg-detail-prompt">Image '+(i+1)+'</span>';
    html += '<div class="bg-detail-meta"><span>'+(s.status==='done'?'✓ Complete':s.status==='error'?'✗ Failed':s.status==='active'?'● Generating':'○ Pending')+'</span></div>';
    if(s.status === 'active'){
      html += '<div class="bg-detail-bar"><div class="bg-detail-fill" style="width:'+(s.progress||10)+'%"></div></div>';
    }
    html += '</div>';
  });
  dom.bgDetails.innerHTML = html;
}

function updateBgCount(){
  var remaining = bgProgressState.filter(function(s){ return s.status==='active'||s.status==='pending'; }).length;
  dom.bgCount.textContent = remaining > 0 ? remaining+' remaining' : 'Complete!';
}

function hideBgIndicator(){
  dom.bgIndicator.classList.remove('active', 'expanded');
  bgProgressState = [];
}

// ==================== DOWNLOAD ====================
function downloadImage(url, prompt){
  var name = sanitizeFilename(prompt || 'aquadevs-image');
  fetch(url).then(function(r){ return r.blob(); }).then(function(blob){
    var bu = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = bu; a.download = name + '.png';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(bu);
    toast('success', 'Downloaded', name+'.png');
  }).catch(function(){
    window.open(url, '_blank');
  });
}

function sanitizeFilename(t){
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').substring(0,80) || 'image';
}

// ==================== TOAST ====================
function toast(type, title, msg){
  var icon = type==='success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : type==='info'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  var el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<div class="toast-icon '+type+'">'+icon+'</div><div class="toast-body"><div class="toast-title">'+esc(title)+'</div>'+(msg?'<div class="toast-msg">'+esc(msg)+'</div>':'')+'</div>';
  dom.toastWrap.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 400); }, 3500);
}

// ==================== UTILITIES ====================
function esc(t){
  if(!t) return '';
  var d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function sleep(ms){
  return new Promise(function(r){ setTimeout(r, ms); });
}

function timeAgo(ts){
  var s = Math.floor((Date.now()-ts)/1000);
  if(s < 60) return 'Just now';
  if(s < 3600) return Math.floor(s/60)+'m ago';
  if(s < 86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}

function copyText(t){
  if(navigator.clipboard){ navigator.clipboard.writeText(t); }
  else {
    var a = document.createElement('textarea');
    a.value = t; a.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(a); a.select();
    document.execCommand('copy'); a.remove();
  }
}

function addCustomStyle(){
  var val = dom.customStyleInput.value.trim();
  if(!val) return;
  var btn = document.createElement('button');
  btn.className = 'schip';
  btn.dataset.style = val.toLowerCase();
  btn.textContent = val;
  btn.type = 'button';
  dom.styleChips.appendChild(btn);
  dom.customStyleInput.value = '';
  dom.addStyleRow.style.display = 'none';
  document.querySelectorAll('.schip').forEach(function(c){ c.classList.remove('active'); });
  btn.classList.add('active');
  state.selectedStyle = val.toLowerCase();
  toast('success', 'Style Added', '"'+val+'" added');
}

// ==================== PWA ====================
function setupPWA(){
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    state.pwaDeferredPrompt = e;
    dom.pwaInstallBtn.style.display = 'inline-flex';
  });

  dom.pwaInstallBtn.addEventListener('click', async function(){
    if(!state.pwaDeferredPrompt) return;
    state.pwaDeferredPrompt.prompt();
    var result = await state.pwaDeferredPrompt.userChoice;
    if(result.outcome === 'accepted'){
      toast('success', 'Installed!', 'AquaDevs Studio is now installed.');
      dom.pwaInstallBtn.style.display = 'none';
    }
    state.pwaDeferredPrompt = null;
  });

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(function(e){
      console.warn('SW registration failed:', e);
    });
  }
}

// ==================== EVENT BINDING ====================
function bindEvents(){

  // ---- Setup Modal ----
  dom.setupAvatarWrap.addEventListener('click', function(){ dom.setupAvatarFile.click(); });
  dom.setupAvatarFile.addEventListener('change', function(e){
    var f = e.target.files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(ev){
      state.avatarData = ev.target.result;
      dom.setupAvatarPreview.src = ev.target.result;
      dom.setupAvatarPreview.style.display = 'block';
      var ph = dom.setupAvatarWrap.querySelector('.setup-avatar-placeholder');
      if(ph) ph.style.display = 'none';
    };
    r.readAsDataURL(f);
  });
  dom.setupEyeToggle.addEventListener('click', function(){
    var i = dom.setupApiKey; i.type = i.type==='password'?'text':'password';
  });
  dom.setupApiKey.addEventListener('input', function(){
    dom.setupSaveBtn.disabled = !dom.setupApiKey.value.trim();
  });
  dom.setupSaveBtn.addEventListener('click', async function(){
    var key = dom.setupApiKey.value.trim();
    if(!key) return;
    dom.setupSaveBtn.disabled = true;
    dom.setupSaveBtn.innerHTML = '<span>Connecting...</span>';
    try{
      var res = await fetch('https://api.aquadevs.com/health', {headers:{'Authorization':'Bearer '+key}});
      var data = await res.json();
      if(data.status === 'online'){
        state.apiKey = key;
        state.userName = dom.setupName.value.trim();
        state.setupComplete = true;
        await saveSetting('apiKey', key);
        await saveSetting('userName', state.userName);
        if(state.avatarData) await saveSetting('avatarData', state.avatarData);
        await saveSetting('setupComplete', true);
        applyProfileUI();
        populateModelSelect();
        hideSetupModal();
        await loadGallery();
        toast('success', 'Welcome!', 'Your workspace is ready.');
      } else {
        toast('error', 'Connection Failed', 'Invalid response from API.');
      }
    } catch(err){
      toast('error', 'Connection Error', 'Could not reach AquaDevs API.');
    }
    dom.setupSaveBtn.disabled = false;
    dom.setupSaveBtn.innerHTML = '<span>Get Started</span>';
  });

  // ---- Settings ----
  dom.settingsCloseBtn.addEventListener('click', closeSettings);
  dom.sidebarSettingsBtn.addEventListener('click', openSettings);
  dom.settingsModal.addEventListener('click', function(e){ if(e.target === dom.settingsModal) closeSettings(); });
  dom.settingsAvatarWrap.addEventListener('click', function(){ dom.settingsAvatarFile.click(); });
  dom.settingsAvatarFile.addEventListener('change', function(e){
    var f = e.target.files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(ev){
      state.avatarData = ev.target.result;
      dom.settingsAvatarPreview.src = ev.target.result;
      dom.settingsAvatarPreview.style.display = 'block';
      var ph = dom.settingsAvatarWrap.querySelector('.settings-avatar-ph');
      if(ph) ph.style.display = 'none';
    };
    r.readAsDataURL(f);
  });
  dom.settingsEyeToggle.addEventListener('click', function(){
    var i = dom.settingsApiKey; i.type = i.type==='password'?'text':'password';
  });
  dom.themeOrange.addEventListener('click', function(){ state.theme = 'orange'; applyTheme('orange'); });
  dom.themeBlue.addEventListener('click', function(){ state.theme = 'blue'; applyTheme('blue'); });

  // Custom model add
  dom.customModelAddBtn.addEventListener('click', async function(){
    var id = dom.customModelId.value.trim();
    if(!id){ toast('error','Empty ID','Enter a model ID.'); return; }
    if(state.customModels.find(function(m){return m.id===id;})){
      toast('error','Duplicate','Model already exists.'); return;
    }
    state.customModels.push({
      id: id,
      supportsRef: dom.customModelRef.checked,
      usesPolling: dom.customModelPoll.checked
    });
    await saveSetting('customModels', state.customModels);
    dom.customModelId.value = '';
    dom.customModelRef.checked = false;
    dom.customModelPoll.checked = false;
    populateModelSelect();
    toast('success','Model Added',id);
  });

  // Custom model remove (delegated)
  dom.customModelsList.addEventListener('click', async function(e){
    var btn = e.target.closest('.cm-remove');
    if(!btn) return;
    var mid = btn.dataset.cmid;
    state.customModels = state.customModels.filter(function(m){ return m.id !== mid; });
    await saveSetting('customModels', state.customModels);
    populateModelSelect();
    toast('success','Model Removed',mid);
  });

  // Save settings
  dom.settingsSaveBtn.addEventListener('click', async function(){
    var key = dom.settingsApiKey.value.trim();
    if(key) state.apiKey = key;
    state.userName = dom.settingsName.value.trim();
    state.defaultModel = dom.settingsDefaultModel.value;
    state.enhanceEnabled = dom.settingsEnhanceToggle.checked;
    state.enhanceModel = dom.settingsEnhanceModel.value;
    state.nameEnabled = dom.settingsNameToggle.checked;
    state.nameModel = dom.settingsNameModel.value;
    state.bgGenEnabled = dom.settingsBgToggle.checked;
    state.simGenEnabled = dom.settingsSimToggle.checked;

    await saveSetting('apiKey', state.apiKey);
    await saveSetting('userName', state.userName);
    if(state.avatarData) await saveSetting('avatarData', state.avatarData);
    await saveSetting('theme', state.theme);
    await saveSetting('defaultModel', state.defaultModel);
    await saveSetting('enhanceEnabled', state.enhanceEnabled);
    await saveSetting('enhanceModel', state.enhanceModel);
    await saveSetting('nameEnabled', state.nameEnabled);
    await saveSetting('nameModel', state.nameModel);
    await saveSetting('bgGenEnabled', state.bgGenEnabled);
    await saveSetting('simGenEnabled', state.simGenEnabled);

    applyProfileUI();
    dom.modelSelect.value = state.defaultModel;
    state.selectedModel = state.defaultModel;
    updateRefSection();
    closeSettings();
    toast('success', 'Settings Saved', 'Preferences updated.');
  });

  // ---- Sidebar ----
  dom.menuToggle.addEventListener('click', function(){
    dom.sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  dom.sidebarOverlay.addEventListener('click', function(){
    closeSidebar(); closePanel();
  });

  // ---- Navigation ----
  document.addEventListener('click', function(e){
    var item = e.target.closest('.nav-item, .mnav');
    if(!item) return;
    var view = item.dataset.view;
    if(view === 'settings'){ openSettings(); closeSidebar(); return; }

    document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
    document.querySelectorAll('.mnav').forEach(function(n){ n.classList.remove('active'); });
    document.querySelectorAll('[data-view="'+view+'"]').forEach(function(n){ n.classList.add('active'); });

    state.currentFilter = view === 'favorites' ? 'favorites' : 'all';
    renderGallery();
    closeSidebar();
  });

  // ---- Search ----
  dom.searchInput.addEventListener('input', renderGallery);

  // ---- Gallery Tabs ----
  document.querySelectorAll('.g-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.g-tab').forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      state.currentFilter = tab.dataset.filter;
      renderGallery();
    });
  });

  // ---- Gallery Clicks (delegated) ----
  dom.galleryGrid.addEventListener('click', function(e){
    // Download
    var dlBtn = e.target.closest('[data-dlid]');
    if(dlBtn){
      e.stopPropagation();
      var img = findImage(Number(dlBtn.dataset.dlid));
      if(img) downloadImage(img.url, img.name||img.originalPrompt||img.prompt);
      return;
    }
    // Favorite
    var favBtn = e.target.closest('[data-favid]');
    if(favBtn){
      e.stopPropagation();
      var img2 = findImage(Number(favBtn.dataset.favid));
      if(img2){
        img2.favorite = !img2.favorite;
        dbPut('gallery', img2).then(renderGallery);
        toast('success', img2.favorite?'Added to Favorites':'Removed from Favorites');
      }
      return;
    }
    // Copy
    var cpBtn = e.target.closest('[data-cpid]');
    if(cpBtn){
      e.stopPropagation();
      var img3 = findImage(Number(cpBtn.dataset.cpid));
      if(img3){ copyText(img3.originalPrompt||img3.prompt); toast('success','Prompt Copied'); }
      return;
    }
    // Batch header toggle
    var bHead = e.target.closest('[data-batch-h]');
    if(bHead){
      var bg = bHead.closest('.batch-group');
      if(bg) bg.classList.toggle('expanded');
      return;
    }
    // Carousel arrow
    var arrow = e.target.closest('[data-cb]');
    if(arrow){
      e.stopPropagation();
      var bid = arrow.dataset.cb;
      var dir = Number(arrow.dataset.dir);
      var batchImgs = state.images.filter(function(i){ return i.batchId === bid; });
      if(batchImgs.length < 2) return;
      batchImgs.sort(function(a,b){ return a.timestamp - b.timestamp; });
      var ci = state.batches[bid] || 0;
      ci = (ci + dir + batchImgs.length) % batchImgs.length;
      state.batches[bid] = ci;
      renderGallery();
      return;
    }
    // Carousel item click → viewer
    var carrItem = e.target.closest('.carousel-item');
    if(carrItem){
      var img4 = findImage(Number(carrItem.dataset.cid));
      if(img4) openViewer(img4);
      return;
    }
    // Single card click → viewer
    var card = e.target.closest('.gcard');
    if(card){
      var img5 = findImage(Number(card.dataset.id));
      if(img5) openViewer(img5);
    }
  });

  // ---- Panel ----
  dom.panelClose.addEventListener('click', closePanel);
  dom.fabBtn.addEventListener('click', openPanel);

  // ---- Prompt ----
  dom.promptInput.addEventListener('input', function(){
    dom.charCount.textContent = dom.promptInput.value.length;
  });
  dom.shuffleBtn.addEventListener('click', function(){
    var p = RANDOM_PROMPTS[Math.floor(Math.random()*RANDOM_PROMPTS.length)];
    dom.promptInput.value = p;
    dom.charCount.textContent = p.length;
    dom.promptInput.focus();
  });

  // ---- Model Select ----
  dom.modelSelect.addEventListener('change', function(){
    state.selectedModel = dom.modelSelect.value;
    updateRefSection();
  });

  // ---- Reference Image ----
  dom.refDrop.addEventListener('click', function(){ dom.refFileInput.click(); });
  dom.refDrop.addEventListener('dragover', function(e){
    e.preventDefault(); dom.refDrop.classList.add('dragover');
  });
  dom.refDrop.addEventListener('dragleave', function(){ dom.refDrop.classList.remove('dragover'); });
  dom.refDrop.addEventListener('drop', function(e){
    e.preventDefault(); e.stopPropagation();
    dom.refDrop.classList.remove('dragover');
    if(e.dataTransfer.files[0]) handleRefFile(e.dataTransfer.files[0]);
  });
  dom.refFileInput.addEventListener('change', function(e){
    if(e.target.files[0]) handleRefFile(e.target.files[0]);
  });
  dom.refUrlBtn.addEventListener('click', function(){
    var url = dom.refUrlInput.value.trim();
    if(!url) return;
    if(!url.startsWith('http')){
      toast('error','Invalid URL','Enter a valid URL.');
      return;
    }
    state.refImageData = url;
    dom.refPreview.src = url;
    dom.refPreview.style.display = 'block';
    dom.refDrop.classList.add('has-image');
    dom.clearRefBtn.style.display = 'flex';
    toast('success','Reference Set','URL loaded.');
  });
  dom.refUrlInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter') dom.refUrlBtn.click();
  });
  dom.clearRefBtn.addEventListener('click', clearRefImage);

  // ---- Ratio ----
  document.querySelectorAll('.ratio-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(btn.id === 'ratioCustomBtn'){
        dom.ratioCustomRow.style.display = dom.ratioCustomRow.style.display==='none'?'flex':'none';
        btn.classList.toggle('active', dom.ratioCustomRow.style.display==='flex');
        if(dom.ratioCustomRow.style.display==='flex') dom.ratioCustomInput.focus();
        return;
      }
      document.querySelectorAll('.ratio-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      state.selectedRatio = btn.dataset.ratio;
      dom.ratioCustomRow.style.display = 'none';
      dom.ratioCustomBtn.classList.remove('active');
    });
  });
  dom.ratioCustomApply.addEventListener('click', function(){
    var val = dom.ratioCustomInput.value.trim();
    if(!val || !val.match(/^\d+:\d+$/)){
      toast('error','Invalid Ratio','Use format like 2:3 or 21:9');
      return;
    }
    document.querySelectorAll('.ratio-btn').forEach(function(b){ b.classList.remove('active'); });
    dom.ratioCustomBtn.classList.add('active');
    state.selectedRatio = val;
    toast('success','Custom Ratio',val+' applied');
  });
  dom.ratioCustomInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter') dom.ratioCustomApply.click();
  });

  // ---- Style Chips ----
  dom.styleChips.addEventListener('click', function(e){
    var chip = e.target.closest('.schip');
    if(!chip) return;
    document.querySelectorAll('.schip').forEach(function(c){ c.classList.remove('active'); });
    chip.classList.add('active');
    state.selectedStyle = chip.dataset.style;
  });
  dom.addStyleBtn.addEventListener('click', function(){
    var show = dom.addStyleRow.style.display === 'none';
    dom.addStyleRow.style.display = show ? 'flex' : 'none';
    if(show) dom.customStyleInput.focus();
  });
  dom.addStyleConfirm.addEventListener('click', addCustomStyle);
  dom.customStyleInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter') addCustomStyle();
  });

  // ---- Count ----
  document.querySelectorAll('.cbtn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.cbtn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      state.selectedCount = parseInt(btn.dataset.count, 10);
    });
  });

  // ---- Generate ----
  dom.generateBtn.addEventListener('click', generateImages);

  // ---- Image Viewer ----
  dom.viewerClose.addEventListener('click', closeViewer);
  dom.imageModal.addEventListener('click', function(e){
    if(e.target === dom.imageModal) closeViewer();
  });
  dom.viewerMaximize.addEventListener('click', function(){
    if(currentViewerImage) openFullscreen(currentViewerImage.url);
  });
  dom.viewerRemix.addEventListener('click', function(){
    remixImage(currentViewerImage);
  });
  dom.viewerDownload.addEventListener('click', function(){
    if(currentViewerImage) downloadImage(currentViewerImage.url, currentViewerImage.name||currentViewerImage.originalPrompt||currentViewerImage.prompt);
  });
  dom.viewerCopy.addEventListener('click', function(){
    if(currentViewerImage){
      copyText(currentViewerImage.originalPrompt||currentViewerImage.prompt);
      toast('success','Prompt Copied');
    }
  });
  dom.viewerFav.addEventListener('click', async function(){
    if(!currentViewerImage) return;
    currentViewerImage.favorite = !currentViewerImage.favorite;
    await dbPut('gallery', currentViewerImage);
    dom.viewerFav.classList.toggle('active', currentViewerImage.favorite);
    renderGallery();
    toast('success', currentViewerImage.favorite?'Added to Favorites':'Removed from Favorites');
  });
  dom.viewerDelete.addEventListener('click', async function(){
    if(!currentViewerImage) return;
    await dbRemove('gallery', currentViewerImage.id);
    state.images = state.images.filter(function(i){ return i.id !== currentViewerImage.id; });
    renderGallery();
    closeViewer();
    toast('success','Image Deleted');
  });

  // ---- Fullscreen ----
  dom.fsMinimize.addEventListener('click', closeFullscreen);
  dom.fsOverlay.addEventListener('wheel', fsWheel, {passive:false});
  dom.fsOverlay.addEventListener('pointerdown', fsPointerDown);
  dom.fsOverlay.addEventListener('pointermove', fsPointerMove);
  dom.fsOverlay.addEventListener('pointerup', fsPointerUp);
  dom.fsOverlay.addEventListener('pointerleave', fsPointerUp);
  dom.fsOverlay.addEventListener('dblclick', fsDblClick);

  // ---- BG Indicator ----
  dom.bgIndicator.addEventListener('click', function(){
    dom.bgIndicator.classList.toggle('expanded');
  });

  // ---- Topbar Avatar ----
  dom.topbarAvatar.addEventListener('click', openSettings);

  // ---- Keyboard ----
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.key === 'n'){
      e.preventDefault();
      openPanel();
      setTimeout(function(){ dom.promptInput.focus(); }, 100);
    }
    if(e.key === 'Escape'){
      if(dom.fsOverlay.classList.contains('active')) closeFullscreen();
      else if(dom.imageModal.classList.contains('open')) closeViewer();
      else if(dom.settingsModal.classList.contains('open')) closeSettings();
      else if(dom.panel.classList.contains('open')) closePanel();
    }
  });
}

// ==================== INITIALIZATION ====================
async function init(){
  cacheDom();
  try{
    await openDB();
    await loadSettings();
  } catch(e){
    console.error('Init:', e);
    showSetupModal();
  }
  bindEvents();
  populateModelSelect();
  updateRefSection();
  setupPWA();
}

init();