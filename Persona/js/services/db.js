/***** INDEXEDDB SERVICE *****/
let _db = null;

async function openDb() {
  if (_db) return _db;
  return new Promise((res, rej) => {
    const req = indexedDB.open('persona', 3);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      ['characters', 'scenarios', 'memories', 'relationships', 'providers'].forEach(s => {
        if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
      });
      if (!d.objectStoreNames.contains('messages')) {
        const ms = d.createObjectStore('messages', { keyPath: 'id' });
        ms.createIndex('scenarioId', 'scenarioId', { unique: false });
      }
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('blobs')) {
        const bs = d.createObjectStore('blobs', { keyPath: 'id' });
        bs.createIndex('kind', 'kind', { unique: false });
        bs.createIndex('url', 'url', { unique: false });
      }
    };
    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror = e => rej(e.target.error);
  });
}

function tx(store, mode, fn) {
  return new Promise((res, rej) => {
    const t = _db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    if (r) {
      r.onsuccess = e => res(e.target.result);
      r.onerror = e => rej(e.target.error);
    } else {
      t.oncomplete = () => res();
      t.onerror = e => rej(e.target.error);
    }
  });
}

export const db = {
  open: openDb,
  get(st, k) { return tx(st, 'readonly', s => s.get(k)); },
  put(st, v) { return tx(st, 'readwrite', s => s.put(v)); },
  del(st, k) { return tx(st, 'readwrite', s => s.delete(k)); },
  async getAll(store) {
    return new Promise((res, rej) => {
      const r = _db.transaction(store, 'readonly').objectStore(store).getAll();
      r.onsuccess = e => res(e.target.result);
      r.onerror = e => rej(e.target.error);
    });
  },
  async getByIndex(store, idx, val) {
    return new Promise((res, rej) => {
      const r = _db.transaction(store, 'readonly').objectStore(store).index(idx).getAll(val);
      r.onsuccess = e => res(e.target.result);
      r.onerror = e => rej(e.target.error);
    });
  },
  async getSetting(k, def = null) {
    const r = await this.get('settings', k);
    return r ? r.value : def;
  },
  async setSetting(k, v) {
    await this.put('settings', { key: k, value: v });
  },

  // Hash-based blob cache
  hashUrl(url) {
    let h = 5381;
    const s = String(url || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'b_' + (h >>> 0).toString(36) + '_' + s.length.toString(36);
  },
  async cacheBlob(url, blob, kind = 'image') {
    if (!url || !blob) return null;
    const id = this.hashUrl(url);
    await this.put('blobs', { id, url, kind, type: blob.type || '', size: blob.size || 0, blob, cachedAt: Date.now() });
    return id;
  },
  async getBlob(url) {
    if (!url) return null;
    const rec = await this.get('blobs', this.hashUrl(url));
    return rec?.blob || null;
  },
  async hasBlob(url) {
    if (!url) return false;
    return !!(await this.get('blobs', this.hashUrl(url)));
  },
  async getBlobUrl(url) {
    if (!url) return null;
    const rec = await this.get('blobs', this.hashUrl(url));
    if (!rec?.blob) return null;
    return URL.createObjectURL(rec.blob);
  },
  async delBlob(url) {
    if (!url) return;
    await this.del('blobs', this.hashUrl(url));
  },
  getAllBlobs() { return this.getAll('blobs'); },
  async clearAll() {
    return new Promise((res, rej) => {
      const r = indexedDB.deleteDatabase('persona');
      r.onsuccess = () => res();
      r.onerror = () => rej(new Error('Failed to delete database'));
    });
  }
};
