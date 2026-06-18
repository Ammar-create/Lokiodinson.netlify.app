/***** CHAT SCREEN STUB *****/
import { createEl } from '../core/dom.js';

export function mount(container) {
  container.innerHTML = '';
  container.appendChild(createEl('div', { style: 'flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px' }, [
    createEl('svg', { style: 'width:48px;height:48px;color:var(--gold);opacity:.4' },
      createEl('use', { href: 'assets/icons.svg#film' })
    ),
    createEl('h2', { class: 'text-head', style: 'font-size:18px;color:var(--text-soft)', text: 'Chat Stage' }),
    createEl('span', { class: 'text-label', text: 'Phase 3 — Coming Soon' })
  ]));
}

export function unmount(container) {
  // cleanup
}
