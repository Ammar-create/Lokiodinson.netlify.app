/* ============================================================
   KINETIC — GALLERY MODULE (FIXED)
   Gallery rendering, viewer, spotlight carousel, fullscreen,
   compare slider, download, search/filter/tabs
   ============================================================ */

let currentViewerImage = null;
let viewerBatchImages = [];
let viewerBatchIndex = 0;
let fullscreenZoom = 1;

// ==================== LOAD GALLERY ====================

async function loadGallery() {
  try {
    state.images = await dbGetAll('gallery');
    state.images.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.warn('[Kinetic] loadGallery failed:', e);
    state.images = [];
  }
  renderGallery();
}

// ==================== RENDER GALLERY ====================

function renderGallery() {
  if (!dom.galleryGrid || !dom.emptyState) return;

  const q = dom.searchInput ? dom.searchInput.value.toLowerCase().trim() : '';
  let imgs = [...state.images];

  if (state.currentFilter === 'favorites') imgs = imgs.filter(i => i.favorite);
  if (state.currentFilter === 'recent') imgs = imgs.slice(0, state.recentLimit);

  if (q) {
    imgs = imgs.filter(i =>
      (i.prompt || '').toLowerCase().includes(q) ||
      (i.originalPrompt || '').toLowerCase().includes(q) ||
      (i.name || '').toLowerCase().includes(q) ||
      (i.model || '').toLowerCase().includes(q) ||
      (i.style || '').toLowerCase().includes(q)
    );
  }

  const favCount = state.images.filter(i => i.favorite).length;
  if (dom.tabRecentCount) dom.tabRecentCount.textContent = '(' + Math.min(state.images.length, state.recentLimit) + ')';
  if (dom.tabFavCount) dom.tabFavCount.textContent = '(' + favCount + ')';
  if (dom.imageCount) dom.imageCount.textContent = imgs.length;

  // Group by batchId
  const batches = {};
  const singles = [];
  imgs.forEach(img => {
    if (img.batchId && state.images.filter(i => i.batchId === img.batchId).length > 1) {
      if (!batches[img.batchId]) batches[img.batchId] = [];
      batches[img.batchId].push(img);
    } else {
      singles.push(img);
    }
  });

  const batchIds = Object.keys(batches);
  const seenBatches = new Set();

  let html = '';

  const entries = [];
  singles.forEach(img => entries.push({ type: 'single', item: img, ts: img.timestamp }));
  batchIds.forEach(bid => {
    const batch = batches[bid].sort((a, b) => (a.batchIndex || 0) - (b.batchIndex || 0));
    entries.push({ type: 'batch', items: batch, ts: batch[0].timestamp, batchId: bid });
  });
  entries.sort((a, b) => b.ts - a.ts);

  entries.forEach(entry => {
    if (entry.type === 'single') {
      html += renderCard(entry.item);
    } else if (!seenBatches.has(entry.batchId)) {
      seenBatches.add(entry.batchId);
      const batch = entry.items;
      const first = batch[0];
      html += `<div class="batch-group" data-batch="${esc(entry.batchId)}">
        <div class="batch-header" data-batch="${esc(entry.batchId)}">
          <svg class="batch-chevron" viewBox="0 0 24 24" width="16" height="16"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <div class="batch-info">
            <div class="batch-prompt">${esc(first.originalPrompt || first.prompt || 'Untitled')}</div>
            <div class="batch-meta">
              <span>${esc(first.model || '')}</span>
              <span>${batch.length} images</span>
              <span>${timeAgo(first.timestamp)}</span>
            </div>
          </div>
        </div>
        <div class="batch-body">
          <div style="display:flex;gap:8px;padding:0 8px 8px;overflow-x:auto;">`;
      batch.forEach(img => {
        html += `<div class="gcard" data-id="${img.id}" style="flex:0 0 160px;aspect-ratio:1;">
          <img src="${esc(img.url)}" alt="" loading="lazy">
          <div class="gcard-actions">
            <button class="gcard-dl" data-id="${img.id}" title="Download"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="gcard-fav${img.favorite ? ' active' : ''}" data-id="${img.id}" title="Favorite"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="${img.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/></svg></button>
          </div>
        </div>`;
      });
      html += `</div></div></div>`;
    }
  });

  dom.galleryGrid.innerHTML = html;
  dom.emptyState.style.display = imgs.length ? 'none' : '';
  dom.galleryGrid.style.display = imgs.length ? '' : 'none';

  dom.galleryGrid.querySelectorAll('.batch-header').forEach(hdr => {
    hdr.addEventListener('click', () => hdr.classList.toggle('open'));
  });
}

