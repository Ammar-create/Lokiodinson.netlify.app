/* ============================================================
   KINETIC — REMIX MODULE (FIXED)
   Remix panel, image selection, action buttons, multimodal
   processing, automatic/manual mode, recent remixes
   ============================================================ */

const REMIX_ACTION_PROMPTS = BUILT_IN_ACTIONS.map(a => ({ ...a, builtin: true }));

// ==================== INIT REMIX PANEL ====================

function initRemixPanel() {
  renderRemixActions();
  renderRemixPickGrid();
  updateRemixManualHint();
  renderRecentRemixes();

  if (dom.remixRatioW) dom.remixRatioW.value = state.remixCustomRatioW || '';
  if (dom.remixRatioH) dom.remixRatioH.value = state.remixCustomRatioH || '';

  document.querySelectorAll('#remixPanel .ratio-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.ratio === state.remixSelectedRatio);
  });
  if (dom.remixCustomRatio) dom.remixCustomRatio.style.display = state.remixSelectedRatio === 'custom' ? '' : 'none';

  document.querySelectorAll('#remixPanel .cbtn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.count) === state.remixSelectedCount);
  });
}

// ==================== REMIX SOURCE TABS ====================

function updateRemixSourceUI() {
  if (state.remixRefSource === 'gallery') {
    if (dom.remixGalleryPick) dom.remixGalleryPick.style.display = '';
    if (dom.remixUploadPick) dom.remixUploadPick.style.display = 'none';
  } else {
    if (dom.remixGalleryPick) dom.remixGalleryPick.style.display = 'none';
    if (dom.remixUploadPick) dom.remixUploadPick.style.display = '';
  }

  document.querySelectorAll('.rstab').forEach(t => {
    t.classList.toggle('active', t.dataset.source === state.remixRefSource);
  });

  if (state.remixRefImageData) {
    if (dom.remixSelected) dom.remixSelected.style.display = '';
    if (dom.remixSelectedImg) dom.remixSelectedImg.src = state.remixRefPreviewUrl || state.remixRefImageData;
  } else {
    if (dom.remixSelected) dom.remixSelected.style.display = 'none';
  }
}

function renderRemixPickGrid() {
  if (!dom.remixPickGrid) return;
  const imgs = state.images.slice(0, 50);
  dom.remixPickGrid.innerHTML = imgs.map(img =>
    `<div class="remix-pick-item" data-id="${img.id}"><img src="${esc(img.url)}" alt="" loading="lazy"></div>`
  ).join('');

  dom.remixPickGrid.querySelectorAll('.remix-pick-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = state.images.find(i => i.id === parseInt(item.dataset.id));
      if (!img) return;
      state.remixRefImageData = img.url;
      state.remixRefPreviewUrl = img.url;
      state.remixRefSource = 'gallery';
      updateRemixSourceUI();
    });
  });
}

// ==================== REMIX ACTIONS ====================

function renderRemixActions() {
  if (!dom.actionGrid) return;
  const allActions = [...REMIX_ACTION_PROMPTS, ...state.customRemixActions];
  dom.actionGrid.innerHTML = allActions.map((a, i) =>
    `<div class="action-card" data-idx="${i}">
      <span class="action-icon">${a.icon || '⚡'}</span>
      <span>${esc(a.name)}</span>
    </div>`
  ).join('');

  dom.actionGrid.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx);
      const action = allActions[idx];
      if (!action) return;

      if (state.remixAutoMode) {
        if (dom.remixPrompt) dom.remixPrompt.value = action.prompt;
        triggerRemix(action.prompt);
      } else {
        if (dom.remixPrompt) {
          dom.remixPrompt.value = action.prompt;
          dom.remixPrompt.focus();
        }
        toast('info', 'Action Loaded', 'Edit the prompt and click Remix when ready.');
      }
    });
  });
}

function updateRemixManualHint() {
  if (dom.remixManualHint) dom.remixManualHint.style.display = (!state.remixAutoMode) ? '' : 'none';
}

// ==================== REMIX PROCESSING ====================

