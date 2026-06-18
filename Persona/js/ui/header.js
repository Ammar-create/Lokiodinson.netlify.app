import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { events } from '../core/events.js';
import { createEl } from '../core/dom.js';
import { iconEl } from './icons.js';

export const header = {
  el: null,
  unsub: null,
  mount(container) {
    this.el = container;
    this.unsub = store.subscribe('screen', () => this.render());
    this.render();
  },
  unmount() {
    if (this.unsub) this.unsub();
  },
  render() {
    if (!this.el) return;
    const screen = store.get('screen');
    const isDash = ['dashboard', 'char-create', 'scenario-create', 'settings'].includes(screen);
    const isChat = screen === 'chat';
    const chat = store.get('chat');

    this.el.innerHTML = '';
    this.el.appendChild(createEl('div', { class: 'hdr' }, [
      createEl('div', { class: 'hdr-logo', onclick: () => router.go('dashboard') }, [
        'PERSO',
        createEl('span', { class: 'dim', text: 'NA' })
      ]),
      isDash ? createEl('nav', { class: 'hdr-nav' }, [
        createEl('button', {
          class: `hdr-btn ${screen === 'dashboard' ? 'active' : ''}`,
          onclick: () => router.go('dashboard'),
          text: 'Dashboard'
        }),
        createEl('button', {
          class: `hdr-btn ${screen === 'settings' ? 'active' : ''}`,
          onclick: () => router.go('settings'),
          text: 'Settings'
        })
      ]) : null,
      isChat ? createEl('div', { style: 'display:flex;align-items:center;gap:8px;flex:1;min-width:0' }, [
        createEl('button', { class: 'ibtn', onclick: () => router.go('dashboard') }, iconEl('back', 16)),
        createEl('span', {
          style: 'font-family:var(--font-display);font-size:15px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
          text: chat.scenario?.name || 'Chat'
        }),
        createEl('span', {
          style: 'font-size:12px;color:var(--text-muted);flex-shrink:0',
          text: `${(chat.characters || []).length} chars`
        })
      ]) : null,
      createEl('div', { class: 'hdr-actions' }, [
        ...(isChat ? [
          createEl('button', {
            class: 'btn btn-secondary btn-sm',
            onclick: () => events.emit('chat:save')
          }, [iconEl('download', 13), ' Save']),
          createEl('button', {
            class: 'btn btn-ghost btn-sm',
            onclick: () => events.emit('chat:load')
          }, [iconEl('upload', 13), ' Load']),
          createEl('button', {
            class: 'ibtn',
            title: 'Settings',
            onclick: () => router.go('settings')
          }, iconEl('settings', 15))
        ] : [
          createEl('button', {
            class: 'btn btn-primary btn-sm',
            onclick: () => { store.set('editScenId', null); router.go('scenario-create'); }
          }, [iconEl('plus', 13), ' Scenario']),
          createEl('button', {
            class: 'btn btn-ghost btn-sm',
            onclick: () => { store.set('editCharId', null); router.go('char-create'); }
          }, [iconEl('plus', 13), ' Character'])
        ])
      ])
    ]));
  }
};
