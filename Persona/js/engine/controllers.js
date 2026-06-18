import { api } from '../services/api.js';
import { store } from '../core/store.js';
import { db } from '../services/db.js';
import { esc } from '../core/dom.js';

/* Internal */
export async function withTimeout(promise, ms = 30000) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error('Controller timeout')), ms);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}

export function dlog(msg, type = 'info') {
  const chat = store.raw().chat;
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  chat.debugLog.push({ entry, type });
  if (chat.debugLog.length > 200) chat.debugLog.shift();
  const area = document.getElementById('debug-area');
  if (area) {
    const cls = type === 'error' ? 'log-err' : type === 'ok' ? 'log-ok' : type === 'warn' ? 'log-warn' : 'log-info';
    area.innerHTML += `\u003cspan class="${cls}"\u003e${esc(entry)}\n\u003c/span\u003e`;
    const kids = area.children;
    if (kids.length > 500) { for (let i = 0; i < 100 && kids.length > 0; i++) kids[0].remove(); }
    area.scrollTop = area.scrollHeight;
  }
}

/* Prompt builders */
export function buildSysPrompt(char, scenario, messages, rels) {
  const s = store.raw().settings;
  const chat = store.raw().chat;
  const stw = s.stWindow || 30;
  const recent = messages.slice(-stw);
  const relCtx = Object.entries(rels || {})
    .filter(([k]) => k.startsWith(char.id + '\u2192'))
    .map(([, r]) => `  \u2022 Toward ${r.toName || r.toId}: ${r.mood || 'neutral'} (${r.intensity || 5}/10) \u2014 ${r.reason || ''}`)
    .join('\n');
  const cast = chat.characters.map(c => c.name).join(', ');
  const isUnified = scenario?.unifiedMemory === true;
  const memKey = isUnified ? `${char.id}_global` : `${char.id}_${chat.scenId}`;
  const mems = chat.charMems?.[memKey] || [];
  const memCtx = mems.length
    ? `\nYOUR PRIVATE MEMORIES (things you personally witnessed/felt \u2014 only you know these):\n${mems.slice(-20).map(m => `- [${m.type}] ${m.content}`).join('\n')}`
    : '';
  return `You are ${char.name}. You are NOT an AI assistant \u2014 you are this character, fully immersed in the roleplay. Never break character. Never admit you are an AI.\n\nSCENARIO: ${scenario.name}\nSETTING: ${scenario.lore || 'Unspecified setting.'}\nYOUR PERSONALITY: ${char.personality || 'No specific personality.'}\nYOUR APPEARANCE: ${char.appearance || 'No specific appearance.'}\nYOUR CURRENT MOOD: ${char.emotionalState || 'neutral'}\nMOOD NOTES: ${char.moodNotes || 'None'}\n${relCtx ? `\nYOUR RELATIONSHIPS:\n${relCtx}` : ''}\n${scenario.summary ? `\nSTORY SO FAR: ${scenario.summary}` : ''}\nOTHERS PRESENT: ${cast}\n${memCtx}\n\nFORMAT: Use *italics* for actions, "quotes" for dialogue. Mix freely: *smirks* "Is that so?"\nBe natural, immersive, authentic to your personality. Vary response length based on the scene.\n${scenario.settings?.aiKnowsUser === false ? 'You do not know which participant is the real human. Treat everyone as characters.' : ''}\n${char.systemInjection ? `\n[PRIVATE DIRECTOR NOTE - only you see this]: ${char.systemInjection}` : ''}\n${chat.directive.next ? `\n[STORY DIRECTION]: ${chat.directive.next}` : ''}`;
}

export function buildConvo(char, messages, chars) {
  const s = store.raw().settings;
  const stw = s.stWindow || 30;
  const recent = messages.slice(-stw);
  const hist = [];
  for (const m of recent) {
    if (m.charId === char.id) hist.push({ role: 'assistant', content: m.content });
    else {
      const spk = chars.find(c => c.id === m.charId);
      hist.push({ role: 'user', content: `${spk?.name || 'Unknown'}: ${m.content}` });
    }
  }
  if (!hist.length) hist.push({ role: 'user', content: '[The scene begins.]' });
  return hist;
}

