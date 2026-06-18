/***** EVENT BUS *****/
const listeners = new Map();

export const events = {
  on(name, handler) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(handler);
    return () => listeners.get(name).delete(handler);
  },
  emit(name, ...args) {
    const handlers = listeners.get(name);
    if (!handlers) return;
    for (const fn of [...handlers]) {
      try { fn(...args); } catch (e) { console.error(`Event "${name}" handler error:`, e); }
    }
  },
  off(name, handler) {
    listeners.get(name)?.delete(handler);
  }
};
