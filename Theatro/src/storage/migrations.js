/**
 * Theatro - Database Migrations
 * 
 * Migration functions for IndexedDB upgrades.
 */

export const MIGRATIONS = [
  // Migration 0: Initial setup (handled in onupgradeneeded)
  (db) => {
    // Initial schema created in setupStores
  }
  
  // Future migrations will be added here
  // Example:
  // (db) => {
  //   // Migration 1: Add new index
  //   if (db.objectStoreNames.contains('characters')) {
  //     const store = db.transaction('characters').objectStore('characters');
  //     if (!store.indexNames.contains('newIndex')) {
  //       store.createIndex('newIndex', 'newField', { unique: false });
  //     }
  //   }
  // }
];
