/**
 * Theatro - Cloud Adapter (Stub)
 * 
 * Future cloud storage implementation.
 * Currently a stub for the swappable storage architecture.
 */

class CloudAdapter {
  constructor() {
    this.enabled = false;
    this.endpoint = null;
    this.apiKey = null;
  }

  /**
   * Configure cloud storage
   */
  configure({ endpoint, apiKey }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.enabled = !!(endpoint && apiKey);
  }

  /**
   * Initialize - currently disabled
   */
  async initialize() {
    if (!this.enabled) {
      throw new Error('Cloud storage not configured');
    }

    // TODO: Implement cloud storage
    throw new Error('Cloud storage not yet implemented');
  }

  /**
   * All storage methods stubbed
   */
  async get() {
    throw new Error('Cloud storage not yet implemented');
  }

  async set() {
    throw new Error('Cloud storage not yet implemented');
  }

  async delete() {
    throw new Error('Cloud storage not yet implemented');
  }

  async query() {
    throw new Error('Cloud storage not yet implemented');
  }

  async getAll() {
    throw new Error('Cloud storage not yet implemented');
  }

  async exists() {
    throw new Error('Cloud storage not yet implemented');
  }

  async count() {
    throw new Error('Cloud storage not yet implemented');
  }

  async clear() {
    throw new Error('Cloud storage not yet implemented');
  }

  async getUsage() {
    return { usage: 0, quota: Infinity };
  }
}

// Singleton
export const cloudAdapter = new CloudAdapter();
