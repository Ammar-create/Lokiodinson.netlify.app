/***** DOM UTILITIES *****/
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Robust RP parser: bold, italic, dialogue */
export function parseRP(text, color = '#d4a843') {
  if (!text) return '';
  let out = '';
  let i = 0;
  const c = esc(color);
  while (i < text.length) {
    // Bold **text**
    if (text[i] === '*' && i + 1 < text.length && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1 && end > i + 2) {
        out += `<strong style="color:${c}">${esc(text.slice(i + 2, end))}</strong>`;
        i = end + 2;
        continue;
      }
    }
    // Italic *text* (must contain a letter)
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        const inner = text.slice(i + 1, end);
        if (/[a-zA-Z]/.test(inner)) {
          out += `<em style="color:${c};opacity:.85">${esc(inner)}</em>`;
          i = end + 1;
          continue;
        }
      }
    }
    // Dialogue "text"
    if (text[i] === '"') {
      const end = text.indexOf('"', i + 1);
      if (end !== -1 && end > i) {
        out += `<span style="color:${c};font-weight:500">${esc(text.slice(i, end + 1))}</span>`;
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '\n') {
      out += '<br>';
      i++;
      continue;
    }
    out += esc(text[i]);
    i++;
  }
  return out;
}

/** DOM element factory — no innerHTML */
export function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v; // escape hatch for trusted content
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      el.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}

/** Generate UID */
export function uid() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 8);
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const fmtDate = ts => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

/** Animate element in */
export function animateIn(el, type = 'fadeUp') {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = `${type === 'fadeUp' ? 'fadeUp' : type} var(--t-slow) var(--ease-out)`;
}

/** Debounce */
export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
