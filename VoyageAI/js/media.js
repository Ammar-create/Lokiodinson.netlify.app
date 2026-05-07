// ============================================================
// Voyage AI — js/media.js
// Media picker, file upload, drag-drop, preview handling
// ============================================================

import { on, emit } from './app.js';

// ----------------------------------------------------------
// State
// ----------------------------------------------------------

const state = {
  context: 'chat',          // 'chat' | 'imagegen' | 'profile'
  attachments: [],          // attachments for current chat message
  refImage: null,           // reference image for image generation
  dragInitialized: false,
  boundHandlers: {}         // references for cleanup
};

// ----------------------------------------------------------
// File type config
// ----------------------------------------------------------

const FILE_CATEGORIES = {
  image: {
    accept: 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml',
    extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
    label: 'Image',
    icon: '🖼',
    iconBg: 'rgba(52,211,153,0.1)',
    iconColor: 'var(--success)',
    desc: 'PNG, JPG, WebP, GIF, SVG',
    maxSize: 20 * 1024 * 1024
  },
  document: {
    accept: 'application/pdf,.pdf,.doc,.docx,.txt,.csv,.json,.md,.rtf,.xls,.xlsx',
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.csv', '.json', '.md', '.rtf', '.xls', '.xlsx'],
    label: 'Document',
    icon: '📄',
    iconBg: 'var(--accent-soft)',
    iconColor: 'var(--accent)',
    desc: 'PDF, DOCX, TXT, CSV, JSON, MD',
    maxSize: 25 * 1024 * 1024
  },
  audio: {
    accept: 'audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm,audio/x-m4a',
    extensions: ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac', '.flac'],
    label: 'Audio',
    icon: '🎵',
    iconBg: 'rgba(251,191,36,0.1)',
    iconColor: 'var(--warning)',
    desc: 'MP3, WAV, M4A, OGG, FLAC',
    maxSize: 50 * 1024 * 1024
  },
  other: {
    accept: '*/*',
    extensions: [],
    label: 'Other',
    icon: '📁',
    iconBg: 'rgba(168,85,247,0.1)',
    iconColor: '#A855F7',
    desc: 'Any file type',
    maxSize: 25 * 1024 * 1024
  }
};

const IMAGE_EXTENSIONS = new Set(FILE_CATEGORIES.image.extensions);
const AUDIO_EXTENSIONS = new Set(FILE_CATEGORIES.audio.extensions);
const DOC_EXTENSIONS = new Set(FILE_CATEGORIES.document.extensions);

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

export function init() {
  setupPickerListeners();
  setupDragAndDrop();
  setupPasteListener();
}

export function openMediaPicker(context = 'chat') {
  state.context = context;
  const picker = document.getElementById('v-mp-picker');
  if (!picker) return;

  // Position near the attach button
  const trigger = document.getElementById('v-typ-attach');
  if (trigger) {
    const rect = trigger.getBoundingClientRect();
    picker.style.left = rect.left + 'px';
    picker.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
  }

  picker.classList.add('show');
  closeOnOutsideClick(picker);
}

export function closeMediaPicker() {
  const picker = document.getElementById('v-mp-picker');
  if (picker) picker.classList.remove('show');
}

export function getAttachments() {
  return [...state.attachments];
}

export function clearAttachments() {
  state.attachments = [];
}

export function addAttachment(attachment) {
  state.attachments.push(attachment);
}

export function removeAttachment(index) {
  state.attachments.splice(index, 1);
}

export function getRefImage() {
  return state.refImage;
}

export function setRefImage(data) {
  state.refImage = data;
}

export function clearRefImage() {
  state.refImage = null;
}

export function destroy() {
  const handlers = state.boundHandlers;
  if (handlers.dragOver) {
    document.removeEventListener('dragover', handlers.dragOver);
    document.removeEventListener('dragleave', handlers.dragLeave);
    document.removeEventListener('drop', handlers.drop);
  }
  if (handlers.paste) {
    document.removeEventListener('paste', handlers.paste);
  }
  state.attachments = [];
  state.refImage = null;
  state.dragInitialized = false;
}

// ----------------------------------------------------------
// File input creation (dynamic, no native picker)
// ----------------------------------------------------------

