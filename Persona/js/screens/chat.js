import { createEl, esc } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { router } from '../core/router.js';
import { toast } from '../ui/toast.js';
import { confirm, open as openModal } from '../ui/modal.js';
import { iconEl } from '../ui/icons.js';
import { avatarEl } from '../ui/avatar.js';
import * as ChatCore from '../engine/chat-core.js';
import * as ChatSession from '../engine/chat-session.js';
import * as ChatRender from '../engine/chat-render.js';
import * as Ctrl from '../engine/controllers.js';

export async function mount(container) {
  const ok = await ChatCore.initChatState(store.get('chat.scenId'));
  if (!ok) {
    container.innerHTML = '';
    container.appendChild(noScenarioView());
    return;
  }
  container.innerHTML = '';
  container.appendChild(buildChat());
  restoreMessages();
  ChatRender.setupScrollWatcher();
  setupInputListeners();
  setupWingsListeners();
}

export function unmount(container) {
  container.innerHTML = '';
}

/* =========== VIEWS =========== */

function noScenarioView() {
  return createEl('div', { class: 'screen-content', style: 'display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px' }, [
    iconEl('alert-circle', 48, { style: 'color:var(--gold);opacity:.4' }),
    createEl('h2', { class: 'text-head', style: 'font-size:18px;color:var(--text-soft)', text: 'No Scenario Selected' }),
    createEl('button', { class: 'btn btn-primary', onclick: () => router.go('dashboard'), text: 'Go to Dashboard' })
  ]);
}

function buildChat() {
  const chat = store.get('chat');
  const chars = chat.characters || [];
  const isDm = chars.length <= 2;
  const userChar = chars.find(c => c.isUser) || chars[0];

  return createEl('div', { class: `chat-stage ${isDm ? 'dm-mode' : 'group-mode'}` }, [
    // Chat log
    createEl('div', { class: 'chat-log', id: 'chat-log' }),

    // Input area
    createEl('div', { class: 'chat-input-area' }, [
      createEl('div', { class: 'whisper-bar', id: 'whisper-bar', style: 'display:none' }),
      createEl('div', { class: 'input-row' }, [
        createEl('div', {
          class: 'input-char-btn',
          id: 'char-av-btn',
          title: 'Switch character'
        }, userChar ? avatarEl(userChar, 28) : createEl('span', { text: '?' })),
        createEl('textarea', {
          id: 'chat-input',
          placeholder: `Write as ${userChar?.name || 'your character'}...`,
          rows: 1,
          style: 'flex:1;background:none;border:none;color:var(--text);font-family:var(--font-body);font-size:14px;resize:none;outline:none;min-height:36px;max-height:120px;line-height:1.5;padding:4px 6px'
        }),
        createEl('div', { class: 'input-actions' }, [
          createEl('button', { class: 'ibtn', id: 'whisper-btn', title: 'Whisper (Private Message)' }, iconEl('lock', 15)),
          createEl('button', { class: 'ibtn', id: 'improve-btn', title: 'Auto-Improve' }, iconEl('magic', 15)),
          createEl('button', { class: 'ibtn', id: 'mic-btn', title: 'Voice Input (Whisper)' }, iconEl('mic', 15)),
          createEl('button', { class: 'ibtn active', id: 'send-btn', title: 'Send (Enter)', style: 'color:var(--gold);border-color:var(--gold-dim)' }, iconEl('send', 15))
        ])
      ]),
      createEl('div', { class: 'input-subrow' }, [
        createEl('button', { class: 'btn btn-secondary btn-sm', id: 'auto-btn' }, [iconEl('play', 13), ' Auto']),
        createEl('div', { id: 'cpill' })
      ])
    ]),

    // Wings panel
    buildWings()
  ]);
}

