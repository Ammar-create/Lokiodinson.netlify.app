// js/ui.js
// ─────────────────────────────────────────────────────────────
// DOM rendering layer — sidebar, top bar, empty state,
// module selector, media picker, user card, toasts,
// model indicator, context menus, template cards
// ─────────────────────────────────────────────────────────────

import { getChats, createChat, deleteChat, updateChat, getProfile, getTemplates, getActiveModel, getAllSettings } from './store.js';
import { getActiveProvider, setActiveProvider } from './providers.js';
import { generateId, formatTimeAgo, formatDateGroup, escapeHtml } from './utils.js';
import { EventBus } from './app.js';


// ─── STATE ──────────────────────────────────────────────────

let sidebarOpen = false;
let activeContextMenu = null;
let mediaPickerContext = null; // 'chat' | 'imagegen' | 'profile'


// ─── SIDEBAR ────────────────────────────────────────────────

export async function renderSidebar() {
    await renderChatList();
    await renderUserCard();
    bindSidebarNav();
    bindNewChatButton();
}

async function renderChatList() {
    const container = document.getElementById('v-sb-chat-list');
    if (!container) return;

    const chats = await getChats();

    // Sort by updatedAt descending
    chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // Group by date
    const groups = groupChatsByDate(chats);
    const currentModel = await getActiveModel();

    let html = '';

    for (const [label, groupChats] of groups) {
        html += `<div class="v-sb-section-label">${escapeHtml(label)}</div>`;

        for (const chat of groupChats) {
            const isActive = chat.id === window.__voyageActiveChatId;
            const icon = chat.private ? '🔒' : '💬';
            const activeClass = isActive ? ' active' : '';

            html += `
                <div class="v-sb-chat-item${activeClass}"
                     data-chat-id="${chat.id}"
                     role="button"
                     tabindex="0">
                    <span class="v-sb-chat-icon">${icon}</span>
                    <span class="v-sb-chat-label">${escapeHtml(chat.title || 'New Chat')}</span>
                    <button class="v-sb-chat-menu-btn"
                            data-chat-id="${chat.id}"
                            title="More options">⋯</button>
                </div>`;
        }
    }

    if (chats.length === 0) {
        html += `
            <div class="v-sb-empty-hint">
                <span>No conversations yet</span>
                <span style="font-size:11px;color:var(--text-muted)">Start a new chat above</span>
            </div>`;
    }

    container.innerHTML = html;

    // Bind click events
    container.querySelectorAll('.v-sb-chat-item').forEach(item => {
        const chatId = Number(item.dataset.chatId);

        item.addEventListener('click', (e) => {
            // Don't select if clicking the menu button
            if (e.target.closest('.v-sb-chat-menu-btn')) return;
            selectChat(chatId);
        });

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectChat(chatId);
            }
        });
    });

    // Bind three-dot menu buttons
    container.querySelectorAll('.v-sb-chat-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatId = Number(btn.dataset.chatId);
            const rect = btn.getBoundingClientRect();
            showChatContextMenu(chatId, rect);
        });
    });
}

function groupChatsByDate(chats) {
    const groups = new Map();

    for (const chat of chats) {
        const date = new Date(chat.updatedAt || Date.now());
        const label = formatDateGroup(date);

        if (!groups.has(label)) {
            groups.set(label, []);
        }
        groups.get(label).push(chat);
    }

    return groups;
}

function selectChat(chatId) {
    window.__voyageActiveChatId = chatId;
    highlightActiveChatItem(chatId);
    EventBus.emit('chat:selected', { chatId });
    closeSidebarOnMobile();
}

function highlightActiveChatItem(chatId) {
    document.querySelectorAll('.v-sb-chat-item').forEach(item => {
        item.classList.toggle('active', Number(item.dataset.chatId) === chatId);
    });
}

// ─── SIDEBAR NAV ────────────────────────────────────────────

function bindSidebarNav() {
    const navItems = [
        { id: 'v-sb-nav-chat', page: 'chat' },
        { id: 'v-sb-nav-images', page: 'imagegen' },
        { id: 'v-sb-nav-settings', page: 'settings' },
    ];

    for (const { id, page } of navItems) {
        const el = document.getElementById(id);
        if (!el) continue;

        el.addEventListener('click', () => {
            highlightNavItem(id);
            EventBus.emit('chat:navigate', { page });
            closeSidebarOnMobile();
        });
    }
}

