/***** HEADER COMPONENT *****/
import { store } from '../core/store.js';
import { createEl, esc } from '../core/dom.js';
import { icon } from './icons.js';
import { router } from '../core/router.js';

export const header = {
  el: null,
  mount(container) {
    this.el = container;
    this.render();
  },
  render() {
    if (!this.el) return;
    const screen = store.get('screen');
    const isDash = ['dashboard', 'char-create', 'scenario-create', 'settings'].includes(screen);
    const isChat = screen === 'chat';

    this.el.innerHTML = '';
    this.el.appendChild(createEl('div', { class: 'hdr' }, [
      createEl('div', { class: 'hdr-logo', onclick: () => router.go('dashboard'), text: 'PERSO' },
        createEl('span', { class: 'dim', text: 'NA' })
      ),
      isDash ? createEl('nav', { class: 'hdr-nav' }, [
        createEl('button', { class: `hdr-btn ${screen === 'dashboard' ? 'active' : ''}`, onclick: () => router.go('dashboard'), text: 'Dashboard' }),
        createEl('button', { class: `hdr-btn ${screen === 'settings' ? 'active' : ''}`, onclick: () => router.go('settings'), text: 'Settings' })
      ]) : null,
      isChat ? createEl('div', { style: 'display:flex;align-items:center;gap:8px;flex:1;min-width:0' }, [
        createEl('button', { class: 'ibtn', onclick: () => router.go('dashboard'), html: icon('back', 16) }),
        createEl('span', { style: 'font-family:var(--font-display);font-size:15px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
          text: store.get('chat.scenario.name') || 'Chat' }),
        createEl('span', { style: 'font-size:12px;color:var(--text-muted);flex-shrink:0',
          text: `${store.get('chat.characters').length} chars` })
      ]) : null,
      createEl('div', { class: 'hdr-actions' }, [
        isChat ? [
          createEl('button', { class: 'btn btn-secondary btn-sm', onclick: () => window.Chat?.saveJSON?.(), html: icon('download', 13) + ' Save' }),
          createEl('button', { class: 'btn btn-ghost btn-sm', onclick: () => window.Chat?.loadJSON?.(), html: icon('upload', 13) + ' Load' }),
          createEl('button', { class: 'ibtn', title: 'Settings', onclick: () => router.go('settings'), html: icon('settings', 15) })
        ] : [
          createEl('button', { class: 'btn btn-primary btn-sm', onclick: () => window.Scr?.newScenario?.(), html: icon('plus', 13) + ' Scenario' }),
          createEl('button', { class: 'btn btn-ghost btn-sm', onclick: () => window.Scr?.newChar?.(), html: icon('plus', 13) + ' Character' })
        ]
      ])
    ]));
  }
};
