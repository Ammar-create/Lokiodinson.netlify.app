/* ============================================================
   KINETIC — GENERATE MODULE
   Image generation (sequential + parallel), prompt enhancement,
   auto-naming, reference images, background generation,
   progress UI, processing indicator
   ============================================================ */

let genPanelModelSelect = null;

// ==================== API HELPERS ====================

async function apiRequest(endpoint, body) {
  const res = await fetch('https://api.aquadevs.com' + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.apiKey
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'API error ' + res.status);
  }
  return res.json();
}

async function apiSearch(query) {
  try {
    const data = await apiRequest('/v1/search', { query, depth: 'basic' });
    if (data.success && data.result && data.result.results) {
      return data.result.results.slice(0, 3).map(r => r.title + ': ' + r.content).join('\n');
    }
  } catch (e) { console.warn('Search failed:', e); }
  return '';
}

async function enhancePromptWithAI(prompt) {
  const messages = [{ role: 'system', content: state.enhancePrompt }];

  let searchContext = '';
  if (state.enhanceWebSearch) {
    searchContext = await apiSearch(prompt);
  }

  let userContent = 'Original prompt: "' + prompt + '"';
  if (searchContext) userContent += '\n\nRelevant web results:\n' + searchContext;

  messages.push({ role: 'user', content: userContent });

  const tools = state.enhanceWebSearch ? [{
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  }] : undefined;

  const body = {
    model: state.enhanceModel === 'custom' ? state.enhanceCustomModel || state.enhanceModel : state.enhanceModel,
    messages,
    max_tokens: 300,
    temperature: 0.7
  };
  if (tools) body.tools = tools;

  const data = await apiRequest('/v1/chat/completions', body);
  return data.choices[0].message.content.trim();
}

async function autoNameImage(prompt) {
  if (!state.nameEnabled) return '';
  try {
    const data = await apiRequest('/v1/chat/completions', {
      model: state.nameModel === 'custom' ? state.nameCustomModel || state.nameModel : state.nameModel,
      messages: [
        { role: 'system', content: state.namePrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.8
    });
    return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    console.warn('Auto-name failed:', e);
    return '';
  }
}

// ==================== REFERENCE IMAGE ====================

async function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1024;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = (h / w) * MAX; w = MAX; }
        else { w = (w / h) * MAX; h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function uploadToHost(blob) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', blob, 'image.jpg');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST', body: form, signal: controller.signal
    });
    clearTimeout(timeout);
    const url = await res.text();
    if (url.startsWith('http')) return url.trim();
  } catch (e) {
    clearTimeout(timeout);
    console.warn('Upload failed:', e);
  }
  return null;
}

async function processRefImage(file) {
  toast('info', 'Processing', 'Compressing reference image...');
  const blob = await compressImage(await readFileAsDataUrl(file));
  if (!blob) { toast('error', 'Error', 'Could not process image.'); return null; }

  const hostedUrl = await uploadToHost(blob);
  if (hostedUrl) {
    toast('success', 'Reference Ready', 'Image uploaded successfully');
    return hostedUrl;
  }

  toast('info', 'Using Local', 'Host unavailable, using compressed version');
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.readAsDataURL(blob);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.readAsDataURL(file);
  });
}

// ==================== GENERATION ====================

async function generateImages() {
  const prompt = dom.promptInput.value.trim();
  if (!prompt) { toast('error', 'No Prompt', 'Please enter a prompt.'); return; }
  if (state.isGenerating) { toast('warn', 'Busy', 'A generation is already in progress.'); return; }

  const model = genPanelModelSelect ? genPanelModelSelect.getValue() : state.selectedModel;
  const ratio = getRatio();
  const count = state.selectedCount;
  const style = state.selectedStyle;
  const hasRef = state.refImageData && modelSupportsRef(model);

  let finalPrompt = prompt;
  if (style) finalPrompt += ', ' + style + ' style';

  // Enhancement
  if (state.enhanceEnabled) {
    try {
      showGenOverlay('Enhancing prompt...', 0, count);
      const enhanced = await enhancePromptWithAI(prompt);
      if (enhanced) finalPrompt = enhanced + (style ? ', ' + style + ' style' : '');
    } catch (e) {
      console.warn('Enhancement failed:', e);
    }
  }

  state.isGenerating = true;
  state.totalCount = count;
  state.completedCount = 0;

  if (state.backgroundGeneration) {
    hideGenOverlay();
    showBgIndicator(count);
    generateInBackground(model, finalPrompt, ratio, count, hasRef);
  } else {
    if (state.parallelGeneration && count > 1) {
      await generateParallel(model, finalPrompt, ratio, count, hasRef);
    } else {
      await generateSequential(model, finalPrompt, ratio, count, hasRef);
    }
    state.isGenerating = false;
    hideGenOverlay();
    hideBgIndicator();
  }
}

