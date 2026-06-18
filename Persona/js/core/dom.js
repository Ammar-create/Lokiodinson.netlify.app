/***** DOM UTILITIES *****/
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function esc(s) {
  const map = { &: '&amp;', <: '&lt;', >: '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, ch => map[ch]);
}

/** Robust RP parser: bold, italic, dialogue */
export function parseRP(text, color = '#d4a843') {
  if (!text) return '';
  let h = '', i = 0;
  const c = esc(color);
  while (i < text.length) {
    if (text[i] === '*' && i + 1 < text.length && text[i + 1] === '*') {
      const e = text.indexOf('**', i + 2);
      if (e !== -1 && e > i + 2) {
        h += `<strong style="color:${c}">${esc(text.slice(i + 2, e))}</strong>`; i = e + 2; continue;
      }
    }
    if (text[i] === '*') {
      const e = text.indexOf('*', i + 1);
      if (e !== -1 && e > i + 1) {
        const inner = text.slice(i + 1, e);
        if (/[a-zA-Z]/.test(inner)) {
          h += `<em style="color:${c};opacity:.85">${esc(inner)}</em>`; i = e + 1; continue;
        }
      }
    }
    if (text[i] === '"') {
      const e = text.indexOf('"', i + 1);
      if (e !== -1 && e > i) {
        h += `<span style="color:${c};font-weight:500">${esc(text.slice(i, e + 1))}</span>`; i = e + 1; continue;
      }
    }
    if (text[i] === '\n') { h += '<br>'; i++; continue; }
    h += esc(text[i]); i++;
  }
  return h;
}

/** DOM element factory — no innerHTML.
 *  Normalizes single children to arrays, flattens nested arrays,
 *  and safely appends only strings/numbers/Nodes. */
export function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  if (children != null && !Array.isArray(children)) children = [children];
  const flat = children.flat(Infinity).filter(c => c != null);

  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      el.setAttribute(k, v);
    }
  }

  for (const child of flat) {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}

export function uid() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 8);
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const fmtDate = ts => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

export function animateIn(el, type = 'fadeUp') {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = `${type === 'fadeUp' ? 'fadeUp' : type} var(--t-slow) var(--ease-out)`;
}
export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
