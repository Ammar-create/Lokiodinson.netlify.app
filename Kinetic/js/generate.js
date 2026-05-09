/* ============================================================
   KINETIC — GENERATE MODULE
   Image generation (sequential/parallel), enhance, auto-name,
   reference images, background generation
   ============================================================ */

// ==================== API HELPERS ====================

async function apiRequest(endpoint, body) {
  const res = await fetch('https://api.aquadevs.com' + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.apiKey },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error ? err.error.message : 'API error ' + res.status);
  }
  return res.json();
}

async function apiSearch(query) {
  try {
    const data = await apiRequest('/v1/search', { query, count: 3 });
    if (data.results) return data.results.map(r => r.title + ': ' + (r.snippet || r.description || '')).join('\n');
    if (data.web && data.web.results) return data.web.results.map(r => r.title + ': ' + r.description).join('\n');
  } catch (e) { console.warn('[Kinetic] Search failed:', e); }
  return '';
}

async function enhancePromptWithAI(prompt) {
  const messages = [{ role: 'system', content: state.enhancePrompt }];
  let searchContext = '';
  if (state.enhanceWebSearch) searchContext = await apiSearch(prompt);
  const userContent = [{ type: 'text', text: prompt }];
  if (searchContext) userContent.push({ type: 'text', text: 'Web search results:\n' + searchContext });
  messages.push({ role: 'user', content: userContent });
  const tools = state.enhanceWebSearch ? [{ type: 'function', function: { name: 'web_search', description: 'Search the web', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } }] : undefined;
  const body = { model: state.enhanceModel, messages, max_tokens: 400, temperature: 0.7 };
  if (tools) body.tools = tools;
  const data = await apiRequest('/v1/chat/completions', body);
  return data.choices[0].message.content.trim();
}

async function autoNameImage(prompt) {
  try {
    const data = await apiRequest('/v1/chat/completions', { model: state.nameModel, messages: [{ role: 'system', content: state.namePrompt }, { role: 'user', content: prompt }], max_tokens: 40, temperature: 0.5 });
    return data.choices[0].message.content.replace(/["']/g, '').trim();
  } catch (e) { return prompt.substring(0, 30); }
}

// ==================== IMAGE PROCESSING ====================

async function compressImage(file, maxW, maxH, quality) {
  maxW = maxW || 1568; maxH = maxH || 1568; quality = quality || 0.82;
  const bmp = await createImageBitmap(file);
  let w = bmp.width, h = bmp.height;
  if (w > maxW || h > maxH) { const s = Math.min(maxW / w, maxH / h); w = Math.round(w * s); h = Math.round(h * s); }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  return new Promise(r => c.toBlob(b => r(b), 'image/jpeg', quality));
}

async function uploadToHost(blob) {
  const fd = new FormData(); fd.append('reqtype', 'fileupload'); fd.append('fileToUpload', blob, 'ref.jpg');
  try {
    const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: fd });
    if (res.ok) return await res.text();
  } catch (e) { console.warn('[Kinetic] Upload failed:', e); }
  return null;
}

async function processRefImage(file) {
  const blob = await compressImage(file);
  if (!blob) return null;
  const url = await uploadToHost(blob);
  if (url) return url.trim();
  toast('warn', 'Upload Failed', 'Storing as local preview only.');
  return readFileAsDataUrl(blob);
}

function readFileAsDataUrl(file) {
  return new Promise(r => { const reader = new FileReader(); reader.onload = (e) => r(e.target.result); reader.readAsDataURL(file); });
}

// ==================== MODEL SELECT (Gen Panel) ====================

let genPanelModelSelect = null;

// *** CRITICAL FIX: always returns a valid model ID ***
function getSelectedModel() {
  if (genPanelModelSelect && !genPanelModelSelect._disabled) {
    const v = genPanelModelSelect.getValue();
    if (v) return v;
  }
  // Fallback: first enabled model, or state default, or hardcoded
  const enabled = getEnabledModels();
  if (enabled.length) return enabled[0].id;
  return state.defaultModel || 'gptimage-2';
}

function updateModelSelect() {
  const opts = getEnabledModels().map(m => ({ value: m.id, label: m.name || m.id }));
  if (genPanelModelSelect && !genPanelModelSelect._disabled) {
    genPanelModelSelect.setOptions(opts);
    genPanelModelSelect.setValue(state.defaultModel);
  }
  updateRefSection();
}

