/**
 * Theatro - IndexedDB Adapter
 * 
 * IndexedDB implementation of the storage adapter.
 */

import { SCHEMA } from './schemas.js';
import { MIGRATIONS } from './migrations.js';

const DB_NAME = 'theatro_v1';
const DB_VERSION = 1;

class IndexedDbAdapter {
  constructor() {
    this.db = null;
    this.dbPromise = null;
  }

  /**
   * Initialize IndexedDB
   */
  async initialize() {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB: ' + request.error?.message));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.setupStores(db);
      };
    });

    return this.dbPromise;
  }

  /**
   * Setup object stores
   */
  setupStores(db) {
    // Create stores based on schema
    for (const [storeName, config] of Object.entries(SCHEMA)) {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: config.keyPath || 'id'
        });

        // Create indexes
        if (config.indexes) {
          for (const index of config.indexes) {
            store.createIndex(index.name, index.keyPath, {
              unique: index.unique || false,
              multiEntry: index.multiEntry || false
            });
          }
        }
      }
    }

    // Run migrations if needed
    MIGRATIONS.forEach(migration => migration(db));
  }

  /**
   * Get item by ID
   */
  async get(storeName, id) {
    const db = await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set item (create or update)
   */
  async set(storeName, id, data) {
    const db = await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item
   */
  async delete(storeName, id) {
    const db = await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query items
   */
  async query(storeName, filters = {}, options = {}) {
    const db = await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      let request;
      
      if (options.index) {
        const index = store.index(options.index);
        request = index.openCursor();
      } else {
        request = store.openCursor();
      }

      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          const item = cursor.value;
          
          // Apply filters
          let matches = true;
          for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value)) {
              // Multi-value filter (OR)
              if (!value.includes(item[key])) {
                matches = false;
                break;
              }
            } else if (item[key] !== value) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            results.push(item);
          }
          
          // Limit results
          if (options.limit && results.length >= options.limit) {
            resolve(results);
            return;
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all items
   */
  async getAll(storeName) {
    const db = await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if item exists
   */
  async exists(storeName, id) {
    const item = await this.get(storeName, id);
    return item !== null;
  }

  /**
   * Count items
   */
  async count(storeName, filters = {}) {
    if (Object.keys(filters).length === 0) {
      const db = await this.initialize();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    // With filters, query and count
    const results = await this.query(storeName, filters);
    return results.length;
  }

  /**
   * Clear collection
   */
  async clear(storeName) {
    const db = await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage usage
   */
  async getUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentUsed: estimate.quota ? (estimate.usage / estimate.quota * 100) : 0
      };
    }

    // Fallback: estimate based on our data
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  /**
   * Close database
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
    }
  }
}

// Singleton
export const indexedDbAdapter = new IndexedDbAdapter();
