import { createEl, esc, uid, fmtTime } from '../core/dom.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { api } from '../services/api.js';
import { toast } from '../ui/toast.js';
import { confirm } from '../ui/modal.js';
import { iconEl } from '../ui/icons.js';
import { avatarEl } from '../ui/avatar.js';
import { avatarElFromChar } from './chat-render.js';
import * as Ctrl from './controllers.js';
import * as ChatRender from './chat-render.js';

export async function initChatState(scenId) {
  const existing = store.get('chat.scenId');
  if (existing && store.get('chat.autoChatRunning')) {
    stopAuto();
    await sleep(200);
  }

  const scenario = await db.get('scenarios', scenId);
  if (!scenario) { toast.error('Scenario not found'); return false; }

  const chars = [];
  for (const cid of scenario.characterIds || []) {
    const c = await db.get('characters', cid);
    if (c) {
      chars.push({
        ...c,
        emotionalState: c.emotionalState || 'neutral',
        moodNotes: c.moodNotes || '',
        systemInjection: c.systemInjection || ''
      });
    }
  }

  for (const c of chars) {
    if (c.modelId && !window.MODELS?.find(m => m.id === c.modelId)) {
      Ctrl.dlog(`Migrated ${c.name} to openai-fast`, 'warn');
      c.modelId = 'openai-fast';
      await db.put('characters', c);
    }
  }

  let msgs = await db.getByIndex('messages', 'scenarioId', scenId);
  msgs.sort((a, b) => a.timestamp - b.timestamp);

  if (!msgs.length && scenario.openingMessage) {
    const opening = {
      id: 'opening-' + scenId, scenarioId: scenId, charId: 'narrator',
      content: scenario.openingMessage, timestamp: Date.now(), isUser: false
    };
    msgs.push(opening);
    await db.put('messages', opening);
  }

  const relData = await db.get('relationships', scenId);
  const allChars = await db.getAll('characters');
  const userChar = allChars.find(c => c.isUser);

  const unified = scenario.unifiedMemory === true;
  await Ctrl.loadMemories(scenId, chars, unified);

  store.set('chat', {
    scenId, scenario, characters: chars, messages: msgs, rels: relData?.matrix || {},
    activeCharId: userChar?.id || chars[0]?.id || null,
    autoChatRunning: false, autoChatStop: false, msgSinceCtrl: 0,
    panelOpen: window.innerWidth > 900, panelTab: 'directive',
    directive: { next: '', details: '' }, debugLog: [],
    sending: false, controllerRunning: false, sttRecording: false,
    whisper: false, whisperWith: [], whisperTarget: null,
    charMems: store.get('chat.charMems') || {}
  });

  return true;
}

export async function send(content, charId, isPrivate = false, privateWith = []) {
  if (!content.trim()) return;
  if (store.get('chat.sending')) { toast.warning('Still processing...'); return; }
  store.set('chat.sending', true);

  try {
    const char = store.get('chat.characters').find(c => c.id === charId);
    if (!char) return;

    const msg = {
      id: uid(), scenarioId: store.get('chat.scenId'), charId,
      content: content.trim(), timestamp: Date.now(), isUser: !!char.isUser,
      isPrivate, privateWith
    };

    const chat = store.get('chat');
    chat.messages.push(msg);
    await db.put('messages', msg);

    const log = document.getElementById('chat-log');
    if (log) {
      ChatRender.renderMsg(msg, char, true);
      ChatRender.scrollEnd();
    }

    const unified = chat.scenario?.unifiedMemory === true;
    await Ctrl.addMemory(char.id, chat.scenId, `I said: "${content.trim().slice(0, 150)}"`, 'witnessed', unified);

    for (const other of chat.characters) {
      if (other.id !== charId) {
        if (!isPrivate || privateWith.includes(other.id)) {
          await Ctrl.addMemory(other.id, chat.scenId, `${char.name} said: "${content.trim().slice(0, 100)}"`, 'witnessed', unified);
        }
      }
    }

    const whisperResp = isPrivate && privateWith.length ? privateWith[0] : null;
    await doResponses(charId, true, whisperResp);
  } finally {
    store.set('chat.sending', false);
  }
}

