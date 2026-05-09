/* ============================================================
   KINETIC — REMIX MODULE
   ============================================================ */

var REMIX_ACTION_PROMPTS = BUILT_IN_ACTIONS.map(function(a) { return Object.assign({}, a, { builtin: true }); });

// ==================== INIT ====================

function initRemixPanel() {
  renderRemixActions();
  renderRemixPickGrid();
  renderRecentRemixes();
  updateRemixManualHint();
  var rbs = document.querySelectorAll('#remixPanel .ratio-btn');
  for (var i = 0; i < rbs.length; i++) {
    rbs[i].classList.toggle('active', rbs[i].dataset.ratio === state.remixSelectedRatio);
  }
  if (dom.remixCustomRatio) {
    dom.remixCustomRatio.style.display = state.remixSelectedRatio === 'custom' ? '' : 'none';
  }
  var cbs = document.querySelectorAll('#remixPanel .cbtn');
  for (var j = 0; j < cbs.length; j++) {
    cbs[j].classList.toggle('active', parseInt(cbs[j].dataset.count) === state.remixSelectedCount);
  }
}

// ==================== SOURCE UI ====================

function updateRemixSourceUI() {
  if (state.remixRefSource === 'gallery') {
    if (dom.remixGalleryPick) dom.remixGalleryPick.style.display = '';
    if (dom.remixUploadPick) dom.remixUploadPick.style.display = 'none';
  } else {
    if (dom.remixGalleryPick) dom.remixGalleryPick.style.display = 'none';
    if (dom.remixUploadPick) dom.remixUploadPick.style.display = '';
  }

  var tabs = document.querySelectorAll('.rstab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].dataset.source === state.remixRefSource);
  }

  if (state.remixRefImageData) {
    if (dom.remixSelected) dom.remixSelected.style.display = '';
    if (dom.remixSelectedImg) dom.remixSelectedImg.src = state.remixRefPreviewUrl || state.remixRefImageData;
  } else {
    if (dom.remixSelected) dom.remixSelected.style.display = 'none';
  }
}

// ==================== PICK GRID ====================

function renderRemixPickGrid() {
  if (!dom.remixPickGrid) return;
  var imgs = state.images.slice(0, 50);
  var html = '';
  for (var i = 0; i < imgs.length; i++) {
    html += '<div class="remix-pick-item" data-id="' + imgs[i].id + '"><img src="' + esc(imgs[i].url) + '" alt="" loading="lazy"></div>';
  }
  dom.remixPickGrid.innerHTML = html;

  var items = dom.remixPickGrid.querySelectorAll('.remix-pick-item');
  for (var j = 0; j < items.length; j++) {
    items[j].addEventListener('click', onPickItemClick);
  }
}

function onPickItemClick() {
  var imgId = parseInt(this.dataset.id);
  var img = null;
  for (var i = 0; i < state.images.length; i++) {
    if (state.images[i].id === imgId) { img = state.images[i]; break; }
  }
  if (!img) return;
  state.remixRefImageData = img.url;
  state.remixRefPreviewUrl = img.url;
  state.remixRefSource = 'gallery';
  updateRemixSourceUI();
}

// ==================== ACTIONS ====================

function renderRemixActions() {
  if (!dom.actionGrid) return;
  var all = REMIX_ACTION_PROMPTS.concat(state.customRemixActions);
  var html = '';
  for (var i = 0; i < all.length; i++) {
    html += '<div class="action-card" data-idx="' + i + '">';
    html += '<span class="action-icon">' + (all[i].icon || '\u26A1') + '</span>';
    html += '<span>' + esc(all[i].name) + '</span>';
    html += '</div>';
  }
  dom.actionGrid.innerHTML = html;

  var cards = dom.actionGrid.querySelectorAll('.action-card');
  for (var j = 0; j < cards.length; j++) {
    cards[j].addEventListener('click', onActionClick);
  }
}

function onActionClick() {
  var idx = parseInt(this.dataset.idx);
  var all = REMIX_ACTION_PROMPTS.concat(state.customRemixActions);
  var action = all[idx];
  if (!action) return;

  if (state.remixAutoMode) {
    if (dom.remixPrompt) dom.remixPrompt.value = action.prompt;
    triggerRemix(action.prompt);
  } else {
    if (dom.remixPrompt) {
      dom.remixPrompt.value = action.prompt;
      dom.remixPrompt.focus();
    }
    toast('info', 'Action Loaded', 'Edit the prompt then click Remix.');
  }
}

