/**
 * Theatro - Router
 * 
 * Client-side navigation without page reloads.
 * Hash-based routing for static hosting compatibility.
 */

import { eventBus } from './eventBus.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.params = {};
    this.query = {};
    this.beforeHooks = [];
    this.afterHooks = [];
    this.routeChangeCallbacks = [];
    
    // Use hash routing for static hosting
    this.useHash = true;
    this.base = '';
  }

  /**
   * Initialize router
   */
  initialize() {
    // Handle hash changes
    window.addEventListener('hashchange', () => this.handleRouteChange());
    
    // Handle popstate for history mode (future)
    window.addEventListener('popstate', () => this.handleRouteChange());
    
    // Handle initial route
    this.handleRouteChange();
    
    // Intercept link clicks
    document.addEventListener('click', (e) => this.handleLinkClick(e));
  }

  /**
   * Add a route
   * @param {string} path - Route path (e.g., '/chat/:id')
   * @param {Function} handler - Route handler
   */
  addRoute(path, handler) {
    // Convert path to regex
    const paramNames = [];
    const regexPath = path.replace(/:([^/]+)/g, (match, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    
    this.routes.set(path, {
      path,
      regex: new RegExp(`^${regexPath}$`),
      paramNames,
      handler
    });
  }

  /**
   * Navigate to a path
   * @param {string} path - Target path
   * @param {Object} params - Route params
   * @param {boolean} replace - Replace current history entry
   */
  navigate(path, params = {}, replace = false) {
    // Build full path with params
    let fullPath = path;
    
    // Replace params in path
    Object.entries(params).forEach(([key, value]) => {
      fullPath = fullPath.replace(`:${key}`, encodeURIComponent(value));
    });
    
    // Build query string from remaining params
    const queryParams = { ...params };
    Object.keys(params).forEach(key => {
      if (path.includes(`:${key}`)) {
        delete queryParams[key];
      }
    });
    
    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    if (queryString) {
      fullPath += `?${queryString}`;
    }
    
    if (this.useHash) {
      fullPath = `#${fullPath}`;
    }
    
    if (replace) {
      window.location.replace(fullPath);
    } else {
      window.location.hash = fullPath.replace('#', '');
    }
  }

  /**
   * Navigate back
   */
  back() {
    window.history.back();
  }

  /**
   * Handle route change
   */
  handleRouteChange() {
    const path = this.getCurrentPath();
    const matched = this.matchRoute(path);
    
    if (matched) {
      this.executeRoute(matched);
    } else {
      this.handleNotFound(path);
    }
  }

  /**
   * Get current path from URL
   */
  getCurrentPath() {
    if (this.useHash) {
      return window.location.hash.replace('#', '') || '/';
    }
    return window.location.pathname + window.location.search;
  }

  /**
   * Match path to registered routes
   */
  matchRoute(path) {
    // Remove query string for matching
    const [pathWithoutQuery, queryString] = path.split('?');
    
    // Parse query params
    this.query = {};
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        this.query[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }
    
    // Find matching route
    for (const route of this.routes.values()) {
      const match = pathWithoutQuery.match(route.regex);
      if (match) {
        // Extract params
        this.params = {};
        route.paramNames.forEach((name, index) => {
          this.params[name] = decodeURIComponent(match[index + 1]);
        });
        
        return { route, params: this.params, query: this.query };
      }
    }
    
    return null;
  }

  /**
   * Execute matched route
   */
  async executeRoute({ route, params, query }) {
    // Run before hooks
    for (const hook of this.beforeHooks) {
      const result = await hook(route.path, params, query);
      if (result === false) return; // Navigation cancelled
    }
    
    this.currentRoute = {
      path: route.path,
      params,
      query
    };
    
    // Get component from handler
    let component;
    try {
      component = await route.handler(params, query);
    } catch (error) {
      console.error('Route handler error:', error);
      eventBus.emit('router:error', { path: route.path, error });
      return;
    }
    
    // Notify subscribers
    this.routeChangeCallbacks.forEach(cb => {
      try {
        cb(this.currentRoute, component);
      } catch (error) {
        console.error('Route change callback error:', error);
      }
    });
    
    // Emit event
    eventBus.emit('route:changed', this.currentRoute);
    
    // Run after hooks
    for (const hook of this.afterHooks) {
      await hook(route.path, params, query);
    }
  }

  /**
   * Handle 404
   */
  handleNotFound(path) {
    console.warn(`Route not found: ${path}`);
    eventBus.emit('router:notFound', { path });
    
    // Redirect to dashboard or welcome
    this.navigate('/dashboard');
  }

  /**
   * Intercept link clicks for SPA navigation
   */
  handleLinkClick(e) {
    const link = e.target.closest('a[href^="/"]');
    if (!link) return;
    
    // Skip if modified click (ctrl, shift, etc)
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    
    // Skip if target is external
    if (link.target === '_blank') return;
    
    // Skip if download link
    if (link.hasAttribute('download')) return;
    
    e.preventDefault();
    this.navigate(link.getAttribute('href'));
  }

  /**
   * Subscribe to route changes
   * @param {Function} callback
   */
  onRouteChange(callback) {
    this.routeChangeCallbacks.push(callback);
    
    // Call immediately if route exists
    if (this.currentRoute) {
      const matched = this.matchRoute(this.getCurrentPath());
      if (matched) {
        callback(this.currentRoute, matched.route.handler);
      }
    }
    
    // Return unsubscribe
    return () => {
      const index = this.routeChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.routeChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Add before hook
   */
  beforeEach(hook) {
    this.beforeHooks.push(hook);
  }

  /**
   * Add after hook
   */
  afterEach(hook) {
    this.afterHooks.push(hook);
  }

  /**
   * Generate URL for route
   * @param {string} name - Route path
   * @param {Object} params - Route params
   * @returns {string}
   */
  resolve(name, params = {}) {
    let path = name;
    
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    });
    
    return this.useHash ? `#${path}` : path;
  }

  /**
   * Get current route info
   */
  getCurrentRoute() {
    return this.currentRoute;
  }
}

// Singleton
export const router = new Router();
