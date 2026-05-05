/**
 * Theatro - Error Handler
 * 
 * Centralized error handling and reporting.
 * Graceful degradation for all error types.
 */

import { eventBus } from './eventBus.js';

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.initialized = false;
  }

  /**
   * Initialize error handling
   */
  initialize() {
    if (this.initialized) return;

    // Global error handlers
    this.setupGlobalHandlers();
    
    this.initialized = true;
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      
      // Don't prevent default for debugging
      return false;
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, { type: 'unhandledrejection' });
      event.preventDefault();
    });

    // Network errors
    window.addEventListener('offline', () => {
      this.handleError(new Error('Network offline'), { type: 'network' });
    });

    // Online recovery
    window.addEventListener('online', () => {
      eventBus.emit('network:online');
    });
  }

  /**
   * Handle an error
   * @param {Error} error - The error
   * @param {Object} context - Additional context
   */
  handleError(error, context = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      type: context.type || 'unknown',
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Store (with limit)
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console
    console.error('Theatro Error:', errorInfo);

    // Emit event
    eventBus.emit('error:occurred', errorInfo);

    // Handle specific types
    this.handleByType(errorInfo);
  }

  /**
   * Handle boot errors specially
   */
  handleBootError(error) {
    console.error('Boot error:', error);
    
    const bootScreen = document.getElementById('boot-screen');
    if (bootScreen) {
      bootScreen.innerHTML = `
        <div class="boot-error">
          <div class="boot-error-icon">⚠️</div>
          <div class="boot-error-title">Failed to start Theatro</div>
          <div class="boot-error-message">${this.escapeHtml(error.message)}</div>
          <button class="boot-retry-btn" onclick="location.reload()">Retry</button>
        </div>
      `;
    }

    this.handleError(error, { type: 'boot' });
  }

  /**
   * Type-specific handling
   */
  handleByType(errorInfo) {
    switch (errorInfo.type) {
      case 'network':
        eventBus.emit('toast:show', {
          type: 'warning',
          message: 'Connection lost. Some features may be unavailable.',
          duration: 5000
        });
        break;
        
      case 'api':
        eventBus.emit('toast:show', {
          type: 'error',
          message: 'API error. Retrying...',
          duration: 3000
        });
        break;
        
      case 'storage':
        eventBus.emit('toast:show', {
          type: 'error',
          message: 'Storage error. Your data may not be saved.',
          duration: 0 // Don't auto-dismiss
        });
        break;
        
      case 'validation':
        // Validation errors are usually handled inline
        break;
        
      default:
        // Unknown errors - show generic message in production
        if (process.env.NODE_ENV === 'production') {
          eventBus.emit('toast:show', {
            type: 'error',
            message: 'Something went wrong. Please try again.',
            duration: 5000
          });
        }
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Create a wrapped function that catches errors
   */
  wrap(fn, context = {}) {
    return (...args) => {
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch(error => {
            this.handleError(error, context);
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }
}

// Singleton
export const errorHandler = new ErrorHandler();