function updateRemixManualHint() {
  if (dom.remixManualHint) {
    dom.remixManualHint.style.display = state.remixAutoMode ? 'none' : '';
  }
}

// ==================== TRIGGER REMIX ====================

function triggerRemix(overridePrompt) {
  var prompt = overridePrompt || (dom.remixPrompt ? dom.remixPrompt.value.trim() : '');
  if (!prompt && state.remixAutoMode) {
    toast('error', 'No Prompt', 'Enter a prompt or select an action.');
    return;
  }
  if (!state.remixRefImageData) {
    toast('error', 'No Image', 'Select or upload a reference image.');
    return;
  }
  if (state.isGenerating) {
    toast('warn', 'Busy', 'A generation is already running.');
    return;
  }
  if (!state.apiKey) {
    toast('error', 'No API Key', 'Configure in settings.');
    return;
  }

  var enabled = getEnabledModels();
  var model = enabled.length ? enabled[0].id : (state.defaultModel || 'gptimage-2');
  var ratio = getRemixRatio();
  var count = state.remixSelectedCount;
  var hasRef = modelSupportsRef(model);
  var batchId = uuid();

  state.isGenerating = true;

  if (state.remixAutoMode) {
    doAutoRemix(prompt, model, ratio, count, hasRef, batchId);
  } else {
    doManualRemix(prompt, model, ratio, count, hasRef, batchId);
  }
}

function doAutoRemix(prompt, model, ratio, count, hasRef, batchId) {
  showGenOverlay(prompt, 0, count);
  updateGenStatus('Crafting prompt with AI...');

  craftRemixPrompt(prompt, state.remixRefImageData).then(function(craftedPrompt) {
    updateGenStatus('Generating image...');
    runRemixGeneration(prompt, craftedPrompt, model, ratio, count, hasRef, batchId);
  }).catch(function(err) {
    console.warn('[Kinetic] Remix craft failed:', err);
    updateGenStatus('Generating with original prompt...');
    runRemixGeneration(prompt, prompt, model, ratio, count, hasRef, batchId);
  });
}

function doManualRemix(prompt, model, ratio, count, hasRef, batchId) {
  showGenOverlay(prompt, 0, count);
  updateGenStatus('Generating image...');
  runRemixGeneration(prompt, prompt, model, ratio, count, hasRef, batchId);
}

function runRemixGeneration(originalPrompt, craftedPrompt, model, ratio, count, hasRef, batchId) {
  var completed = 0;
  var i = 0;

  function next() {
    if (i >= count) {
      finishRemix(completed, batchId);
      return;
    }
    var idx = i;
    i++;
    updateGenStatus('Generating image ' + (idx + 1) + ' of ' + count + '...');

    callImageAPI(model, craftedPrompt, ratio, hasRef).then(function(url) {
      return saveRemixImage(url, originalPrompt, craftedPrompt, model, ratio, batchId, idx);
    }).then(function() {
      completed++;
      updateGenProgress(completed, count);
      next();
    }).catch(function(err) {
      toast('error', 'Remix Failed', err.message || 'Generation error');
      next();
    });
  }

  next();
}

function finishRemix(completed, batchId) {
  state.isGenerating = false;
  hideGenOverlay();
  toast('success', 'Remix Complete', completed + ' image' + (completed !== 1 ? 's' : '') + ' created.');
  loadGallery().then(function() {
    addRecentRemix(batchId);
  });
}

// ==================== PROMPT CRAFTING ====================

function craftRemixPrompt(userPrompt, imageUrl) {
  var messages = [{ role: 'system', content: state.remixPrompt }];
  var userContent = [{ type: 'text', text: 'Transform request: ' + userPrompt }];
  if (imageUrl) {
    userContent.push({ type: 'image_url', image_url: { url: imageUrl } });
  }

  var doSearch = state.remixWebSearch;

  function doRequest(searchCtx) {
    if (searchCtx) {
      userContent.push({ type: 'text', text: 'Web search results:\n' + searchCtx });
    }
    messages.push({ role: 'user', content: userContent });

    var body = {
      model: state.remixModel,
      messages: messages,
      max_tokens: 400,
      temperature: 0.7
    };

    if (doSearch) {
      body.tools = [{
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query']
          }
        }
      }];
    }

    return apiRequest('/v1/chat/completions', body);
  }

  if (doSearch) {
    return apiSearch(userPrompt).then(function(searchCtx) {
      return doRequest(searchCtx);
    }).then(function(data) {
      return data.choices[0].message.content.trim();
    });
  }

  return doRequest('').then(function(data) {
    return data.choices[0].message.content.trim();
  });
}