function renderCard(img) {
  return `<div class="gcard" data-id="${img.id}">
    <img src="${esc(img.url)}" alt="" loading="lazy">
    <span class="gcard-badge">${esc(img.model || '')}</span>
    ${img.favorite ? '<span class="gcard-badge" style="left:auto;right:8px;background:rgba(239,68,68,0.6);">♥</span>' : ''}
    <div class="gcard-overlay">
      <div class="gcard-name">${esc(img.name || img.originalPrompt || img.prompt || '')}</div>
      <div class="gcard-meta"><span>${esc(img.ratio || '')}</span><span>${timeAgo(img.timestamp)}</span></div>
    </div>
    <div class="gcard-actions">
      <button class="gcard-dl" data-id="${img.id}" title="Download"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="gcard-fav${img.favorite ? ' active' : ''}" data-id="${img.id}" title="Favorite"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="${img.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/></svg></button>
    </div>
  </div>`;
}

// ==================== VIEWER ====================

function openViewer(img) {
  if (!img) return;
  currentViewerImage = img;

  const batchImgs = img.batchId
    ? state.images.filter(i => i.batchId === img.batchId).sort((a, b) => (a.batchIndex || 0) - (b.batchIndex || 0))
    : [img];
  viewerBatchImages = batchImgs;
  viewerBatchIndex = batchImgs.findIndex(i => i.id === img.id);
  if (viewerBatchIndex < 0) viewerBatchIndex = 0;

  renderSpotlight();

  if (dom.viewerPrompt) dom.viewerPrompt.textContent = img.originalPrompt || img.prompt || '';
  if (dom.viewerMeta) {
    dom.viewerMeta.innerHTML =
      '<span>' + esc(img.model || '') + '</span>' +
      '<span>' + esc(img.ratio || '') + '</span>' +
      (img.style ? '<span>' + esc(img.style) + '</span>' : '') +
      '<span>' + timeAgo(img.timestamp) + '</span>';
  }

  if (dom.viewerFav) dom.viewerFav.classList.toggle('active', !!img.favorite);
  if (dom.viewerCompare) dom.viewerCompare.style.display = (img.referenceImageUrl || img.referenceImageBlob) ? '' : 'none';
  if (dom.imageModal) dom.imageModal.classList.add('open');
}

function closeViewer() {
  if (dom.imageModal) dom.imageModal.classList.remove('open');
  currentViewerImage = null;
  viewerBatchImages = [];
  viewerBatchIndex = 0;
  if (dom.compareWrap) dom.compareWrap.style.display = 'none';
  if (dom.spotlight) dom.spotlight.style.display = '';
  // Remove leftover spotlight-single
  const single = document.querySelector('#imageModal .spotlight-single');
  if (single) single.remove();
}