export async function doResponses(excludeId, skipGuard = false, onlyCharId = null) {
  const chat = store.get('chat');
  let responders = chat.characters.filter(c => c.id !== excludeId && !c.isUser);
  if (onlyCharId) responders = responders.filter(c => c.id === onlyCharId);
  if (!responders.length) return;

  for (const c of responders) {
    if (chat.autoChatStop) break;
    if (!skipGuard && chat.sending && !chat.autoChatRunning) break;
    const visible = filterVisible(chat.messages, c.id);
    await genResponse(c, visible);
    if (chat.autoChatStop) break;
  }
}

export async function genResponse(char, visibleMessages) {
  if (!char) return;
  const chat = store.get('chat');
  const tid = `th-${char.id}-${Date.now()}`;
  let msgId;
  ChatRender.addThinking(tid, char);
  ChatRender.scrollEnd();

  try {
    const msgs = visibleMessages || filterVisible(chat.messages, char.id);
    const sys = Ctrl.buildSysPrompt(char, chat.scenario, msgs, chat.rels);
    const hist = Ctrl.buildConvo(char, msgs, chat.characters);
    const model = char.modelId || store.get('settings.charModel') || 'openai-fast';
    Ctrl.dlog(`Generating for ${char.name} (${model})...`, 'info');

    msgId = uid();
    const el = ChatRender.createStreamEl(msgId, char);
    document.getElementById(tid)?.remove();

    let full = '';
    await api.stream([{ role: 'system', content: sys }, ...hist], model, (chunk, done) => {
      full += chunk;
      if (el) ChatRender.updateStreamEl(el, char, full, done);
      ChatRender.scrollEnd();
    }, { temp: 0.93 });

    ChatRender.finalizeEl(el, msgId);

    const msg = {
      id: msgId, scenarioId: chat.scenId, charId: char.id,
      content: full, timestamp: Date.now(), isUser: false
    };
    chat.messages.push(msg);
    await db.put('messages', msg);

    const unified = chat.scenario?.unifiedMemory === true;
    await Ctrl.addMemory(char.id, chat.scenId, `I said: "${full.slice(0, 150)}"`, 'witnessed', unified);
    for (const other of chat.characters) {
      if (other.id !== char.id) {
        if (!msg.isPrivate || !msg.privateWith || msg.privateWith.includes(other.id)) {
          await Ctrl.addMemory(other.id, chat.scenId, `${char.name} said: "${full.slice(0, 100)}"`, 'witnessed', unified);
        }
      }
    }

    store.set('chat.msgSinceCtrl', chat.msgSinceCtrl + 1);
    const freq = chat.scenario?.settings?.controllerFreq || store.get('settings.ctrlFreq') || 10;
    if (store.get('chat.msgSinceCtrl') >= freq) {
      store.set('chat.msgSinceCtrl', 0);
      if (!store.get('chat.controllerRunning')) {
        store.set('chat.controllerRunning', true);
        try {
          await Ctrl.runMain(chat.scenario, chat.characters, chat.messages, chat.rels);
          await db.put('relationships', { scenarioId: chat.scenId, matrix: chat.rels });
        } catch (err) {
          Ctrl.dlog(`Controller failed: ${err.message}`, 'error');
        } finally {
          store.set('chat.controllerRunning', false);
        }
      }
    }

    if (chat.scenario?.settings?.autoImage) {
      try {
        let imgPrompt;
        try {
          const imgData = await Ctrl.genImagePrompt(msg, char, chat.scenario);
          imgPrompt = imgData?.prompt || `${char.appearance || ''}, ${full.replace(/\*[^*]+\*/g, '').replace(/"[^"]+"/g, '').trim().slice(0, 200)}`;
        } catch {
          imgPrompt = `${char.appearance || ''}, ${full.replace(/\*[^*]+\*/g, '').replace(/"[^"]+"/g, '').trim().slice(0, 200)}`;
        }
        const imgModel = store.get('settings.imgModel') || 'flux';
        const imgUrl = await api.generateImageUrl(imgPrompt, 512, 512, imgModel);
        const mb = el.querySelector('.msg-body');
        if (mb) {
          const img = createEl('img', { class: 'msg-media', src: imgUrl, loading: 'lazy', onclick: () => window.open(imgUrl) });
          mb.appendChild(img);
        }
        msg.imageUrl = imgUrl;
        await db.put('messages', msg);
      } catch {}
    }

    Ctrl.dlog(`${char.name} responded`, 'ok');
  } catch (err) {
    document.getElementById(tid)?.remove();
    if (msgId) {
      const partial = document.getElementById(`msg-${msgId}`);
      if (partial) {
        const mb = partial.querySelector('.msg-body');
        if (mb) {
          mb.classList.remove('streaming');
          if (!mb.textContent.trim()) partial.remove();
        }
      }
    }
    toast.error(`${char.name} failed: ${err.message}`);
    Ctrl.dlog(`${char.name} error: ${err.message}`, 'error');
  }
}