function highlightNavItem(activeId) {
    ['v-sb-nav-chat', 'v-sb-nav-images', 'v-sb-nav-settings'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', id === activeId);
    });
}

// ─── NEW CHAT ───────────────────────────────────────────────

function bindNewChatButton() {
    const btn = document.getElementById('v-sb-new-chat');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const chatId = await createChat('New Chat', false);
        window.__voyageActiveChatId = chatId;

        await renderChatList();
        highlightNavItem('v-sb-nav-chat');

        EventBus.emit('chat:created', { chatId });
        EventBus.emit('chat:navigate', { page: 'chat' });

        closeSidebarOnMobile();
    });
}


// ─── SIDEBAR TOGGLE (MOBILE) ───────────────────────────────

export function toggleSidebar() {
    const sidebar = document.getElementById('v-sidebar');
    if (!sidebar) return;

    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('v-sb-open', sidebarOpen);

    if (sidebarOpen) {
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeSidebarOutsideHandler);
        }, 10);
    }
}

function closeSidebarOnMobile() {
    if (!sidebarOpen) return;

    const sidebar = document.getElementById('v-sidebar');
    sidebarOpen = false;
    sidebar?.classList.remove('v-sb-open');
    document.removeEventListener('click', closeSidebarOutsideHandler);
}

function closeSidebarOutsideHandler(e) {
    const sidebar = document.getElementById('v-sidebar');
    const hamburger = document.getElementById('v-tb-hamburger');

    if (sidebar && !sidebar.contains(e.target) && !hamburger?.contains(e.target)) {
        closeSidebarOnMobile();
    }
}


// ─── TOPBAR ─────────────────────────────────────────────────

export async function updateTopbarTitle(chat) {
    const titleEl = document.getElementById('v-tb-chat-title');
    const modelInfoEl = document.getElementById('v-tb-chat-model-info');
    const privateBtn = document.getElementById('v-tb-private-btn');

    if (titleEl) {
        titleEl.textContent = chat?.title || 'New Chat';
    }

    if (modelInfoEl) {
        const model = await getActiveModel();
        modelInfoEl.textContent = model ? `${model.name} · ${model.providerName || ''}` : 'No model selected';
    }

    if (privateBtn) {
        privateBtn.style.display = chat?.private ? '' : 'none';
    }
}

export async function updateModelIndicator(model) {
    const el = document.getElementById('v-typ-model-indicator');
    if (!el) return;

    if (!model) {
        model = await getActiveModel();
    }

    if (!model) {
        el.innerHTML = '<span class="v-typ-model-dot" style="background:var(--error)"></span><span>No model</span>';
        return;
    }

    el.innerHTML = `
        <span class="v-typ-model-dot" style="background:var(--success)"></span>
        <span>${escapeHtml(model.name)}</span>
    `;

    // Update topbar model info too
    const modelInfoEl = document.getElementById('v-tb-chat-model-info');
    if (modelInfoEl) {
        modelInfoEl.textContent = `${model.name} · ${model.providerName || ''}`;
    }
}


// ─── EMPTY STATE ────────────────────────────────────────────

