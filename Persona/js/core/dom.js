// ===== DOM UTILITIES =====
// No globals. Every function exported explicitly.

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function fmtT(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtD(ts) {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * createElement factory — replaces innerHTML string concatenation.
 * Accepts tag, props object, and children array (strings or nodes).
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (key === 'class') node.className = val;
    else if (key === 'style' && typeof val === 'object') Object.assign(node.style, val);
    else if (key === 'dataset' && typeof val === 'object') Object.assign(node.dataset, val);
    else if (key.startsWith('on') && typeof val === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (val !== null && val !== undefined && val !== false) {
      node.setAttribute(key, val);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const child of kids) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? child : child);
  }
  return node;
}

/**
 * Roleplay text parser — converts *actions* and "dialogue" into styled HTML.
 * Returns an array of DOM nodes for safe insertion (no innerHTML).
 */
export function parseRP(text, color) {
  if (!text) return [];
  const nodes = [];
  let i = 0;
  const c = color || '#d4a843';

  while (i < text.length) {
    // Bold **text**
    if (text[i] === '*' && i + 1 < text.length && text[i + 1] === '*') {
      const e = text.indexOf('**', i + 2);
      if (e !== -1 && e > i + 2) {
        const strong = el('strong', { style: { color: c } }, [text.slice(i + 2, e)]);
        nodes.push(strong); i = e + 2; continue;
      }
    }
    // Italic *text*
    if (text[i] === '*') {
      const e = text.indexOf('*', i + 1);
      if (e !== -1 && e > i + 1) {
        const inner = text.slice(i + 1, e);
        if (/[a-zA-Z]/.test(inner)) {
          const em = el('em', { style: { color: c, opacity: '.85' } }, [inner]);
          nodes.push(em); i = e + 1; continue;
        }
      }
    }
    // Dialogue "text"
    if (text[i] === '"') {
      const e = text.indexOf('"', i + 1);
      if (e !== -1 && e > i) {
        const span = el('span', { style: { color: c, fontWeight: '500' } }, [text.slice(i, e + 1)]);
        nodes.push(span); i = e + 1; continue;
      }
    }
    // Line break
    if (text[i] === '\n') {
      nodes.push(el('br')); i++; continue;
    }
    // Plain text — accumulate until next special char
    let j = i;
    while (j < text.length && text[j] !== '*' && text[j] !== '"' && text[j] !== '\n') j++;
    if (j > i) {
      nodes.push(document.createTextNode(text.slice(i, j)));
      i = j;
    } else {
      nodes.push(document.createTextNode(text[i]));
      i++;
    }
  }
  return nodes;
}

/** Clear all children of a node */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Mount nodes into a container, clearing previous content */
export function mount(container, ...nodes) {
  clear(container);
  for (const n of nodes) {
    if (Array.isArray(n)) n.forEach(x => container.append(x));
    else if (n) container.append(n);
  }
  return container;
}
