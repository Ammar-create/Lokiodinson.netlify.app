/**
 * Theatro - Lifecycle Manager
 * 
 * Coordinates initialization and cleanup of all modules.
 * Ensures proper startup and shutdown order.
 */

import { eventBus } from './eventBus.js';

class Lifecycle {
  constructor() {
    this.phases = new Map();
    this.cleanupHandlers = new Map();
    this.initialized = false;
  }

  /**
   * Register an initialization phase
   * @param {string} name - Phase name
   * @param {Function} initializer - Async init function
   * @param {number} priority - Lower = earlier (default: 50)
   */
  register(name, initializer, priority = 50) {
    this.phases.set(name, {
      name,
      initializer,
      priority,
      initialized: false,
      error: null
    });
  }

  /**
   * Register a cleanup handler
   * @param {string} name - Cleanup target name
   * @param {Function} handler - Cleanup function
   */
  registerCleanup(name, handler) {
    this.cleanupHandlers.set(name, handler);
  }

  /**
   * Start initialization in priority order
   */
  async start() {
    if (this.initialized) {
      console.warn('Lifecycle already initialized');
      return;
    }

    // Sort by priority
    const sortedPhases = Array.from(this.phases.values())
      .sort((a, b) => a.priority - b.priority);

    console.log('🚀 Starting initialization...');
    
    for (const phase of sortedPhases) {
      try {
        console.log(`  → ${phase.name}...`);
        await phase.initializer();
        phase.initialized = true;
        eventBus.emit(`lifecycle:${phase.name}:ready`);
      } catch (error) {
        phase.error = error;
        console.error(`  ✗ ${phase.name} failed:`, error);
        eventBus.emit(`lifecycle:${phase.name}:error`, error);
        
        // Decide whether to continue or abort
        if (this.isCriticalPhase(phase.name)) {
          throw new Error(`Critical phase ${phase.name} failed: ${error.message}`);
        }
      }
    }

    this.initialized = true;
    eventBus.emit('lifecycle:ready');
    console.log('✅ All systems initialized');
  }

  /**
   * Run cleanup handlers
   */
  async cleanup() {
    console.log('🧹 Running cleanup...');
    
    for (const [name, handler] of this.cleanupHandlers) {
      try {
        await handler();
        console.log(`  → ${name} cleaned up`);
      } catch (error) {
        console.error(`  ✗ ${name} cleanup failed:`, error);
      }
    }
    
    this.initialized = false;
    eventBus.emit('lifecycle:cleanup');
  }

  /**
   * Check if phase is critical (should abort on failure)
   */
  isCriticalPhase(name) {
    const criticalPhases = ['errorHandler', 'storage', 'stateManager'];
    return criticalPhases.includes(name);
  }

  /**
   * Get status of all phases
   */
  getStatus() {
    return Array.from(this.phases.values()).map(phase => ({
      name: phase.name,
      priority: phase.priority,
      initialized: phase.initialized,
      error: phase.error?.message
    }));
  }

  /**
   * Check if specific phase is ready
   */
  isReady(name) {
    return this.phases.get(name)?.initialized || false;
  }

  /**
   * Wait for a phase to be ready
   */
  async waitFor(name, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (this.isReady(name)) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${name}`));
      }, timeout);

      const unsubscribe = eventBus.on(`lifecycle:${name}:ready`, () => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      });
    });
  }
}

// Setup cleanup on page unload
const lifecycle = new Lifecycle();

window.addEventListener('beforeunload', (e) => {
  lifecycle.cleanup();
});

// Handle visibility changes (pause/resume)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    eventBus.emit('app:background');
  } else {
    eventBus.emit('app:foreground');
  }
});

export { lifecycle };