/* Main Controller */
export async function runMain(scenario, chars, messages, rels) {
  const model = store.raw().settings.ctrlModel || 'openai';
  dlog(`Main Controller firing (${model})...`, 'info');
  const s = store.raw().settings;
  const stw = s.stWindow || 30;
  const recent = messages.slice(-stw);
  const convo = recent.map(m => {
    const c = chars.find(x => x.id === m.charId);
    return `${c?.name || '?'}: ${m.content}`;
  }).join('\n');
  const charList = chars.map(c => `- ${c.name} [${c.id}] mood:${c.emotionalState || 'neutral'}`).join('\n');
  const sys = `You are the Main Controller for a roleplay scenario. Analyze the conversation, then respond ONLY with a valid JSON object \u2014 no other text, no markdown fences.\nReturn this exact structure:\n{\n  "characterUpdates":[{"charId":"id","emotionalState":"mood","moodNotes":"notes","systemInjection":"optional hidden note to inject"}],\n  "relationshipUpdates":[{"fromId":"id","toId":"id","fromName":"name","toName":"name","mood":"positive|negative|neutral|romantic|suspicious|jealous|fearful","intensity":7,"reason":"why"}],\n  "memoryUpdates":[{"charId":"id","content":"what this character witnessed or felt","type":"witnessed|felt|told"}],\n  "storySummary":"brief summary of events so far",\n  "requestScenario":false,\n  "scenarioHint":"brief hint for what the scenario controller should do next"\n}`;
  const usr = `CHARACTERS:\n${charList}\n\nCONVERSATION:\n${convo}\n\nUSER DIRECTIVE: ${store.raw().chat.directive.next || 'Continue naturally'}\nSTORY NOTES: ${store.raw().chat.directive.details || 'None'}`;
  try {
    const raw = await withTimeout(api.chat([{ role: 'system', content: sys }, { role: 'user', content: usr }], model, { temp: 0.7, maxTokens: 1500 }));
    dlog('Main Controller: response received', 'ok');
    let parsed;
    try { parsed = JSON.parse(raw.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, '').trim()); }
    catch { dlog('Main Controller: JSON parse failed', 'error'); return null; }
    const chat = store.raw().chat;
    if (parsed.characterUpdates) {
      for (const u of parsed.characterUpdates) {
        const c = chat.characters.find(x => x.id === u.charId);
        if (c) {
          c.emotionalState = u.emotionalState || c.emotionalState;
          c.moodNotes = u.moodNotes || '';
          c.systemInjection = u.systemInjection || '';
          try { await db.put('characters', { ...c, updatedAt: Date.now() }); }
          catch (err) { dlog(`Failed to persist ${c.name}: ${err.message}`, 'warn'); }
        }
      }
    }
    const unified = scenario?.unifiedMemory === true;
    if (parsed.memoryUpdates) {
      for (const mu of parsed.memoryUpdates) {
        await addMemory(mu.charId, chat.scenId, mu.content, mu.type, unified);
      }
      dlog(`Added ${parsed.memoryUpdates.length} memory entries`, 'ok');
    }
    if (parsed.relationshipUpdates) {
      for (const r of parsed.relationshipUpdates) chat.rels[`${r.fromId}\u2192${r.toId}`] = r;
      // NOTE: Caller persists relationships
    }
    if (parsed.storySummary && scenario) {
      scenario.summary = parsed.storySummary;
      const sm = document.getElementById('panel-memory');
      if (sm) sm.textContent = parsed.storySummary;
      await db.put('scenarios', scenario);
    }
    dlog(`Applied: ${parsed.characterUpdates?.length || 0} char, ${parsed.relationshipUpdates?.length || 0} rel`, 'ok');
    if (parsed.requestScenario && parsed.scenarioHint) {
      dlog('Main Controller requesting Scenario Controller...', 'info');
      setTimeout(() => runScenario(scenario, chars, messages, rels, parsed.scenarioHint), 300);
    }
    return parsed;
  } catch (err) { dlog(`Main Controller error: ${err.message}`, 'error'); return null; }
}