function renderSpotlight() {
  if (!dom.spotlight) return;

  // Clean up any existing spotlight-single
  const existingSingle = dom.spotlight.parentElement.querySelector('.spotlight-single');

  if (viewerBatchImages.length <= 1) {
    dom.spotlight.style.display = 'none';
    const wrap = document.createElement('div');
    wrap.className = 'spotlight-single';
    const img = viewerBatchImages[0] || currentViewerImage;
    wrap.innerHTML = '<img src="' + esc(img.url) + '" alt="">';
    dom.spotlight.parentElement.insertBefore(wrap, dom.spotlight);
    if (existingSingle && existingSingle !== wrap) existingSingle.remove();
    return;
  }

  if (existingSingle) existingSingle.remove();
  dom.spotlight.style.display = '';

  const total = viewerBatchImages.length;
  const center = viewerBatchImages[viewerBatchIndex];
  const leftIdx = (viewerBatchIndex - 1 + total) % total;
  const rightIdx = (viewerBatchIndex + 1) % total;
  const left = viewerBatchImages[leftIdx];
  const right = viewerBatchImages[rightIdx];

  dom.spotlight.innerHTML = `
    <div class="spotlight-track">
      <div class="spotlight-side spotlight-left" data-dir="left">
        <img src="${esc(left.url)}" alt="">
        <div class="spot-arrow"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </div>
      <div class="spotlight-center entering">
        <img src="${esc(center.url)}" alt="">
      </div>
      <div class="spotlight-side spotlight-right" data-dir="right">
        <img src="${esc(right.url)}" alt="">
        <div class="spot-arrow"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </div>
    </div>`;

  dom.spotlight.querySelector('.spotlight-left').addEventListener('click', () => {
    viewerBatchIndex = (viewerBatchIndex - 1 + total) % total;
    currentViewerImage = viewerBatchImages[viewerBatchIndex];
    renderSpotlight();
    updateViewerInfo();
  });

  dom.spotlight.querySelector('.spotlight-right').addEventListener('click', () => {
    viewerBatchIndex = (viewerBatchIndex + 1) % total;
    currentViewerImage = viewerBatchImages[viewerBatchIndex];
    renderSpotlight();
    updateViewerInfo();
  });
}

function updateViewerInfo() {
  if (!currentViewerImage) return;
  const img = currentViewerImage;
  if (dom.viewerPrompt) dom.viewerPrompt.textContent = img.originalPrompt || img.prompt || '';
  if (dom.viewerMeta) {
    dom.viewerMeta.innerHTML =
      '<span>' + esc(img.model || '') + '</span>' +
      '<span>' + esc(img.ratio || '') + '</span>' +
      (img.style ? '<span>' + esc(img.style) + '</span>' : '') +
      '<span>' + timeAgo(img.timestamp) + '</span>';
  }
  if (dom.viewerFav) dom.viewerFav.classList.toggle('active', !!img.favorite);
  if (dom.viewerCompare) dom.viewerCompare.style.display = (img.referenceImageUrl || img.referenceImageBlob) ? '' : 'none';
}

// ==================== FULLSCREEN ====================

function openFullscreen() {
  if (!currentViewerImage || !dom.fullscreenView) return;
  fullscreenZoom = 1;
  if (dom.fullscreenImg) dom.fullscreenImg.src = currentViewerImage.url;
  if (dom.fullscreenImg) dom.fullscreenImg.style.transform = 'scale(1)';
  if (dom.fullscreenImgWrap) dom.fullscreenImgWrap.classList.remove('zoomed');
  dom.fullscreenView.classList.add('open');
}

function closeFullscreen() {
  if (dom.fullscreenView) dom.fullscreenView.classList.remove('open');
  fullscreenZoom = 1;
}

// ==================== COMPARE ====================

function openCompare() {
  if (!currentViewerImage || !currentViewerImage.referenceImageUrl) return;
  if (dom.compareInput) dom.compareInput.src = currentViewerImage.referenceImageUrl;
  if (dom.compareOutput) dom.compareOutput.src = currentViewerImage.url;
  if (dom.spotlight) dom.spotlight.style.display = 'none';
  const single = document.querySelector('#imageModal .spotlight-single');
  if (single) single.style.display = 'none';
  if (dom.compareWrap) dom.compareWrap.style.display = '';
  initCompareSlider();
}