// ==================== SAVE ====================

function saveRemixImage(url, originalPrompt, craftedPrompt, model, ratio, batchId, batchIndex) {
  var img = {
    url: url,
    prompt: craftedPrompt,
    originalPrompt: originalPrompt,
    model: model,
    ratio: ratio,
    style: '',
    name: '',
    batchId: batchId || null,
    batchIndex: batchIndex || 0,
    favorite: false,
    timestamp: Date.now(),
    referenceImageUrl: state.remixRefImageData || null,
    isRemix: true
  };

  return dbPut('gallery', img).then(function(id) {
    img.id = id;
    state.images.unshift(img);
    storeImageBlob(id, url);
    return id;
  });
}

// ==================== RECENT REMIXES ====================

function addRecentRemix(batchId) {
  var batch = [];
  for (var i = 0; i < state.images.length; i++) {
    if (state.images[i].batchId === batchId) batch.push(state.images[i]);
  }
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

  var show = state.recentRemixes.slice(0, 8);
  var html = '';
  for (var i = 0; i < show.length; i++) {
    html += '<div class="remix-result-card" data-id="' + show[i].id + '">';
    html += '<img src="' + esc(show[i].url) + '" alt="" loading="lazy">';
    html += '</div>';
  }
  dom.remixResults.innerHTML = html;

  var cards = dom.remixResults.querySelectorAll('.remix-result-card');
  for (var j = 0; j < cards.length; j++) {
    cards[j].addEventListener('click', onRecentRemixClick);
  }
}

function onRecentRemixClick() {
  var imgId = parseInt(this.dataset.id);
  var img = null;
  for (var i = 0; i < state.recentRemixes.length; i++) {
    if (state.recentRemixes[i].id === imgId) { img = state.recentRemixes[i]; break; }
  }
  if (img) openViewer(img);
}

// ==================== BIND EVENTS ====================

