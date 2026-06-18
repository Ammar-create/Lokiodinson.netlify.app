import { store } from '../core/store.js';
import { router } from '../core/router.js';
import { events } from '../core/events.js';
import { createEl } from '../core/dom.js';
import { iconEl } from './icons.js';

let mobileNavOpen = false;
let mobileMenuEl = null;

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
    if (mobileMenuEl) { mobileMenuEl.remove(); mobileMenuEl = null; }
  },
  render() {
    if (!this.el) return;
    const screen = store.get('screen');
    const isDash = ['dashboard', 'char-create', 'scenario-create', 'settings'].includes(screen);
    const isChat = screen === 'chat';
    const chat = store.get('chat');

    this.el.innerHTML = '';
    this.el.appendChild(createEl('div', { class: 'hdr' }, [
      createEl('div', { class: 'hdr-logo', onclick: () => closeMobileMenu() && router.go('dashboard') }, [
        'PERSO',
        createEl('span', { class: 'dim', text: 'NA' })
      ]),

      // Desktop nav — hidden on mobile via responsive.css
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

      isChat ? createEl('div', { class: 'hide-mobile', style: 'display:flex;align-items:center;gap:8px;flex:1;min-width:0' }, [
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

      // Mobile chat header (compact)
      isChat ? createEl('div', { class: 'mobile-only', style: 'display:none;align-items:center;gap:6px;flex:1;min-width:0;overflow:hidden' }, [
        createEl('span', {
          style: 'font-family:var(--font-display);font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
          text: chat.scenario?.name || 'Chat'
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
            onclick: () => { store.set('editScenId', null); router.go('scenario-create'); },
            text: 'Scenario'
          }),
          createEl('button', {
            class: 'btn btn-ghost btn-sm',
            onclick: () => { store.set('editCharId', null); router.go('char-create'); },
            text: 'Character'
          })
        ])
      ]),

      // Hamburger button — visible on mobile
      isDash ? createEl('button', {
        class: 'ibtn mobile-only',
        style: 'display:none;',
        onclick: () => toggleMobileMenu()
      }, iconEl('menu', 18)) : null
    ]));

    this.refreshMobileMenu(screen);
  },
  refreshMobileMenu(activeScreen) {
    if (mobileMenuEl) mobileMenuEl.remove();
    mobileNavOpen = false;

    const navItems = [
      { label: 'Dashboard', route: 'dashboard' },
      { label: 'Settings', route: 'settings' }
    ];

    mobileMenuEl = createEl('div', { class: 'mobile-nav', id: 'mobile-nav' },
      navItems.map(item => createEl('button', {
        class: `hdr-btn ${item.route === activeScreen ? 'active' : ''}`,
        onclick: () => { closeMobileMenu(); router.go(item.route); },
        text: item.label
      }))
    );
    document.body.appendChild(mobileMenuEl);
  }
};

function toggleMobileMenu() {
  mobileNavOpen = !mobileNavOpen;
  if (mobileMenuEl) mobileMenuEl.classList.toggle('open', mobileNavOpen);
}

function closeMobileMenu() {
  mobileNavOpen = false;
  if (mobileMenuEl) mobileMenuEl.classList.remove('open');
  return true;
}
