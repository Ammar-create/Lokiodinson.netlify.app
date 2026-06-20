'use strict';
// ===== API =====
const API = {
 _getProvider(id){
 const provs = ST.settings.providers || [];
 return provs.find(p => p.id === id) || null;
 },
 // Sync legacy aquaKey/pollinationsKey into providers on first load
 _syncLegacyKeys(){
 const provs = ST.settings.providers || [];
 const aqua = provs.find(p => p.id === 'aqua');
 const polli = provs.find(p => p.id === 'pollinations');
 if (aqua && !aqua.apiKey && ST.settings.aquaKey) { aqua.apiKey = ST.settings.aquaKey; }
 if (polli && !polli.apiKey && ST.settings.pollinationsKey) { polli.apiKey = ST.settings.pollinationsKey; }
 },
 _providerBase(providerId){
 API._syncLegacyKeys();
 const p = API._getProvider(providerId);
 if (p && p.apiKey) return { url: (p.baseUrl || '').replace(/\/$/, ''), headers: { 'Authorization': 'Bearer ' + p.apiKey } };
 if (providerId === 'aqua') return { url: 'https://api.aquadevs.com/v1', headers: { 'Authorization': 'Bearer ' + (ST.settings.aquaKey || '') } };
 return { url: 'https://gen.pollinations.ai/v1', headers: { 'Authorization': 'Bearer ' + (ST.settings.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU') } };
 },
 endpoint(model) {
 API._syncLegacyKeys();
 const s = ST.settings;
 if (model.startsWith('aqua:')) {
 const real = model.slice(5);
 const p = API._getProvider('aqua');
 const key = p?.apiKey || s.aquaKey;
 if (key) return { url: (p?.baseUrl || 'https://api.aquadevs.com/v1').replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, model: real, provider: 'aqua' };
 return { ...API._pollinationsEndpoint(), model: real, provider: 'pollinations' };
 }
 const m = MODELS.find(x => x.id === model);
 if (m && m.provider === 'aqua') {
 const p = API._getProvider('aqua');
 const key = p?.apiKey || s.aquaKey;
 if (key) return { url: (p?.baseUrl || 'https://api.aquadevs.com/v1').replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, model, provider: 'aqua' };
 }
 if (s.customUrl && s.customKey) return { url: s.customUrl.replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.customKey }, model, provider: 'custom' };
 return { ...API._pollinationsEndpoint(), model, provider: 'pollinations' };
 },
 _pollinationsEndpoint() {
 const s = ST.settings;
 const url = 'https://gen.pollinations.ai/v1/chat/completions';
 const h = { 'Content-Type': 'application/json' };
 const p = API._getProvider('pollinations');
 h['Authorization'] = 'Bearer ' + (p?.apiKey || s.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU');
 return { url, headers: h };
 },
 _base(provider) { return API._providerBase(provider); },
 _pollinationsKey() {
 const p = API._getProvider('pollinations');
 return p?.apiKey || ST.settings.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU';
 },
 trackCall(provider) {
 const now = Date.now();
 const bucket = ST.rateLimits[provider];
 if (!bucket) return;
 bucket.calls.push(now);
 bucket.calls = bucket.calls.filter(t => now - t < 3600000);
 if (bucket.calls.length % 10 === 0 && bucket.calls.length > 0) {
 Ctrl && Ctrl.dlog && Ctrl.dlog(provider + ': ' + bucket.calls.length + ' calls this hour.', 'warn');
 }
 },
 async chat(msgs, model, opts) {
 opts = opts || {};
 const ep = API.endpoint(model);
 API.trackCall(ep.provider);
 const body = { model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: false };
 try {
 const r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify(body) });
 if (!r.ok) {
 if (ep.provider === 'aqua') {
 const errText = await r.text();
 Ctrl && Ctrl.dlog && Ctrl.dlog('Aqua API ' + r.status + ': ' + errText.slice(0, 100) + ' — falling back to Pollinations', 'warn');
 const pol = API._pollinationsEndpoint();
 const fbModel = model.startsWith('aqua:') ? model.slice(5) : model;
 const r2 = await fetch(pol.url, { method: 'POST', headers: pol.headers, body: JSON.stringify(Object.assign({}, body, { model: fbModel })) });
 if (!r2.ok) { const t = await r2.text(); throw new Error('Pollinations fallback ' + r2.status + ': ' + t.slice(0, 150)); }
 const d = await r2.json(); return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
 }
 const t = await r.text(); throw new Error('API ' + r.status + ': ' + t.slice(0, 150));
 }
 const d = await r.json(); return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
 } catch (err) {
 if (ep.provider === 'aqua' && err.message.indexOf('Pollinations fallback') === -1) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Aqua error: ' + err.message + ' — falling back to Pollinations', 'warn');
 try {
 const pol = API._pollinationsEndpoint();
 const fbModel = model.startsWith('aqua:') ? model.slice(5) : model;
 body.model = fbModel;
 const r = await fetch(pol.url, { method: 'POST', headers: pol.headers, body: JSON.stringify(body) });
 if (!r.ok) { const t = await r.text(); throw new Error('Pollinations fallback ' + r.status + ': ' + t.slice(0, 150)); }
 const d = await r.json(); return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
 } catch (fbErr) { throw new Error('Both providers failed: Aqua=' + err.message + ', Pollinations=' + fbErr.message); }
 }
 throw err;
 }
 },
 async stream(msgs, model, onChunk, opts) {
 opts = opts || {};
 if (!ST.settings.streaming) { const t = await API.chat(msgs, model, opts); onChunk(t, true); return; }
 const ep = API.endpoint(model);
 API.trackCall(ep.provider);
 try {
 const r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify({ model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: true }) });
 if (!r.ok) {
 if (ep.provider === 'aqua') {
 const errText = await r.text();
 Ctrl && Ctrl.dlog && Ctrl.dlog('Aqua stream ' + r.status + ': ' + errText.slice(0, 100) + ' — falling back to Pollinations (non-stream)', 'warn');
 const fbModel = model.startsWith('aqua:') ? model.slice(5) : model;
 const text = await API.chat(msgs, fbModel, opts);
 if (text) onChunk(text, true);
 return;
 }
 const t = await r.text(); throw new Error('API ' + r.status + ': ' + t.slice(0, 150));
 }
 const reader = r.body.getReader();
 const dec = new TextDecoder();
 let buf = '';
 try {
 while (true) {
 const result = await reader.read();
 if (result.done) break;
 buf += dec.decode(result.value, { stream: true });
 const lines = buf.split('\n');
 buf = lines.pop();
 for (const line of lines) {
 if (line.indexOf('data: ') !== 0) continue;
 const data = line.slice(6).trim();
 if (data === '[DONE]') { onChunk('', true); return; }
 try { const p = JSON.parse(data); const delta = p.choices && p.choices[0] && p.choices[0].delta; if (delta && delta.content) onChunk(delta.content, false); } catch (e) {}
 }
 }
 } catch (err) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Stream interrupted: ' + err.message, 'warn');
 if (ep.provider === 'aqua') {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Aqua stream error — falling back to Pollinations (non-stream)', 'warn');
 try { const fbModel = model.startsWith('aqua:') ? model.slice(5) : model; const text = await API.chat(msgs, fbModel, opts); if (text) onChunk(text, true); } catch (fbErr) { Ctrl && Ctrl.dlog && Ctrl.dlog('Pollinations fallback failed: ' + fbErr.message, 'err'); }
 }
 }
 } finally { try { reader.releaseLock(); } catch (e) {} }
 },
 async _cacheMedia(url, kind) {
 if (!url) return;
 try {
 if (await DB.hasBlob(url)) return;
 const response = await fetch(url, { method: 'GET' });
 if (!response.ok) return;
 const blob = await response.blob();
 if (!blob || blob.size === 0) return;
 await DB.cacheBlob(url, blob, kind);
 Ctrl && Ctrl.dlog && Ctrl.dlog('Cached ' + kind + ' blob for ' + url.slice(0, 60), 'ok');
 } catch (err) { Ctrl && Ctrl.dlog && Ctrl.dlog('Media cache failed: ' + err.message, 'warn'); }
 },
 async _cacheAndReturnBlob(blob, kind) {
 kind = kind || 'audio';
 const pseudoUrl = 'blob://tts/' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
 await DB.cacheBlob(pseudoUrl, blob, kind);
 return DB.getBlobUrl(pseudoUrl);
 },

 // ===== IMAGE GENERATION =====
 async generateImageUrl(prompt, w, h, model) {
 API._syncLegacyKeys();
 w = w || 512; h = h || 512;
 const provId = ST.settings.imgProvider || 'aqua';
 model = model || ST.settings.imgModel || 'zimage';
 const isAqua = provId === 'aqua';
 if (isAqua) {
 const realModel = model.startsWith('aqua:') ? model.slice(5) : model;
 const key = (API._getProvider('aqua')?.apiKey) || ST.settings.aquaKey || '';
 if (key) {
 let ratio = 'square';
 if (w > h) ratio = 'landscape'; else if (h > w) ratio = 'portrait';
 const body = { model: realModel, prompt: prompt, ratio: ratio };
 const url = 'https://api.aquadevs.com/v1/images/generations';
 const headers = { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' };
 try {
 const response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
 if (!response.ok) { const errText = await response.text(); throw new Error('Aqua image generation failed: ' + response.status + ' - ' + errText.slice(0, 100)); }
 const data = await response.json();
 if (!data.success || !data.url) throw new Error('Aqua image generation response missing success or url');
 API._cacheMedia(data.url, 'image').catch(function() {});
 return data.url;
 } catch (err) { Ctrl && Ctrl.dlog && Ctrl.dlog('Aqua image error: ' + err.message, 'err'); throw err; }
 }
 }
 const key = API._pollinationsKey();
 const realModel = model.startsWith('aqua:') ? model.slice(5) : model;
 const pollUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(realModel) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key);
 API._cacheMedia(pollUrl, 'image').catch(function() {});
 return pollUrl;
 },
 imageUrl(prompt, w, h, model) {
 w = w || 512; h = h || 512;
 model = model || ST.settings.imgModel || 'zimage';
 const provId = ST.settings.imgProvider || 'aqua';
 if (provId === 'aqua' || model.startsWith('aqua:')) {
 throw new Error('Aqua image models require async generateImageUrl. Use await API.generateImageUrl(...)');
 }
 const key = API._pollinationsKey();
 const pollUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(model) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key);
 API._cacheMedia(pollUrl, 'image').catch(function() {});
 return pollUrl;
 },

 // ===== TTS — Aqua MiMo =====
 async tts(text, opts) {
 API._syncLegacyKeys();
 opts = opts || {};
 const provId = ST.settings.ttsProvider || 'aqua';
 const prov = API._getProvider(provId);
 const baseUrl = (prov?.baseUrl || 'https://api.aquadevs.com/v1').replace(/\/$/, '');
 const apiKey = prov?.apiKey || ST.settings.aquaKey || '';

 if (!apiKey) {
 const msg = 'No Aqua API key configured. Go to Settings → Providers and add your Aqua API key.';
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS: ' + msg, 'err');
 throw new Error(msg);
 }

 let model, body = { input: text };
 if (opts.voiceClone) {
 model = ST.settings.ttsVoicecloneModel || 'mimo-v2.5-tts-voiceclone';
 body.audio = { voice: opts.voiceClone };
 } else if (opts.voiceDescription && !opts.useStandardVoice) {
 model = ST.settings.ttsVoicedesignModel || 'mimo-v2.5-tts-voicedesign';
 body.instructions = opts.voiceDescription;
 } else {
 model = ST.settings.ttsModel || 'mimo-v2.5-tts';
 body.audio = { voice: opts.voice || ST.settings.defVoice || 'Mia' };
 }
 body.model = model;

 const fullUrl = baseUrl + '/audio/speech';
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS: POST ' + fullUrl + ' model=' + model + ' voice=' + (body.audio?.voice || 'design'), 'dinfo');

 try {
 const r = await fetch(fullUrl, {
 method: 'POST',
 headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
 body: JSON.stringify(body)
 });
 if (!r.ok) {
 const errText = await r.text().catch(function() { return ''; });
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS HTTP ' + r.status + ': ' + errText.slice(0, 300), 'err');
 throw new Error('TTS ' + r.status + ': ' + (errText.slice(0, 100) || r.statusText));
 }
 const data = await r.json();
 if (!data.success || !data.url) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS response missing success/url: ' + JSON.stringify(data).slice(0, 200), 'err');
 throw new Error('TTS response missing audio URL');
 }
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS mp3 ready: ' + data.filename + ' (' + (data.size_bytes || '?') + ' bytes)', 'ok');
 const mp3Resp = await fetch(data.url);
 if (!mp3Resp.ok) throw new Error('TTS mp3 download failed: ' + mp3Resp.status);
 const blob = await mp3Resp.blob();
 if (!blob || blob.size === 0) throw new Error('TTS mp3 blob is empty');
 API._cacheMedia(data.url, 'audio').catch(function() {});
 return API._cacheAndReturnBlob(blob, 'audio');
 } catch (err) {
 // Distinguish network errors from API errors
 if (err.message === 'Failed to fetch') {
 const netMsg = 'Cannot reach Aqua TTS API. Check your internet connection and verify the API key in Settings → Providers.';
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS network error: ' + netMsg + ' (URL: ' + fullUrl + ')', 'err');
 throw new Error(netMsg);
 }
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS error: ' + err.message, 'err');
 throw err;
 }
 },

 // ===== STT =====
 async transcribe(audioBlob) {
 API._syncLegacyKeys();
 const provId = ST.settings.sttProvider || 'pollinations';
 const model = ST.settings.sttModel || 'whisper-large-v3';
 if (provId === 'aqua') {
 const prov = API._getProvider('aqua');
 const baseUrl = (prov?.baseUrl || 'https://api.aquadevs.com/v1').replace(/\/$/, '');
 const apiKey = prov?.apiKey || ST.settings.aquaKey || '';
 if (!apiKey) throw new Error('No Aqua API key configured for STT. Go to Settings → Providers.');
 const fd = new FormData();
 fd.append('file', audioBlob, 'recording.webm');
 fd.append('model', model);
 const r = await fetch(baseUrl + '/audio/transcriptions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey }, body: fd });
 if (!r.ok) { const t = await r.text(); throw new Error('STT ' + r.status + ': ' + t.slice(0, 100)); }
 const d = await r.json();
 return d.text || '';
 }
 const base = API._base('pollinations');
 const fd = new FormData();
 fd.append('file', audioBlob, 'recording.webm');
 fd.append('model', model);
 const h = { 'Authorization': base.headers['Authorization'] };
 const r = await fetch(base.url + '/audio/transcriptions', { method: 'POST', headers: h, body: fd });
 if (!r.ok) { const t = await r.text(); throw new Error('STT ' + r.status + ': ' + t.slice(0, 100)); }
 const d = await r.json();
 return d.text || '';
 },
 async fetchModels(provider) {
 provider = provider || 'pollinations';
 try {
 const base = API._base(provider);
 const r = await fetch(base.url + '/models', { method: 'GET', headers: base.headers });
 if (!r.ok) throw new Error(provider + ' models: ' + r.status);
 const d = await r.json();
 const raw = Array.isArray(d) ? d : (d.data || []);
 return raw.map(function(m) { return { id: m.id, name: m.name || m.id, provider: provider, desc: m.description || m.owned_by || '', object: m.object || 'model', raw: m }; });
 } catch (err) { Ctrl && Ctrl.dlog && Ctrl.dlog('Failed to fetch ' + provider + ' models: ' + err.message, 'warn'); return []; }
 }
};