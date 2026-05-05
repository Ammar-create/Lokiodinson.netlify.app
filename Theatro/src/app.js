/**
 * Theatro - Application Shell
 * 
 * Main application component. Manages top-level layout, 
 * screen transitions, and global UI state.
 */

import { stateManager } from './core/stateManager.js';
import { eventBus } from './core/eventBus.js';
import { router } from './core/router.js';
import { storageAdapter } from './storage/storageAdapter.js';
import { settingsService } from './services/settingsService.js';
import { AppLayout } from './ui/layouts/AppLayout.js';
import { Dashboard } from './ui/screens/Dashboard.js';
import { ChatScreen } from './ui/screens/ChatScreen.js';
import { Settings } from './ui/screens/Settings.js';
import { ScenarioCreate } from './ui/screens/ScenarioCreate.js';
import { CharacterCreate } from './ui/screens/CharacterCreate.js';
import { ScenarioIndex } from './ui/screens/ScenarioIndex.js';
import { CharacterIndex } from './ui/screens/CharacterIndex.js';
import { Welcome } from './ui/screens/Welcome.js';

// Screen registry
const screens = {
  dashboard: Dashboard,
  chat: ChatScreen,
  settings: Settings,
  'scenario-create': ScenarioCreate,
  'scenario-index': ScenarioIndex,
  'character-create': CharacterCreate,
  'character-index': CharacterIndex,
  welcome: Welcome
};

let currentScreen = null;
let appContainer = null;

/**
 * Initialize the application
 */
export async function initializeApp() {
  // Get or create app container
  appContainer = document.getElementById('app');
  if (!appContainer) {
    appContainer = document.createElement('div');
    appContainer.id = 'app';
    document.body.appendChild(appContainer);
  }

  // Apply theme
  const settings = await settingsService.getSettings();
  applyTheme(settings.appearance.theme);

  // Setup router
  setupRoutes();

  // Determine initial screen
  const hasData = await checkExistingData();
  const initialRoute = hasData ? '/dashboard' : '/welcome';
  
  router.navigate(initialRoute);

  // Listen for navigation
  eventBus.on('navigate', ({ path, params }) => {
    router.navigate(path, params);
  });

  // Listen for theme changes
  eventBus.on('settings:themeChanged', ({ theme }) => {
    applyTheme(theme);
  });

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
}

/**
 * Setup router routes
 */
function setupRoutes() {
  router.addRoute('/', () => screens.welcome);
  router.addRoute('/welcome', () => screens.welcome);
  router.addRoute('/dashboard', () => screens.dashboard);
  router.addRoute('/chat/:scenarioId', (params) => {
    return (container) => screens.chat(container, params.scenarioId);
  });
  router.addRoute('/settings', () => screens.settings);
  router.addRoute('/settings/:section', (params) => {
    return (container) => screens.settings(container, params.section);
  });
  router.addRoute('/scenarios', () => screens['scenario-index']);
  router.addRoute('/scenarios/new', () => screens['scenario-create']);
  router.addRoute('/scenarios/:id/edit', (params) => {
    return (container) => screens['scenario-create'](container, params.id);
  });
  router.addRoute('/characters', () => screens['character-index']);
  router.addRoute('/characters/new', () => screens['character-create']);
  router.addRoute('/characters/:id/edit', (params) => {
    return (container) => screens['character-create'](container, params.id);
  });

  // Handle route changes
  router.onRouteChange((route, ScreenComponent) => {
    renderScreen(ScreenComponent);
  });
}

/**
 * Render a screen
 */
function renderScreen(ScreenComponent) {
  // Cleanup current screen
  if (currentScreen?.destroy) {
    currentScreen.destroy();
  }

  // Clear container (but keep theme attribute)
  const theme = appContainer.getAttribute('data-theme');
  appContainer.innerHTML = '';
  if (theme) {
    appContainer.setAttribute('data-theme', theme);
  }

  // Create new screen
  const screenContainer = document.createElement('div');
  screenContainer.className = 'screen-container';
  appContainer.appendChild(screenContainer);

  // Mount screen
  if (typeof ScreenComponent === 'function') {
    currentScreen = ScreenComponent(screenContainer);
  } else {
    currentScreen = new ScreenComponent(screenContainer);
  }

  // Update document title
  if (currentScreen.title) {
    document.title = `${currentScreen.title} — Theatro`;
  }

  eventBus.emit('screen:changed', { screen: currentScreen });
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
  const root = document.documentElement;
  const app = document.getElementById('app');
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    app?.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
    app?.setAttribute('data-theme', theme);
  }
}

/**
 * Check if user has existing data
 */
async function checkExistingData() {
  try {
    const scenarios = await storageAdapter.query('scenarios', {});
    const characters = await storageAdapter.query('characters', {});
    return scenarios.length > 0 || characters.length > 0;
  } catch {
    return false;
  }
}

/**
 * Setup global keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + , = Settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      router.navigate('/settings');
    }

    // Ctrl/Cmd + D = Dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      router.navigate('/dashboard');
    }

    // Escape = Close modals, collapse side panel
    if (e.key === 'Escape') {
      eventBus.emit('keyboard:escape');
    }
  });
}

/**
 * Get current screen instance
 */
export function getCurrentScreen() {
  return currentScreen;
}
