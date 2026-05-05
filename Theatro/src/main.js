/**
 * Theatro - Application Bootstrap
 * 
 * Entry point. Initializes core systems in order, mounts the app,
 * and handles the boot sequence.
 */

import { lifecycle } from './core/lifecycle.js';
import { stateManager } from './core/stateManager.js';
import { eventBus } from './core/eventBus.js';
import { router } from './core/router.js';
import { errorHandler } from './core/errorHandler.js';
import { storageAdapter } from './storage/storageAdapter.js';
import { initializeApp } from './app.js';

// Boot sequence
async function boot() {
  const bootProgress = document.getElementById('boot-progress');
  const updateProgress = (percent) => {
    if (bootProgress) {
      bootProgress.style.width = `${percent}%`;
    }
  };

  try {
    // Phase 1: Error handling (first!)
    errorHandler.initialize();
    updateProgress(10);

    // Phase 2: Event bus (needed by everyone)
    eventBus.initialize?.();
    updateProgress(20);

    // Phase 3: State manager
    await stateManager.initialize();
    updateProgress(40);

    // Phase 4: Storage
    await storageAdapter.initialize();
    updateProgress(60);

    // Phase 5: Router
    router.initialize();
    updateProgress(80);

    // Phase 6: Mount app
    await initializeApp();
    updateProgress(100);

    // Hide boot screen with fade
    const bootScreen = document.getElementById('boot-screen');
    if (bootScreen) {
      bootScreen.classList.add('boot-complete');
      setTimeout(() => {
        bootScreen.remove();
      }, 500);
    }

    console.log('🎭 Theatro initialized');
    eventBus.emit('app:ready');

  } catch (error) {
    errorHandler.handleBootError(error);
    updateProgress(0);
  }
}

// Start boot sequence when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Handle unhandled errors
window.addEventListener('error', (event) => {
  errorHandler.handleError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handleError(event.reason);
});