export async function renderEmptyState() {
    const container = document.getElementById('v-ch-empty-state');
    if (!container) return;

    const settings = await getAllSettings();
    const nickname = settings.nickname || 'there';

    // Get templates
    let templates = [];
    try {
        templates = await getTemplates();
    } catch (e) {
        // Templates store may be empty on first run — use defaults
    }

    // Default templates if none stored
    if (!templates || templates.length === 0) {
        templates = [
            { id: 't1', icon: '✍️', label: 'Write code', prompt: 'Help me write code for' },
            { id: 't2', icon: '🔍', label: 'Research', prompt: 'Research and explain' },
            { id: 't3', icon: '🎨', label: 'Generate image', prompt: 'Generate an image of' },
            { id: 't4', icon: '📊', label: 'Analyze data', prompt: 'Help me analyze this data' },
            { id: 't5', icon: '💡', label: 'Brainstorm', prompt: 'Brainstorm ideas about' },
            { id: 't6', icon: '📝', label: 'Summarize', prompt: 'Summarize the following' },
        ];
    }

    const templateCards = templates.map(t => `
        <div class="v-ch-template-card"
             data-prompt="${escapeHtml(t.prompt || '')}"
             role="button"
             tabindex="0">
            <div class="v-ch-template-thumb">${t.icon || '💬'}</div>
            <div class="v-ch-template-label">${escapeHtml(t.label)}</div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="v-ch-empty">
            <div class="v-ch-empty-icon">🧭</div>
            <div class="v-ch-empty-greeting">What are you working on, ${escapeHtml(nickname)}?</div>
            <div class="v-ch-empty-sub">Start a conversation or try a template below</div>
            <div class="v-ch-templates">${templateCards}</div>
        </div>
    `;

    // Bind template clicks
    container.querySelectorAll('.v-ch-template-card').forEach(card => {
        card.addEventListener('click', async () => {
            const prompt = card.dataset.prompt;
            if (prompt) {
                const input = document.getElementById('v-typ-input');
                if (input) {
                    input.value = prompt;
                    input.focus();
                    // Move cursor to end
                    input.setSelectionRange(prompt.length, prompt.length);
                }
            }
        });
    });
}


// ─── MODULE SELECTOR ────────────────────────────────────────

export async function renderModuleSelector() {
    const dropdown = document.getElementById('v-md-dropdown');
    const trigger = document.getElementById('v-md-trigger');
    if (!dropdown || !trigger) return;

    const settings = await getAllSettings();
    const activeProviderId = settings.active_provider || null;
    const activeModelId = settings.active_model || null;

    // Fetch all providers with their models
    const providers = await getAllProvidersWithModels();

    // Get stored models for each provider
    let dropdownHTML = '';

    for (const provider of providers) {
        const isActive = provider.id === activeProviderId;
        const activeClass = isActive ? ' active' : '';

        dropdownHTML += `
            <div class="v-md-provider${activeClass}"
                 data-provider-id="${provider.id}">
                <div class="v-md-provider-icon" style="background:${provider.gradient || 'var(--accent-soft)'};color:#fff">
                    ${(provider.name || '?')[0]}
                </div>
                <div class="v-md-provider-info">
                    <div class="v-md-provider-name">${escapeHtml(provider.name)}</div>
                    <div class="v-md-provider-desc">${escapeHtml(provider.description || '')}</div>
                </div>
                ${isActive ? '<span class="v-md-provider-check">✓</span>' : ''}
            </div>`;

        // If this is the active provider, show its models expanded
        if (isActive && provider.models && provider.models.length > 0) {
            dropdownHTML += '<div class="v-md-model-list">';
            for (const model of provider.models) {
                if (!model.active) continue;

                const modelActive = model.id === activeModelId;
                const capTags = renderCapabilityTags(model.capabilities);

                dropdownHTML += `
                    <div class="v-md-model-item${modelActive ? ' active' : ''}"
                         data-model-id="${model.id}"
                         data-provider-id="${provider.id}">
                        <span>${escapeHtml(model.name)}</span>
                        ${capTags}
                    </div>`;
            }
            dropdownHTML += '</div>';
        }
    }

    // Add Provider option
    dropdownHTML += `
        <div class="v-md-provider" data-action="add-provider">
            <div class="v-md-provider-icon" style="background:var(--bg-tertiary);color:var(--text-muted)">+</div>
            <div class="v-md-provider-info">
                <div class="v-md-provider-name">Add Provider</div>
                <div class="v-md-provider-desc">Connect any OpenAI-compatible API</div>
            </div>
        </div>`;

    dropdown.innerHTML = dropdownHTML;

    // Bind events
    bindModuleSelectorEvents(dropdown);
}

function renderCapabilityTags(capabilities) {
    if (!capabilities || capabilities.length === 0) return '';

    const tagMap = {
        text: 'text',
        tools: 'tools',
        vision: 'vision',
        reasoning: 'reasoning',
        image: 'image',
        video: 'video',
        audio: 'audio',
        tts: 'audio',
        stt: 'audio',
        search: 'tools',
    };

    const seen = new Set();
    let tags = '';

    for (const cap of capabilities) {
        const tagType = tagMap[cap] || 'text';
        if (seen.has(tagType)) continue;
        seen.add(tagType);

        const label = tagType.charAt(0).toUpperCase() + tagType.slice(1);
        tags += `<span class="v-ct-tag ${tagType}">${label}</span>`;
    }

    return tags;
}

function bindModuleSelectorEvents(dropdown) {
    // Provider click → toggle expand
    dropdown.querySelectorAll('.v-md-provider[data-provider-id]').forEach(el => {
        el.addEventListener('click', async () => {
            const providerId = Number(el.dataset.providerId);
            await expandProviderModels(dropdown, providerId);
        });
    });

    // Model click → select
    dropdown.querySelectorAll('.v-md-model-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const modelId = Number(el.dataset.modelId);
            const providerId = Number(el.dataset.providerId);
            selectModel(modelId, providerId, el.textContent.trim().split('\n')[0].trim());
        });
    });

    // Add Provider click
    const addProvider = dropdown.querySelector('[data-action="add-provider"]');
    if (addProvider) {
        addProvider.addEventListener('click', () => {
            closeModuleSelector();
            highlightNavItem('v-sb-nav-settings');
            EventBus.emit('chat:navigate', { page: 'settings', tab: 'providers' });
        });
    }
}