function updateRefSection() {
  const model = getSelectedModel();
  if (dom.refSection) dom.refSection.style.display = modelSupportsRef(model) ? '' : 'none';
}

// ==================== GENERATION ====================

async function generateImages() {
  const prompt = dom.promptInput ? dom.promptInput.value.trim() : '';
  if (!prompt) { toast('error', 'No Prompt', 'Please enter a prompt.'); return; }
  if (state.isGenerating) { toast('warn', 'Busy', 'A generation is already in progress.'); return; }
  if (!state.apiKey) { toast('error', 'No API Key', 'Please configure your API key in settings.'); return; }

  const model = getSelectedModel();
  let finalPrompt = prompt;

  // Enhance if auto
  if (state.enhanceEnabled && !state.enhanceManual) {
    try {
      const enhanced = await enhancePromptWithAI(prompt);
      if (enhanced) finalPrompt = enhanced;
    } catch (e) { console.warn('[Kinetic] Auto-enhance failed:', e); }
  }

  // Append style
  if (state.selectedStyle) finalPrompt += ', ' + state.selectedStyle;

  const ratio = getRatio();
  const count = state.selectedCount;
  const hasRef = modelSupportsRef(model) && state.refImageData;

  state.isGenerating = true;
  state.completedCount = 0;
  state.totalCount = count;

  const batchId = uuid();

  if (state.backgroundGeneration) {
    showBgIndicator(count);
    generateInBackground(model, finalPrompt, prompt, ratio, count, hasRef, batchId);
    closeGenPanel();
  } else if (state.parallelGeneration && count > 1) {
    showGenOverlay(finalPrompt, 0, count);
    await generateParallel(model, finalPrompt, prompt, ratio, count, hasRef, batchId);
  } else {
    showGenOverlay(finalPrompt, 0, count);
    await generateSequential(model, finalPrompt, prompt, ratio, count, hasRef, batchId);
  }
}

async function generateSequential(model, finalPrompt, originalPrompt, ratio, count, hasRef, batchId) {
  let completed = 0;
  for (let i = 0; i < count; i++) {
    updateGenStatus('Generating image ' + (i + 1) + ' of ' + count + '...');
    try {
      const url = await callImageAPI(model, finalPrompt, ratio, hasRef);
      await saveGeneratedImage(url, finalPrompt, originalPrompt, model, ratio, batchId, i);
      completed++;
      updateGenProgress(completed, count);
    } catch (e) {
      toast('error', 'Generation Failed', e.message);
      break;
    }
  }
  state.isGenerating = false;
  hideGenOverlay();
  toast('success', 'Generation Complete', completed + ' image' + (completed > 1 ? 's' : '') + ' created.');
  await loadGallery();
}

async function generateParallel(model, finalPrompt, originalPrompt, ratio, count, hasRef, batchId) {
  if (dom.genBoxes) {
    dom.genBoxes.style.display = '';
    dom.genBoxes.innerHTML = '';
    for (let i = 0; i < count; i++) dom.genBoxes.innerHTML += `<div class="gen-box" id="genBox${i}"><div class="gen-box-fill"></div></div>`;
  }

  let completed = 0;
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push((async (idx) => {
      const box = document.getElementById('genBox' + idx);
      if (box) box.classList.add('processing');
      try {
        const url = await callImageAPI(model, finalPrompt, ratio, hasRef);
        await saveGeneratedImage(url, finalPrompt, originalPrompt, model, ratio, batchId, idx);
        completed++;
        if (box) { box.classList.remove('processing'); box.classList.add('done'); }
        updateGenProgress(completed, count);
      } catch (e) {
        if (box) box.style.borderColor = '#ef4444';
        toast('error', 'Image ' + (idx + 1) + ' Failed', e.message);
      }
    })(i));
  }
  await Promise.all(promises);
  if (dom.genBoxes) dom.genBoxes.style.display = 'none';
  state.isGenerating = false;
  hideGenOverlay();
  toast('success', 'Generation Complete', completed + ' image' + (completed > 1 ? 's' : '') + ' created.');
  await loadGallery();
}