async function generateSequential(model, prompt, ratio, count, hasRef) {
  const batchId = uuid();
  showGenOverlay(prompt, 0, count);

  for (let i = 0; i < count; i++) {
    updateGenStatus('Generating image ' + (i + 1) + ' of ' + count + '...');
    try {
      const url = await callImageAPI(model, prompt, ratio, hasRef);
      const name = await autoNameImage(prompt);
      await saveGeneratedImage(url, prompt, prompt, model, ratio, state.selectedStyle, name, batchId, i, state.refImageData);
      state.completedCount = i + 1;
      updateGenProgress(i + 1, count);
    } catch (e) {
      toast('error', 'Generation Failed', e.message);
    }
  }

  toast('success', 'Complete', count + ' image' + (count > 1 ? 's' : '') + ' generated.');
  await loadGallery();
}

async function generateParallel(model, prompt, ratio, count, hasRef) {
  const batchId = uuid();
  showGenOverlay(prompt, 0, count, true);

  // Create parallel boxes
  dom.genBoxes.style.display = '';
  dom.genBoxes.innerHTML = '';
  for (let i = 0; i < count; i++) {
    dom.genBoxes.innerHTML += `<div class="gen-box" id="genBox${i}"><div class="gen-box-fill"></div></div>`;
  }

  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push((async (idx) => {
      const box = document.getElementById('genBox' + idx);
      box.classList.add('processing');
      updateGenStatus('Generating images simultaneously...');
      try {
        const url = await callImageAPI(model, prompt, ratio, hasRef);
        const name = await autoNameImage(prompt);
        await saveGeneratedImage(url, prompt, prompt, model, ratio, state.selectedStyle, name, batchId, idx, state.refImageData);
        state.completedCount++;
        box.classList.remove('processing');
        box.classList.add('done');
        updateGenProgress(state.completedCount, count);
      } catch (e) {
        box.style.borderColor = '#ef4444';
        toast('error', 'Image ' + (idx + 1) + ' Failed', e.message);
      }
    })(i));
  }

  await Promise.all(promises);
  toast('success', 'Complete', count + ' image' + (count > 1 ? 's' : '') + ' generated.');
  dom.genBoxes.style.display = 'none';
  await loadGallery();
}

async function generateInBackground(model, prompt, ratio, count, hasRef) {
  const batchId = uuid();
  const isParallel = state.parallelGeneration && count > 1;

  // Create bg boxes
  dom.bgBoxes.innerHTML = '';
  for (let i = 0; i < count; i++) {
    dom.bgBoxes.innerHTML += '<div class="bg-box" id="bgBox' + i + '"></div>';
  }

  const doOne = async (idx) => {
    try {
      const url = await callImageAPI(model, prompt, ratio, hasRef);
      const name = await autoNameImage(prompt);
      await saveGeneratedImage(url, prompt, prompt, model, ratio, state.selectedStyle, name, batchId, idx, state.refImageData);
      state.completedCount++;
      const box = document.getElementById('bgBox' + idx);
      if (box) box.classList.add('done');
      updateBgCount();
      if (state.completedCount >= count) {
        state.isGenerating = false;
        hideBgIndicator();
        toast('success', 'Background Complete', count + ' image' + (count > 1 ? 's' : '') + ' generated.');
        await loadGallery();
      }
    } catch (e) {
      toast('error', 'BG Generation Failed', e.message);
      state.completedCount++;
      updateBgCount();
    }
  };

  if (isParallel) {
    for (let i = 0; i < count; i++) doOne(i);
  } else {
    (async () => {
      for (let i = 0; i < count; i++) await doOne(i);
    })();
  }
}

async function callImageAPI(model, prompt, ratio, hasRef) {
  const body = { model, prompt, ratio };
  if (hasRef && state.refImageData) {
    body.image = state.refImageData;
    body.n = 1;
  }

  if (modelUsesPolling(model)) {
    const task = await apiRequest('/v1/images/generations', body);
    if (!task.task_id) throw new Error('No task ID returned');
    return await pollForResult(task.task_id);
  }

  const data = await apiRequest('/v1/images/generations', body);
  if (data.data && data.data[0]) {
    return data.data[0].url || data.data[0].b64_json;
  }
  throw new Error('No image returned');
}

async function pollForResult(taskId) {
  for (let i = 0; i < 120; i++) {
    await sleep(2000);
    const res = await fetch('https://api.aquadevs.com/v1/images/tasks/' + taskId, {
      headers: { 'Authorization': 'Bearer ' + state.apiKey }
    });
    const data = await res.json();
    if (data.status === 'completed' || data.status === 'done') {
      if (data.data && data.data[0]) return data.data[0].url;
      if (data.output && data.output.url) return data.output.url;
      if (data.url) return data.url;
    }
    if (data.status === 'failed') throw new Error('Generation failed');
  }
  throw new Error('Polling timeout');
}