/* Scenario Controller */
export async function runScenario(scenario, chars, messages, rels, hint) {
  const model = store.raw().settings.ctrlModel || 'openai';
  dlog(`Scenario Controller firing (${model})...`, 'info');
  const s = store.raw().settings;
  const stw = s.stWindow || 30;
  const recent = messages.slice(-stw);
  const convo = recent.map(m => { const c = chars.find(x => x.id === m.charId); return `${c?.name || '?'}: ${m.content}`; }).join('\n');
  const charList = chars.map(c => `- ${c.name} [${c.id}] mood:${c.emotionalState || 'neutral'}`).join('\n');
  const sys = `You are the Scenario Controller for a roleplay narrative. Your job is to advance the story with surprising events, scene changes, and dramatic twists. Respond ONLY with valid JSON \u2014 no other text, no markdown fences.\n\nReturn this exact structure:\n{\n  "sceneChange": "description of new location/setting if applicable, or null",\n  "surpriseEvent": "a dramatic event (eavesdropping, arrival, discovery, weather, etc.) or null",\n  "narration": "brief narration text to display in chat as a system message, or null",\n  "characterEffects": [{"charId":"id","effect":"how this event affects them specifically"}],\n  "suggestedNext": "what might naturally happen next"\n}\n\nBe creative but consistent with the scenario tone. Events should feel organic, not forced.`;
  const usr = `SCENARIO: ${scenario.name}\nSETTING: ${scenario.lore || 'Unspecified'}\n\nCHARACTERS:\n${charList}\n\nRECENT CONVERSATION:\n${convo}\n\nHINT: ${hint || store.raw().chat.directive.next || 'Continue naturally with a surprise'}`;
  try {
    const raw = await withTimeout(api.chat([{ role: 'system', content: sys }, { role: 'user', content: usr }], model, { temp: 0.92, maxTokens: 800 }));
    dlog('Scenario Controller: response received', 'ok');
    let parsed;
    try { parsed = JSON.parse(raw.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, '').trim()); }
    catch { dlog('Scenario Controller: JSON parse failed', 'error'); return null; }
    const chat = store.raw().chat;
    if (parsed.narration) addCtrlMsg(`\u25c6 ${parsed.narration}`);
    if (parsed.sceneChange) { dlog(`Scene: ${parsed.sceneChange}`, 'ok'); addCtrlMsg(`\u25c6 Scene: ${parsed.sceneChange}`); }
    if (parsed.surpriseEvent) { dlog(`Event: ${parsed.surpriseEvent}`, 'ok'); addCtrlMsg(`\u25c6 Event: ${parsed.surpriseEvent}`); }
    const unified = scenario?.unifiedMemory === true;
    if (parsed.characterEffects) {
      for (const eff of parsed.characterEffects) {
        await addMemory(eff.charId, chat.scenId, `[Event] ${eff.effect}`, 'witnessed', unified);
        const c = chat.characters.find(x => x.id === eff.charId);
        if (c) {
          c.systemInjection = (c.systemInjection || '') + '\n' + eff.effect;
          if (c.systemInjection.length > 500) c.systemInjection = c.systemInjection.slice(-400);
          await db.put('characters', { ...c, updatedAt: Date.now() });
        }
      }
      dlog(`Applied ${parsed.characterEffects.length} effects`, 'ok');
    }
    if (parsed.suggestedNext) {
      chat.directive.details = (chat.directive.details ? chat.directive.details + '\n' : '') + `[Scenario suggests]: ${parsed.suggestedNext}`;
    }
    return parsed;
  } catch (err) { dlog(`Scenario Controller error: ${err.message}`, 'error'); return null; }
}

/* Memory */
export async function addMemory(charId, scenId, content, type = 'witnessed', unified = false) {
  const key = unified ? `${charId}_global` : `${charId}_${scenId}`;
  const chat = store.raw().chat;
  if (!chat.charMems) chat.charMems = {};
  if (!chat.charMems[key]) chat.charMems[key] = [];
  const mem = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), charId, scenId, content, type, timestamp: Date.now() };
  chat.charMems[key].push(mem);
  if (chat.charMems[key].length > 50) chat.charMems[key] = chat.charMems[key].slice(-50);
  await db.put('memories', { id: key, charId, scenId, events: chat.charMems[key] });
  return mem;
}

export async function loadMemories(scenId, chars, unified = false) {
  const chat = store.raw().chat;
  chat.charMems = {};
  for (const c of chars) {
    const key = unified ? `${c.id}_global` : `${c.id}_${scenId}`;
    const stored = await db.get('memories', key);
    if (stored?.events) chat.charMems[key] = stored.events;
  }
}

/* Creative Controller */
let _improveRunning = false;
let _improveAbort = false;

export async function runCreative(brief) {
  const model = store.raw().settings.creativeModel || store.raw().settings.ctrlModel || 'openai';
  dlog(`Creative Controller: generating character (${model})...`, 'info');
  const sys = `You are the Creative Controller. Generate a complete roleplay character from a brief description.\nRespond ONLY with valid JSON \u2014 no other text, no markdown fences:\n{"name":"Name","personality":"2-3 sentence personality","appearance":"2-3 sentence appearance","voice":"alloy|echo|fable|onyx|nova|shimmer","colorHint":"#hexcolor matching the character vibe","backstory":"brief backstory"}`;
  try {
    const raw = await withTimeout(api.chat([{ role: 'system', content: sys }, { role: 'user', content: `Create a character based on: ${brief}` }], model, { temp: 0.97, maxTokens: 800 }));
    const parsed = JSON.parse(raw.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, '').trim());
    if (!parsed.name?.trim()) parsed.name = 'Character-' + Math.random().toString(36).slice(2, 8);
    parsed.personality = parsed.personality || '';
    parsed.appearance = parsed.appearance || '';
    parsed.voice = parsed.voice || 'nova';
    parsed.colorHint = parsed.colorHint || '#d4a843';
    parsed.backstory = parsed.backstory || '';
    return parsed;
  } catch (err) { dlog('Creative Controller failed: ' + err.message, 'error'); return null; }
}