function openFileInput(category) {
  const cat = FILE_CATEGORIES[category] || FILE_CATEGORIES.other;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = cat.accept;
  input.multiple = state.context === 'chat';
  input.style.display = 'none';

  document.body.appendChild(input);

  input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
    input.remove();
  });

  // Handle cancel (input stays, remove on blur after timeout)
  const cleanup = () => {
    setTimeout(() => {
      if (document.body.contains(input)) input.remove();
    }, 5000);
  };
  input.addEventListener('cancel', cleanup);

  input.click();
}

// ----------------------------------------------------------
// File selection handler
// ----------------------------------------------------------

export async function handleFileSelect(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  for (const file of files) {
    // Size validation
    const category = detectCategory(file);
    const catConfig = FILE_CATEGORIES[category];
    if (file.size > catConfig.maxSize) {
      emit('toast:show', {
        message: `${file.name} exceeds ${formatSize(catConfig.maxSize)} limit`,
        type: 'error'
      });
      continue;
    }

    try {
      const preview = await getFilePreview(file);
      const attachment = {
        id: generateLocalId(),
        file,
        name: file.name,
        size: file.size,
        type: category,
        mimeType: file.type,
        dataUrl: preview.dataUrl,
        thumbnail: preview.thumbnail,
        addedAt: Date.now()
      };

      // Route based on context
      if (state.context === 'imagegen') {
        state.refImage = attachment;
        emit('media:ref-image-set', attachment);
      } else if (state.context === 'profile') {
        emit('media:profile-picture', attachment);
      } else {
        state.attachments.push(attachment);
        emit('media:file-selected', attachment);
      }
    } catch (err) {
      console.error('[VoyageAI] File processing error:', err);
      emit('toast:show', {
        message: `Failed to process ${file.name}`,
        type: 'error'
      });
    }
  }

  closeMediaPicker();
}

// ----------------------------------------------------------
// URL paste handler
// ----------------------------------------------------------

export async function handleUrlPaste(url) {
  if (!url || typeof url !== 'string') return;

  const trimmed = url.trim();

  // Validate URL format
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    emit('toast:show', { message: 'Invalid URL format', type: 'error' });
    return;
  }

  // Determine if it's an image URL
  const isImageUrl = isImageURL(trimmed);

  if (isImageUrl || state.context === 'imagegen') {
    // Attempt to fetch and use as reference
    try {
      emit('toast:show', { message: 'Fetching image from URL...', type: 'info' });

      const response = await fetch(trimmed, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const extension = guessExtension(blob.type);
      const file = new File([blob], `pasted-image${extension}`, { type: blob.type });

      handleFileSelect([file]);
    } catch (err) {
      console.error('[VoyageAI] URL fetch error:', err);
      emit('toast:show', {
        message: 'Could not fetch image from URL. Try downloading and uploading directly.',
        type: 'error'
      });
    }
  } else {
    // Non-image URL: store as text attachment reference
    const attachment = {
      id: generateLocalId(),
      file: null,
      name: extractFilename(trimmed),
      size: 0,
      type: 'url',
      mimeType: 'text/uri-list',
      dataUrl: null,
      thumbnail: null,
      url: trimmed,
      addedAt: Date.now()
    };

    state.attachments.push(attachment);
    emit('media:file-selected', attachment);
    closeMediaPicker();
  }
}

// ----------------------------------------------------------
// File preview generation
// ----------------------------------------------------------

async function getFilePreview(file) {
  const category = detectCategory(file);
  const result = { dataUrl: null, thumbnail: null };

  switch (category) {
    case 'image':
      result.dataUrl = await readAsDataURL(file);
      result.thumbnail = await createImageThumbnail(result.dataUrl, 120);
      break;

    case 'audio':
      result.thumbnail = createWaveformPlaceholder(file.name);
      break;

    case 'document':
      result.thumbnail = createDocThumbnail(file.name);
      break;

    default:
      result.thumbnail = createGenericThumbnail(file.name);
      break;
  }

  return result;
}

// ----------------------------------------------------------
// File reading helpers
// ----------------------------------------------------------

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ----------------------------------------------------------
// Thumbnail generators
// ----------------------------------------------------------