function closeCompareView() {
  if (dom.compareWrap) dom.compareWrap.style.display = 'none';
  if (dom.spotlight) dom.spotlight.style.display = '';
  const single = document.querySelector('#imageModal .spotlight-single');
  if (single) single.style.display = '';
}

function initCompareSlider() {
  const container = dom.compareContainer;
  const slider = dom.compareSlider;
  if (!container || !slider) return;
  let dragging = false;

  function move(clientX) {
    const rect = container.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(5, Math.min(95, pct));
    slider.style.left = pct + '%';
    if (dom.compareOutput) dom.compareOutput.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
  }

  slider.addEventListener('mousedown', (e) => { e.preventDefault(); dragging = true; });
  slider.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
  container.addEventListener('mousedown', (e) => { dragging = true; move(e.clientX); });

  document.addEventListener('mousemove', (e) => { if (dragging) move(e.clientX); });
  document.addEventListener('touchmove', (e) => { if (dragging) move(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });
}

// ==================== DOWNLOAD ====================

function downloadImage(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(name) + '.png';
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 100);
}

// ==================== IMAGE PICKER (for remix) ====================

let pickerCallback = null;

function openImagePicker(callback) {
  pickerCallback = callback;
  renderPickerGrid();
  if (dom.imagePickerModal) dom.imagePickerModal.classList.add('open');
}

function renderPickerGrid() {
  if (!dom.pickerGrid || !dom.pickerSearch) return;
  const q = dom.pickerSearch.value.toLowerCase().trim();
  let imgs = state.images.filter(i => !q || (i.prompt || '').toLowerCase().includes(q) || (i.name || '').toLowerCase().includes(q));
  imgs = imgs.slice(0, 100);
  dom.pickerGrid.innerHTML = imgs.map(img =>
    `<div class="picker-item" data-id="${img.id}"><img src="${esc(img.url)}" alt="" loading="lazy"></div>`
  ).join('');

  dom.pickerGrid.querySelectorAll('.picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = state.images.find(i => i.id === parseInt(item.dataset.id));
      if (img && pickerCallback) {
        pickerCallback(img);
        pickerCallback = null;
      }
      if (dom.imagePickerModal) dom.imagePickerModal.classList.remove('open');
    });
  });
}

// ==================== BIND GALLERY EVENTS ====================