async function expandProviderModels(dropdown, providerId) {
    const models = await getModels(providerId);
    const activeModelId = (await getAllSettings()).active_model;

    // Find the provider element
    const providerEl = dropdown.querySelector(`.v-md-provider[data-provider-id="${providerId}"]`);
    if (!providerEl) return;

    // Remove any existing model list
    const existing = dropdown.querySelector('.v-md-model-list');
    if (existing) existing.remove();

    // Mark provider as active
    dropdown.querySelectorAll('.v-md-provider').forEach(p => p.classList.remove('active'));
    providerEl.classList.add('active');

    // Insert checkmark
    dropdown.querySelectorAll('.v-md-provider-check').forEach(c => c.remove());
    providerEl.insertAdjacentHTML('beforeend', '<span class="v-md-provider-check">✓</span>');

    // Build model list
    const activeModels = (models || []).filter(m => m.active);
    if (activeModels.length === 0) return;

    let modelListHTML = '<div class="v-md-model-list">';
    for (const model of activeModels) {
        const isActive = model.id === activeModelId;
        const capTags = renderCapabilityTags(model.capabilities);
        modelListHTML += `
            <div class="v-md-model-item${isActive ? ' active' : ''}"
                 data-model-id="${model.id}"
                 data-provider-id="${providerId}">
                <span>${escapeHtml(model.name)}</span>
                ${capTags}
            </div>`;
    }
    modelListHTML += '</div>';

    providerEl.insertAdjacentHTML('afterend', modelListHTML);

    // Rebind model clicks
    dropdown.querySelectorAll('.v-md-model-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const modelId = Number(el.dataset.modelId);
            const provId = Number(el.dataset.providerId);
            const name = el.querySelector('span')?.textContent?.trim() || el.textContent.trim();
            selectModel(modelId, provId, name);
        });
    });
}

async function selectModel(modelId, providerId, modelName) {
    // Update store
    const { setSetting } = await import('./store.js');
    await setSetting('active_provider', providerId);
    await setSetting('active_model', modelId);

    // Get provider name
    const providers = await getAllProvidersWithModels();
    const provider = providers.find(p => p.id === providerId);
    const providerName = provider?.name || '';

    // Emit event
    EventBus.emit('model:changed', {
        providerId,
        modelId,
        name: modelName,
        providerName,
    });

    // Update indicator
    updateModelIndicator({ name: modelName, providerName });

    // Close dropdown
    closeModuleSelector();
}

export function openModuleSelector() {
    const dropdown = document.getElementById('v-md-dropdown');
    if (!dropdown) return;

    dropdown.classList.add('open');
    dropdown.style.display = 'block';

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', closeModuleSelectorOutside);
    }, 10);
}

export function closeModuleSelector() {
    const dropdown = document.getElementById('v-md-dropdown');
    if (!dropdown) return;

    dropdown.classList.remove('open');
    dropdown.style.display = 'none';
    document.removeEventListener('click', closeModuleSelectorOutside);
}

