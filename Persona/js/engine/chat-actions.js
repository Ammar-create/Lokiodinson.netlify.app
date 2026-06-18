import { db } from '../services/db.js';
import { store } from '../core/store.js';
import { api } from '../services/api.js';
import { toast } from '../ui/toast.js';
import { confirm } from '../ui/modal.js';
import * as Ctrl from './controllers.js';
import * as ChatRender from './chat-render.js';
import * as ChatCore from './chat-core.js';

export async function img(msgId) {
  const msgs = store.get('chat.messages');
  const msg = msgs.find(m => m.id === msgId);
  const char = msg ? store.get('chat.characters').find(c => c.id === msg.charId) : null;
  if (!msg || !char) return;
  toast.info('Generating image...');
  try {
    let prompt;
    try {
      const imgData = await Ctrl.genImagePrompt(msg, char, store.get('chat.scenario'));
      prompt = imgData?.prompt || `${char.appearance || ''}, ${msg.content.replace(/\*[^*]+\*/g, '').replace(/"[^"]+"/g, '').trim().slice(0, 200)}`;
    } catch {
      prompt = `${char.appearance || ''}, ${msg.content.replace(/\*[^*]+\*/g, '').replace(/"[^"]+"/g, '').trim().slice(0, 200)}`;
    }
    const url = api.imageUrl(prompt);
    const mb = document.querySelector(`#msg-${msgId} .msg-body`);
    if (mb) {
      const img = document.createElement('img');
      img.className = 'msg-media';
      img.src = url;
      img.loading = 'lazy';
      img.onclick = () => window.open(url);
      mb.appendChild(img);
    }
    msg.imageUrl = url;
    await db.put('messages', msg);
    toast.success('Image generated');
  } catch (err) { toast.error('Image failed: ' + err.message); }
}

export async function voice(msgId) {
  const msgs = store.get('chat.messages');
  const msg = msgs.find(m => m.id === msgId);
  const char = msg ? store.get('chat.characters').find(c => c.id === msg.charId) : null;
  if (!msg || !char) return;
  toast.info('Generating voice...');
  try {
    const text = msg.content.replace(/\*[^*]+\*/g, '').replace(/"/g, '').trim();
    const voice = char.voice || store.get('settings.defVoice') || 'nova';
    const audioUrl = await api.tts(text, voice);
    const mb = document.querySelector(`#msg-${msgId} .msg-body`);
    if (mb) {
      mb.querySelector('.audio-player')?.remove();
      const div = document.createElement('div');
      div.innerHTML = audioPlayerHtml(audioUrl);
      mb.appendChild(div.firstElementChild);
      ChatCore.apToggle(div.firstElementChild.id);
    }
    msg.audioUrl = audioUrl;
    await db.put('messages', msg);
    toast.success('Voice generated');
  } catch (err) { toast.error('Voice failed: ' + err.message); }
}

export async function regen(msgId) {
  const msgs = store.get('chat.messages');
  const idx = msgs.findIndex(m => m.id === msgId);
  if (idx < 0) return;
  const msg = msgs[idx];
  const char = store.get('chat.characters').find(c => c.id === msg.charId);
  if (!char) return;
  const ok = await confirm('Regenerate this message? Current version will be lost.', { ok: 'Regenerate' });
  if (!ok) return;

  msgs.splice(idx, 1);
  await db.del('messages', msgId);
  document.getElementById(`msg-${msgId}`)?.remove();

  const visible = ChatCore.filterVisible(msgs, char.id);
  await ChatCore.genResponse(char, visible);
}

export async function branch(msgId) {
  const msgs = store.get('chat.messages');
  const idx = msgs.findIndex(m => m.id === msgId);
  if (idx < 0) return;
  const ok = await confirm('Create a branch from this message point?', { ok: 'Branch Here' });
  if (!ok) return;

  const chat = store.get('chat');
  const base = chat.scenario?.name || 'Scenario';
  const allScens = await db.getAll('scenarios');
  const bc = allScens.filter(s => s.parentId === chat.scenId).length;
  const bname = `${base}-${bc + 2}`;
  const bs = { ...chat.scenario, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name: bname, parentId: chat.scenId, messageIds: [], summary: '', createdAt: Date.now(), updatedAt: Date.now() };
  await db.put('scenarios', bs);

  for (const m of msgs.slice(0, idx + 1)) {
    const newMsg = { ...m, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), scenarioId: bs.id };
    await db.put('messages', newMsg);
  }

  if (chat.rels && Object.keys(chat.rels).length) {
    await db.put('relationships', { scenarioId: bs.id, matrix: { ...chat.rels } });
  }

  for (const char of chat.characters) {
    const memKey = `${char.id}_${chat.scenId}`;
    const mems = chat.charMems?.[memKey];
    if (mems && mems.length) {
      const newMemKey = `${char.id}_${bs.id}`;
      const copied = mems.map(m => ({ ...m, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), scenId: bs.id }));
      await db.put('memories', { id: newMemKey, charId: char.id, scenId: bs.id, events: copied });
    }
  }

  toast.success(`Branch "${bname}" created`);
  const go = await confirm(`Branch "${bname}" created. Open it?`, { ok: 'Open Branch' });
  if (go) {
    store.set('chat.scenId', bs.id);
    ChatCore.initChatState(bs.id);
  }
}

function audioPlayerHtml(src) {
  const id = 'ap-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `<div class="audio-player" id="${id}" data-src="${src}">
    <button class="ap-btn" onclick="ChatEngine.apToggle('${id}')">\u25b6</button>
    <div class="ap-track" onclick="ChatEngine.apSeek(event, '${id}')"><div class="ap-fill"></div></div>
    <span class="ap-time">0:00</span>
  </div>`;
}
