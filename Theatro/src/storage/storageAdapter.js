/**
 * Theatro - Storage Adapter
 * 
 * Abstract storage interface.
 * Swappable implementation (IndexedDB now, cloud later).
 */

import { indexedDbAdapter } from './indexedDbAdapter.js';
import { eventBus } from '../core/eventBus.js';

class StorageAdapter {
  constructor() {
    this.backend = indexedDbAdapter;
    this.initialized = false;
    this.cache = new Map();
    this.cacheEnabled = false;
    this.cacheTTL = 60000; // 1 minute
  }

  /**
   * Initialize storage
   */
  async initialize() {
    if (this.initialized) return;

    await this.backend.initialize();
    this.initialized = true;
    
    eventBus.emit('storage:ready');
  }

  /**
   * Get item by ID
   * @param {string} collection - Collection/store name
   * @param {string} id - Item ID
   * @returns {Promise<any>}
   */
  async get(collection, id) {
    this.checkInitialized();

    // Check cache
    const cacheKey = `${collection}:${id}`;
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return structuredClone(cached.data);
      }
      this.cache.delete(cacheKey);
    }

    const result = await this.backend.get(collection, id);
    
    if (this.cacheEnabled && result) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result ? structuredClone(result) : null;
  }

  /**
   * Set item (create or update)
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @param {any} data - Item data
   * @returns {Promise<void>}
   */
  async set(collection, id, data) {
    this.checkInitialized();

    const item = {
      ...data,
      id,
      updatedAt: new Date().toISOString()
    };

    await this.backend.set(collection, id, item);

    // Update cache
    if (this.cacheEnabled) {
      this.cache.set(`${collection}:${id}`, {
        data: item,
        timestamp: Date.now()
      });
    }

    eventBus.emit('storage:changed', { collection, id, operation: 'set' });
  }

  /**
   * Delete item
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Promise<void>}
   */
  async delete(collection, id) {
    this.checkInitialized();

    await this.backend.delete(collection, id);

    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(`${collection}:${id}`);
    }

    eventBus.emit('storage:changed', { collection, id, operation: 'delete' });
  }

  /**
   * Query items
   * @param {string} collection - Collection name
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Promise<any[]>}
   */
  async query(collection, filters = {}, options = {}) {
    this.checkInitialized();

    const results = await this.backend.query(collection, filters, options);
    return results.map(item => structuredClone(item));
  }

  /**
   * Get all items in collection
   * @param {string} collection - Collection name
   * @returns {Promise<any[]>}
   */
  async getAll(collection) {
    this.checkInitialized();

    const results = await this.backend.getAll(collection);
    return results.map(item => structuredClone(item));
  }

  /**
   * Check if item exists
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Promise<boolean>}
   */
  async exists(collection, id) {
    this.checkInitialized();

    return await this.backend.exists(collection, id);
  }

  /**
   * Count items in collection
   * @param {string} collection - Collection name
   * @param {Object} filters - Optional filters
   * @returns {Promise<number>}
   */
  async count(collection, filters = {}) {
    this.checkInitialized();

    return await this.backend.count(collection, filters);
  }

  /**
   * Clear collection
   * @param {string} collection - Collection name
   * @returns {Promise<void>}
   */
  async clear(collection) {
    this.checkInitialized();

    await this.backend.clear(collection);

    // Clear cache entries for this collection
    if (this.cacheEnabled) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${collection}:`)) {
          this.cache.delete(key);
        }
      }
    }

    eventBus.emit('storage:cleared', { collection });
  }

  /**
   * Get storage usage info
   * @returns {Promise<Object>}
   */
  async getUsage() {
    this.checkInitialized();

    if (this.backend.getUsage) {
      return await this.backend.getUsage();
    }

    return { usage: 0, quota: 0 };
  }

  /**
   * Batch operations
   * @param {Array<{operation: string, collection: string, id?: string, data?: any}>} operations
   * @returns {Promise<Array>}
   */
  async batch(operations) {
    this.checkInitialized();

    const results = [];
    
    for (const op of operations) {
      try {
        switch (op.operation) {
          case 'get':
            results.push(await this.get(op.collection, op.id));
            break;
          case 'set':
            await this.set(op.collection, op.id, op.data);
            results.push(true);
            break;
          case 'delete':
            await this.delete(op.collection, op.id);
            results.push(true);
            break;
          default:
            results.push(new Error(`Unknown operation: ${op.operation}`));
        }
      } catch (error) {
        results.push(error);
      }
    }

    return results;
  }

  /**
   * Switch storage backend
   * @param {Object} newBackend - New backend adapter
   */
  async switchBackend(newBackend) {
    this.backend = newBackend;
    this.cache.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Enable/disable caching
   */
  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  /**
   * Check if initialized
   */
  checkInitialized() {
    if (!this.initialized) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
  }
}

// Singleton
export const storageAdapter = new StorageAdapter();