function buildWings() {
  const chat = store.get('chat');
  const open = chat.panelOpen !== false;

  const panel = createEl('div', {
    class: `wings ${open ? '' : 'collapsed'}`,
    id: 'wings'
  });

  panel.appendChild(createEl('div', {
    class: 'wings-toggle',
    onclick: () => toggleWings()
  }, iconEl('panel', 14)));

  const tabs = createEl('div', { class: 'wings-tabs' });
  const tabsConfig = [
    { id: 'directive', label: 'Directive' },
    { id: 'memory', label: 'Memory' },
    { id: 'rels', label: 'Relations' },
    { id: 'cast', label: 'Cast' },
    { id: 'debug', label: 'Debug' }
  ];
  for (const t of tabsConfig) {
    tabs.appendChild(createEl('button', {
      class: `wings-tab ${chat.panelTab === t.id ? 'active' : ''}`,
      'data-tab': t.id,
      text: t.label
    }));
  }
  panel.appendChild(tabs);

  const body = createEl('div', { class: 'wings-body' });

  // Directive
  body.appendChild(createEl('div', {
    class: `wings-section ${chat.panelTab === 'directive' ? 'active' : ''}`,
    id: 'ws-directive'
  }, [
    createEl('div', {}, [
      createEl('div', { class: 'wings-label', text: '\u2728 What Happens Next' }),
      createEl('textarea', {
        rows: 3,
        placeholder: 'What should happen in the next few messages...',
        style: 'font-size:12px',
        value: chat.directive?.next || '',
        oninput: e => store.set('chat.directive.next', e.target.value)
      })
    ]),
    createEl('div', {}, [
      createEl('div', { class: 'wings-label', text: '\u270d Style Notes' }),
      createEl('textarea', {
        rows: 3,
        placeholder: 'Writing style, tone, things to avoid...',
        style: 'font-size:12px',
        value: chat.directive?.details || '',
        oninput: e => store.set('chat.directive.details', e.target.value)
      })
    ]),
    createEl('button', {
      class: 'btn btn-primary btn-sm',
      onclick: () => runCtrlNow(),
      style: 'align-self:flex-start'
    }, [iconEl('ctrl', 12), ' Run Controller'])
  ]));

  // Memory
  body.appendChild(createEl('div', {
    class: `wings-section ${chat.panelTab === 'memory' ? 'active' : ''}`,
    id: 'ws-memory'
  }, [
    createEl('div', { class: 'wings-label', text: '\ud83d\udcdc Story Summary' }),
    createEl('div', {
      id: 'panel-memory',
      style: 'font-size:12px;color:var(--text-soft);line-height:1.6;background:var(--stage);padding:10px;border-radius:var(--r);min-height:60px',
      text: chat.scenario?.summary || 'No summary yet \u2014 generated after first controller analysis.'
    })
  ]));

  // Relations
  body.appendChild(createEl('div', {
    class: `wings-section ${chat.panelTab === 'rels' ? 'active' : ''}`,
    id: 'ws-rels'
  }, [
    createEl('div', { class: 'wings-label', text: '\u2764\ufe0f Relationship Matrix' }),
    createEl('div', { id: 'rel-container' }, [
      createEl('p', { style: 'color:var(--text-muted);font-size:12px', text: 'Relationships appear after controller analysis.' })
    ])
  ]));

  // Cast
  body.appendChild(createEl('div', {
    class: `wings-section ${chat.panelTab === 'cast' ? 'active' : ''}`,
    id: 'ws-cast'
  }, [
    createEl('div', { class: 'wings-label', text: '\ud83d\udc65 Active Cast' }),
    createEl('div', { id: 'active-chars-list' })
  ]));

  // Debug
  body.appendChild(createEl('div', {
    class: `wings-section ${chat.panelTab === 'debug' ? 'active' : ''}`,
    id: 'ws-debug'
  }, [
    createEl('div', { class: 'wings-label', text: '\ud83d\udc1b Debug Console' }),
    createEl('div', {
      class: 'debug-console',
      id: 'debug-area',
      text: 'Persona Debug Console\nReady.\n'
    }),
    createEl('button', {
      class: 'btn btn-ghost btn-sm',
      onclick: () => { const d = document.getElementById('debug-area'); if (d) d.innerHTML = ''; }
    }, 'Clear')
  ]));

  panel.appendChild(body);
  return panel;
}

/* =========== RESTORE MESSAGES =========== */

