/**
 * Theatro - State Manager
 * 
 * Centralized reactive state management.
 * Single source of truth for application state.
 */

import { eventBus } from './eventBus.js';
import { storageAdapter } from '../storage/storageAdapter.js';

class StateManager {
  constructor() {
    this.state = this.getDefaultState();
    this.subscribers = new Map();
    this.initialized = false;
  }

  /**
   * Get default state structure
   */
  getDefaultState() {
    return {
      app: {
        initialized: false,
        currentScreen: null,
        loading: false,
        error: null,
        version: '0.1.0'
      },
      settings: null,  // Loaded from storage
      user: {
        characterId: null,
        preferences: {}
      },
      currentScenario: {
        id: null,
        messages: [],
        isStreaming: false,
        autoScenarioRunning: false,
        currentTurn: null
      },
      ui: {
        sidePanelOpen: true,
        sidePanelTab: 'active',
        activeModal: null,
        toasts: [],
        searchQuery: ''
      },
      providers: {
        available: [],
        status: {}  // Connection status per provider
      },
      cache: {
        models: {},
        lastFetched: {}
      }
    };
  }

  /**
   * Initialize state manager
   */
  async initialize() {
    if (this.initialized) return;

    // Load settings from storage
    try {
      const stored = await storageAdapter.get('settings', 'global');
      if (stored) {
        this.state.settings = stored;
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }

    this.state.app.initialized = true;
    this.initialized = true;

    eventBus.emit('state:initialized');
  }

  /**
   * Get value at path
   * @param {string} path - Dot-notation path (e.g., 'settings.theme')
   * @returns {*} Value at path
   */
  get(path) {
    if (!path) return this.getSnapshot();
    
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    
    // Deep clone to prevent mutations
    return value !== undefined ? structuredClone(value) : undefined;
  }

  /**
   * Set value at path
   * @param {string} path - Dot-notation path
   * @param {*} value - Value to set
   */
  set(path, value) {
    const keys = path.split('.');
    let target = this.state;
    
    // Navigate to parent of target
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    const finalKey = keys[keys.length - 1];
    const oldValue = target[finalKey];
    
    // Only update if changed
    if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
      target[finalKey] = value;
      
      // Notify subscribers
      this.notifySubscribers(path, value, oldValue);
      
      // Emit change event
      eventBus.emit('state:changed', { path, value, oldValue });
    }
  }

  /**
   * Subscribe to changes at path
   * @param {string} path - Path to watch
   * @param {Function} callback - Change handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    
    this.subscribers.get(path).add(callback);
    
    // Return immediate current value
    callback(this.get(path));
    
    // Return unsubscribe
    return () => {
      this.subscribers.get(path)?.delete(callback);
    };
  }

  /**
   * Notify subscribers of change
   */
  notifySubscribers(changedPath, newValue, oldValue) {
    this.subscribers.forEach((callbacks, subscribedPath) => {
      // Notify if subscribed path matches or is parent of changed path
      if (changedPath.startsWith(subscribedPath) || subscribedPath.startsWith(changedPath)) {
        callbacks.forEach(callback => {
          try {
            callback(this.get(subscribedPath), newValue, oldValue, changedPath);
          } catch (error) {
            console.error('Error in state subscriber:', error);
          }
        });
      }
    });
  }

  /**
   * Get full state snapshot (for debugging)
   */
  getSnapshot() {
    return structuredClone(this.state);
  }

  /**
   * Batch multiple updates
   * @param {Object} updates - Map of path -> value
   */
  batch(updates) {
    const changed = [];
    
    Object.entries(updates).forEach(([path, value]) => {
      const keys = path.split('.');
      let target = this.state;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in target) || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      
      const finalKey = keys[keys.length - 1];
      const oldValue = target[finalKey];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        target[finalKey] = value;
        changed.push({ path, value, oldValue });
      }
    });
    
    // Notify after all updates
    changed.forEach(({ path, value, oldValue }) => {
      this.notifySubscribers(path, value, oldValue);
      eventBus.emit('state:changed', { path, value, oldValue });
    });
  }

  /**
   * Update nested object
   * @param {string} path - Base path
   * @param {Object} partial - Partial object to merge
   */
  merge(path, partial) {
    const current = this.get(path) || {};
    this.set(path, { ...current, ...partial });
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.state = this.getDefaultState();
    this.subscribers.clear();
    eventBus.emit('state:reset');
  }
}

// Singleton
export const stateManager = new StateManager();