export async function createScenario(description, selectedCharacters) {
  const model = store.raw().settings.creativeModel || store.raw().settings.ctrlModel || 'openai';
  dlog(`Creative Controller: creating scenario (${model})...`, 'info');
  const charList = selectedCharacters.map(c => `- ${c.name}[${c.id}]: ${c.personality || 'No personality'}. ${c.appearance || 'No appearance'}. Mood: ${c.emotionalState || 'neutral'}`).join('\n');
  const sys = `You are the Creative Controller. Generate a complete roleplay scenario based on a description and available characters.\nRespond ONLY with valid JSON \u2014 no other text, no markdown fences:\n{\n  "name": "short evocative scenario name (max 40 chars)",\n  "lore": "detailed world setting, atmosphere, and backstory (2-4 paragraphs, immersive and vivid)",\n  "openingMessage": "scene-setting narration to start the story (1-2 paragraphs, atmospheric, sets the mood and introduces the setting)"\n}`;
  const usr = `SCENARIO DESCRIPTION: ${description}\n\nAVAILABLE CHARACTERS:\n${charList}`;
  try {
    const raw = await withTimeout(api.chat([{ role: 'system', content: sys }, { role: 'user', content: usr }], model, { temp: 0.94, maxTokens: 1500 }));
    const parsed = JSON.parse(raw.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, '').trim());
    parsed.name = parsed.name || 'Untitled Scenario';
    parsed.lore = parsed.lore || '';
    parsed.openingMessage = parsed.openingMessage || '';
    dlog(`Scenario created: "${parsed.name}"`, 'ok');
    return parsed;
  } catch (err) { dlog('createScenario failed: ' + err.message, 'error'); return null; }
}

export async function generateCharacterImages(characters) {
  const model = store.raw().settings.creativeModel || store.raw().settings.ctrlModel || 'openai';
  const imgModel = store.raw().settings.creativeImgModel || store.raw().settings.imgModel || 'flux';
  dlog(`Creative Controller: generating ${characters.length} image(s) (prompt:${model}, img:${imgModel})...`, 'info');
  const results = [];
  for (const char of characters) {
    try {
      const sys = `Generate a detailed image generation prompt for a character portrait.\nRespond ONLY with JSON:\n{"prompt":"detailed visual description (2-3 sentences)","style":"anime|realistic|cinematic|painterly|comic","aspect":"1:1"}`;
      const usr = `NAME: ${char.name}\nAPPEARANCE: ${char.appearance || 'Not specified'}\nPERSONALITY: ${char.personality || 'Not specified'}\nCOLOR: ${char.color || '#d4a843'}`;
      const raw = await withTimeout(api.chat([{ role: 'system', content: sys }, { role: 'user', content: usr }], model, { temp: 0.85, maxTokens: 300 }), 15000);
      const parsed = JSON.parse(raw.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, '').trim());
      let w = 512, h = 512;
      if (parsed.aspect === '16:9') { w = 768; h = 432; }
      else if (parsed.aspect === '9:16') { w = 432; h = 768; }
      const prompt = parsed.prompt || `${char.appearance || char.name}, portrait`;
      const imageUrl = await api.generateImageUrl(prompt, w, h, imgModel);
      results.push({ charId: char.id, imageUrl, prompt, style: parsed.style || 'cinematic' });
      dlog(`Image for ${char.name}`, 'ok');
    } catch (err) {
      dlog(`Image failed for ${char.name}: ${err.message}`, 'warn');
      const fallback = `${char.appearance || char.name}, character portrait, detailed`;
      try {
        const imageUrl = await api.generateImageUrl(fallback, 512, 512, imgModel);
        results.push({ charId: char.id, imageUrl, prompt: fallback, style: 'cinematic', fallback: true });
      } catch { results.push({ charId: char.id, imageUrl: null, prompt: fallback, style: 'cinematic', fallback: true, error: true }); }
    }
  }
  return results;
}