function closeModuleSelectorOutside(e) {
    const dropdown = document.getElementById('v-md-dropdown');
    const trigger = document.getElementById('v-md-trigger') || document.getElementById('v-tb-module-btn');

    if (dropdown && !dropdown.contains(e.target) && !trigger?.contains(e.target)) {
        closeModuleSelector();
    }
}

// Helper to get providers (avoids circular import with store)
async function getAllProvidersWithModels() {
    const { getProviders, getModels } = await import('./store.js');
    const providers = await getProviders();

    for (const provider of providers) {
        provider.models = await getModels(provider.id);
    }

    return providers;
}

// Helper to import getModels lazily
async function getModels(providerId) {
    const mod = await import('./store.js');
    return mod.getModels(providerId);
}


// ─── USER CARD ──────────────────────────────────────────────

export async function renderUserCard() {
    const card = document.getElementById('v-sb-user-card');
    if (!card) return;

    const profile = await getProfile();
    const settings = await getAllSettings();

    const firstName = profile?.firstName || '';
    const lastName = profile?.lastName || '';
    const nickname = profile?.nickname || firstName || 'User';

    const initials = getInitials(firstName, lastName, nickname);

    const providerName = await getActiveProviderName();
    const plan = settings.active_provider ? providerName : 'No provider';

    card.innerHTML = `
        <div class="v-sb-user">
            <div class="v-ct-avatar">${escapeHtml(initials)}</div>
            <div class="v-sb-user-info">
                <div class="v-sb-user-name">${escapeHtml(nickname)}</div>
                <div class="v-sb-user-plan">${escapeHtml(plan)}</div>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        highlightNavItem('v-sb-nav-settings');
        EventBus.emit('chat:navigate', { page: 'settings', tab: 'profile' });
    });
}

function getInitials(firstName, lastName, nickname) {
    if (firstName && lastName) {
        return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (nickname) return nickname[0].toUpperCase();
    return '?';
}

async function getActiveProviderName() {
    const settings = await getAllSettings();
    if (!settings.active_provider) return 'No provider';

    try {
        const providers = await getAllProvidersWithModels();
        const provider = providers.find(p => p.id === settings.active_provider);
        return provider?.name || 'Unknown provider';
    } catch {
        return 'Unknown provider';
    }
}


// ─── TOAST NOTIFICATIONS ────────────────────────────────────

export function showToast(message, type = 'success') {
    const container = document.getElementById('v-toast-container');
    if (!container) return;

    const iconMap = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️',
    };

    const icon = iconMap[type] || iconMap.info;
    const toastId = 'toast-' + generateId();

    const toast = document.createElement('div');
    toast.className = 'v-tt-toast';
    toast.id = toastId;
    toast.innerHTML = `
        <span class="v-tt-icon">${icon}</span>
        <span class="v-tt-text">${escapeHtml(message)}</span>
        <button class="v-tt-close" aria-label="Dismiss">✕</button>
    `;

    container.appendChild(toast);

    // Bind close
    const closeBtn = toast.querySelector('.v-tt-close');
    closeBtn.addEventListener('click', () => removeToast(toastId));

    // Auto-remove
    setTimeout(() => removeToast(toastId), 4000);
}

function removeToast(id) {
    const toast = document.getElementById(id);
    if (!toast) return;

    toast.style.animation = 'slideOutRight 0.25s ease forwards';
    setTimeout(() => toast.remove(), 250);
}


// ─── MEDIA PICKER ───────────────────────────────────────────

export function renderMediaPicker() {
    const picker = document.getElementById('v-mp-picker');
    if (!picker) return;

    const options = [
        {
            icon: '🖼',
            label: 'Image',
            desc: 'PNG, JPG, WebP up to 20MB',
            accept: 'image/png,image/jpeg,image/webp,image/gif',
            type: 'image',
            bg: 'rgba(52,211,153,0.1)',
            color: 'var(--success)',
        },
        {
            icon: '📄',
            label: 'Document',
            desc: 'PDF, DOCX, TXT, CSV',
            accept: '.pdf,.docx,.doc,.txt,.csv,.json,.md',
            type: 'document',
            bg: 'var(--accent-soft)',
            color: 'var(--accent)',
        },
        {
            icon: '🎵',
            label: 'Audio',
            desc: 'MP3, WAV, M4A',
            accept: 'audio/mpeg,audio/wav,audio/mp4,audio/ogg',
            type: 'audio',
            bg: 'rgba(251,191,36,0.1)',
            color: 'var(--warning)',
        },
        {
            icon: '📁',
            label: 'Other',
            desc: 'Any file type',
            accept: '*/*',
            type: 'other',
            bg: 'rgba(168,85,247,0.1)',
            color: '#A855F7',
        },
    ];

    picker.innerHTML = options.map(opt => `
        <div class="v-mp-option" data-type="${opt.type}" data-accept="${opt.accept}">
            <div class="v-mp-option-icon" style="background:${opt.bg};color:${opt.color}">
                ${opt.icon}
            </div>
            <div>
                <div class="v-mp-option-text">${opt.label}</div>
                <div class="v-mp-option-desc">${opt.desc}</div>
            </div>
        </div>
    `).join('');

    // Bind events
    picker.querySelectorAll('.v-mp-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const accept = opt.dataset.accept;
            triggerFileInput(accept);
            closeMediaPicker();
        });
    });
}

export function openMediaPicker(context = 'chat') {
    const picker = document.getElementById('v-mp-picker');
    if (!picker) return;

    mediaPickerContext = context;
    renderMediaPicker();

    picker.style.display = 'block';
    picker.classList.add('open');

    // Position near the trigger
    const attachBtn = document.getElementById('v-typ-attach');
    if (attachBtn) {
        const rect = attachBtn.getBoundingClientRect();
        picker.style.bottom = `${window.innerHeight - rect.top + 8}px`;
        picker.style.left = `${rect.left}px`;
    }

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', closeMediaPickerOutside);
    }, 10);
}

export function closeMediaPicker() {
    const picker = document.getElementById('v-mp-picker');
    if (!picker) return;

    picker.style.display = 'none';
    picker.classList.remove('open');
    mediaPickerContext = null;
    document.removeEventListener('click', closeMediaPickerOutside);
}

function closeMediaPickerOutside(e) {
    const picker = document.getElementById('v-mp-picker');
    const attachBtn = document.getElementById('v-typ-attach');

    if (picker && !picker.contains(e.target) && !attachBtn?.contains(e.target)) {
        closeMediaPicker();
    }
}

function triggerFileInput(accept) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = false;
    input.style.display = 'none';

    input.addEventListener('change', () => {
        if (input.files && input.files.length > 0) {
            EventBus.emit('media:file-selected', {
                file: input.files[0],
                context: mediaPickerContext,
            });
        }
        input.remove();
    });

    document.body.appendChild(input);
    input.click();
}


// ─── CHAT CONTEXT MENU ──────────────────────────────────────

function showChatContextMenu(chatId, rect) {
    // Remove existing menu
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'v-cm-menu';
    menu.id = 'v-active-context-menu';

    // Position near the button
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.zIndex = '1000';

    menu.innerHTML = `
        <div class="v-cm-item" data-action="rename">
            <span class="v-cm-icon">✎</span> Rename
        </div>
        <div class="v-cm-item" data-action="share">
            <span class="v-cm-icon">↗</span> Share
        </div>
        <div class="v-cm-divider"></div>
        <div class="v-cm-item danger" data-action="delete">
            <span class="v-cm-icon">🗑</span> Delete
        </div>
    `;

    document.body.appendChild(menu);
    activeContextMenu = menu;

    // Bind actions
    menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
        closeContextMenu();
        renameChat(chatId);
    });

    menu.querySelector('[data-action="share"]').addEventListener('click', () => {
        closeContextMenu();
        shareChat(chatId);
    });

    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
        closeContextMenu();
        deleteChatConfirm(chatId);
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', closeContextMenuOutside);
    }, 10);
}

function closeContextMenu() {
    if (activeContextMenu) {
        activeContextMenu.remove();
        activeContextMenu = null;
        document.removeEventListener('click', closeContextMenuOutside);
    }
}

function closeContextMenuOutside(e) {
    if (activeContextMenu && !activeContextMenu.contains(e.target)) {
        closeContextMenu();
    }
}

// ─── CONTEXT MENU ACTIONS ───────────────────────────────────

async function renameChat(chatId) {
    const chat = await getChatById(chatId);
    if (!chat) return;

    const newTitle = prompt('Rename chat:', chat.title || '');
    if (newTitle !== null && newTitle.trim()) {
        await updateChat(chatId, { title: newTitle.trim() });
        await renderChatList();

        // If this is the active chat, update topbar
        if (window.__voyageActiveChatId === chatId) {
            updateTopbarTitle({ ...chat, title: newTitle.trim() });
        }

        EventBus.emit('chat:renamed', { chatId, title: newTitle.trim() });
        showToast('Chat renamed', 'success');
    }
}

async function shareChat(chatId) {
    const messages = await getMessagesForChat(chatId);
    const chat = await getChatById(chatId);

    if (!messages || messages.length === 0) {
        showToast('No messages to share', 'warning');
        return;
    }

    // Build markdown export
    let markdown = `# ${chat?.title || 'Chat'}\n\n`;
    for (const msg of messages) {
        const role = msg.role === 'user' ? '**You**' : '**AI**';
        markdown += `### ${role}\n${msg.content}\n\n`;
    }

    // Try Web Share API, fallback to clipboard
    if (navigator.share) {
        try {
            await navigator.share({
                title: chat?.title || 'Voyage AI Chat',
                text: markdown,
            });
        } catch (e) {
            // User cancelled share
        }
    } else {
        try {
            await navigator.clipboard.writeText(markdown);
            showToast('Chat copied to clipboard', 'success');
        } catch (e) {
            showToast('Failed to copy', 'error');
        }
    }
}