function bindGalleryEvents() {
  console.log('[Kinetic] Binding gallery events...');

  // Gallery tabs
  document.querySelectorAll('.g-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.g-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentFilter = tab.dataset.filter;
      renderGallery();
    });
  });

  // Search
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', renderGallery);
  }

  // Gallery card clicks (delegated)
  if (dom.galleryGrid) {
    dom.galleryGrid.addEventListener('click', (e) => {
      const dlBtn = e.target.closest('.gcard-dl');
      const favBtn = e.target.closest('.gcard-fav');
      const card = e.target.closest('.gcard');

      if (dlBtn) {
        e.stopPropagation();
        const img = state.images.find(i => i.id === parseInt(dlBtn.dataset.id));
        if (img) downloadImage(img.url, img.name || img.originalPrompt || img.prompt);
        return;
      }

      if (favBtn) {
        e.stopPropagation();
        const img = state.images.find(i => i.id === parseInt(favBtn.dataset.id));
        if (img) {
          img.favorite = !img.favorite;
          dbPut('gallery', img).then(renderGallery);
          toast('success', img.favorite ? 'Added to Favorites' : 'Removed from Favorites');
        }
        return;
      }

      if (card && !e.target.closest('.batch-header')) {
        const img = state.images.find(i => i.id === parseInt(card.dataset.id));
        if (img) openViewer(img);
      }
    });
  }

  // Viewer close
  if (dom.viewerClose) dom.viewerClose.addEventListener('click', closeViewer);
  if (dom.imageModal) {
    dom.imageModal.addEventListener('click', (e) => { if (e.target === dom.imageModal) closeViewer(); });
  }

  // Viewer fullscreen
  if (dom.viewerFullscreen) dom.viewerFullscreen.addEventListener('click', openFullscreen);
  if (dom.fullscreenMinimize) dom.fullscreenMinimize.addEventListener('click', closeFullscreen);

  // Viewer download
  if (dom.viewerDownload) {
    dom.viewerDownload.addEventListener('click', () => {
      if (currentViewerImage) downloadImage(currentViewerImage.url, currentViewerImage.name || currentViewerImage.originalPrompt || currentViewerImage.prompt);
    });
  }

  // Viewer copy prompt
  if (dom.viewerCopy) {
    dom.viewerCopy.addEventListener('click', () => {
      if (currentViewerImage) {
        copyText(currentViewerImage.originalPrompt || currentViewerImage.prompt);
        toast('success', 'Prompt Copied', 'Ready to paste');
      }
    });
  }

  // Viewer favorite
  if (dom.viewerFav) {
    dom.viewerFav.addEventListener('click', async () => {
      if (!currentViewerImage) return;
      currentViewerImage.favorite = !currentViewerImage.favorite;
      await dbPut('gallery', currentViewerImage);
      dom.viewerFav.classList.toggle('active', currentViewerImage.favorite);
      renderGallery();
      toast('success', currentViewerImage.favorite ? 'Added to Favorites' : 'Removed from Favorites');
    });
  }

  // Viewer delete
  if (dom.viewerDelete) {
    dom.viewerDelete.addEventListener('click', async () => {
      if (!currentViewerImage) return;
      const id = currentViewerImage.id;
      try { await dbRemove('gallery', id); } catch (e) { /* ok */ }
      try { await dbRemove('blobs', id); } catch (e) { /* ok */ }
      state.images = state.images.filter(i => i.id !== id);
      renderGallery();
      closeViewer();
      toast('success', 'Image Deleted');
    });
  }

  // Viewer remix
  if (dom.viewerRemix) {
    dom.viewerRemix.addEventListener('click', () => {
      if (!currentViewerImage) return;
      const img = currentViewerImage;
      closeViewer();
      openRemixPanel();
      state.remixRefImageData = img.url;
      state.remixRefPreviewUrl = img.url;
      state.remixRefSource = 'gallery';
      if (typeof updateRemixSourceUI === 'function') updateRemixSourceUI();
    });
  }

  // Viewer compare
  if (dom.viewerCompare) dom.viewerCompare.addEventListener('click', openCompare);
  if (dom.compareClose) dom.compareClose.addEventListener('click', closeCompareView);

  // Fullscreen zoom
  if (dom.fullscreenImgWrap) {
    dom.fullscreenImgWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      fullscreenZoom += e.deltaY > 0 ? -0.15 : 0.15;
      fullscreenZoom = Math.max(1, Math.min(5, fullscreenZoom));
      if (dom.fullscreenImg) dom.fullscreenImg.style.transform = 'scale(' + fullscreenZoom + ')';
      dom.fullscreenImgWrap.classList.toggle('zoomed', fullscreenZoom > 1);
    }, { passive: false });
  }

  // Image picker
  if (dom.pickerClose) {
    dom.pickerClose.addEventListener('click', () => {
      if (dom.imagePickerModal) dom.imagePickerModal.classList.remove('open');
    });
  }
  if (dom.imagePickerModal) {
    dom.imagePickerModal.addEventListener('click', (e) => {
      if (e.target === dom.imagePickerModal) dom.imagePickerModal.classList.remove('open');
    });
  }
  if (dom.pickerSearch) {
    dom.pickerSearch.addEventListener('input', renderPickerGrid);
  }

  console.log('[Kinetic] Gallery events bound.');
}

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', bindGalleryEvents);