async function generateInBackground(model, finalPrompt, originalPrompt, ratio, count, hasRef, batchId) {
  let completed = 0;
  for (let i = 0; i < count; i++) {
    try {
      const url = await callImageAPI(model, finalPrompt, ratio, hasRef);
      await saveGeneratedImage(url, finalPrompt, originalPrompt, model, ratio, batchId, i);
      completed++;
      updateBgCount(completed, count);
    } catch (e) {
      console.warn('[Kinetic] Background gen failed:', e);
      break;
    }
  }
  state.isGenerating = false;
  hideBgIndicator();
  toast('success', 'Background Complete', completed + ' image' + (completed > 1 ? 's' : '') + ' generated.');
  await loadGallery();
}

// ==================== API CALL ====================

async function callImageAPI(model, prompt, ratio, useRef) {
  const body = { model, prompt, ratio: ratio || 'landscape', n: 1 };
  if (useRef && state.refImageData) {
    body.image = state.refImageData;
    body.n = 1;
  }
  const data = await apiRequest('/v1/images/generations', body);

  if (data.data && data.data[0] && data.data[0].url) return data.data[0].url;
  if (data.task_id) return await pollForResult(model, data.task_id);
  if (data.data && data.data[0] && data.data[0].b64_json) return 'data:image/png;base64,' + data.data[0].b64_json;

  throw new Error('Unexpected API response');
}

async function pollForResult(model, taskId) {
  updateGenStatus('Waiting for ' + model + ' to finish...');
  let attempts = 0;
  while (attempts < 120) {
    await sleep(3000);
    attempts++;
    try {
      const res = await fetch('https://api.aquadevs.com/v1/images/tasks/' + taskId, {
        headers: { 'Authorization': 'Bearer ' + state.apiKey }
      });
      if (!res.ok) throw new Error('Poll failed');
      const data = await res.json();
      if (data.status === 'completed' || data.status === 'done') {
        if (data.data && data.data[0] && data.data[0].url) return data.data[0].url;
        if (data.output && data.output.url) return data.output.url;
        if (data.url) return data.url;
        throw new Error('Completed but no URL');
      }
      if (data.status === 'failed' || data.status === 'error') throw new Error(data.error || 'Task failed');
      updateGenStatus('Processing... (' + (attempts * 3) + 's)');
    } catch (e) {
      if (e.message.includes('Task failed') || e.message.includes('Completed but')) throw e;
      console.warn('[Kinetic] Poll error:', e);
    }
  }
  throw new Error('Generation timed out');
}

// ==================== SAVE ====================

async function saveGeneratedImage(url, prompt, originalPrompt, model, ratio, batchId, batchIndex) {
  let name = '';
  if (state.nameEnabled) {
    try { name = await autoNameImage(prompt); } catch (e) { /* */ }
  }
  const img = {
    url, prompt, originalPrompt, model, ratio,
    style: state.selectedStyle || '',
    name, batchId, batchIndex,
    favorite: false, timestamp: Date.now(),
    referenceImageBlob: state.refImageData || null
  };
  const id = await dbPut('gallery', img);
  img.id = id;
  state.images.unshift(img);
  storeImageBlob(id, url);
}

// ==================== OVERLAY UI ====================

function showGenOverlay(prompt, current, total) {
  if (!dom.genOverlay) return;
  if (dom.genPromptText) dom.genPromptText.textContent = prompt || '';
  if (dom.genBarFill) dom.genBarFill.style.width = '0%';
  if (dom.genStatusText) dom.genStatusText.textContent = 'Starting...';
  if (dom.genCurrentCount) dom.genCurrentCount.textContent = current;
  if (dom.genTotalCount) dom.genTotalCount.textContent = total;
  if (dom.genBoxes) dom.genBoxes.style.display = 'none';
  dom.genOverlay.classList.add('open');
}

function hideGenOverlay() {
  if (dom.genOverlay) dom.genOverlay.classList.remove('open');
}

function updateGenStatus(msg) {
  if (dom.genStatusText) dom.genStatusText.textContent = msg;
}

function updateGenProgress(current, total) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  if (dom.genBarFill) dom.genBarFill.style.width = pct + '%';
  if (dom.genCurrentCount) dom.genCurrentCount.textContent = current;
}

// ==================== BG INDICATOR ====================

let bgDragging = false, bgOffX = 0, bgOffY = 0;

function showBgIndicator(total) {
  if (!dom.bgIndicator) return;
  if (dom.bgCount) dom.bgCount.textContent = '0/' + total;
  dom.bgIndicator.style.display = '';
}

function hideBgIndicator() {
  if (dom.bgIndicator) dom.bgIndicator.style.display = 'none';
}

