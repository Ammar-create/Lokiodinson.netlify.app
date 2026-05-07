// ============================================================
// Voyage AI — App Entry Point
// Boot sequence, EventBus, theme/accent system, global setup
// ============================================================

// ─── Event Bus ──────────────────────────────────────────────
// Global pub/sub for cross-module communication.
// Every other JS module imports { emit, on } from './app.js'.

const _listeners = {};

export function on(event, callback) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(callback);
}

export function off(event, callback) {
  if (!_listeners[event]) return;
  _listeners[event] = _listeners[event].filter(fn => fn !== callback);
}

export function emit(event, data) {
  if (!_listeners[event]) return;
  for (const cb of _listeners[event]) {
    try { cb(data); } catch (err) { console.error(`[EventBus] ${event}:`, err); }
  }
}

// ─── Toast System ───────────────────────────────────────────

export function showToast(message, type = 'success') {
  const container = document.getElementById('v-toast-container');
  if (!container) return;

  const icons = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `v-tt-toast v-tt-${type}`;
  toast.innerHTML = `
    <span class="v-tt-icon">${icons[type] || icons.info}</span>
    <span class="v-tt-text"></span>
    <button class="v-tt-close" aria-label="Close">✕</button>
  `;
  toast.querySelector('.v-tt-text').textContent = message;
  toast.querySelector('.v-tt-close').addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('v-tt-visible'));
  setTimeout(() => removeToast(toast), 4000);
}

function removeToast(el) {
  if (!el || !el.parentNode) return;
  el.classList.remove('v-tt-visible');
  el.classList.add('v-tt-exit');
  setTimeout(() => el.remove(), 250);
}

// ─── Theme & Accent ─────────────────────────────────────────

export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;

  document.documentElement.setAttribute('data-theme', resolved);
}

export function applyAccent(h, s, l) {
  const root = document.documentElement.style;
  root.setProperty('--accent-h', h);
  root.setProperty('--accent-s', s + '%');
  root.setProperty('--accent-l', l + '%');
}

// ─── Onboarding ─────────────────────────────────────────────

async function showOnboarding(storeMod, uiMod) {
  const modal = document.getElementById('v-onb-modal');
  if (!modal) return;

  modal.style.display = 'flex';
  let step = 1;
  let profileData = {};

  function renderStep() {
    const step1 = document.getElementById('v-onb-step1');
    const step2 = document.getElementById('v-onb-step2');
    const step3 = document.getElementById('v-onb-step3');

    if (step1) step1.style.display = step === 1 ? 'block' : 'none';
    if (step2) step2.style.display = step === 2 ? 'block' : 'none';
    if (step3) step3.style.display = step === 3 ? 'block' : 'none';

    const dots = modal.querySelectorAll('.v-onb-step-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === step - 1));
  }

  function bindStep1() {
    const continueBtn = modal.querySelector('#v-onb-continue-1');
    const skipBtn = modal.querySelector('#v-onb-skip-1');

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        profileData.firstName = (document.getElementById('v-onb-first-name') || {}).value || '';
        profileData.lastName = (document.getElementById('v-onb-last-name') || {}).value || '';
        profileData.nickname = (document.getElementById('v-onb-nickname') || {}).value || '';
        step = 2;
        renderStep();
        bindStep2();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        step = 2;
        renderStep();
        bindStep2();
      });
    }
  }

  function bindStep2() {
    const continueBtn = modal.querySelector('#v-onb-continue-2');
    const skipBtn = modal.querySelector('#v-onb-skip-2');

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        step = 3;
        renderStep();
        bindStep3();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        step = 3;
        renderStep();
        bindStep3();
      });
    }
  }

  function bindStep3() {
    const startBtn = modal.querySelector('#v-onb-start');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        const providerName = (document.getElementById('v-onb-provider') || {}).value || 'AquaDevs';
        const apiKey = (document.getElementById('v-onb-api-key') || {}).value || '';

        // Save profile
        await storeMod.saveProfile({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          nickname: profileData.nickname,
          picture: null
        });

        // Save default settings
        await storeMod.setSetting('accent_h', 215);
        await storeMod.setSetting('accent_s', 92);
        await storeMod.setSetting('accent_l', 56);
        await storeMod.setSetting('theme', 'dark');
        await storeMod.setSetting('tone', 'Professional');
        await storeMod.setSetting('warmth', 1);
        await storeMod.setSetting('enthusiasm', 1);
        await storeMod.setSetting('emoji_usage', 1);
        await storeMod.setSetting('headers_usage', 1);
        await storeMod.setSetting('custom_instructions', '');
        await storeMod.setSetting('web_search_enabled', true);
        await storeMod.setSetting('streaming_enabled', true);
        await storeMod.setSetting('reference_memories', true);
        await storeMod.setSetting('reference_chat_history', true);
        await storeMod.setSetting('private_mode', false);
        await storeMod.setSetting('active_provider', 'AquaDevs');
        await storeMod.setSetting('active_model', 'gpt-5');

        // Add default provider
        const providerId = await storeMod.addProvider({
          name: providerName,
          baseUrl: 'https://api.aquadevs.com',
          apiKey: apiKey
        });

        // Add default models
        const defaultModels = [
          { name: 'gpt-5', type: 'text', active: true, capabilities: ['text', 'tools', 'vision'] },
          { name: 'gpt-5.2', type: 'text', active: true, capabilities: ['text', 'tools', 'vision'] },
          { name: 'gemini-3', type: 'text', active: true, capabilities: ['text', 'tools'] },
          { name: 'deepseek-v4', type: 'text', active: true, capabilities: ['text', 'tools'] },
          { name: 'sonnet-4.6', type: 'text', active: true, capabilities: ['text', 'tools', 'vision', 'reasoning'] },
          { name: 'flux-2', type: 'image', active: true, capabilities: ['image'] },
          { name: 'gptimage-2', type: 'image', active: true, capabilities: ['image'] },
        ];

        for (const model of defaultModels) {
          await storeMod.addModel({ ...model, providerId });
        }

        await storeMod.setSetting('onboarding_complete', true);

        modal.style.display = 'none';
        emit('onboarding:complete', profileData);

        // Refresh UI
        if (uiMod.renderUserCard) {
          const profile = await storeMod.getProfile();
          uiMod.renderUserCard(profile);
        }
        if (uiMod.renderSidebar) uiMod.renderSidebar();
        emit('chat:navigate', { page: 'chat' });
      });
    }
  }

  renderStep();
  bindStep1();
}

