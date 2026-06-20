'use strict';
// ===== API =====
const API = {
 _getProvider(id){
 const provs = ST.settings.providers || [];
 return provs.find(p => p.id === id) || null;
 },
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
 const lines = buf.split('
');
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
 } catch (err) {}
 },
 async _cacheAndReturnBlob(blob, kind) {
 kind = kind || 'audio';
 const pseudoUrl = 'blob://tts/' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
 await DB.cacheBlob(pseudoUrl, blob, kind);
 return DB.getBlobUrl(pseudoUrl);
 },
 async generateImageUrl(prompt, w, h, model) {
 API._syncLegacyKeys();
 w = w || 512; h = h || 512;
 const provId = ST.settings.imgProvider || 'aqua';
 model = model || ST.settings.imgModel || 'zimage';
 if (provId === 'aqua') {
 const realModel = model.startsWith('aqua:') ? model.slice(5) : model;
 const key = (API._getProvider('aqua')?.apiKey) || ST.settings.aquaKey || '';
 if (key) {
 let ratio = 'square';
 if (w > h) ratio = 'landscape'; else if (h > w) ratio = 'portrait';
 const r = await fetch('https://api.aquadevs.com/v1/images/generations', { method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: realModel, prompt: prompt, ratio: ratio }) });
 if (!r.ok) { const t = await r.text(); throw new Error('Aqua image: ' + r.status + ' - ' + t.slice(0, 100)); }
 const d = await r.json();
 if (!d.success || !d.url) throw new Error('Aqua image: no url');
 API._cacheMedia(d.url, 'image').catch(function() {});
 return d.url;
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
 if ((ST.settings.imgProvider || 'aqua') === 'aqua' || model.startsWith('aqua:')) throw new Error('Use await API.generateImageUrl()');
 const key = API._pollinationsKey();
 const pollUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(model) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key);
 return pollUrl;
 },

 // ===== TTS — Aqua MiMo (multi-proxy CORS fallback) =====
 async tts(text, opts) {
 API._syncLegacyKeys();
 opts = opts || {};
 const prov = API._getProvider(ST.settings.ttsProvider || 'aqua');
 const baseUrl = (prov?.baseUrl || 'https://api.aquadevs.com/v1').replace(/\/$/, '');
 const apiKey = prov?.apiKey || ST.settings.aquaKey || '';
 if (!apiKey) throw new Error('No Aqua API key. Go to Settings → Providers.');

 let model, body = { input: text };
 if (opts.voiceClone) { model = ST.settings.ttsVoicecloneModel || 'mimo-v2.5-tts-voiceclone'; body.audio = { voice: opts.voiceClone }; }
 else if (opts.voiceDescription && !opts.useStandardVoice) { model = ST.settings.ttsVoicedesignModel || 'mimo-v2.5-tts-voicedesign'; body.instructions = opts.voiceDescription; }
 else { model = ST.settings.ttsModel || 'mimo-v2.5-tts'; body.audio = { voice: opts.voice || ST.settings.defVoice || 'Mia' }; }
 body.model = model;

 const fullUrl = baseUrl + '/audio/speech';
 const apiHeaders = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
 const bodyStr = JSON.stringify(body);
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS: ' + fullUrl + ' model=' + model, 'dinfo');

 // Try direct first, then proxies
 const proxies = [
 null, // direct
 'https://corsproxy.io/?' + encodeURIComponent(fullUrl),
 'https://api.allorigins.win/raw?url=' + encodeURIComponent(fullUrl)
 ];

 let lastErr;
 for (let i = 0; i < proxies.length; i++) {
 const proxyUrl = proxies[i];
 const url = proxyUrl || fullUrl;
 const isProxy = !!proxyUrl;
 try {
 const r = await fetch(url, { method: 'POST', headers: isProxy ? { ...apiHeaders, 'X-Requested-With': 'XMLHttpRequest' } : apiHeaders, body: bodyStr });
 if (!r.ok) {
 const errText = await r.text().catch(function() { return ''; });
 if (r.status === 502 || r.status === 503) {
 lastErr = new Error('Aqua TTS server returned ' + r.status + ' — may be temporarily down.');
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS ' + r.status + (isProxy ? ' (proxy)' : ' (direct)') + ': ' + errText.slice(0, 150), 'warn');
 continue; // try next proxy
 }
 throw new Error('TTS ' + r.status + ': ' + (errText.slice(0, 100) || r.statusText));
 }
 const data = await r.json();
 if (!data.success || !data.url) {
 lastErr = new Error('TTS response missing audio URL');
 continue;
 }
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS ok: ' + data.filename + ' (' + (data.size_bytes||'?') + ' bytes)' + (isProxy ? ' [proxy]' : ' [direct]'), 'ok');
 const mp3Resp = await fetch(data.url);
 if (!mp3Resp.ok) throw new Error('MP3 download failed: ' + mp3Resp.status);
 const blob = await mp3Resp.blob();
 API._cacheMedia(data.url, 'audio').catch(function() {});
 return API._cacheAndReturnBlob(blob, 'audio');
 } catch (err) {
 if (err.message === 'Failed to fetch') {
 lastErr = new Error('CORS blocked' + (isProxy ? ' (proxy also blocked)' : '') + '.');
 continue;
 }
 throw err;
 }
 }
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS: all attempts failed. ' + (lastErr?.message||''), 'err');
 throw lastErr || new Error('TTS failed — all connection attempts exhausted.');
 },

 async transcribe(audioBlob) {
 API._syncLegacyKeys();
 const provId = ST.settings.sttProvider || 'pollinations';
 const model = ST.settings.sttModel || 'whisper-large-v3';
 if (provId === 'aqua') {
 const prov = API._getProvider('aqua');
 const baseUrl = (prov?.baseUrl || 'https://api.aquadevs.com/v1').replace(/\/$/, '');
 const apiKey = prov?.apiKey || ST.settings.aquaKey || '';
 if (!apiKey) throw new Error('No Aqua API key for STT.');
 const fd = new FormData(); fd.append('file', audioBlob, 'recording.webm'); fd.append('model', model);
 const r = await fetch(baseUrl + '/audio/transcriptions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey }, body: fd });
 if (!r.ok) { const t = await r.text(); throw new Error('STT ' + r.status + ': ' + t.slice(0, 100)); }
 const d = await r.json(); return d.text || '';
 }
 const base = API._base('pollinations');
 const fd = new FormData(); fd.append('file', audioBlob, 'recording.webm'); fd.append('model', model);
 const h = { 'Authorization': base.headers['Authorization'] };
 const r = await fetch(base.url + '/audio/transcriptions', { method: 'POST', headers: h, body: fd });
 if (!r.ok) { const t = await r.text(); throw new Error('STT ' + r.status + ': ' + t.slice(0, 100)); }
 const d = await r.json(); return d.text || '';
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