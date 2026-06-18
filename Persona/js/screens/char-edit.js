/***** CHARACTER EDIT SCREEN STUB *****/
import { createEl } from '../core/dom.js';

export function mount(container) {
  container.innerHTML = '';
  container.appendChild(createEl('div', { class: 'screen-content' }, [
    createEl('div', { class: 'char-form' }, [
      createEl('div', { class: 'form-header' }, [
        createEl('h1', { class: 'form-title', text: 'Character' }),
        createEl('span', { class: 'text-label', text: 'Phase 2 — Coming Soon' })
      ])
    ])
  ]));
}

export function unmount(container) {
  // cleanup
}