// ─── Boot Sequence ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize database
    await store.init();

    // 2. Check onboarding state
    const onboardingComplete = await store.getSetting('onboarding_complete');

    if (!onboardingComplete) {
      // Show onboarding — user hasn't set up yet
      await showOnboarding(store, ui);
    } else {
      // 3. Load and apply saved accent
      const [h, s, l] = await Promise.all([
        store.getSetting('accent_h'),
        store.getSetting('accent_s'),
        store.getSetting('accent_l')
      ]);
      applyAccent(
        h !== undefined ? h : 215,
        s !== undefined ? s : 92,
        l !== undefined ? l : 56
      );

      // 4. Load and apply saved theme
      const theme = await store.getSetting('theme') || 'dark';
      applyTheme(theme);

      // Listen for system theme changes if using 'system' theme
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        store.getSetting('theme').then(t => {
          if (t === 'system') applyTheme('system');
        });
      });

      // 5. Render sidebar
      await ui.renderSidebar();

      // 6. Render user card
      const profile = await store.getProfile();
      if (profile) ui.renderUserCard(profile);

      // 7. Navigate to welcome state (no active chat)
      emit('chat:navigate', { page: 'chat' });
    }

    // 8. Register service worker (progressive enhancement)
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch {
        // SW not critical — continue without it
      }
    }

    console.log('[Voyage AI] Ready');

  } catch (err) {
    console.error('[Voyage AI] Boot failed:', err);
    showToast('Failed to initialize. Please refresh.', 'error');
  }

  // ─── Global Event Wiring ─────────────────────────────────

  // Toast events from any module
  on('toast:show', ({ message, type }) => showToast(message, type));

  // Accent changes from settings
  on('accent:changed', ({ h, s, l }) => applyAccent(h, s, l));

  // Theme changes from settings
  on('theme:changed', ({ theme }) => applyTheme(theme));

  // ─── Mobile Sidebar Toggle ────────────────────────────────

  const hamburger = document.getElementById('v-tb-hamburger');
  const sidebar = document.getElementById('v-sidebar');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('v-sb-open');
      document.body.classList.toggle('v-body-sidebar-open');
    });

    // Close sidebar on overlay click (mobile)
    document.addEventListener('click', (e) => {
      if (
        sidebar.classList.contains('v-sb-open') &&
        !sidebar.contains(e.target) &&
        e.target !== hamburger
      ) {
        sidebar.classList.remove('v-sb-open');
        document.body.classList.remove('v-body-sidebar-open');
      }
    });
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────

  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K → Focus typing input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const input = document.getElementById('v-typ-input');
      if (input) input.focus();
    }

    // Ctrl/Cmd + Shift + N → New chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      emit('chat:create-new', {});
    }

    // Escape → Close modals / dropdowns
    if (e.key === 'Escape') {
      emit('ui:escape', {});
    }
  });
});