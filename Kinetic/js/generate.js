// ==================== MODEL SELECT (Gen Panel) ====================

let genPanelModelSelect = null;

function updateModelSelect() {
  const opts = getEnabledModels().map(m => ({ value: m.id, label: m.name || m.id }));
  if (genPanelModelSelect && !genPanelModelSelect._disabled) {
    genPanelModelSelect.setOptions(opts);
    genPanelModelSelect.setValue(state.defaultModel);
  }
}

function updateRefSection() {
  const model = genPanelModelSelect && !genPanelModelSelect._disabled ? genPanelModelSelect.getValue() : state.selectedModel;
  if (dom.refSection) dom.refSection.style.display = modelSupportsRef(model) ? '' : 'none';
}

// ==================== BIND GENERATE EVENTS ====================

function bindGenerateEvents() {
  console.log('[Kinetic] Binding generate events...');

  // Model select in gen panel
  const modelOpts = getEnabledModels().map(m => ({ value: m.id, label: m.name || m.id }));
  genPanelModelSelect = new KineticSelect(dom.modelSelectWrap, modelOpts, () => {
    updateRefSection();
  });
  if (!genPanelModelSelect._disabled) genPanelModelSelect.setValue(state.defaultModel);
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
          toast('success', 'Enhanced', 'Prompt has been improved.');
        }
      } catch (e) {
        toast('error', 'Enhancement Failed', e.message);
      }
      dom.enhanceBtn.disabled = false;
      if (span) span.textContent = 'Enhance Prompt';
    });
  }

  // Enhance button visibility
  function updateEnhanceBtn() {
    if (dom.enhanceBtn) dom.enhanceBtn.style.display = (state.enhanceEnabled && state.enhanceManual) ? '' : 'none';
  }
  updateEnhanceBtn();
  setInterval(updateEnhanceBtn, 2000);

  // Reference image drag & drop
  if (dom.refDrop) {
    dom.refDrop.addEventListener('click', (e) => {
      if (e.target === dom.refPreview || e.target === dom.refUrlInput || e.target === dom.refUrlBtn) return;
      if (dom.refFileInput) dom.refFileInput.click();
    });

    dom.refDrop.addEventListener('dragover', (e) => { e.preventDefault(); dom.refDrop.classList.add('dragover'); });
    dom.refDrop.addEventListener('dragleave', () => dom.refDrop.classList.remove('dragover'));
    dom.refDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.refDrop.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleRefFile(e.dataTransfer.files[0]);
    });
  }

  if (dom.refFileInput) {
    dom.refFileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleRefFile(e.target.files[0]); });
  }

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

  // Ref URL
  if (dom.refUrlBtn) {
    dom.refUrlBtn.addEventListener('click', () => {
      const url = dom.refUrlInput ? dom.refUrlInput.value.trim() : '';
      if (!url || !url.startsWith('http')) {
        toast('error', 'Invalid URL', 'Enter a valid image URL.');
        return;
      }
      state.refImageData = url;
      if (dom.refPreview) { dom.refPreview.src = url; dom.refPreview.style.display = 'block'; }
      if (dom.refDropInner) dom.refDropInner.style.display = 'none';
      if (dom.refDrop) dom.refDrop.classList.add('has-image');
      if (dom.clearRefBtn) dom.clearRefBtn.style.display = '';
    });
  }

  if (dom.refUrlInput) {
    dom.refUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && dom.refUrlBtn) dom.refUrlBtn.click(); });
  }

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

  // Ratio buttons (gen panel)
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

  // Style chips
  if (dom.styleChips) {
    dom.styleChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.schip');
      if (!chip) return;
      dom.styleChips.querySelectorAll('.schip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedStyle = chip.dataset.style;
    });
  }

  if (dom.addStyleBtn) {
    dom.addStyleBtn.addEventListener('click', () => {
      if (dom.addStyleRow) {
        dom.addStyleRow.style.display = dom.addStyleRow.style.display === 'none' ? '' : 'none';
        if (dom.addStyleRow.style.display !== 'none' && dom.customStyleInput) dom.customStyleInput.focus();
      }
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
    document.querySelectorAll('#genPanel .schip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    state.selectedStyle = val.toLowerCase();
    toast('success', 'Style Added', '"' + val + '" added to your styles');
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

  // Generate button
  if (dom.generateBtn) {
    dom.generateBtn.addEventListener('click', () => {
      generateImages();
      if (!state.backgroundGeneration) {
        closeGenPanel();
      }
    });
  }

  console.log('[Kinetic] Generate events bound.');
}

document.addEventListener('DOMContentLoaded', bindGenerateEvents);