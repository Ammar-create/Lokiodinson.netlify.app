// ===== EVENT BUS =====
// Decoupled pub/sub for cross-module communication.
// Controllers emit events; screens subscribe and react.

const channels = new Map();

export const events = {
  on(name, handler) {
    if (!channels.has(name)) channels.set(name, new Set());
    channels.get(name).add(handler);
    return () => channels.get(name)?.delete(handler);
  },

  emit(name, payload) {
    const handlers = channels.get(name);
    if (handlers) for (const h of handlers) {
      try { h(payload); } catch (e) { console.error(`Event "${name}" handler error:`, e); }
    }
  },

  off(name, handler) {
    channels.get(name)?.delete(handler);
  },
};