async function deleteChatConfirm(chatId) {
    const confirmed = confirm('Delete this chat? This cannot be undone.');
    if (!confirmed) return;

    await deleteChat(chatId);

    // If deleted chat was active, clear it
    if (window.__voyageActiveChatId === chatId) {
        window.__voyageActiveChatId = null;
        EventBus.emit('chat:navigate', { page: 'chat' });
    }

    await renderChatList();
    EventBus.emit('chat:deleted', { chatId });
    showToast('Chat deleted', 'success');
}

// Helper to get chat from store without full import at top level
async function getChatById(chatId) {
    const mod = await import('./store.js');
    return mod.getChat(chatId);
}

async function getMessagesForChat(chatId) {
    const mod = await import('./store.js');
    return mod.getMessages(chatId);
}


// ─── TOOL CHIPS (TYPING BAR) ────────────────────────────────

export function renderToolChips(activeTools = []) {
    const container = document.getElementById('v-typ-tools');
    if (!container) return;

    const tools = [
        { id: 'search', icon: '🔍', label: 'Search' },
        { id: 'think', icon: '💡', label: 'Think' },
        { id: 'create', icon: '🎨', label: 'Create' },
    ];

    container.innerHTML = tools.map(tool => {
        const isActive = activeTools.includes(tool.id);
        return `
            <span class="v-ct-chip${isActive ? ' on' : ''}"
                  data-tool-id="${tool.id}"
                  role="button"
                  tabindex="0">
                ${tool.icon} ${tool.label}
            </span>`;
    }).join('');

    // Bind toggle clicks
    container.querySelectorAll('.v-ct-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('on');

            // Collect active tools
            const active = [];
            container.querySelectorAll('.v-ct-chip.on').forEach(c => {
                active.push(c.dataset.toolId);
            });

            EventBus.emit('tools:toggled', { tools: active });
        });
    });
}