function updateBgCount(current, total) {
  if (dom.bgCount) dom.bgCount.textContent = current + '/' + total;
}

function initBgDrag() {
  if (!dom.bgIndicator) return;
  dom.bgIndicator.addEventListener('mousedown', (e) => {
    bgDragging = true;
    const r = dom.bgIndicator.getBoundingClientRect();
    bgOffX = e.clientX - r.left; bgOffY = e.clientY - r.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!bgDragging) return;
    dom.bgIndicator.style.left = (e.clientX - bgOffX) + 'px';
    dom.bgIndicator.style.top = (e.clientY - bgOffY) + 'px';
    dom.bgIndicator.style.right = 'auto';
    dom.bgIndicator.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => { bgDragging = false; });
}

// ==================== BIND GENERATE EVENTS ====================

function bindGenerateEvents() {
  console.log('[Kinetic] Binding generate events...');

  // Model select — use DEFAULT options immediately, will be updated once state is ready
  const initialOpts = getEnabledModels().length > 0
    ? getEnabledModels().map(m => ({ value: m.id, label: m.name || m.id }))
    : DEFAULT_IMAGE_MODELS.filter(m => m.enabled).map(m => ({ value: m.id, label: m.name }));

  genPanelModelSelect = new KineticSelect(dom.modelSelectWrap, initialOpts);
  if (!genPanelModelSelect._disabled) {
    genPanelModelSelect.setValue(state.defaultModel || 'gptimage-2');
  }
  updateRefSection();

  // Prompt char count
  if (dom.promptInput) {
    dom.promptInput.addEventListener('input', () => {
      if (dom.charCount) dom.charCount.textContent = dom.promptInput.value.length;
    });
  }

  // Shuffle
  if (dom.shuffleBtn) {
    dom.shuffleBtn.addEventListener('click', () => {
      const p = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
      if (dom.promptInput) {
        dom.promptInput.value = p;
        if (dom.charCount) dom.charCount.textContent = p.length;
        dom.promptInput.focus();
      }
    });
  }

  // Enhance button
  if (dom.enhanceBtn) {
    dom.enhanceBtn.addEventListener('click', async () => {
      const prompt = dom.promptInput ? dom.promptInput.value.trim() : '';
      if (!prompt) return;
      dom.enhanceBtn.disabled = true;
      const span = dom.enhanceBtn.querySelector('span');
      if (span) span.textContent = 'Enhancing...';
      try {
        const enhanced = await enhancePromptWithAI(prompt);
        if (enhanced && dom.promptInput) {
          dom.promptInput.value = enhanced;
          if (dom.charCount) dom.charCount.textContent = enhanced.length;
          toast('success', 'Enhanced', 'Prompt improved.');
        }
      } catch (e) { toast('error', 'Enhancement Failed', e.message); }
      dom.enhanceBtn.disabled = false;
      if (span) span.textContent = 'Enhance Prompt';
    });
  }

  // Enhance visibility
  setInterval(() => {
    if (dom.enhanceBtn) dom.enhanceBtn.style.display = (state.enhanceEnabled && state.enhanceManual) ? '' : 'none';
  }, 2000);

  // Reference image upload
  if (dom.refDrop) {
    dom.refDrop.addEventListener('click', (e) => {
      if (e.target === dom.refPreview || e.target === dom.refUrlInput || e.target === dom.refUrlBtn) return;
      if (dom.refFileInput) dom.refFileInput.click();
    });
    dom.refDrop.addEventListener('dragover', (e) => { e.preventDefault(); dom.refDrop.classList.add('dragover'); });
    dom.refDrop.addEventListener('dragleave', () => dom.refDrop.classList.remove('dragover'));
    dom.refDrop.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); dom.refDrop.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleRefFile(e.dataTransfer.files[0]); });
  }

  if (dom.refFileInput) dom.refFileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleRefFile(e.target.files[0]); });

  async function handleRefFile(file) {
    toast('info', 'Processing', 'Compressing reference image...');
    const result = await processRefImage(file);
    if (result) {
      state.refImageData = result;
      if (dom.refPreview) { dom.refPreview.src = result; dom.refPreview.style.display = 'block'; }
      if (dom.refDropInner) dom.refDropInner.style.display = 'none';
      if (dom.refDrop) dom.refDrop.classList.add('has-image');
      if (dom.clearRefBtn) dom.clearRefBtn.style.display = '';
    }
  }

  if (dom.refUrlBtn) {
    dom.refUrlBtn.addEventListener('click', () => {
      const url = dom.refUrlInput ? dom.refUrlInput.value.trim() : '';
      if (!url || !url.startsWith('http')) { toast('error', 'Invalid URL', 'Enter a valid image URL.'); return; }
      state.refImageData = url;
      if (dom.refPreview) { dom.refPreview.src = url; dom.refPreview.style.display = 'block'; }
      if (dom.refDropInner) dom.refDropInner.style.display = 'none';
      if (dom.refDrop) dom.refDrop.classList.add('has-image');
      if (dom.clearRefBtn) dom.clearRefBtn.style.display = '';
    });
  }

  if (dom.refUrlInput) dom.refUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && dom.refUrlBtn) dom.refUrlBtn.click(); });

  if (dom.clearRefBtn) {
    dom.clearRefBtn.addEventListener('click', () => {
      state.refImageData = null;
      if (dom.refPreview) { dom.refPreview.style.display = 'none'; dom.refPreview.src = ''; }
      if (dom.refDropInner) dom.refDropInner.style.display = '';
      if (dom.refDrop) dom.refDrop.classList.remove('has-image');
      dom.clearRefBtn.style.display = 'none';
      if (dom.refUrlInput) dom.refUrlInput.value = '';
      if (dom.refFileInput) dom.refFileInput.value = '';
    });
  }

  // Ratio buttons
  document.querySelectorAll('#genPanel .ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#genPanel .ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedRatio = btn.dataset.ratio;
      if (dom.customRatio) dom.customRatio.style.display = btn.dataset.ratio === 'custom' ? '' : 'none';
    });
  });

  if (dom.customRatioW) dom.customRatioW.addEventListener('input', () => { state.customRatioW = dom.customRatioW.value; });
  if (dom.customRatioH) dom.customRatioH.addEventListener('input', () => { state.customRatioH = dom.customRatioH.value; });

  // Style chips — delegated on container
  if (dom.styleChips) {
    dom.styleChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.schip');
      if (!chip) return;
      dom.styleChips.querySelectorAll('.schip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedStyle = chip.dataset.style || '';
    });
  }

  // Add custom style
  if (dom.addStyleBtn) {
    dom.addStyleBtn.addEventListener('click', () => {
      if (!dom.addStyleRow) return;
      dom.addStyleRow.style.display = dom.addStyleRow.style.display === 'none' ? '' : 'none';
      if (dom.addStyleRow.style.display !== 'none' && dom.customStyleInput) dom.customStyleInput.focus();
    });
  }

  function addCustomStyle() {
    const val = dom.customStyleInput ? dom.customStyleInput.value.trim() : '';
    if (!val) return;
    const btn = document.createElement('button');
    btn.className = 'schip';
    btn.dataset.style = val.toLowerCase();
    btn.textContent = val;
    btn.type = 'button';
    if (dom.styleChips) dom.styleChips.appendChild(btn);
    if (dom.customStyleInput) dom.customStyleInput.value = '';
    if (dom.addStyleRow) dom.addStyleRow.style.display = 'none';
    dom.styleChips.querySelectorAll('.schip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    state.selectedStyle = val.toLowerCase();
    toast('success', 'Style Added', '"' + val + '" is ready.');
  }

  if (dom.addStyleConfirm) dom.addStyleConfirm.addEventListener('click', addCustomStyle);
  if (dom.customStyleInput) dom.customStyleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCustomStyle(); });

  // Count buttons
  document.querySelectorAll('#genPanel .cbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#genPanel .cbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedCount = parseInt(btn.dataset.count, 10);
    });
  });

  // Generate button — THE MAIN ONE
  if (dom.generateBtn) {
    dom.generateBtn.addEventListener('click', () => {
      generateImages();
      if (!state.backgroundGeneration) closeGenPanel();
    });
    console.log('[Kinetic] Generate button bound.');
  } else {
    console.error('[Kinetic] Generate button #generateBtn NOT FOUND!');
  }

  // Update model select once state becomes ready
  document.addEventListener('kinetic:ready', () => {
    updateModelSelect();
    console.log('[Kinetic] Generate module synced with loaded settings.');
  });

  // Background drag
  initBgDrag();

  console.log('[Kinetic] Generate events bound.');
}

document.addEventListener('DOMContentLoaded', bindGenerateEvents);