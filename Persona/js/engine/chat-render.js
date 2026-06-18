import { createEl, esc, parseRP, uid, fmtTime, sleep } from '../core/dom.js';
import { store } from '../core/store.js';

let _scrollBtn = null;

export function scrollEnd(force) {
  const l = document.getElementById('chat-log');
  if (!l) return;
  if (force || _nearBottom()) {
    l.scrollTop = l.scrollHeight;
    removeScrollBtn();
  } else {
    showScrollBtn();
  }
}

function _nearBottom() {
  const l = document.getElementById('chat-log');
  if (!l) return true;
  return (l.scrollHeight - l.scrollTop - l.clientHeight) <= 200;
}

function showScrollBtn() {
  if (_scrollBtn) return;
  const log = document.getElementById('chat-log');
  if (!log) return;
  const parent = log.parentElement;
  if (!parent) return;
  _scrollBtn = createEl('button', {
    class: 'scroll-to-bottom',
    onclick: () => scrollEnd(true)
  }, '\u2193 New');
  parent.appendChild(_scrollBtn);
}

function removeScrollBtn() {
  if (_scrollBtn) { _scrollBtn.remove(); _scrollBtn = null; }
}

export function addThinking(tid, char) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const el = createEl('div', { class: 'msg', id: tid }, [
    createEl('div', { class: 'msg-hdr' }, [
      avatarElFromChar(char, 26),
      createEl('span', { class: 'msg-name', style: `color:${char.color}`, text: char.name })
    ]),
    createEl('div', { class: 'msg-body', style: `--msg-color:${char.color}` }, [
      createEl('div', { class: 'thinking' }, [
        createEl('span', null, ''),
        createEl('span', null, ''),
        createEl('span', null, '')
      ])
    ])
  ]);
  log.appendChild(el);
}

export function createStreamEl(msgId, char) {
  const log = document.getElementById('chat-log');
  if (!log) return null;
  const el = createEl('div', { class: 'msg', id: `msg-${msgId}` }, [
    createEl('div', { class: 'msg-hdr' }, [
      avatarElFromChar(char, 26),
      createEl('span', { class: 'msg-name', style: `color:${char.color}`, text: char.name }),
      createEl('span', { class: 'msg-time', text: fmtTime(Date.now()) })
    ]),
    createEl('div', { class: 'msg-body streaming', id: `mb-${msgId}`, style: `--msg-color:${char.color}` })
  ]);
  log.appendChild(el);
  return el;
}

export function updateStreamEl(el, char, text, done) {
  if (!el) return;
  const mb = el.querySelector('[id^="mb-"]') || el.querySelector('.msg-body');
  if (!mb) return;
  mb.innerHTML = parseRP(text, char.color);
  if (done) mb.classList.remove('streaming');
}

export function finalizeEl(el, msgId) {
  if (!el) return;
  const mb = el.querySelector('.msg-body');
  if (mb) mb.classList.remove('streaming');
  const ar = createEl('div', { class: 'msg-toolbar' }, [
    createEl('button', { class: 'msg-tool', onclick: () => window.CA?.img(msgId) }, [iconEl('image', 10), ' Image']),
    createEl('button', { class: 'msg-tool', onclick: () => window.CA?.voice(msgId) }, [iconEl('voice', 10), ' Voice']),
    createEl('button', { class: 'msg-tool', onclick: () => window.CA?.regen(msgId) }, [iconEl('regen', 10), ' Regen']),
    createEl('button', { class: 'msg-tool', onclick: () => window.CA?.branch(msgId) }, [iconEl('branch', 10), ' Branch'])
  ]);
  el.appendChild(ar);
}

export function renderMsg(msg, char, withActions = false) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const isUser = char.isUser;
  const isPrivate = msg.isPrivate;

  const el = createEl('div', {
    class: `msg${isUser ? ' msg-user' : ''}${isPrivate ? ' msg-private' : ''}`,
    id: `msg-${msg.id}`
  });

  const hdr = createEl('div', { class: 'msg-hdr' });
  if (!isUser) {
    hdr.appendChild(avatarElFromChar(char, 26));
    hdr.appendChild(createEl('span', { class: 'msg-name', style: `color:${char.color}`, text: char.name }));
  } else {
    hdr.appendChild(createEl('span', { class: 'msg-time', text: fmtTime(msg.timestamp) }));
    hdr.appendChild(createEl('span', { class: 'msg-name', style: `color:${char.color}`, text: char.name }));
    hdr.appendChild(avatarElFromChar(char, 26));
  }
  if (isPrivate) {
    hdr.insertBefore(createEl('span', { style: 'font-size:10px;color:var(--gold)', text: ' whisper' }), hdr.lastChild);
  }

  const body = createEl('div', {
    class: 'msg-body',
    style: `--msg-color:${char.color}`,
    html: parseRP(msg.content, char.color) +
      (msg.imageUrl ? `<img class="msg-media" src="${esc(msg.imageUrl)}" loading="lazy" onclick="window.open('${esc(msg.imageUrl)}')">` : '') +
      (msg.audioUrl ? audioPlayerHtml(msg.audioUrl) : '')
  });

  el.appendChild(hdr);
  el.appendChild(body);

  if (withActions) {
    const ar = createEl('div', { class: 'msg-toolbar' }, [
      createEl('button', { class: 'msg-tool', onclick: () => window.CA?.img(msg.id) }, [iconEl('image', 10), ' Image']),
      createEl('button', { class: 'msg-tool', onclick: () => window.CA?.voice(msg.id) }, [iconEl('voice', 10), ' Voice']),
      createEl('button', { class: 'msg-tool', onclick: () => window.CA?.regen(msg.id) }, [iconEl('regen', 10), ' Regen']),
      createEl('button', { class: 'msg-tool', onclick: () => window.CA?.branch(msg.id) }, [iconEl('branch', 10), ' Branch'])
    ]);
    el.appendChild(ar);
  }

  log.appendChild(el);
  return el;
}

