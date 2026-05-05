/**
 * Theatro - Event Bus
 * 
 * Decoupled pub/sub system for cross-module communication.
 * No tight coupling between components.
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const wrappedCallback = (data) => {
      this.off(event, wrappedCallback);
      callback(data);
    };

    return this.on(event, wrappedCallback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }

    // Debug logging
    if (window.__THEATRO_DEBUG__) {
      console.log(`[EventBus] ${event}`, data);
    }
  }

  /**
   * Check if event has subscribers
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasListeners(event) {
    const callbacks = this.events.get(event);
    return callbacks ? callbacks.size > 0 : false;
  }

  /**
   * Get all event names with listeners
   * @returns {string[]}
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Common event names (for documentation and autocomplete)
export const Events = {
  // App lifecycle
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  
  // Navigation
  NAVIGATE: 'navigate',
  ROUTE_CHANGED: 'route:changed',
  
  // Settings
  SETTINGS_CHANGED: 'settings:changed',
  THEME_CHANGED: 'settings:themeChanged',
  
  // Character
  CHARACTER_CREATED: 'character:created',
  CHARACTER_UPDATED: 'character:updated',
  CHARACTER_DELETED: 'character:deleted',
  
  // Scenario
  SCENARIO_CREATED: 'scenario:created',
  SCENARIO_UPDATED: 'scenario:updated',
  SCENARIO_DELETED: 'scenario:deleted',
  SCENARIO_SELECTED: 'scenario:selected',
  
  // Chat
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_STREAMING: 'message:streaming',
  STREAMING_COMPLETE: 'streaming:complete',
  TURN_CHANGED: 'turn:changed',
  
  // Controllers
  CONTROLLER_STARTED: 'controller:started',
  CONTROLLER_COMPLETED: 'controller:completed',
  CONTROLLER_ERROR: 'controller:error',
  
  // UI
  SIDEPANEL_TOGGLED: 'sidepanel:toggled',
  MODAL_OPENED: 'modal:opened',
  MODAL_CLOSED: 'modal:closed',
  TOAST_SHOW: 'toast:show',
  
  // Keyboard
  KEYBOARD_ESCAPE: 'keyboard:escape'
};