async function triggerRemix(overridePrompt) {
  const prompt = overridePrompt || (dom.remixPrompt ? dom.remixPrompt.value.trim() : '');
  if (!prompt && state.remixAutoMode) {
    toast('error', 'No Prompt', 'Please enter a prompt or select an action.');
    return;
  }
  if (!state.remixRefImageData) {
    toast('error', 'No Image', 'Please select or upload a reference image.');
    return;
  }
  if (state.isGenerating) {
    toast('warn', 'Busy', 'A generation is already in progress.');
    return;
  }

  const model = getEnabledModels().find(m => m.id === state.defaultModel) ? state.defaultModel : (getEnabledModels()[0] ? getEnabledModels()[0].id : null);
  if (!model) { toast('error', 'No Model', 'No enabled image models.'); return; }

  state.isGenerating = true;

  if (state.remixAutoMode) {
    showGenOverlay(prompt, 0, state.remixSelectedCount);
    updateGenStatus('Crafting prompt with AI...');

    let craftedPrompt = prompt;
    try {
      craftedPrompt = await craftRemixPrompt(prompt, state.remixRefImageData);
      updateGenStatus('Generating image...');
    } catch (e) {
      console.warn('[Kinetic] Remix prompt crafting failed:', e);
      updateGenStatus('Generating with original prompt...');
    }

    const ratio = getRemixRatio();
    const count = state.remixSelectedCount;
    const hasRef = modelSupportsRef(model);
    const batchId = uuid();
    let completed = 0;

    if (state.parallelGeneration && count > 1) {
      if (dom.genBoxes) {
        dom.genBoxes.style.display = '';
        dom.genBoxes.innerHTML = '';
        for (let i = 0; i < count; i++) {
          dom.genBoxes.innerHTML += `<div class="gen-box" id="genBox${i}"><div class="gen-box-fill"></div></div>`;
        }
      }

      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push((async (idx) => {
          const box = document.getElementById('genBox' + idx);
          if (box) box.classList.add('processing');
          try {
            const url = await callImageAPI(model, craftedPrompt, ratio, hasRef);
            await saveRemixImage(url, prompt, craftedPrompt, model, ratio, batchId, idx);
            completed++;
            if (box) { box.classList.remove('processing'); box.classList.add('done'); }
            updateGenProgress(completed, count);
          } catch (e) {
            if (box) box.style.borderColor = '#ef4444';
            toast('error', 'Remix ' + (idx + 1) + ' Failed', e.message);
          }
        })(i));
      }
      await Promise.all(promises);
      if (dom.genBoxes) dom.genBoxes.style.display = 'none';
    } else {
      for (let i = 0; i < count; i++) {
        updateGenStatus('Generating image ' + (i + 1) + ' of ' + count + '...');
        try {
          const url = await callImageAPI(model, craftedPrompt, ratio, hasRef);
          await saveRemixImage(url, prompt, craftedPrompt, model, ratio, batchId, i);
          completed++;
          updateGenProgress(completed, count);
        } catch (e) {
          toast('error', 'Remix Failed', e.message);
        }
      }
    }

    state.isGenerating = false;
    hideGenOverlay();
    toast('success', 'Remix Complete', completed + ' image' + (completed > 1 ? 's' : '') + ' created.');
    await loadGallery();
    addRecentRemix(batchId);

  } else {
    const finalPrompt = prompt;
    const ratio = getRemixRatio();
    const count = state.remixSelectedCount;
    const hasRef = modelSupportsRef(model);
    const batchId = uuid();
    let completed = 0;

    showGenOverlay(finalPrompt, 0, count);
    updateGenStatus('Generating image...');

    for (let i = 0; i < count; i++) {
      try {
        const url = await callImageAPI(model, finalPrompt, ratio, hasRef);
        await saveRemixImage(url, dom.remixPrompt ? dom.remixPrompt.value.trim() : finalPrompt, finalPrompt, model, ratio, batchId, i);
        completed++;
        updateGenProgress(completed, count);
      } catch (e) {
        toast('error', 'Remix Failed', e.message);
      }
    }

    state.isGenerating = false;
    hideGenOverlay();
    toast('success', 'Remix Complete', completed + ' image' + (completed > 1 ? 's' : '') + ' created.');
    await loadGallery();
    addRecentRemix(batchId);
  }
}