function restoreMessages() {
  const log = document.getElementById('chat-log');
  if (!log) return;
  log.innerHTML = '';
  const chars = store.get('chat.characters');
  for (const m of store.get('chat.messages')) {
    const ch = chars.find(c => c.id === m.charId) || { id: 'narrator', name: 'Narrator', color: '#8b7355', isUser: false };
    ChatRender.renderMsg(m, ch, true);
  }
  ChatRender.scrollEnd(true);
  ChatRender.renderRels();
  ChatRender.renderCast();
  updateCPill();
  updateWhisperBar();
}

/* =========== LISTENERS =========== */

function setupInputListeners() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const whisperBtn = document.getElementById('whisper-btn');
  const improveBtn = document.getElementById('improve-btn');
  const micBtn = document.getElementById('mic-btn');
  const autoBtn = document.getElementById('auto-btn');
  const charBtn = document.getElementById('char-av-btn');

  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
      }
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', submitMessage);
  if (whisperBtn) whisperBtn.addEventListener('click', openWhisperPicker);
  if (improveBtn) improveBtn.addEventListener('click', runImprove);
  if (micBtn) micBtn.addEventListener('click', () => ChatSession.toggleSTT());
  if (autoBtn) autoBtn.addEventListener('click', toggleAuto);
  if (charBtn) charBtn.addEventListener('click', openCharPicker);
}

function setupWingsListeners() {
  const tabs = document.querySelectorAll('.wings-tab[data-tab]');
  tabs.forEach(t => {
    t.addEventListener('click', () => setWingTab(t.getAttribute('data-tab')));
  });
}

/* =========== ACTIONS =========== */

async function submitMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';

  const chat = store.get('chat');
  const isPrivate = !!chat.whisperTarget;
  const privateWith = isPrivate ? [chat.whisperTarget] : [];
  const charId = chat.activeCharId;

  await ChatCore.send(text, charId, isPrivate, privateWith);
  if (isPrivate) {
    store.set('chat.whisperTarget', null);
    updateWhisperBar();
  }
}

function openWhisperPicker() {
  const chars = store.get('chat.characters').filter(c => c.id !== store.get('chat.activeCharId'));
  if (!chars.length) { toast.warning('No other characters to whisper to'); return; }

  const content = () => createEl('div', { class: 'picker-list' }, [
    createEl('div', {
      class: `picker-item ${!store.get('chat.whisperTarget') ? 'selected' : ''}`,
      onclick: () => { store.set('chat.whisperTarget', null); updateWhisperBar(); }
    }, [
      createEl('div', {}, [
        createEl('div', { style: 'font-weight:600', text: '\ud83c\udf10 Public' }),
        createEl('div', { class: 'meta', text: 'Everyone can see this message' })
      ])
    ]),
    ...chars.map(c => createEl('div', {
      class: `picker-item ${store.get('chat.whisperTarget') === c.id ? 'selected' : ''}`,
      onclick: () => { store.set('chat.whisperTarget', c.id); updateWhisperBar(); }
    }, [
      createEl('div', { style: 'display:flex;align-items:center;gap:8px' }, [
        avatarEl(c, 22),
        createEl('div', {}, [
          createEl('div', { style: `font-weight:600;color:${c.color}`, text: c.name })
        ])
      ]),
      store.get('chat.whisperTarget') === c.id ? createEl('span', { style: 'color:var(--gold)', text: '\u2713' }) : null
    ]))
  ]).outerHTML;

  openModal({ title: 'Whisper To', narrow: true, content });
}

function updateWhisperBar() {
  const bar = document.getElementById('whisper-bar');
  if (!bar) return;
  const target = store.get('chat.whisperTarget');
  if (!target) { bar.style.display = 'none'; return; }
  const char = store.get('chat.characters').find(c => c.id === target);
  if (!char) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = '';
  bar.appendChild(createEl('span', { text: `\ud83d\udd12 Whisper to ${char.name}` }));
  bar.appendChild(createEl('button', {
    style: 'background:none;border:none;color:var(--text-muted);font-size:14px;cursor:pointer;padding:0 4px',
    text: '\u00d7',
    onclick: () => { store.set('chat.whisperTarget', null); updateWhisperBar(); }
  }));
}

