/***** DASHBOARD SCREEN STUB *****/
import { createEl } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';

export function mount(container) {
  container.innerHTML = '';
  const el = createEl('div', { class: 'screen-content' }, [
    createEl('div', { class: 'section-hdr' }, [
      createEl('h2', { class: 'section-title', text: 'Dashboard' }),
      createEl('span', { class: 'text-label', text: 'Phase 1 — Foundation Ready' })
    ]),
    createEl('div', { class: 'empty' }, [
      createEl('svg', { class: 'empty-icon', style: 'width:48px;height:48px;margin:0 auto 16px;color:var(--gold);opacity:.4' },
        createEl('use', { href: 'assets/icons.svg#film' })
      ),
      createEl('div', { class: 'empty-title', text: 'Persona Foundation Loaded' }),
      createEl('div', { class: 'empty-desc', text: 'Phase 1 complete. ES modules, reactive store, IndexedDB, API client, DOM factory, and all CSS tokens are wired. Phase 2 screens incoming.' }),
      createEl('button', { class: 'btn btn-primary', text: 'Check Console for Details' })
    ])
  ]);
  container.appendChild(el);
}

export function unmount(container) {
  // cleanup if needed
}