async function craftRemixPrompt(userPrompt, imageUrl) {
  const messages = [
    { role: 'system', content: state.remixPrompt }
  ];

  let searchContext = '';
  if (state.remixWebSearch) {
    searchContext = await apiSearch(userPrompt);
  }

  const userContent = [];
  userContent.push({ type: 'text', text: 'Transform request: ' + userPrompt });
  if (imageUrl) {
    userContent.push({ type: 'image_url', image_url: { url: imageUrl } });
  }
  if (searchContext) {
    userContent.push({ type: 'text', text: 'Web search results:\n' + searchContext });
  }

  messages.push({ role: 'user', content: userContent });

  const tools = state.remixWebSearch ? [{
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query']
      }
    }
  }] : undefined;

  const body = {
    model: state.remixModel,
    messages,
    max_tokens: 400,
    temperature: 0.7
  };
  if (tools) body.tools = tools;

  const data = await apiRequest('/v1/chat/completions', body);
  return data.choices[0].message.content.trim();
}

async function saveRemixImage(url, originalPrompt, craftedPrompt, model, ratio, batchId, batchIndex) {
  const img = {
    url,
    prompt: craftedPrompt,
    originalPrompt,
    model,
    ratio,
    style: '',
    name: '',
    batchId: batchId || null,
    batchIndex: batchIndex || 0,
    favorite: false,
    timestamp: Date.now(),
    referenceImageUrl: state.remixRefImageData || null,
    isRemix: true
  };
  const id = await dbPut('gallery', img);
  img.id = id;
  state.images.unshift(img);
  storeImageBlob(id, url);
}

// ==================== RECENT REMIXES ====================

function addRecentRemix(batchId) {
  const batch = state.images.filter(i => i.batchId === batchId);
  state.recentRemixes = batch.concat(state.recentRemixes).slice(0, 20);
  renderRecentRemixes();
}

function renderRecentRemixes() {
  if (!dom.recentRemixes || !dom.remixResults) return;
  if (state.recentRemixes.length === 0) {
    dom.recentRemixes.style.display = 'none';
    return;
  }
  dom.recentRemixes.style.display = '';
  dom.remixResults.innerHTML = state.recentRemixes.slice(0, 8).map(img =>
    `<div class="remix-result-card" data-id="${img.id}"><img src="${esc(img.url)}" alt="" loading="lazy"></div>`
  ).join('');

  dom.remixResults.querySelectorAll('.remix-result-card').forEach(card => {
    card.addEventListener('click', () => {
      const img = state.recentRemixes.find(i => i.id === parseInt(card.dataset.id));
      if (img) openViewer(img);
    });
  });
}

// ==================== BIND REMIX EVENTS ====================