// ─── PRIVATE MODE BADGE ─────────────────────────────────────

export function togglePrivateBadge(enabled) {
    const badge = document.getElementById('v-tb-private-btn');
    if (badge) {
        badge.style.display = enabled ? '' : 'none';
    }
}


// ─── IMAGE GENERATION PAGE ──────────────────────────────────

export async function renderImageGenPage() {
    const page = document.getElementById('v-page-imagegen');
    if (!page) return;

    // Build ratio selector
    const ratios = [
        { label: '1:1 Square', value: '1:1' },
        { label: '9:16 Portrait', value: '9:16' },
        { label: '16:9 Landscape', value: '16:9' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
        { label: 'Custom', value: 'custom' },
    ];

    const ratioContainer = page.querySelector('#v-img-ratio');
    if (ratioContainer) {
        ratioContainer.innerHTML = ratios.map((r, i) => `
            <div class="v-ct-chip${i === 0 ? ' active' : ''}"
                 data-ratio="${r.value}"
                 role="button"
                 tabindex="0">
                ${r.label}
            </div>
        `).join('');

        ratioContainer.querySelectorAll('.v-ct-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                ratioContainer.querySelector('.active')?.classList.remove('active');
                chip.classList.add('active');
            });
        });
    }

    // Bind generate button
    const generateBtn = document.getElementById('v-img-generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const prompt = document.getElementById('v-img-prompt')?.value?.trim();
            if (!prompt) return;

            const activeRatio = ratioContainer?.querySelector('.active')?.dataset.ratio || '1:1';

            generateBtn.disabled = true;
            generateBtn.textContent = '⏳ Generating...';

            EventBus.emit('image:generate', {
                prompt,
                ratio: activeRatio,
            });

            // Re-enable when done (listens for image:generated)
            const handler = () => {
                generateBtn.disabled = false;
                generateBtn.textContent = '✨ Generate Image';
                EventBus.off('image:generated', handler);
                EventBus.off('image:generate-error', handler);
            };
            EventBus.on('image:generated', handler);
            EventBus.on('image:generate-error', handler);
        });
    }

    // Bind reference upload
    const uploadArea = document.getElementById('v-img-ref-upload');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            triggerFileInput('image/png,image/jpeg,image/webp,image/gif');
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                EventBus.emit('media:file-selected', {
                    file: e.dataTransfer.files[0],
                    context: 'imagegen-ref',
                });
            }
        });
    }

    // Load gallery
    await renderImageGallery();
}

