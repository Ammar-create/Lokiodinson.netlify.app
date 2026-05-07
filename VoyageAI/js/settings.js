// ============================================================
// FILE 12: js/settings.js
// Settings page — all tabs, render logic, state management
// ============================================================

import * as store from './store.js';
import { getActiveProvider } from './providers.js';
import { EventBus } from './app.js';
import { showToast } from './ui.js';

// === State ===
let currentTab = 'personalization';
let accentDots = [];

// === Public API ===

export function init() {
  // Listen for setting changes from other modules
  EventBus.on('memory:added', () => {
    if (currentTab === 'memory') renderMemory();
  });

  EventBus.on('provider:changed', () => {
    if (currentTab === 'providers') renderProviders();
  });
}

export function navigateToSetting(tab) {
  currentTab = tab;
  renderSettingsNav();
  renderSettingsContent(tab);
}

// === Settings Nav ===

export function renderSettingsNav() {
  const nav = document.getElementById('v-set-nav');
  if (!nav) return;

  const sections = [
    {
      label: 'My AI',
      items: [
        { id: 'personalization', icon: '👤', title: 'Personalization', desc: 'Tone, characteristics, instructions' },
        { id: 'memory', icon: '🧠', title: 'Memory', desc: 'Manage stored memories' }
      ]
    },
    {
      label: 'Account',
      items: [
        { id: 'profile', icon: '✏️', title: 'Profile', desc: 'Name, picture, nickname' }
      ]
    },
    {
      label: 'Preferences',
      items: [
        { id: 'appearance', icon: '◐', title: 'Appearance', desc: 'Theme, accent, streaming' },
        { id: 'providers', icon: '🔌', title: 'Providers', desc: 'API keys, models, tools' }
      ]
    }
  ];

  let html = '';

  for (const section of sections) {
    html += `<div class="v-set-section">`;
    html += `<div class="v-set-section-title">${section.label}</div>`;

    for (const item of section.items) {
      const isActive = currentTab === item.id ? ' active' : '';
      html += `
        <div class="v-ct-card${isActive}" data-settings-tab="${item.id}">
          <div class="v-ct-card-icon">${item.icon}</div>
          <div class="v-ct-card-content">
            <div class="v-ct-card-title">${item.title}</div>
            <div class="v-ct-card-desc">${item.desc}</div>
          </div>
          <span class="v-ct-card-chevron">›</span>
        </div>`;
    }

    html += `</div>`;
  }

  nav.innerHTML = html;

  // Bind clicks
  nav.querySelectorAll('[data-settings-tab]').forEach(card => {
    card.addEventListener('click', () => {
      navigateToSetting(card.dataset.settingsTab);
    });
  });
}

// === Content Router ===

function renderSettingsContent(tab) {
  const content = document.getElementById('v-set-content');
  if (!content) return;

  switch (tab) {
    case 'personalization':
      renderPersonalization();
      break;
    case 'memory':
      renderMemory();
      break;
    case 'profile':
      renderProfile();
      break;
    case 'appearance':
      renderAppearance();
      break;
    case 'providers':
      renderProviders();
      break;
    default:
      content.innerHTML = `<p class="v-type-muted">Select a setting from the left.</p>`;
  }
}

// === Personalization Tab ===