function createImageThumbnail(dataUrl, maxSize = 120) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        resolve(dataUrl); // Fallback for tainted canvas
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function createWaveformPlaceholder(filename) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">
    <rect width="120" height="60" fill="#1A1A1F" rx="6"/>
    <g fill="hsl(215,92%,56%)" opacity="0.6">
      <rect x="10" y="20" width="3" height="20" rx="1.5"/>
      <rect x="16" y="15" width="3" height="30" rx="1.5"/>
      <rect x="22" y="10" width="3" height="40" rx="1.5"/>
      <rect x="28" y="18" width="3" height="24" rx="1.5"/>
      <rect x="34" y="12" width="3" height="36" rx="1.5"/>
      <rect x="40" y="22" width="3" height="16" rx="1.5"/>
      <rect x="46" y="8" width="3" height="44" rx="1.5"/>
      <rect x="52" y="16" width="3" height="28" rx="1.5"/>
      <rect x="58" y="20" width="3" height="20" rx="1.5"/>
      <rect x="64" y="14" width="3" height="32" rx="1.5"/>
      <rect x="70" y="10" width="3" height="40" rx="1.5"/>
      <rect x="76" y="18" width="3" height="24" rx="1.5"/>
      <rect x="82" y="24" width="3" height="12" rx="1.5"/>
      <rect x="88" y="12" width="3" height="36" rx="1.5"/>
      <rect x="94" y="20" width="3" height="20" rx="1.5"/>
      <rect x="100" y="16" width="3" height="28" rx="1.5"/>
      <rect x="106" y="22" width="3" height="16" rx="1.5"/>
    </g>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function createDocThumbnail(filename) {
  const ext = getExtension(filename).toUpperCase().replace('.', '') || 'FILE';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">
    <rect width="120" height="60" fill="#1A1A1F" rx="6"/>
    <rect x="20" y="5" width="60" height="50" fill="#222228" rx="4" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <rect x="30" y="5" width="20" height="12" fill="#1A1A1F"/>
    <line x1="30" y1="25" x2="70" y2="25" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <line x1="30" y1="31" x2="70" y2="31" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <line x1="30" y1="37" x2="60" y2="37" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <line x1="30" y1="43" x2="55" y2="43" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <text x="92" y="34" fill="hsl(215,92%,56%)" font-size="11" font-weight="600" text-anchor="middle" font-family="sans-serif">${ext}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function createGenericThumbnail(filename) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">
    <rect width="120" height="60" fill="#1A1A1F" rx="6"/>
    <circle cx="60" cy="26" r="12" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <rect x="56" y="22" width="8" height="8" rx="1" fill="rgba(255,255,255,0.15)"/>
    <text x="60" y="48" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="middle" font-family="sans-serif">${truncateFilename(filename)}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ----------------------------------------------------------
// Category detection
// ----------------------------------------------------------

function detectCategory(file) {
  const ext = getExtension(file.name);

  // Check MIME type first
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'other';

  // Fall back to extension
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (DOC_EXTENSIONS.has(ext)) return 'document';

  return 'other';
}

function isImageURL(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    for (const ext of IMAGE_EXTENSIONS) {
      if (pathname.endsWith(ext)) return true;
    }
    // Check for data URL
    if (url.startsWith('data:image/')) return true;
  } catch {
    // ignore
  }
  return false;
}

// ----------------------------------------------------------
// Picker UI
// ----------------------------------------------------------

function setupPickerListeners() {
  const picker = document.getElementById('v-mp-picker');
  if (!picker) return;

  // Build picker content if empty
  if (picker.children.length === 0) {
    for (const [key, cat] of Object.entries(FILE_CATEGORIES)) {
      const option = document.createElement('div');
      option.className = 'v-mp-option';
      option.dataset.category = key;
      option.innerHTML = `
        <div class="v-mp-option-icon" style="background:${cat.iconBg};color:${cat.iconColor}">${cat.icon}</div>
        <div>
          <div class="v-mp-option-text">${cat.label}</div>
          <div class="v-mp-option-desc">${cat.desc}</div>
        </div>
      `;
      option.addEventListener('click', () => openFileInput(key));
      picker.appendChild(option);
    }

    // URL input option
    const urlOption = document.createElement('div');
    urlOption.className = 'v-mp-option';
    urlOption.innerHTML = `
      <div class="v-mp-option-icon" style="background:rgba(248,113,113,0.1);color:var(--error)">🔗</div>
      <div>
        <div class="v-mp-option-text">Paste URL</div>
        <div class="v-mp-option-desc">Image or file URL</div>
      </div>
    `;
    urlOption.addEventListener('click', () => {
      const url = prompt('Paste image or file URL:');
      if (url) handleUrlPaste(url);
      closeMediaPicker();
    });
    picker.appendChild(urlOption);
  }

  // Attach button listener
  const attachBtn = document.getElementById('v-typ-attach');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      const pickerEl = document.getElementById('v-mp-picker');
      if (pickerEl?.classList.contains('show')) {
        closeMediaPicker();
      } else {
        openMediaPicker('chat');
      }
    });
  }
}