/* Media Controller */
export async function genImagePrompt(msg, char, scenario) {
  const model = store.raw().settings.ctrlModel || 'openai';
  dlog('Media Controller: generating image prompt...', 'info');
  const sys = `You are the Media Controller. Generate a detailed image generation prompt based on the current moment in a roleplay.\nReturn ONLY JSON:\n{"prompt":"detailed visual description (2-3 sentences)","style":"anime|realistic|cinematic|painterly|comic","aspect":"16:9|1:1|9:16"}`;
  const usr = `CHARACTER: ${char.name}\nAPPEARANCE: ${char.appearance || 'Not specified'}\nMOOD: ${char.emotionalState || 'neutral'}\nSCENARIO: ${scenario.name}\nMESSAGE: ${msg.content.slice(0, 300)}`;
  try {
    const raw = await withTimeout(api.chat([{ role: 'system', content: sys }, { role: 'user', content: usr }], model, { temp: 0.85, maxTokens: 400 }));
    return JSON.parse(raw.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, '').trim());
  } catch (err) {
    dlog(`Media Controller image error: ${err.message}`, 'warn');
    return { prompt: `${char.appearance || ''}, ${msg.content.replace(/\*[^*]+\*/g, '').replace(/"[^"]+"/g, '').trim().slice(0, 200)}`, style: 'cinematic', aspect: '1:1' };
  }
}

export async function genVoiceHint(msg, char) {
  const model = store.raw().settings.ctrlModel || 'openai';
  const sys = `Analyze the message and character mood for voice generation. Return ONLY JSON:\n{"emotion":"dominant emotion","intensity":7,"speed":"normal|slow|fast","emphasis":"key phrases or empty string"}`;
  const usr = `CHARACTER: ${char.name}\nMOOD: ${char.emotionalState || 'neutral'}\nMESSAGE: ${msg.content.slice(0, 300)}`;
  try {
    const raw = await withTimeout(api.chat([{ role: 'system', content: sys }, { role: 'user', content: usr }], model, { temp: 0.6, maxTokens: 200 }), 15000);
    return JSON.parse(raw.replace(/\u0060\u0060\u0060json|\u0060\u0060\u0060/g, '').trim());
  } catch { return { emotion: char.emotionalState || 'neutral', intensity: 5, speed: 'normal', emphasis: '' }; }
}

/* Auto-Improve */
export async function autoImprove(userChar, scenario, messages) {
  if (_improveRunning) { _improveAbort = true; return ''; }
  _improveRunning = true;
  _improveAbort = false;
  const model = store.raw().settings.creativeModel || store.raw().settings.ctrlModel || 'openai';
  const recent = messages.slice(-15).map(m => {
    const c = store.raw().chat.characters.find(x => x.id === m.charId);
    return `${c?.name || '?'}: ${m.content}`;
  }).join('\n');
  const memKey = `${userChar.id}_${store.raw().chat.scenId}`;
  const mems = store.raw().chat.charMems?.[memKey] || [];
  const memCtx = mems.length ? `\n${userChar.name}'S PRIVATE MEMORIES:\n${mems.slice(-10).map(m => `- [${m.type}] ${m.content}`).join('\n')}` : '';
  const prompt = `Write the next in-character message for ${userChar.name} in this roleplay.\n\nSCENARIO: ${scenario.name} \u2014 ${scenario.lore || ''}\n${userChar.name}'s PERSONALITY: ${userChar.personality || ''}\nDIRECTIVE: ${store.raw().chat.directive.next || 'Continue naturally'}\n${memCtx}\n\nRECENT CONVERSATION:\n${recent}\n\nWrite only ${userChar.name}'s next message using *actions* and "dialogue". No labels.`;

  if (store.raw().settings.streaming) {
    const ta = document.getElementById('chat-input');
    if (ta) { ta.value = ''; resizeTextarea(ta); }
    let full = '';
    try {
      await api.stream([{ role: 'user', content: prompt }], model, (chunk, done) => {
        if (_improveAbort) throw new Error('Cancelled');
        full += chunk;
        if (ta) { ta.value = full; resizeTextarea(ta); }
      }, { temp: 0.94, maxTokens: 600 });
    } catch (err) {
      if (err.message !== 'Cancelled') dlog(`autoImprove stream: ${err.message}`, 'warn');
    }
    _improveRunning = false; _improveAbort = false;
    return full;
  }
  try {
    return await api.chat([{ role: 'user', content: prompt }], model, { temp: 0.94, maxTokens: 600 });
  } finally { _improveRunning = false; _improveAbort = false; }
}

function addCtrlMsg(text) {
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

// imported here to avoid circular dep issues in this file
import { createEl } from '../core/dom.js';
import { scrollEnd } from './chat-render.js';

function resizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