export async function renderPersonalization() {
  const content = document.getElementById('v-set-content');
  if (!content) return;

  const [
    tone, warmth, enthusiasm, emoji, headers, instructions, searchEnabled
  ] = await Promise.all([
    store.getSetting('tone'),
    store.getSetting('warmth'),
    store.getSetting('enthusiasm'),
    store.getSetting('emoji_usage'),
    store.getSetting('headers_usage'),
    store.getSetting('custom_instructions'),
    store.getSetting('web_search_enabled')
  ]);

  content.innerHTML = `
    <h2 class="v-type-h2" style="margin-bottom:24px">Personalization</h2>

    <!-- Tone Selector -->
    <div class="v-set-field-group">
      <label class="v-ct-label">Tone</label>
      <div class="v-ct-select-wrap" id="v-set-tone-select">
        <div class="v-ct-select-trigger"><span>${tone || 'Professional'}</span></div>
        <div class="v-ct-select-dropdown">
          ${['Default', 'Professional', 'Friendly', 'Concise', 'Creative'].map(t => `
            <div class="v-ct-select-option${(tone || 'Professional') === t ? ' selected' : ''}" data-value="${t}">
              ${t}${(tone || 'Professional') === t ? ' <span class="v-ct-check">✓</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Characteristic Sliders -->
    <div class="v-set-field-group" style="margin-top:24px">
      <label class="v-ct-label" style="margin-bottom:16px">Characteristics</label>
      ${renderSlider('warmth', 'Warmth', warmth || 1)}
      ${renderSlider('enthusiasm', 'Enthusiasm', enthusiasm || 1)}
      ${renderSlider('emoji_usage', 'Emoji Usage', emoji || 1)}
      ${renderSlider('headers_usage', 'Headers & Lists', headers || 1)}
    </div>

    <!-- Custom Instructions -->
    <div class="v-set-field-group" style="margin-top:24px">
      <label class="v-ct-label">Custom Instructions</label>
      <textarea class="v-ct-textarea" id="v-set-instructions" rows="4"
        placeholder="Tell the AI how to behave. This is prepended to the system prompt.">${instructions || ''}</textarea>
    </div>

    <!-- Web Search Toggle -->
    <div class="v-ct-toggle-row" style="margin-top:16px;max-width:100%">
      <div class="v-ct-toggle-info">
        <div class="v-ct-toggle-title">Web Search</div>
        <div class="v-ct-toggle-desc">Allow model to search the web by default</div>
      </div>
      <div class="v-ct-toggle${searchEnabled !== false ? ' on' : ''}" id="v-set-search-toggle"></div>
    </div>
  `;

  // === Bind Tone Select ===
  const toneSelect = content.querySelector('#v-set-tone-select');
  if (toneSelect) {
    bindCustomSelect(toneSelect, async (value) => {
      await store.setSetting('tone', value);
      EventBus.emit('setting:changed', { key: 'tone', value });
    });
  }

  // === Bind Sliders ===
  content.querySelectorAll('.v-ct-slider-segment').forEach(seg => {
    seg.addEventListener('click', async () => {
      const track = seg.closest('.v-ct-slider-track');
      const field = track.dataset.field;
      const index = parseInt(seg.dataset.index, 10);
      const segments = track.querySelectorAll('.v-ct-slider-segment');
      const labels = ['Less', 'Default', 'More'];
      const valueDisplay = track.parentElement.querySelector('.v-ct-slider-value');

      segments.forEach((s, i) => {
        s.classList.toggle('filled', i <= index);
      });
      if (valueDisplay) valueDisplay.textContent = labels[index];

      await store.setSetting(field, index);
      EventBus.emit('setting:changed', { key: field, value: index });
    });
  });

  // === Bind Custom Instructions ===
  const instructionsEl = content.querySelector('#v-set-instructions');
  if (instructionsEl) {
    let saveTimeout;
    instructionsEl.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        await store.setSetting('custom_instructions', instructionsEl.value);
        EventBus.emit('setting:changed', { key: 'custom_instructions', value: instructionsEl.value });
      }, 500);
    });
  }

  // === Bind Search Toggle ===
  const searchToggle = content.querySelector('#v-set-search-toggle');
  if (searchToggle) {
    searchToggle.addEventListener('click', async () => {
      searchToggle.classList.toggle('on');
      const enabled = searchToggle.classList.contains('on');
      await store.setSetting('web_search_enabled', enabled);
      EventBus.emit('setting:changed', { key: 'web_search_enabled', value: enabled });
    });
  }
}

function renderSlider(field, label, level) {
  const labels = ['Less', 'Default', 'More'];
  return `
    <div class="v-ct-slider-group">
      <div class="v-ct-slider-header">
        <span class="v-ct-slider-label">${label}</span>
        <span class="v-ct-slider-value">${labels[level] || 'Default'}</span>
      </div>
      <div class="v-ct-slider-track" data-field="${field}">
        ${[0, 1, 2].map(i => `
          <div class="v-ct-slider-segment${i <= level ? ' filled' : ''}" data-index="${i}"></div>
        `).join('')}
      </div>
      <div class="v-ct-slider-labels">
        <span>Less</span>
        <span>Default</span>
        <span>More</span>
      </div>
    </div>`;
}

// === Memory Tab ===

export async function renderMemory() {
  const content = document.getElementById('v-set-content');
  if (!content) return;

  const [
    memories, refMemories, refHistory, nickname, occupation, additionalInfo
  ] = await Promise.all([
    store.getMemories(),
    store.getSetting('reference_memories'),
    store.getSetting('reference_chat_history'),
    store.getSetting('nickname'),
    store.getSetting('occupation'),
    store.getSetting('additional_info')
  ]);

  // Sort memories newest first
  memories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  let memoryListHtml = '';
  if (memories.length === 0) {
    memoryListHtml = `<p class="v-type-muted" style="padding:20px;text-align:center">No memories saved yet.</p>`;
  } else {
    for (const mem of memories) {
      const date = mem.createdAt ? new Date(mem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      memoryListHtml += `
        <div class="v-set-memory-item" data-memory-id="${mem.id}">
          <span class="v-set-memory-icon">🧠</span>
          <span class="v-set-memory-text">${escapeHTML(mem.content)}</span>
          <span class="v-set-memory-date">${date}</span>
          <button class="v-ct-btn-icon v-set-memory-delete" title="Delete" style="width:28px;height:28px;font-size:12px;flex-shrink:0">🗑</button>
        </div>`;
    }
  }

  content.innerHTML = `
    <h2 class="v-type-h2" style="margin-bottom:24px">Memory</h2>

    <!-- Toggles -->
    <div class="v-ct-toggle-row" style="max-width:100%">
      <div class="v-ct-toggle-info">
        <div class="v-ct-toggle-title">Reference Saved Memories</div>
        <div class="v-ct-toggle-desc">Use stored memories in AI responses</div>
      </div>
      <div class="v-ct-toggle${refMemories !== false ? ' on' : ''}" id="v-set-ref-memories"></div>
    </div>

    <div class="v-ct-toggle-row" style="max-width:100%">
      <div class="v-ct-toggle-info">
        <div class="v-ct-toggle-title">Reference Chat History</div>
        <div class="v-ct-toggle-desc">Allow AI to recall past conversations</div>
      </div>
      <div class="v-ct-toggle${refHistory !== false ? ' on' : ''}" id="v-set-ref-history"></div>
    </div>

    <!-- Personal Fields -->
    <div style="margin-top:24px">
      <label class="v-ct-label">Personal Details (used in AI context)</label>
      <div class="v-ct-input-group" style="margin-top:8px">
        <input class="v-ct-input" id="v-set-mem-nickname" placeholder="Nickname" value="${escapeHTML(nickname || '')}">
      </div>
      <div class="v-ct-input-group" style="margin-top:8px">
        <input class="v-ct-input" id="v-set-mem-occupation" placeholder="Occupation" value="${escapeHTML(occupation || '')}">
      </div>
      <div class="v-ct-input-group" style="margin-top:8px">
        <textarea class="v-ct-textarea" id="v-set-mem-additional" rows="2" placeholder="Additional info (hobbies, preferences, etc.)">${escapeHTML(additionalInfo || '')}</textarea>
      </div>
      <button class="v-ct-btn v-ct-btn-primary btn-sm" id="v-set-mem-save-fields" style="margin-top:8px">Save Details</button>
    </div>

    <!-- Memory List -->
    <div style="margin-top:32px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <label class="v-ct-label" style="margin:0">Saved Memories (${memories.length})</label>
        <button class="v-ct-btn v-ct-btn-sm v-ct-btn-secondary" id="v-set-add-memory">+ Add Memory</button>
      </div>
      <div class="v-set-memory-list" id="v-set-memory-list">
        ${memoryListHtml}
      </div>
    </div>
  `;

  // === Bind Toggles ===
  bindToggle('#v-set-ref-memories', 'reference_memories');
  bindToggle('#v-set-ref-history', 'reference_chat_history');

  // === Bind Save Personal Fields ===
  const saveFieldsBtn = content.querySelector('#v-set-mem-save-fields');
  if (saveFieldsBtn) {
    saveFieldsBtn.addEventListener('click', async () => {
      const nn = content.querySelector('#v-set-mem-nickname').value.trim();
      const oc = content.querySelector('#v-set-mem-occupation').value.trim();
      const ad = content.querySelector('#v-set-mem-additional').value.trim();

      await Promise.all([
        store.setSetting('nickname', nn),
        store.setSetting('occupation', oc),
        store.setSetting('additional_info', ad)
      ]);

      EventBus.emit('setting:changed', { key: 'nickname', value: nn });
      showToast('Personal details saved', 'success');
    });
  }

  // === Bind Add Memory ===
  const addBtn = content.querySelector('#v-set-add-memory');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const memContent = prompt('Enter a new memory:');
      if (!memContent || !memContent.trim()) return;

      const id = await store.addMemory(memContent.trim());
      EventBus.emit('memory:added', { id, content: memContent.trim() });
      showToast('Memory saved', 'success');
      renderMemory();
    });
  }

  // === Bind Delete Memory ===
  content.querySelectorAll('.v-set-memory-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = btn.closest('.v-set-memory-item');
      const memId = parseInt(item.dataset.memoryId, 10);
      await store.deleteMemory(memId);
      EventBus.emit('memory:deleted', { id: memId });
      item.remove();

      // Update count
      const list = content.querySelector('#v-set-memory-list');
      const count = list ? list.querySelectorAll('.v-set-memory-item').length : 0;
      const label = content.querySelector('.v-ct-label');
      if (label) label.textContent = `Saved Memories (${count})`;
    });
  });
}

// === Profile Tab ===

export async function renderProfile() {
  const content = document.getElementById('v-set-content');
  if (!content) return;

  const profile = await store.getProfile() || {};

  content.innerHTML = `
    <h2 class="v-type-h2" style="margin-bottom:24px">Profile</h2>

    <!-- Avatar -->
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:28px">
      <div class="v-ct-avatar-lg" id="v-set-avatar-preview"
        style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg, var(--accent), hsl(calc(var(--accent-h) + 40), 80%, 60%));display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden">
        ${profile.picture
          ? `<img src="${profile.picture}" style="width:100%;height:100%;object-fit:cover">`
          : getInitials(profile.firstName, profile.lastName)}
      </div>
      <div>
        <button class="v-ct-btn v-ct-btn-secondary btn-sm" id="v-set-avatar-upload">Upload Photo</button>
        <button class="v-ct-btn v-ct-btn-ghost btn-sm" id="v-set-avatar-remove" ${!profile.picture ? 'style="display:none"' : ''}>Remove</button>
        <p class="v-type-muted" style="margin-top:6px">JPG, PNG or WebP. Max 5MB.</p>
      </div>
    </div>

    <!-- Name Fields -->
    <div class="v-ct-input-group">
      <label class="v-ct-label">First Name</label>
      <input class="v-ct-input" id="v-set-first-name" placeholder="First name" value="${escapeHTML(profile.firstName || '')}">
    </div>

    <div class="v-ct-input-group" style="margin-top:12px">
      <label class="v-ct-label">Last Name</label>
      <input class="v-ct-input" id="v-set-last-name" placeholder="Last name" value="${escapeHTML(profile.lastName || '')}">
    </div>

    <div class="v-ct-input-group" style="margin-top:12px">
      <label class="v-ct-label">Nickname</label>
      <input class="v-ct-input" id="v-set-nickname" placeholder="What should the AI call you?" value="${escapeHTML(profile.nickname || '')}">
    </div>

    <button class="v-ct-btn v-ct-btn-primary" style="margin-top:20px" id="v-set-profile-save">Save Profile</button>
  `;

  // === Hidden file input for avatar ===
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.style.display = 'none';
  fileInput.id = 'v-set-avatar-file';
  content.appendChild(fileInput);

  // === Bind Upload ===
  const uploadBtn = content.querySelector('#v-set-avatar-upload');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => fileInput.click());
  }

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const preview = content.querySelector('#v-set-avatar-preview');
      preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover">`;
      preview.dataset.picture = dataUrl;

      const removeBtn = content.querySelector('#v-set-avatar-remove');
      if (removeBtn) removeBtn.style.display = '';
    };
    reader.readAsDataURL(file);
  });

  // === Bind Remove ===
  const removeBtn = content.querySelector('#v-set-avatar-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const preview = content.querySelector('#v-set-avatar-preview');
      delete preview.dataset.picture;
      preview.innerHTML = getInitials(
        content.querySelector('#v-set-first-name').value,
        content.querySelector('#v-set-last-name').value
      );
      removeBtn.style.display = 'none';
      fileInput.value = '';
    });
  }

  // === Bind Save ===
  const saveBtn = content.querySelector('#v-set-profile-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const preview = content.querySelector('#v-set-avatar-preview');
      const profileData = {
        firstName: content.querySelector('#v-set-first-name').value.trim(),
        lastName: content.querySelector('#v-set-last-name').value.trim(),
        nickname: content.querySelector('#v-set-nickname').value.trim(),
        picture: preview.dataset.picture || (preview.querySelector('img')?.src) || null
      };

      await store.saveProfile(profileData);
      showToast('Profile saved', 'success');

      // Also update nickname in settings so AI can reference it
      if (profileData.nickname) {
        await store.setSetting('nickname', profileData.nickname);
      }

      // Refresh sidebar user card
      EventBus.emit('setting:changed', { key: 'profile', value: profileData });
    });
  }
}