function bindRemixEvents() {
  console.log('[Kinetic] Binding remix events...');

  // Source tabs
  var rstabs = document.querySelectorAll('.rstab');
  for (var i = 0; i < rstabs.length; i++) {
    (function(tab) {
      tab.addEventListener('click', function() {
        state.remixRefSource = tab.dataset.source;
        updateRemixSourceUI();
      });
    })(rstabs[i]);
  }

  // Gallery pick → open picker
  if (dom.remixPickGrid) {
    dom.remixPickGrid.addEventListener('click', function(e) {
      if (e.target.closest('.remix-pick-item')) return;
      openImagePicker(function(img) {
        state.remixRefImageData = img.url;
        state.remixRefPreviewUrl = img.url;
        state.remixRefSource = 'gallery';
        updateRemixSourceUI();
      });
    });
  }

  // Upload pick
  if (dom.remixDrop) {
    dom.remixDrop.addEventListener('click', function(e) {
      if (e.target === dom.remixPreview) return;
      if (dom.remixFileInput) dom.remixFileInput.click();
    });

    dom.remixDrop.addEventListener('dragover', function(e) {
      e.preventDefault();
      dom.remixDrop.classList.add('dragover');
    });

    dom.remixDrop.addEventListener('dragleave', function() {
      dom.remixDrop.classList.remove('dragover');
    });

    dom.remixDrop.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dom.remixDrop.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleRemixFile(e.dataTransfer.files[0]);
    });
  }

  if (dom.remixFileInput) {
    dom.remixFileInput.addEventListener('change', function(e) {
      if (e.target.files[0]) handleRemixFile(e.target.files[0]);
    });
  }

  // Clear remix ref
  if (dom.clearRemixRef) {
    dom.clearRemixRef.addEventListener('click', function() {
      state.remixRefImageData = null;
      state.remixRefPreviewUrl = null;
      if (dom.remixSelected) dom.remixSelected.style.display = 'none';
      if (dom.remixPreview) {
        dom.remixPreview.style.display = 'none';
        dom.remixPreview.src = '';
      }
      if (dom.remixDropInner) dom.remixDropInner.style.display = '';
      if (dom.remixDrop) dom.remixDrop.classList.remove('has-image');
      if (dom.remixFileInput) dom.remixFileInput.value = '';
    });
  }

  // Add custom action
  if (dom.addRemixAction) {
    dom.addRemixAction.addEventListener('click', function() {
      if (!dom.addActionForm) return;
      dom.addActionForm.style.display = dom.addActionForm.style.display === 'none' ? '' : 'none';
      if (dom.addActionForm.style.display !== 'none' && dom.actionName) {
        dom.actionName.focus();
      }
    });
  }

  if (dom.cancelAddAction) {
    dom.cancelAddAction.addEventListener('click', function() {
      if (dom.addActionForm) dom.addActionForm.style.display = 'none';
      if (dom.actionName) dom.actionName.value = '';
      if (dom.actionPrompt) dom.actionPrompt.value = '';
    });
  }

  if (dom.confirmAddAction) {
    dom.confirmAddAction.addEventListener('click', function() {
      var name = dom.actionName ? dom.actionName.value.trim() : '';
      var prompt = dom.actionPrompt ? dom.actionPrompt.value.trim() : '';
      if (!name || !prompt) {
        toast('error', 'Missing Info', 'Fill in both fields.');
        return;
      }
      state.customRemixActions.push({
        icon: '\u26A1',
        name: name,
        prompt: prompt,
        builtin: false
      });
      saveSetting('customRemixActions', state.customRemixActions);
      if (dom.addActionForm) dom.addActionForm.style.display = 'none';
      if (dom.actionName) dom.actionName.value = '';
      if (dom.actionPrompt) dom.actionPrompt.value = '';
      renderRemixActions();
      toast('success', 'Action Added', '"' + name + '" is ready.');
    });
  }

  // Ratio buttons
  var remixRatioBtns = document.querySelectorAll('#remixPanel .ratio-btn');
  for (var r = 0; r < remixRatioBtns.length; r++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var k = 0; k < remixRatioBtns.length; k++) {
          remixRatioBtns[k].classList.remove('active');
        }
        btn.classList.add('active');
        state.remixSelectedRatio = btn.dataset.ratio;
        if (dom.remixCustomRatio) {
          dom.remixCustomRatio.style.display = btn.dataset.ratio === 'custom' ? '' : 'none';
        }
      });
    })(remixRatioBtns[r]);
  }

  if (dom.remixRatioW) {
    dom.remixRatioW.addEventListener('input', function() {
      state.remixCustomRatioW = dom.remixRatioW.value;
    });
  }

  if (dom.remixRatioH) {
    dom.remixRatioH.addEventListener('input', function() {
      state.remixCustomRatioH = dom.remixRatioH.value;
    });
  }

  // Count buttons
  var remixCountBtns = document.querySelectorAll('#remixPanel .cbtn');
  for (var c = 0; c < remixCountBtns.length; c++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var k = 0; k < remixCountBtns.length; k++) {
          remixCountBtns[k].classList.remove('active');
        }
        btn.classList.add('active');
        state.remixSelectedCount = parseInt(btn.dataset.count, 10);
      });
    })(remixCountBtns[c]);
  }

  // Remix button
  if (dom.remixBtn) {
    dom.remixBtn.addEventListener('click', function() {
      triggerRemix();
      if (!state.backgroundGeneration) {
        closeRemixPanel();
      }
    });
  }

  // Manual hint update
  setInterval(updateRemixManualHint, 2000);

  console.log('[Kinetic] Remix events bound.');
}

// ==================== FILE HANDLER ====================

function handleRemixFile(file) {
  toast('info', 'Processing', 'Compressing image...');

  processRefImage(file).then(function(result) {
    if (!result) return;
    state.remixRefImageData = result;
    state.remixRefPreviewUrl = result;
    state.remixRefSource = 'upload';
    if (dom.remixPreview) {
      dom.remixPreview.src = result;
      dom.remixPreview.style.display = 'block';
    }
    if (dom.remixDropInner) dom.remixDropInner.style.display = 'none';
    if (dom.remixDrop) dom.remixDrop.classList.add('has-image');
    updateRemixSourceUI();
  }).catch(function(err) {
    toast('error', 'Upload Failed', err.message || 'Could not process image.');
  });
}

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', function() {
  bindRemixEvents();
});