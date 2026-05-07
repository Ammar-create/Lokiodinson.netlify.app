// js/router.js
// ═══════════════════════════════════════════════════════════
// Voyage AI — Router
// Page navigation, history management, sidebar active states
// ═══════════════════════════════════════════════════════════

import { EventBus } from './app.js';

// ── Page registry ──────────────────────────────────────────

const PAGES = {
  chat:     { containerId: 'v-page-chat',     title: 'Chat' },
  settings: { containerId: 'v-page-settings',  title: 'Settings' },
  imagegen: { containerId: 'v-page-imagegen',  title: 'Image Generation' }
};

const NAV_MAP = {
  chat:     'v-sb-nav-chat',
  settings: 'v-sb-nav-settings',
  imagegen: 'v-sb-nav-images'
};

// ── State ──────────────────────────────────────────────────

let currentPage = 'chat';
let currentParams = null;

// ── Cached DOM refs ────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function getRefs() {
  return {
    typingBar:       $('v-typing-bar'),
    topbarTitle:     $('v-tb-chat-title'),
    topbarModelInfo: $('v-tb-chat-model-info'),
    topbarPrivate:   $('v-tb-private-btn'),
    topbarEditChat:  $('v-tb-edit-chat'),
    topbarModuleBtn: $('v-tb-module-btn'),
    sidebar:         $('v-sidebar')
  };
}

// ── Core navigation ────────────────────────────────────────

function showPage(page) {
  // Hide every page container
  for (const key of Object.keys(PAGES)) {
    const el = $(PAGES[key].containerId);
    if (el) el.style.display = 'none';
  }

  // Show the target page
  const target = $(PAGES[page].containerId);
  if (target) target.style.display = '';
}

function updateTypingBar(page) {
  const typingBar = $('v-typing-bar');
  if (!typingBar) return;
  typingBar.style.display = page === 'chat' ? '' : 'none';
}

function updateSidebarNav(page) {
  // Remove active from all nav items
  for (const navId of Object.values(NAV_MAP)) {
    const el = $(navId);
    if (el) el.classList.remove('active');
  }

  // Set active on current page's nav item
  const activeNavId = NAV_MAP[page];
  if (activeNavId) {
    const el = $(activeNavId);
    if (el) el.classList.add('active');
  }
}

function updateTopbarForPage(page) {
  const refs = getRefs();

  if (page === 'settings') {
    if (refs.topbarTitle)       refs.topbarTitle.textContent = 'Settings';
    if (refs.topbarModelInfo)   refs.topbarModelInfo.textContent = '';
    if (refs.topbarPrivate)     refs.topbarPrivate.style.display = 'none';
    if (refs.topbarEditChat)    refs.topbarEditChat.style.display = 'none';
    if (refs.topbarModuleBtn)   refs.topbarModuleBtn.style.display = 'none';
  }

  if (page === 'imagegen') {
    if (refs.topbarTitle)       refs.topbarTitle.textContent = 'Image Generation';
    if (refs.topbarModelInfo)   refs.topbarModelInfo.textContent = '';
    if (refs.topbarPrivate)     refs.topbarPrivate.style.display = 'none';
    if (refs.topbarEditChat)    refs.topbarEditChat.style.display = 'none';
    if (refs.topbarModuleBtn)   refs.topbarModuleBtn.style.display = '';
  }

  if (page === 'chat') {
    // Topbar title is set by chat.js when a chat is selected
    if (refs.topbarPrivate)   refs.topbarPrivate.style.display = '';
    if (refs.topbarEditChat)  refs.topbarEditChat.style.display = '';
    if (refs.topbarModuleBtn) refs.topbarModuleBtn.style.display = '';
  }
}

function closeSidebarOnMobile() {
  const sidebar = $('v-sidebar');
  if (!sidebar) return;
  // Only close if overlay mode (small screen)
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('v-sb-open');
  }
}

// ── Public API ─────────────────────────────────────────────

/**
 * Navigate to a page.
 * @param {'chat'|'settings'|'imagegen'} page
 * @param {object} [params] - Optional params (e.g. { chatId })
 */
export function navigateTo(page, params = null) {
  if (!PAGES[page]) {
    console.warn(`[router] Unknown page: "${page}"`);
    return;
  }

  // Skip if already on this page (unless params changed)
  if (page === currentPage && JSON.stringify(params) === JSON.stringify(currentParams)) {
    return;
  }

  currentPage = page;
  currentParams = params;

  showPage(page);
  updateTypingBar(page);
  updateSidebarNav(page);
  updateTopbarForPage(page);
  closeSidebarOnMobile();

  // Notify all listeners
  EventBus.emit('router:page', { page, params });
}

/**
 * Returns the currently active page name.
 * @returns {'chat'|'settings'|'imagegen'}
 */
export function getCurrentPage() {
  return currentPage;
}

/**
 * Returns the current navigation params.
 * @returns {object|null}
 */
export function getParams() {
  return currentParams;
}

// ── Event binding ──────────────────────────────────────────

function bindSidebarNav() {
  const navChat     = $('v-sb-nav-chat');
  const navImages   = $('v-sb-nav-images');
  const navSettings = $('v-sb-nav-settings');

  if (navChat) {
    navChat.addEventListener('click', () => navigateTo('chat'));
  }

  if (navImages) {
    navImages.addEventListener('click', () => navigateTo('imagegen'));
  }

  if (navSettings) {
    navSettings.addEventListener('click', () => navigateTo('settings'));
  }
}

function bindHamburger() {
  const hamburger = $('v-tb-hamburger');
  const sidebar   = $('v-sidebar');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('v-sb-open');
    });
  }
}

function bindBackFromSettings() {
  // When user clicks a settings sub-tab and wants to go back
  EventBus.on('settings:back', () => {
    navigateTo('chat');
  });
}

// ── Initialization ─────────────────────────────────────────

/**
 * Initialize the router. Call once from app.js during boot.
 * Sets up nav listeners, shows default page, restores state.
 */
export function init() {
  bindSidebarNav();
  bindHamburger();
  bindBackFromSettings();

  // Listen for programmatic navigation requests
  EventBus.on('chat:navigate', ({ page, params }) => {
    navigateTo(page, params);
  });

  // Default to chat page
  navigateTo('chat');

  console.log('[router] Initialized — default page: chat');
}