function closeOnOutsideClick(picker) {
  const handler = (e) => {
    if (!picker.contains(e.target) && e.target.id !== 'v-typ-attach') {
      closeMediaPicker();
      document.removeEventListener('click', handler);
    }
  };
  // Delay to avoid immediate close from the same click
  requestAnimationFrame(() => {
    document.addEventListener('click', handler);
  });
}

// ----------------------------------------------------------
// Drag and drop
// ----------------------------------------------------------

function setupDragAndDrop() {
  if (state.dragInitialized) return;
  state.dragInitialized = true;

  const handleDragOver = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Visual feedback on drop targets
    const targets = [
      document.getElementById('v-typing-bar'),
      document.getElementById('v-ch-messages'),
      document.getElementById('v-img-ref-upload')
    ];

    for (const target of targets) {
      if (target && isElementOrChild(e.target, target)) {
        target.classList.add('v-drag-active');
      }
    }
  };

  const handleDragLeave = (e) => {
    // Only remove if actually leaving the element
    if (e.relatedTarget && isElementOrChild(e.relatedTarget, e.currentTarget)) return;

    document.querySelectorAll('.v-drag-active').forEach(el => {
      el.classList.remove('v-drag-active');
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();

    document.querySelectorAll('.v-drag-active').forEach(el => {
      el.classList.remove('v-drag-active');
    });

    if (!e.dataTransfer?.files?.length) return;

    // Determine context based on drop target
    const imageGenPage = document.getElementById('v-page-imagegen');
    if (imageGenPage && isElementOrChild(e.target, imageGenPage)) {
      state.context = 'imagegen';
    } else {
      state.context = 'chat';
    }

    handleFileSelect(e.dataTransfer.files);
  };

  state.boundHandlers.dragOver = handleDragOver;
  state.boundHandlers.dragLeave = handleDragLeave;
  state.boundHandlers.drop = handleDrop;

  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('dragleave', handleDragLeave);
  document.addEventListener('drop', handleDrop);
}

// ----------------------------------------------------------
// Paste listener
// ----------------------------------------------------------

function setupPasteListener() {
  const handlePaste = (e) => {
    // Only handle when chat input is focused or on imagegen page
    const input = document.getElementById('v-typ-input');
    const promptArea = document.getElementById('v-img-prompt');

    const isTypingBarFocused = document.activeElement === input;
    const isPromptFocused = document.activeElement === promptArea;

    // Handle pasted images (clipboard)
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          // If in prompt area and it's an image, treat as reference
          if (isPromptFocused && file.type.startsWith('image/')) {
            state.context = 'imagegen';
          }
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFileSelect(imageFiles);
      return;
    }

    // Handle pasted URLs (only when not typing in a text field)
    if (!isTypingBarFocused && !isPromptFocused) {
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text && isValidUrl(text) && isImageURL(text)) {
        e.preventDefault();
        handleUrlPaste(text);
      }
    }
  };

  state.boundHandlers.paste = handlePaste;
  document.addEventListener('paste', handlePaste);
}

// ----------------------------------------------------------
// Reference image preview for Image Gen page
// ----------------------------------------------------------

