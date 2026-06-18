/***** AVATAR COMPONENT *****/
import { esc } from '../core/dom.js';

export function avatarHtml(char, size = 32, opts = {}) {
  const st = `width:${size}px;height:${size}px;background:${char.color}22;border:2px solid ${opts.borderColor || char.color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size * 0.4)}px;font-weight:700;font-family:var(--font-display);color:${char.color};overflow:hidden;flex-shrink:0;`;
  if (char.avatar) {
    return `<div class="avatar" style="${st}"><img src="${esc(char.avatar)}" style="width:100%;height:100%;object-fit:cover" alt="${esc(char.name)}"></div>`;
  }
  return `<div class="avatar" style="${st}">${char.name?.[0]?.toUpperCase() || '?'}</div>`;
}

export function avatarEl(char, size = 32, opts = {}) {
  const div = document.createElement('div');
  div.innerHTML = avatarHtml(char, size, opts);
  return div.firstElementChild;
}
