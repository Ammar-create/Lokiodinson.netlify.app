import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { toast } from '../ui/toast.js';
import { prompt, confirm } from '../ui/modal.js';
import * as ChatCore from './chat-core.js';
import * as Ctrl from './controllers.js';

let _recorder = null;
let _chunks = [];
let _stream = null;

export async function startAuto() {
  ChatCore.startAuto();
}

export function stopAuto() {
  ChatCore.stopAuto();
}

export async function saveSession() {
  const chat = store.get('chat');
  const name = await prompt('Save name:', { title: 'Save Chat Session', placeholder: `${chat.scenario?.name || 'session'} - ${new Date().toLocaleDateString()}`, ok: 'Save' });
  if (!name) return;
  const data = {
    _persona: true, version: 1, name, savedAt: Date.now(),
    scenario: chat.scenario, characters: chat.characters, messages: chat.messages,
    rels: chat.rels, charMems: chat.charMems
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success('Chat saved');
}

export async function loadSession() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data._persona) { toast.error('Not a Persona file'); return; }
      if (data.scenario) store.set('chat.scenario', data.scenario);
      if (data.characters && data.characters.length) store.set('chat.characters', data.characters);
      if (data.charMems) store.set('chat.charMems', data.charMems);
      store.set('chat.messages', data.messages || []);
      store.set('chat.rels', data.rels || {});
      // Re-render
      const log = document.getElementById('chat-log');
      if (log) {
        log.innerHTML = '';
        const chars = store.get('chat.characters');
        for (const m of store.get('chat.messages')) {
          const ch = chars.find(c => c.id === m.charId);
          if (ch) ChatRender.renderMsg(m, ch, true);
        }
      }
      ChatRender.renderRels?.();
      ChatRender.renderCast?.();
      toast.success(`Loaded: "${data.name}"`);
    } catch { toast.error('Load failed'); }
  };
  inp.click();
}

export async function startSTT() {
  if (store.get('chat.sttRecording')) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _stream = stream;
    _chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    _recorder = recorder;
    recorder.ondataavailable = e => { if (e.data.size > 0) _chunks.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      _stream = null;
      if (!_chunks.length) return;
      const blob = new Blob(_chunks, { type: 'audio/webm' });
      _chunks = [];
      const micBtn = document.getElementById('mic-btn');
      if (micBtn) { micBtn.disabled = true; micBtn.innerHTML = '<div class="spinner spinner-sm"></div>'; }
      try {
        toast.info('Transcribing...');
        const text = await api.transcribe(blob);
        const ta = document.getElementById('chat-input');
        if (ta && text) {
          ta.value = (ta.value ? ta.value + ' ' : '') + text;
          resizeTextarea(ta);
          ta.focus();
        }
        toast.success('Transcribed');
      } catch (err) {
        toast.error('Transcription failed: ' + err.message);
        Ctrl.dlog(`STT error: ${err.message}`, 'error');
      } finally {
        if (micBtn) { micBtn.disabled = false; micBtn.innerHTML = `<svg class="icon" style="width:15px;height:15px"><use href="assets/icons.svg#mic"/></svg>`; }
      }
    };
    recorder.start();
    store.set('chat.sttRecording', true);
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) { micBtn.classList.add('recording'); micBtn.innerHTML = `<svg class="icon" style="width:15px;height:15px"><use href="assets/icons.svg#stop"/></svg>`; }
    toast.info('Recording... click again to stop');
  } catch (err) {
    toast.error('Microphone access denied');
    Ctrl.dlog(`STT mic error: ${err.message}`, 'error');
  }
}

export function stopSTT() {
  if (!store.get('chat.sttRecording') || !_recorder) return;
  _recorder.stop();
  store.set('chat.sttRecording', false);
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) { micBtn.classList.remove('recording'); micBtn.innerHTML = `<svg class="icon" style="width:15px;height:15px"><use href="assets/icons.svg#mic"/></svg>`; }
}

export function toggleSTT() {
  if (store.get('chat.sttRecording')) stopSTT();
  else startSTT();
}

function resizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