async function renderImageGallery() {
    const gallery = document.getElementById('v-img-gallery');
    if (!gallery) return;

    try {
        const { getImages } = await import('./store.js');
        const images = await getImages();

        if (!images || images.length === 0) {
            gallery.innerHTML = '<div class="v-img-gallery-empty">No images generated yet</div>';
            return;
        }

        // Sort newest first
        images.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        gallery.innerHTML = images.map(img => `
            <div class="v-img-gallery-item"
                 data-image-id="${img.id}"
                 title="${escapeHtml(img.prompt || '')}">
                <img src="${img.dataUrl}" alt="${escapeHtml(img.prompt || 'Generated image')}" loading="lazy">
                <div class="v-img-gallery-overlay">
                    <span class="v-img-gallery-prompt">${escapeHtml(truncate(img.prompt || '', 60))}</span>
                </div>
            </div>
        `).join('');

        // Bind gallery item clicks
        gallery.querySelectorAll('.v-img-gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const imageId = Number(item.dataset.imageId);
                EventBus.emit('image:gallery-select', { imageId });
            });
        });
    } catch (e) {
        gallery.innerHTML = '<div class="v-img-gallery-empty">Error loading gallery</div>';
    }
}

function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}


// ─── INITIALIZATION ─────────────────────────────────────────

export async function init() {
    // Bind hamburger
    const hamburger = document.getElementById('v-tb-hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', toggleSidebar);
    }

    // Bind module button
    const moduleBtn = document.getElementById('v-tb-module-btn') || document.getElementById('v-md-trigger');
    if (moduleBtn) {
        moduleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('v-md-dropdown');
            const isOpen = dropdown?.classList.contains('open');
            if (isOpen) {
                closeModuleSelector();
            } else {
                openModuleSelector();
                renderModuleSelector();
            }
        });
    }

    // Bind attach button
    const attachBtn = document.getElementById('v-typ-attach');
    if (attachBtn) {
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const picker = document.getElementById('v-mp-picker');
            const isOpen = picker?.classList.contains('open');
            if (isOpen) {
                closeMediaPicker();
            } else {
                openMediaPicker('chat');
            }
        });
    }

    // Listen for image generated → refresh gallery
    EventBus.on('image:generated', () => {
        renderImageGallery();
    });

    // Listen for setting changes that affect UI
    EventBus.on('setting:changed', async ({ key, value }) => {
        if (key === 'active_provider' || key === 'active_model') {
            await renderModuleSelector();
            await updateModelIndicator();
        }
        if (key === 'nickname' || key === 'accent_h' || key === 'accent_s' || key === 'accent_l') {
            await renderUserCard();
        }
    });

    // Render initial UI
    await renderSidebar();
    await renderMediaPicker();
    await updateModelIndicator();
}