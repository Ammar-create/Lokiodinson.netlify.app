import { createEl, esc } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { router } from '../core/router.js';
import { avatarEl } from '../ui/avatar.js';
import { iconEl } from '../ui/icons.js';

export async function mount(container) {
  const scenId = store.get('chat.scenId');
  if (!scenId) {
    container.innerHTML = '';
    container.appendChild(createEl('div', { class: 'screen-content', style: 'display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px' }, [
      iconEl('alert-circle', 48, { style: 'color:var(--gold);opacity:.4' }),
      createEl('h2', { class: 'text-head', style: 'font-size:18px;color:var(--text-soft)', text: 'No Scenario Selected' }),
      createEl('button', { class: 'btn btn-primary', onclick: () => router.go('dashboard'), text: 'Go to Dashboard' })
    ]));
    return;
  }

  const scenario = await db.get('scenarios', scenId);
  if (!scenario) {
    container.innerHTML = '';
    container.appendChild(createEl('div', { class: 'screen-content', style: 'display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px' }, [
      iconEl('alert-circle', 48, { style: 'color:var(--gold);opacity:.4' }),
      createEl('h2', { class: 'text-head', style: 'font-size:18px;color:var(--text-soft)', text: 'Scenario Not Found' })
    ]));
    return;
  }

  const chars = [];
  for (const cid of scenario.characterIds || []) {
    const c = await db.get('characters', cid);
    if (c) chars.push(c);
  }

  const msgs = await db.getByIndex('messages', 'scenarioId', scenId);
  msgs.sort((a, b) => a.timestamp - b.timestamp);

  store.merge('chat', { scenario, characters: chars, messages: msgs });

  container.innerHTML = '';
  container.appendChild(renderLayout(scenario, chars, msgs));
}

export function unmount(container) {
  container.innerHTML = '';
}

function renderLayout(scenario, chars, msgs) {
  const isDm = chars.length <= 2;

  return createEl('div', { class: `chat-stage ${isDm ? 'dm-mode' : 'group-mode'}` }, [
    // Chat log placeholder
    createEl('div', { class: 'chat-log', id: 'chat-log' }, [
      msgs.length ? msgs.map(m => renderMsgPlaceholder(m, chars)) : createEl('div', { class: 'empty', style: 'padding:40px 20px' }, [
        createEl('div', { class: 'empty-title', text: scenario.name }),
        createEl('div', { class: 'empty-desc', text: 'Chat engine coming in Phase 3' })
      ])
    ]),
    // Input area placeholder
    createEl('div', { class: 'chat-input-area' }, [
      createEl('div', { class: 'input-row' }, [
        createEl('div', { class: 'input-char-btn', id: 'char-av-btn' },
          chars[0] ? avatarEl(chars[0], 28) : '?'
        ),
        createEl('textarea', {
          id: 'chat-input',
          placeholder: `Write as ${chars[0]?.name || 'your character'}...`,
          rows: 1,
          style: 'flex:1;background:none;border:none;color:var(--text);font-family:var(--font-body);font-size:14px;resize:none;outline:none;min-height:36px;max-height:120px;line-height:1.5;padding:4px 6px'
        }),
        createEl('div', { class: 'input-actions' }, [
          createEl('button', { class: 'ibtn', title: 'Whisper' }, iconEl('lock', 15)),
          createEl('button', { class: 'ibtn', title: 'Auto-Improve' }, iconEl('magic', 15)),
          createEl('button', { class: 'ibtn', title: 'Voice Input' }, iconEl('mic', 15)),
          createEl('button', { class: 'ibtn active', title: 'Send', style: 'color:var(--gold);border-color:var(--gold-dim)' }, iconEl('send', 15))
        ])
      ])
    ])
  ]);
}

function renderMsgPlaceholder(msg, chars) {
  const char = chars.find(c => c.id === msg.charId) || { name: 'Unknown', color: '#888' };
  return createEl('div', { class: 'msg' }, [
    createEl('div', { class: 'msg-hdr' }, [
      avatarEl(char, 28),
      createEl('span', { class: 'msg-name', style: `color:${char.color}`, text: char.name })
    ]),
    createEl('div', { class: 'msg-body', style: `--msg-color:${char.color}`, text: msg.content })
  ]);
}
