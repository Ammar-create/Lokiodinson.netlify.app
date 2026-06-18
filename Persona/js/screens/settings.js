/***** SETTINGS SCREEN STUB *****/
import { createEl } from '../core/dom.js';

export function mount(container) {
  container.innerHTML = '';
  container.appendChild(createEl('div', { class: 'screen-content', style: 'display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px' }, [
    createEl('svg', { style: 'width:48px;height:48px;color:var(--gold);opacity:.4' },
      createEl('use', { href: 'assets/icons.svg#sliders' })
    ),
    createEl('h2', { class: 'text-head', style: 'font-size:18px;color:var(--text-soft)', text: 'Settings' }),
    createEl('span', { class: 'text-label', text: 'Phase 2 — Coming Soon' })
  ]));
}

export function unmount(container) {
  // cleanup
}