async function runImprove() {
  const btn = document.getElementById('improve-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner spinner-sm"></div>`; }
  try {
    const chat = store.get('chat');
    const char = chat.characters.find(c => c.id === chat.activeCharId);
    if (!char) return;
    const text = await Ctrl.autoImprove(char, chat.scenario, chat.messages);
    if (text) {
      const ta = document.getElementById('chat-input');
      if (ta && !ta.value) {
        ta.value = text;
        ta.dispatchEvent(new Event('input'));
        ta.focus();
      }
    }
    toast.info('Suggestion ready \u2014 edit then send');
  } catch (err) {
    toast.error('Auto-improve failed: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = iconEl('magic', 15).outerHTML; }
  }
}

async function runCtrlNow() {
  toast.info('Running Main Controller...');
  const chat = store.get('chat');
  const r = await Ctrl.runMain(chat.scenario, chat.characters, chat.messages, chat.rels);
  if (r) {
    await db.put('relationships', { scenarioId: chat.scenId, matrix: chat.rels });
    toast.success('Analysis complete');
    ChatRender.renderRels();
  } else toast.error('Controller failed');
}

function toggleAuto() {
  const chat = store.get('chat');
  if (chat.autoChatRunning) ChatSession.stopAuto();
  else ChatSession.startAuto();
  updateAutoBtn(chat.autoChatRunning);
}

function updateAutoBtn(running) {
  const btn = document.getElementById('auto-btn');
  if (!btn) return;
  btn.innerHTML = running
    ? iconEl('pause', 13).outerHTML + ' Pause'
    : iconEl('play', 13).outerHTML + ' Auto';
}

function openCharPicker() {
  const chars = store.get('chat.characters');
  const content = () => createEl('div', { class: 'picker-list' },
    chars.map(c => createEl('div', {
      class: `picker-item ${c.id === store.get('chat.activeCharId') ? 'selected' : ''}`,
      onclick: () => { selectChar(c.id); }
    }, [
      createEl('div', { style: 'display:flex;align-items:center;gap:8px' }, [
        avatarEl(c, 22),
        createEl('div', {}, [
          createEl('div', { style: `font-weight:600;color:${c.color}`, text: c.name }),
          c.isUser ? createEl('span', { class: 'pill pill-gold', style: 'font-size:10px', text: 'You' }) : null
        ])
      ]),
      c.id === store.get('chat.activeCharId') ? createEl('span', { style: 'color:var(--gold)', text: '\u2713' }) : null
    ]))
  ).outerHTML;

  openModal({ title: 'Play As Character', narrow: true, content });
}

function selectChar(cid) {
  store.set('chat.activeCharId', cid);
  const char = store.get('chat.characters').find(c => c.id === cid);
  if (!char) return;

  const ta = document.getElementById('chat-input');
  if (ta) ta.placeholder = `Write as ${char.name}...`;

  const avb = document.getElementById('char-av-btn');
  if (avb) { avb.innerHTML = ''; avb.appendChild(avatarEl(char, 28)); }

  updateCPill();
}

function updateCPill() {
  const el = document.getElementById('cpill');
  if (!el) return;
  const char = store.get('chat.characters').find(c => c.id === store.get('chat.activeCharId'));
  if (!char) return;
  el.innerHTML = '';
  el.appendChild(createEl('div', {
    class: 'char-badge',
    onclick: openCharPicker
  }, [
    createEl('div', { class: 'dot', style: `background:${char.color}` }),
    `Playing as `,
    createEl('strong', { style: `color:${char.color}`, text: char.name })
  ]));
}

function toggleWings() {
  store.set('chat.panelOpen', !store.get('chat.panelOpen'));
  document.getElementById('wings')?.classList.toggle('collapsed', !store.get('chat.panelOpen'));
}

function setWingTab(tab) {
  store.set('chat.panelTab', tab);
  document.querySelectorAll('.wings-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tab));
  document.querySelectorAll('.wings-section').forEach(s => s.classList.toggle('active', s.id === `ws-${tab}`));
}