async function saveGeneratedImage(url, prompt, originalPrompt, model, ratio, style, name, batchId, batchIndex, refUrl) {
  const img = {
    url,
    prompt,
    originalPrompt,
    model,
    ratio,
    style: style || '',
    name: name || '',
    batchId: batchId || null,
    batchIndex: batchIndex || 0,
    favorite: false,
    timestamp: Date.now(),
    referenceImageUrl: refUrl || null
  };
  const id = await dbPut('gallery', img);
  img.id = id;
  state.images.unshift(img);
  storeImageBlob(id, url);
}

// ==================== GEN OVERLAY UI ====================

function showGenOverlay(prompt, current, total, parallel) {
  dom.genOverlay.classList.add('active');
  dom.genPromptText.textContent = prompt ? prompt.substring(0, 150) + (prompt.length > 150 ? '...' : '') : '';
  dom.genCurrentCount.textContent = current;
  dom.genTotalCount.textContent = total;
  dom.genBarFill.style.width = (total > 0 ? (current / total * 100) : 0) + '%';
  dom.genStatusText.textContent = 'Preparing...';
  dom.genBoxes.style.display = parallel ? '' : 'none';
  if (!parallel) dom.genBoxes.innerHTML = '';

  // Generate particles
  dom.genParticles.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'gen-particle';
    p.style.cssText = 'left:' + (20 + Math.random() * 60) + '%;top:' + (40 + Math.random() * 40) + '%;animation-delay:' + (Math.random() * 3) + 's;animation-duration:' + (2 + Math.random() * 2) + 's;';
    dom.genParticles.appendChild(p);
  }
}

function hideGenOverlay() {
  dom.genOverlay.classList.remove('active');
}

function updateGenStatus(text) {
  dom.genStatusText.textContent = text;
}

function updateGenProgress(current, total) {
  dom.genCurrentCount.textContent = current;
  dom.genTotalCount.textContent = total;
  dom.genBarFill.style.width = (total > 0 ? (current / total * 100) : 0) + '%';
  if (current < total) {
    updateGenStatus('Generating image ' + (current + 1) + ' of ' + total + '...');
  } else {
    updateGenStatus('Complete!');
  }
}

// ==================== BG INDICATOR UI ====================

function showBgIndicator(count) {
  dom.bgIndicator.style.display = '';
  dom.bgCount.textContent = '0/' + count;
  dom.bgBoxes.innerHTML = '';
  for (let i = 0; i < count; i++) {
    dom.bgBoxes.innerHTML += '<div class="bg-box"></div>';
  }
  initBgDrag();
}

function hideBgIndicator() {
  dom.bgIndicator.style.display = 'none';
}

function updateBgCount() {
  dom.bgCount.textContent = state.completedCount + '/' + state.totalCount;
}