export function filterVisible(messages, charId) {
  return messages.filter(m => {
    if (m.isPrivate) {
      if (m.privateWith && m.privateWith.length) return m.charId === charId || m.privateWith.includes(charId);
      return m.charId === charId;
    }
    return true;
  });
}

export async function startAuto() {
  const chat = store.get('chat');
  if (chat.autoChatRunning) return;
  store.set('chat.autoChatRunning', true);
  store.set('chat.autoChatStop', false);

  const startedScenId = chat.scenId;
  updateAutoBtn(true);
  toast.info('Auto-chat started');

  const chars = chat.characters.filter(c => !c.isUser);
  while (!store.get('chat.autoChatStop')) {
    if (store.get('chat.scenId') !== startedScenId) break;
    if (!chars.length) break;
    if (store.get('chat.sending') || store.get('chat.controllerRunning')) { await sleep(500); continue; }

    const msgs = store.get('chat.messages');
    const last = msgs[msgs.length - 1];
    const li = last ? chars.findIndex(c => c.id === last.charId) : -1;
    const next = chars[(li + 1) % chars.length];
    const visible = filterVisible(msgs, next.id);
    await genResponse(next, visible);
    if (store.get('chat.autoChatStop')) break;
    await sleep(1200);
  }

  store.set('chat.autoChatRunning', false);
  updateAutoBtn(false);
}

export function stopAuto() {
  store.set('chat.autoChatStop', true);
  store.set('chat.autoChatRunning', false);
  updateAutoBtn(false);
  toast.info('Auto-chat paused');
}

function updateAutoBtn(running) {
  const btn = document.getElementById('auto-btn');
  if (!btn) return;
  btn.classList.toggle('active', running);
  btn.innerHTML = running ? `${iconEl('pause', 13).outerHTML} Pause` : `${iconEl('play', 13).outerHTML} Auto`;
}

// Audio player
export function apToggle(pid) {
  const el = document.getElementById(pid);
  if (!el) return;
  let audio = el._audio;
  if (!audio) {
    audio = new Audio(el.dataset.src);
    el._audio = audio;
    audio.ontimeupdate = () => {
      const fill = el.querySelector('.ap-fill');
      const time = el.querySelector('.ap-time');
      if (fill) fill.style.width = (audio.currentTime / audio.duration * 100 || 0) + '%';
      if (time) time.textContent = fmtAudioTime(audio.currentTime);
    };
    audio.onended = () => {
      el.querySelector('.ap-btn').textContent = '\u25b6';
      el.querySelector('.ap-fill').style.width = '0%';
    };
  }
  if (audio.paused) {
    document.querySelectorAll('.audio-player').forEach(p => { if (p.id !== pid && p._audio && !p._audio.paused) { p._audio.pause(); p.querySelector('.ap-btn').textContent = '\u25b6'; } });
    audio.play();
    el.querySelector('.ap-btn').textContent = '\u23f8';
  } else {
    audio.pause();
    el.querySelector('.ap-btn').textContent = '\u25b6';
  }
}

export function apSeek(event, pid) {
  const el = document.getElementById(pid);
  if (!el || !el._audio || !el._audio.duration) return;
  const bar = event.currentTarget;
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  el._audio.currentTime = pct * el._audio.duration;
}

function fmtAudioTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
