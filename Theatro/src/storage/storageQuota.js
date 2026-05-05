/**
 * Theatro - Storage Quota
 * 
 * Monitors storage usage and warns when approaching limits.
 */

import { storageAdapter } from './storageAdapter.js';
import { eventBus } from '../core/eventBus.js';

const WARNING_THRESHOLD = 0.8; // Warn at 80%
const CRITICAL_THRESHOLD = 0.95; // Critical at 95%

class StorageQuota {
  constructor() {
    this.checkInterval = null;
    this.lastWarning = null;
  }

  /**
   * Start monitoring
   * @param {number} intervalMs - Check interval (default: 5 minutes)
   */
  startMonitoring(intervalMs = 5 * 60 * 1000) {
    this.check();
    
    this.checkInterval = setInterval(() => {
      this.check();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check current usage
   */
  async check() {
    try {
      const usage = await storageAdapter.getUsage();
      
      if (!usage.quota || usage.quota === Infinity) {
        return; // Can't calculate percentage
      }

      const percentUsed = (usage.usage / usage.quota);
      
      // Update state
      eventBus.emit('storage:usage', {
        usage: usage.usage,
        quota: usage.quota,
        percentUsed
      });

      // Warnings
      if (percentUsed >= CRITICAL_THRESHOLD) {
        this.emitWarning('critical', percentUsed);
      } else if (percentUsed >= WARNING_THRESHOLD) {
        this.emitWarning('warning', percentUsed);
      }

      return usage;
    } catch (error) {
      console.warn('Failed to check storage quota:', error);
    }
  }

  /**
   * Emit warning
   */
  emitWarning(level, percentUsed) {
    const now = Date.now();
    
    // Throttle warnings (max once per hour)
    if (this.lastWarning && (now - this.lastWarning) < 60 * 60 * 1000) {
      return;
    }
    
    this.lastWarning = now;

    const percent = Math.round(percentUsed * 100);
    
    if (level === 'critical') {
      eventBus.emit('storage:critical', {
        message: `Storage ${percent}% full. Export and clear data to continue.`,
        percentUsed
      });
    } else {
      eventBus.emit('storage:warning', {
        message: `Storage ${percent}% full. Consider exporting old scenarios.`,
        percentUsed
      });
    }
  }

  /**
   * Get storage breakdown by collection
   */
  async getBreakdown() {
    const collections = ['characters', 'scenarios', 'messages', 'memories', 'media'];
    const breakdown = {};
    
    for (const collection of collections) {
      try {
        const items = await storageAdapter.getAll(collection);
        let size = 0;
        
        // Estimate size
        for (const item of items) {
          size += JSON.stringify(item).length * 2; // Rough UTF-16 estimate
        }
        
        breakdown[collection] = {
          count: items.length,
          estimatedSize: size,
          estimatedSizeMB: (size / 1024 / 1024).toFixed(2)
        };
      } catch {
        breakdown[collection] = { count: 0, estimatedSize: 0 };
      }
    }

    return breakdown;
  }
}

// Singleton
export const storageQuota = new StorageQuota();