function initBgDrag() {
  let dragging = false, startX, startY, startLeft, startTop;
  const el = dom.bgIndicator;

  el.addEventListener('mousedown', (e) => {
    if (e.target.closest('.bg-box')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = startLeft + 'px';
    el.style.top = startTop + 'px';
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    el.style.left = (startLeft + e.clientX - startX) + 'px';
    el.style.top = (startTop + e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => { dragging = false; });
}

// ==================== MODEL SELECT (Gen Panel) ====================

function updateModelSelect() {
  const opts = getEnabledModels().map(m => ({ value: m.id, label: m.name || m.id }));
  if (genPanelModelSelect) {
    genPanelModelSelect.setOptions(opts);
    genPanelModelSelect.setValue(state.defaultModel);
  }
}

function updateRefSection() {
  const model = genPanelModelSelect ? genPanelModelSelect.getValue() : state.selectedModel;
  dom.refSection.style.display = modelSupportsRef(model) ? '' : 'none';
}

// ==================== BIND GENERATE EVENTS ====================

function bindGenerateEvents() {
  // Model select
  const modelOpts = getEnabledModels().map(m => ({ value: m.id, label: m.name || m.id }));
  genPanelModelSelect = new KineticSelect(dom.modelSelectWrap, modelOpts, () => {
    updateRefSection();
  });
  genPanelModelSelect.setValue(state.defaultModel);
  updateRefSection();

  // Prompt
  dom.promptInput.addEventListener('input', () => {
    dom.charCount.textContent = dom.promptInput.value.length;
  });

  dom.shuffleBtn.addEventListener('click', () => {
    const p = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    dom.promptInput.value = p;
    dom.charCount.textContent = p.length;
    dom.promptInput.focus();
  });

  // Enhance button
  dom.enhanceBtn.addEventListener('click', async () => {
    const prompt = dom.promptInput.value.trim();
    if (!prompt) return;
    dom.enhanceBtn.disabled = true;
    dom.enhanceBtn.querySelector('span').textContent = 'Enhancing...';
    try {
      const enhanced = await enhancePromptWithAI(prompt);
      if (enhanced) {
        dom.promptInput.value = enhanced;
        dom.charCount.textContent = enhanced.length;
        toast('success', 'Enhanced', 'Prompt has been improved.');
      }
    } catch (e) {
      toast('error', 'Enhancement Failed', e.message);
    }
    dom.enhanceBtn.disabled = false;
    dom.enhanceBtn.querySelector('span').textContent = 'Enhance Prompt';
  });

  // Show/hide enhance button based on settings
  function updateEnhanceBtn() {
    dom.enhanceBtn.style.display = (state.enhanceEnabled && state.enhanceManual) ? '' : 'none';
  }
  updateEnhanceBtn();

  // Reference image
  dom.refDrop.addEventListener('click', (e) => {
    if (e.target === dom.refPreview) return;
    dom.refFileInput.click();
  });

  dom.refDrop.addEventListener('dragover', (e) => { e.preventDefault(); dom.refDrop.classList.add('dragover'); });
  dom.refDrop.addEventListener('dragleave', () => dom.refDrop.classList.remove('dragover'));
  dom.refDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dom.refDrop.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleRefFile(e.dataTransfer.files[0]);
  });

  dom.refFileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleRefFile(e.target.files[0]); });

  async function handleRefFile(file) {
    const result = await processRefImage(file);
    if (result) {
      state.refImageData = result;
      dom.refPreview.src = result;
      dom.refPreview.style.display = 'block';
      dom.refDropInner.style.display = 'none';
      dom.refDrop.classList.add('has-image');
      dom.clearRefBtn.style.display = '';
    }
  }

  dom.refUrlBtn.addEventListener('click', () => {
    const url = dom.refUrlInput.value.trim();
    if (!url || !url.startsWith('http')) {
      toast('error', 'Invalid URL', 'Enter a valid image URL.');
      return;
    }
    state.refImageData = url;
    dom.refPreview.src = url;
    dom.refPreview.style.display = 'block';
    dom.refDropInner.style.display = 'none';
    dom.refDrop.classList.add('has-image');
    dom.clearRefBtn.style.display = '';
  });

  dom.refUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') dom.refUrlBtn.click(); });

  dom.clearRefBtn.addEventListener('click', () => {
    state.refImageData = null;
    dom.refPreview.style.display = 'none';
    dom.refPreview.src = '';
    dom.refDropInner.style.display = '';
    dom.refDrop.classList.remove('has-image');
    dom.clearRefBtn.style.display = 'none';
    dom.refUrlInput.value = '';
    dom.refFileInput.value = '';
  });

  // Ratio buttons
  document.querySelectorAll('#genPanel .ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#genPanel .ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedRatio = btn.dataset.ratio;
      dom.customRatio.style.display = btn.dataset.ratio === 'custom' ? '' : 'none';
    });
  });

  dom.customRatioW.addEventListener('input', () => { state.customRatioW = dom.customRatioW.value; });
  dom.customRatioH.addEventListener('input', () => { state.customRatioH = dom.customRatioH.value; });

  // Style chips
  dom.styleChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.schip');
    if (!chip) return;
    document.querySelectorAll('#genPanel .schip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedStyle = chip.dataset.style;
  });

  dom.addStyleBtn.addEventListener('click', () => {
    dom.addStyleRow.style.display = dom.addStyleRow.style.display === 'none' ? '' : 'none';
    if (dom.addStyleRow.style.display !== 'none') dom.customStyleInput.focus();
  });

  dom.addStyleConfirm.addEventListener('click', () => addCustomStyle());
  dom.customStyleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCustomStyle(); });

  function addCustomStyle() {
    const val = dom.customStyleInput.value.trim();
    if (!val) return;
    const btn = document.createElement('button');
    btn.className = 'schip';
    btn.dataset.style = val.toLowerCase();
    btn.textContent = val;
    btn.type = 'button';
    dom.styleChips.appendChild(btn);
    dom.customStyleInput.value = '';
    dom.addStyleRow.style.display = 'none';
    document.querySelectorAll('#genPanel .schip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    state.selectedStyle = val.toLowerCase();
    toast('success', 'Style Added', '"' + val + '" added to your styles');
  }

  // Count buttons
  document.querySelectorAll('#genPanel .cbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#genPanel .cbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedCount = parseInt(btn.dataset.count, 10);
    });
  });

  // Generate button
  dom.generateBtn.addEventListener('click', () => {
    generateImages();
    if (!state.backgroundGeneration) {
      // Close panel when showing overlay
      closeGenPanel();
    }
  });

  // Dynamic visibility
  setInterval(() => {
    updateEnhanceBtn();
  }, 1000);
}

document.addEventListener('DOMContentLoaded', bindGenerateEvents);