// === Appearance Tab ===

export async function renderAppearance() {
  const content = document.getElementById('v-set-content');
  if (!content) return;

  const [theme, accentH, accentS, accentL, streaming] = await Promise.all([
    store.getSetting('theme'),
    store.getSetting('accent_h'),
    store.getSetting('accent_s'),
    store.getSetting('accent_l'),
    store.getSetting('streaming_enabled')
  ]);

  const currentTheme = theme || 'dark';
  const currentH = accentH ?? 215;
  const currentS = accentS ?? 92;
  const currentL = accentL ?? 56;

  const presets = [
    { name: 'Blue', h: 215, s: 92, l: 56 },
    { name: 'Purple', h: 262, s: 83, l: 58 },
    { name: 'Green', h: 142, s: 71, l: 45 },
    { name: 'Rose', h: 346, s: 77, l: 55 },
    { name: 'Orange', h: 25, s: 95, l: 53 },
    { name: 'Amber', h: 47, s: 96, l: 53 },
    { name: 'Cyan', h: 187, s: 85, l: 43 },
    { name: 'Neutral', h: 0, s: 0, l: 55 }
  ];

  content.innerHTML = `
    <h2 class="v-type-h2" style="margin-bottom:24px">Appearance</h2>

    <!-- Theme -->
    <div class="v-set-field-group">
      <label class="v-ct-label">Theme</label>
      <div class="v-ct-select-wrap" id="v-set-theme-select">
        <div class="v-ct-select-trigger"><span>${capitalize(currentTheme)}</span></div>
        <div class="v-ct-select-dropdown">
          ${['dark', 'light', 'system'].map(t => `
            <div class="v-ct-select-option${currentTheme === t ? ' selected' : ''}" data-value="${t}">
              ${capitalize(t)}${currentTheme === t ? ' <span class="v-ct-check">✓</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Accent Color -->
    <div style="margin-top:24px">
      <label class="v-ct-label">Accent Color</label>
      <div class="v-ct-accent-picker" id="v-set-accent-picker" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        ${presets.map(p => {
          const isActive = p.h === currentH && p.s === currentS && p.l === currentL;
          return `<div class="v-ct-accent-dot${isActive ? ' active' : ''}"
            style="background:hsl(${p.h},${p.s}%,${p.l}%)"
            data-h="${p.h}" data-s="${p.s}" data-l="${p.l}"
            title="${p.name}"></div>`;
        }).join('')}
      </div>
    </div>

    <!-- Streaming -->
    <div class="v-ct-toggle-row" style="margin-top:24px;max-width:100%">
      <div class="v-ct-toggle-info">
        <div class="v-ct-toggle-title">Streaming</div>
        <div class="v-ct-toggle-desc">Stream AI responses in real-time</div>
      </div>
      <div class="v-ct-toggle${streaming !== false ? ' on' : ''}" id="v-set-streaming-toggle"></div>
    </div>
  `;

  // === Bind Theme Select ===
  const themeSelect = content.querySelector('#v-set-theme-select');
  if (themeSelect) {
    bindCustomSelect(themeSelect, async (value) => {
      await applyTheme(value);
      await store.setSetting('theme', value);
      EventBus.emit('theme:changed', { theme: value });
      EventBus.emit('setting:changed', { key: 'theme', value });
    });
  }

  // === Bind Accent Dots ===
  const picker = content.querySelector('#v-set-accent-picker');
  if (picker) {
    picker.querySelectorAll('.v-ct-accent-dot').forEach(dot => {
      dot.addEventListener('click', async () => {
        picker.querySelectorAll('.v-ct-accent-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');

        const h = parseInt(dot.dataset.h, 10);
        const s = parseInt(dot.dataset.s, 10);
        const l = parseInt(dot.dataset.l, 10);

        applyAccent(h, s, l);

        await Promise.all([
          store.setSetting('accent_h', h),
          store.setSetting('accent_s', s),
          store.setSetting('accent_l', l)
        ]);

        EventBus.emit('accent:changed', { h, s, l });
        EventBus.emit('setting:changed', { key: 'accent', value: { h, s, l } });
      });
    });
  }

  // === Bind Streaming Toggle ===
  const streamingToggle = content.querySelector('#v-set-streaming-toggle');
  if (streamingToggle) {
    streamingToggle.addEventListener('click', async () => {
      streamingToggle.classList.toggle('on');
      const enabled = streamingToggle.classList.contains('on');
      await store.setSetting('streaming_enabled', enabled);
      EventBus.emit('setting:changed', { key: 'streaming_enabled', value: enabled });
    });
  }
}

// === Providers Tab ===

export async function renderProviders() {
  const content = document.getElementById('v-set-content');
  if (!content) return;

  const [providers, activeProvider, activeModel] = await Promise.all([
    store.getProviders(),
    store.getSetting('active_provider'),
    store.getSetting('active_model')
  ]);

  let providerCardsHtml = '';

  for (const provider of providers) {
    const models = await store.getModels(provider.id);
    const isActive = String(provider.id) === String(activeProvider);

    let modelListHtml = '';
    for (const model of models) {
      const caps = model.capabilities || [];
      const tags = [
        caps.includes('text') ? '<span class="v-ct-tag text">Text</span>' : '',
        caps.includes('image') ? '<span class="v-ct-tag image">Image</span>' : '',
        caps.includes('video') ? '<span class="v-ct-tag image">Video</span>' : '',
        caps.includes('tools') ? '<span class="v-ct-tag tools">Tools</span>' : '',
        caps.includes('vision') ? '<span class="v-ct-tag vision">Vision</span>' : '',
        caps.includes('reasoning') ? '<span class="v-ct-tag reasoning">Reason</span>' : '',
        caps.includes('tts') ? '<span class="v-ct-tag text">TTS</span>' : '',
        caps.includes('stt') ? '<span class="v-ct-tag text">STT</span>' : '',
        caps.includes('embeddings') ? '<span class="v-ct-tag tools">Embed</span>' : ''
      ].filter(Boolean).join('');

      modelListHtml += `
        <div class="v-ct-model-config-item">
          <div class="v-ct-toggle${model.active !== false ? ' on' : ''}"
            data-model-id="${model.id}" data-provider-id="${provider.id}"></div>
          <span class="v-ct-model-config-name">${escapeHTML(model.name)}</span>
          <div class="v-ct-model-config-tags">${tags}</div>
        </div>`;
    }

    // Gradient colors per provider
    const gradientMap = {
      'AquaDevs': 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
      'Groq': 'linear-gradient(135deg,#F97316,#EA580C)',
      'OpenAI': 'linear-gradient(135deg,#10B981,#059669)',
      'Anthropic': 'linear-gradient(135deg,#D97706,#B45309)',
      'Google': 'linear-gradient(135deg,#8B5CF6,#7C3AED)'
    };
    const gradient = gradientMap[provider.name] || 'linear-gradient(135deg,#6366F1,#4F46E5)';
    const initial = provider.name.charAt(0).toUpperCase();

    providerCardsHtml += `
      <div class="v-ct-provider-card">
        <div class="v-ct-provider-header">
          <div class="v-ct-provider-icon" style="background:${gradient};color:#fff">${initial}</div>
          <div class="v-ct-provider-info">
            <div class="v-ct-provider-name">${escapeHTML(provider.name)}</div>
            <div class="v-ct-provider-url">${escapeHTML(provider.baseUrl || '')}</div>
          </div>
          <div class="v-ct-provider-actions">
            <button class="v-ct-btn-icon" style="width:30px;height:30px;font-size:13px"
              data-action="refresh-models" data-provider-id="${provider.id}" title="Refresh Models">⟳</button>
            <button class="v-ct-btn-icon" style="width:30px;height:30px;font-size:13px"
              data-action="delete-provider" data-provider-id="${provider.id}" title="Delete">🗑</button>
          </div>
        </div>
        <div class="v-ct-model-config-list">
          ${modelListHtml || '<p class="v-type-muted" style="padding:8px 0;font-size:12px">No models loaded. Click ⟳ to fetch.</p>'}
        </div>
      </div>`;
  }

  // Add Provider Form
  const addProviderHtml = `
    <div class="v-ct-provider-card" style="border-style:dashed;border-color:var(--border-default)">
      <div class="v-ct-provider-header" style="flex-wrap:wrap;gap:12px;align-items:flex-start">
        <div class="v-ct-provider-icon" style="background:var(--bg-tertiary);color:var(--text-muted);font-size:22px">+</div>
        <div class="v-ct-provider-info" style="flex-basis:100%">
          <div class="v-ct-provider-name" style="color:var(--text-secondary)">Add New Provider</div>
        </div>
        <input class="v-ct-input" id="v-set-new-provider-name" placeholder="Provider name" style="width:100%;margin-top:4px">
        <input class="v-ct-input" id="v-set-new-provider-url" placeholder="Base URL (e.g. https://api.groq.com)" style="width:100%">
        <input class="v-ct-input" id="v-set-new-provider-key" type="password" placeholder="API Key" style="width:100%">
        <div style="display:flex;gap:8px;width:100%">
          <button class="v-ct-btn v-ct-btn-primary btn-sm" style="flex:1" id="v-set-add-provider-btn">
            Save &amp; Fetch Models
          </button>
        </div>
      </div>
    </div>`;

  content.innerHTML = `
    <h2 class="v-type-h2" style="margin-bottom:24px">Providers</h2>
    <div class="v-set-provider-list">
      ${providerCardsHtml}
      ${addProviderHtml}
    </div>
  `;

  // === Bind Model Toggles ===
  content.querySelectorAll('.v-ct-model-config-item .v-ct-toggle').forEach(toggle => {
    toggle.addEventListener('click', async () => {
      toggle.classList.toggle('on');
      const modelId = parseInt(toggle.dataset.modelId, 10);
      const isActive = toggle.classList.contains('on');
      await store.updateModel(modelId, { active: isActive });
    });
  });

  // === Bind Refresh Models ===
  content.querySelectorAll('[data-action="refresh-models"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const providerId = parseInt(btn.dataset.providerId, 10);
      btn.textContent = '⏳';
      btn.disabled = true;

      try {
        const providerConfig = await store.dbGet('providers', providerId);
        if (!providerConfig) throw new Error('Provider not found');

        const provider = getActiveProvider();
        // If this is the active provider, use it; otherwise create a temp instance
        const models = await provider.fetchModels();

        // Clear old models for this provider
        const existing = await store.getModels(providerId);
        for (const m of existing) {
          await store.dbDelete('models', m.id);
        }

        // Add new models
        for (const model of models) {
          await store.addModel({
            providerId,
            name: model.name || model.id,
            type: model.type || 'text',
            active: true,
            capabilities: model.capabilities || ['text']
          });
        }

        showToast(`Fetched ${models.length} models`, 'success');
        renderProviders();
      } catch (err) {
        showToast(`Failed to fetch models: ${err.message}`, 'error');
      } finally {
        btn.textContent = '⟳';
        btn.disabled = false;
      }
    });
  });

  // === Bind Delete Provider ===
  content.querySelectorAll('[data-action="delete-provider"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const providerId = parseInt(btn.dataset.providerId, 10);
      if (!confirm('Delete this provider and all its models?')) return;

      // Delete models first
      const models = await store.getModels(providerId);
      for (const m of models) {
        await store.dbDelete('models', m.id);
      }

      await store.deleteProvider(providerId);
      showToast('Provider deleted', 'success');
      renderProviders();
    });
  });

  // === Bind Add Provider ===
  const addBtn = content.querySelector('#v-set-add-provider-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const name = content.querySelector('#v-set-new-provider-name').value.trim();
      const baseUrl = content.querySelector('#v-set-new-provider-url').value.trim();
      const apiKey = content.querySelector('#v-set-new-provider-key').value.trim();

      if (!name || !baseUrl) {
        showToast('Name and URL are required', 'error');
        return;
      }

      addBtn.textContent = 'Saving...';
      addBtn.disabled = true;

      try {
        const providerId = await store.addProvider({ name, baseUrl, apiKey });
        showToast(`${name} added. Click ⟳ to fetch models.`, 'success');

        EventBus.emit('provider:changed', { providerId, name });

        // Re-render to show the new card
        renderProviders();
      } catch (err) {
        showToast(`Failed to add provider: ${err.message}`, 'error');
        addBtn.textContent = 'Save & Fetch Models';
        addBtn.disabled = false;
      }
    });
  }
}

// === Helper: Custom Select Binding ===

function bindCustomSelect(wrapEl, onChange) {
  const trigger = wrapEl.querySelector('.v-ct-select-trigger');
  const dropdown = wrapEl.querySelector('.v-ct-select-dropdown');

  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();

    // Close any other open dropdowns
    document.querySelectorAll('.v-ct-select-dropdown').forEach(d => {
      if (d !== dropdown) d.classList.remove('open');
    });

    dropdown.classList.toggle('open');
  });

  dropdown.querySelectorAll('.v-ct-select-option').forEach(option => {
    option.addEventListener('click', async () => {
      const value = option.dataset.value;

      // Update visual state
      dropdown.querySelectorAll('.v-ct-select-option').forEach(o => {
        o.classList.remove('selected');
        const check = o.querySelector('.v-ct-check');
        if (check) check.remove();
      });

      option.classList.add('selected');
      option.innerHTML = `${capitalize(value)} <span class="v-ct-check">✓</span>`;

      // Update trigger text
      trigger.querySelector('span').textContent = capitalize(value);

      // Close dropdown
      dropdown.classList.remove('open');

      // Callback
      if (onChange) await onChange(value);
    });
  });
}

// === Helper: Toggle Binding ===

function bindToggle(selector, settingKey) {
  const el = document.querySelector(selector);
  if (!el) return;

  el.addEventListener('click', async () => {
    el.classList.toggle('on');
    const value = el.classList.contains('on');
    await store.setSetting(settingKey, value);
    EventBus.emit('setting:changed', { key: settingKey, value });
  });
}

// === Helper: Apply Theme ===

export async function applyTheme(theme) {
  let resolved = theme;

  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  document.documentElement.setAttribute('data-theme', resolved);
}

// === Helper: Apply Accent ===

export function applyAccent(h, s, l) {
  const root = document.documentElement;
  root.style.setProperty('--accent-h', h);
  root.style.setProperty('--accent-s', s + '%');
  root.style.setProperty('--accent-l', l + '%');
}

// === Helper: Get Initials ===

function getInitials(first, last) {
  const f = (first || '').charAt(0).toUpperCase();
  const l = (last || '').charAt(0).toUpperCase();
  return f + l || '?';
}

// === Helper: Escape HTML ===

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// === Helper: Capitalize ===

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}