function bindRemixEvents() {
  console.log('[Kinetic] Binding remix events...');

  // Source tabs
  document.querySelectorAll('.rstab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.remixRefSource = tab.dataset.source;
      updateRemixSourceUI();
    });
  });

  // Gallery pick → open picker
  if (dom.remixPickGrid) {
    dom.remixPickGrid.addEventListener('click', () => {
      openImagePicker((img) => {
        state.remixRefImageData = img.url;
        state.remixRefPreviewUrl = img.url;
        state.remixRefSource = 'gallery';
        updateRemixSourceUI();
      });
    });
  }

  // Upload pick drag & drop
  if (dom.remixDrop) {
    dom.remixDrop.addEventListener('click', (e) => {
      if (e.target === dom.remixPreview) return;
      if (dom.remixFileInput) dom.remixFileInput.click();
    });

    dom.remixDrop.addEventListener('dragover', (e) => { e.preventDefault(); dom.remixDrop.classList.add('dragover'); });
    dom.remixDrop.addEventListener('dragleave', () => dom.remixDrop.classList.remove('dragover'));
    dom.remixDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.remixDrop.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleRemixFile(e.dataTransfer.files[0]);
    });
  }

  if (dom.remixFileInput) {
    dom.remixFileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleRemixFile(e.target.files[0]); });
  }

  async function handleRemixFile(file) {
    toast('info', 'Processing', 'Compressing image...');
    const result = await processRefImage(file);
    if (result) {
      state.remixRefImageData = result;
      state.remixRefPreviewUrl = result;
      state.remixRefSource = 'upload';
      if (dom.remixPreview) { dom.remixPreview.src = result; dom.remixPreview.style.display = 'block'; }
      if (dom.remixDropInner) dom.remixDropInner.style.display = 'none';
      if (dom.remixDrop) dom.remixDrop.classList.add('has-image');
      updateRemixSourceUI();
    }
  }

  // Clear remix ref
  if (dom.clearRemixRef) {
    dom.clearRemixRef.addEventListener('click', () => {
      state.remixRefImageData = null;
      state.remixRefPreviewUrl = null;
      if (dom.remixSelected) dom.remixSelected.style.display = 'none';
      if (dom.remixPreview) { dom.remixPreview.style.display = 'none'; dom.remixPreview.src = ''; }
      if (dom.remixDropInner) dom.remixDropInner.style.display = '';
      if (dom.remixDrop) dom.remixDrop.classList.remove('has-image');
      if (dom.remixFileInput) dom.remixFileInput.value = '';
    });
  }

  // Add custom action
  if (dom.addRemixAction) {
    dom.addRemixAction.addEventListener('click', () => {
      if (dom.addActionForm) {
        dom.addActionForm.style.display = dom.addActionForm.style.display === 'none' ? '' : 'none';
        if (dom.addActionForm.style.display !== 'none' && dom.actionName) dom.actionName.focus();
      }
    });
  }

  if (dom.cancelAddAction) {
    dom.cancelAddAction.addEventListener('click', () => {
      if (dom.addActionForm) dom.addActionForm.style.display = 'none';
      if (dom.actionName) dom.actionName.value = '';
      if (dom.actionPrompt) dom.actionPrompt.value = '';
    });
  }

  if (dom.confirmAddAction) {
    dom.confirmAddAction.addEventListener('click', () => {
      const name = dom.actionName ? dom.actionName.value.trim() : '';
      const prompt = dom.actionPrompt ? dom.actionPrompt.value.trim() : '';
      if (!name || !prompt) {
        toast('error', 'Missing Info', 'Please fill in both name and prompt.');
        return;
      }
      state.customRemixActions.push({ icon: '⚡', name, prompt, builtin: false });
      saveSetting('customRemixActions', state.customRemixActions);
      if (dom.addActionForm) dom.addActionForm.style.display = 'none';
      if (dom.actionName) dom.actionName.value = '';
      if (dom.actionPrompt) dom.actionPrompt.value = '';
      renderRemixActions();
      toast('success', 'Action Added', '"' + name + '" is ready to use.');
    });
  }

  // Remix ratio buttons
  document.querySelectorAll('#remixPanel .ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#remixPanel .ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.remixSelectedRatio = btn.dataset.ratio;
      if (dom.remixCustomRatio) dom.remixCustomRatio.style.display = btn.dataset.ratio === 'custom' ? '' : 'none';
    });
  });

  if (dom.remixRatioW) dom.remixRatioW.addEventListener('input', () => { state.remixCustomRatioW = dom.remixRatioW.value; });
  if (dom.remixRatioH) dom.remixRatioH.addEventListener('input', () => { state.remixCustomRatioH = dom.remixRatioH.value; });

  // Remix count buttons
  document.querySelectorAll('#remixPanel .cbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#remixPanel .cbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.remixSelectedCount = parseInt(btn.dataset.count, 10);
    });
  });

  // Remix button
  if (dom.remixBtn) {
    dom.remixBtn.addEventListener('click', () => {
      triggerRemix();
      if (!state.backgroundGeneration) {
        closeRemixPanel();
      }
    });
  }

  // Live-update manual hint
  setInterval(updateRemixManualHint, 1000);

  console.log('[Kinetic] Remix events bound.');
}

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', bindRemixEvents);