export function renderRefImagePreview(attachment) {
  const uploadArea = document.getElementById('v-img-ref-upload');
  if (!uploadArea || !attachment) return;

  uploadArea.innerHTML = '';
  uploadArea.classList.add('v-has-file');

  if (attachment.dataUrl && attachment.type === 'image') {
    const preview = document.createElement('div');
    preview.className = 'v-ref-preview';
    preview.innerHTML = `
      <img src="${attachment.dataUrl}" alt="${escapeAttr(attachment.name)}" class="v-ref-preview-img">
      <button class="v-ref-preview-remove v-ct-btn-icon" title="Remove reference">✕</button>
      <span class="v-ref-preview-name">${escapeHtml(attachment.name)}</span>
    `;

    preview.querySelector('.v-ref-preview-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      clearRefImage();
      resetUploadArea(uploadArea);
      emit('media:ref-image-cleared');
    });

    uploadArea.appendChild(preview);
  } else {
    // Non-image file
    const info = document.createElement('div');
    info.className = 'v-ref-file-info';
    info.innerHTML = `
      <span class="v-ref-file-icon">${FILE_CATEGORIES[attachment.type]?.icon || '📁'}</span>
      <span class="v-ref-file-name">${escapeHtml(attachment.name)}</span>
      <span class="v-ref-file-size">${formatSize(attachment.size)}</span>
      <button class="v-ref-preview-remove v-ct-btn-icon" title="Remove">✕</button>
    `;

    info.querySelector('.v-ref-preview-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      clearRefImage();
      resetUploadArea(uploadArea);
      emit('media:ref-image-cleared');
    });

    uploadArea.appendChild(info);
  }
}

function resetUploadArea(uploadArea) {
  uploadArea.classList.remove('v-has-file');
  uploadArea.innerHTML = `
    <div class="v-ct-upload-icon">🖼</div>
    <div class="v-ct-upload-text">Drop an image here, or <strong>click to browse</strong></div>
    <div class="v-ct-upload-desc">or paste an image URL</div>
  `;
  uploadArea.addEventListener('click', () => openFileInput('image'), { once: true });
}

// ----------------------------------------------------------
// Attachment preview for chat typing bar
// ----------------------------------------------------------

export function renderAttachmentPreviews() {
  const bar = document.getElementById('v-typing-bar');
  if (!bar) return;

  let previewContainer = bar.querySelector('.v-att-previews');

  if (state.attachments.length === 0) {
    if (previewContainer) previewContainer.remove();
    return;
  }

  if (!previewContainer) {
    previewContainer = document.createElement('div');
    previewContainer.className = 'v-att-previews';
    bar.querySelector('.v-typ-wrap')?.prepend(previewContainer);
  }

  previewContainer.innerHTML = '';

  state.attachments.forEach((att, index) => {
    const chip = document.createElement('div');
    chip.className = 'v-att-chip';

    if (att.type === 'image' && att.thumbnail) {
      chip.innerHTML = `
        <img src="${att.thumbnail}" class="v-att-thumb" alt="">
        <span class="v-att-name">${escapeHtml(truncateFilename(att.name))}</span>
        <button class="v-att-remove" data-index="${index}">✕</button>
      `;
    } else {
      const cat = FILE_CATEGORIES[att.type] || FILE_CATEGORIES.other;
      chip.innerHTML = `
        <span class="v-att-icon">${cat.icon}</span>
        <span class="v-att-name">${escapeHtml(truncateFilename(att.name))}</span>
        <span class="v-att-size">${formatSize(att.size)}</span>
        <button class="v-att-remove" data-index="${index}">✕</button>
      `;
    }

    chip.querySelector('.v-att-remove').addEventListener('click', () => {
      removeAttachment(index);
      renderAttachmentPreviews();
    });

    previewContainer.appendChild(chip);
  });
}

// Listen for new attachments to render previews
on('media:file-selected', () => {
  renderAttachmentPreviews();
});

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function getExtension(filename) {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.substring(idx).toLowerCase() : '';
}

function guessExtension(mimeType) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
  };
  return map[mimeType] || '.png';
}

function extractFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'file';
  } catch {
    return 'file';
  }
}

function truncateFilename(name, maxLen = 20) {
  if (!name || name.length <= maxLen) return name;
  const ext = getExtension(name);
  const base = name.substring(0, name.length - ext.length);
  const truncated = base.substring(0, maxLen - ext.length - 3);
  return truncated + '...' + ext;
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return size + ' ' + units[i];
}

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function isElementOrChild(el, parent) {
  if (!el || !parent) return false;
  return parent.contains(el);
}

function generateLocalId() {
  return 'att_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}