export function addCtrlMsg(text) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const el = createEl('div', { class: 'msg msg-system' }, [
    createEl('div', { class: 'msg-hdr' }, [
      createEl('div', { class: 'msg-av', style: 'background:var(--rail);color:var(--text-muted);font-size:10px', text: '\u2699' }),
      createEl('span', { class: 'msg-name', style: 'color:var(--text-muted);font-size:10px', text: 'System' })
    ]),
    createEl('div', { class: 'msg-body', text })
  ]);
  log.appendChild(el);
  scrollEnd();
}

export function renderRels() {
  const c = document.getElementById('rel-container');
  if (!c) return;
  const entries = Object.values(store.get('chat.rels'));
  if (!entries.length) {
    c.innerHTML = `<p style="color:var(--text-muted);font-size:12px">No relationships tracked yet.</p>`;
    return;
  }
  c.innerHTML = '';
  c.appendChild(createEl('div', null, entries.map(r => createEl('div', { class: 'rel-card' }, [
    createEl('div', { class: 'rel-pair', text: `${esc(r.fromName || r.fromId)} \u2192 ${esc(r.toName || r.toId)}` }),
    createEl('div', { style: 'display:flex;align-items:center;gap:8px' }, [
      createEl('span', {
        class: `rel-mood ${r.mood === 'positive' || r.mood === 'romantic' ? (r.mood === 'romantic' ? 'rom' : 'pos') : r.mood === 'negative' ? 'neg' : 'neu'}`,
        text: r.mood || 'neutral'
      }),
      createEl('span', { style: 'font-size:11px;color:var(--text-muted)', text: `${r.intensity || 5}/10` })
    ]),
    createEl('div', { class: 'rel-reason', text: esc(r.reason || '') })
  ]))));
}

export function renderCast() {
  const c = document.getElementById('active-chars-list');
  if (!c) return;
  const chars = store.get('chat.characters');
  c.innerHTML = '';
  c.appendChild(createEl('div', null, chars.map(ch => createEl('div', { class: 'cast-member' }, [
    avatarElFromChar(ch, 24),
    createEl('div', { style: 'flex:1' }, [
      createEl('div', { style: `font-size:12px;color:${ch.color};font-weight:600`, text: ch.name }),
      createEl('div', { style: 'font-size:11px;color:var(--text-muted)', text: ch.emotionalState || 'neutral' })
    ]),
    ch.isUser ? createEl('span', { class: 'pill pill-gold', style: 'font-size:10px', text: 'You' }) : null
  ]))));
}

export function setupScrollWatcher() {
  const log = document.getElementById('chat-log');
  if (!log) return;
  log.addEventListener('scroll', () => {
    if (_nearBottom()) removeScrollBtn();
  });
}

export function avatarElFromChar(char, size) {
  const st = `width:${size}px;height:${size}px;border-radius:50%;background:${char.color}22;border:2px solid ${char.color};display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size * 0.38)}px;font-weight:700;font-family:var(--font-display);color:${char.color};overflow:hidden;flex-shrink:0;`;
  if (char.avatar) {
    const wrapper = createEl('div', { class: 'msg-av', style: st });
    const img = createEl('img', { src: char.avatar, style: 'width:100%;height:100%;object-fit:cover', alt: char.name });
    wrapper.appendChild(img);
    return wrapper;
  }
  return createEl('div', { class: 'msg-av', style: `${st};font-size:${Math.floor(size * 0.45)}px`, text: char.name?.[0]?.toUpperCase() || '?' });
}

function audioPlayerHtml(src) {
  const pid = 'ap-' + uid();
  return `<div class="audio-player" id="${pid}" data-src="${esc(src)}">
    <button class="ap-btn" onclick="ChatEngine.apToggle('${pid}')">\u25b6</button>
    <div class="ap-track" onclick="ChatEngine.apSeek(event, '${pid}')"><div class="ap-fill"></div></div>
    <span class="ap-time">0:00</span>
  </div>`;
}

function iconEl(name, size) {
  const div = document.createElement('div');
  div.innerHTML = `<svg class="icon" style="width:${size}px;height:${size}px" aria-hidden="true"><use href="assets/icons.svg#${name}"/></svg>`;
  return div.firstElementChild;
}
