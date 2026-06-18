/***** TOAST NOTIFICATIONS *****/
import { createEl } from '../core/dom.js';

const ROOT = document.getElementById('toast-root');
const ICONS = { s: 'check', e: 'x', w: 'warn', i: 'info' };
const TYPES = { s: 'success', e: 'error', w: 'warning', i: 'info' };

function show(msg, type = 'i', duration = 3500) {
  if (!ROOT) return;
  const toast = createEl('div', { class: `toast toast-${TYPES[type] || 'info'}` }, [
    createEl('span', { text: msg })
  ]);
  ROOT.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

export const toast = {
  show,
  success: (m, d) => show(m, 's', d),
  error: (m, d) => show(m, 'e', d || 5000),
  warning: (m, d) => show(m, 'w', d),
  info: (m, d) => show(m, 'i', d)
};
