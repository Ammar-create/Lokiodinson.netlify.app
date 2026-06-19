'use strict';
// ===== API =====
const API = {
 endpoint(model) {
 const s = ST.settings;
 if (model.startsWith('aqua:')) {
 const real = model.slice(5);
 if (s.aquaKey)
 return { url: 'https://api.aquadevs.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.aquaKey }, model: real, provider: 'aqua' };
 return { ...API._pollinationsEndpoint(), model: real, provider: 'pollinations' };
 }
 const m = MODELS.find(x => x.id === model);
 if (m && m.provider === 'aqua' && s.aquaKey)
 return { url: 'https://api.aquadevs.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.aquaKey }, model, provider: 'aqua' };
 if (s.customUrl && s.customKey)
 return { url: s.customUrl.replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.customKey }, model, provider: 'custom' };
 return { ...API._pollinationsEndpoint(), model, provider: 'pollinations' };
 },
 _pollinationsEndpoint() {
 const s = ST.settings;
 const url = 'https://gen.pollinations.ai/v1/chat/completions';
 const h = { 'Content-Type': 'application/json' };
 h['Authorization'] = 'Bearer ' + (s.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU');
 return { url, headers: h };
 },
 _base(provider) {
 const s = ST.settings;
 if (provider === 'aqua' && s.aquaKey)
 return { url: 'https://api.aquadevs.com/v1', headers: { 'Authorization': 'Bearer ' + s.aquaKey } };
 if (provider === 'custom' && s.customUrl && s.customKey)
 return { url: s.customUrl.replace(/\/$/, '') + '/v1', headers: { 'Authorization': 'Bearer ' + s.customKey } };
 return { url: 'https://gen.pollinations.ai/v1', headers: { 'Authorization': 'Bearer ' + (s.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU') } };
 },
 _pollinationsKey() {
 return ST.settings.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU';
 },
 trackCall(provider) {
 const now = Date.now();
 const bucket = ST.rateLimits[provider];
 if (!bucket) return;
 bucket.calls.push(now);
 bucket.calls = bucket.calls.filter(t => now - t < 3600000);
 if (bucket.calls.length % 10 === 0 && bucket.calls.length > 0) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Pollinations: ' + bucket.calls.length + ' calls this hour. pk_ keys are limited to 1 pollen/hr.', 'warn');
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
 const r = await fetch(ep.url, {
 method: 'POST',
 headers: ep.headers,
 body: JSON.stringify({ model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: true })
 });
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
 try {
 const p = JSON.parse(data);
 const delta = p.choices && p.choices[0] && p.choices[0].delta;
 if (delta && delta.content) onChunk(delta.content, false);
 } catch (e) { /* ignore parse errors */ }
 }
 }
 } catch (err) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Stream interrupted: ' + err.message, 'warn');
 if (ep.provider === 'aqua') {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Aqua stream error — falling back to Pollinations (non-stream)', 'warn');
 try {
 const fbModel = model.startsWith('aqua:') ? model.slice(5) : model;
 const text = await API.chat(msgs, fbModel, opts);
 if (text) onChunk(text, true);
 } catch (fbErr) { Ctrl && Ctrl.dlog && Ctrl.dlog('Pollinations fallback failed: ' + fbErr.message, 'err'); }
 }
 }
 } finally {
 try { reader.releaseLock(); } catch (e) { }
 }
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
 } catch (err) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Media cache failed for ' + url.slice(0, 60) + ': ' + err.message, 'warn');
 }
 },
 async _cacheAndReturnBlob(blob, kind) {
 kind = kind || 'audio';
 const pseudoUrl = 'blob://tts/' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
 await DB.cacheBlob(pseudoUrl, blob, kind);
 return DB.getBlobUrl(pseudoUrl);
 },
 async generateImageUrl(prompt, w, h, model) {
 w = w || 512;
 h = h || 512;
 model = model || ST.settings.imgModel || 'flux';
 const realModel = model.startsWith('aqua:') ? model.slice(5) : model;
 if (model.startsWith('aqua:') && ST.settings.aquaKey) {
 let ratio = 'square';
 if (w > h) ratio = 'landscape';
 else if (h > w) ratio = 'portrait';
 const body = { model: realModel, prompt: prompt, ratio: ratio };
 const url = 'https://api.aquadevs.com/v1/images/generations';
 const headers = { 'Authorization': 'Bearer ' + ST.settings.aquaKey, 'Content-Type': 'application/json' };
 try {
 const response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
 if (!response.ok) {
 const errText = await response.text();
 throw new Error('Aqua image generation failed: ' + response.status + ' - ' + errText.slice(0, 100));
 }
 const data = await response.json();
 if (!data.success || !data.url) throw new Error('Aqua image generation response missing success or url');
 API._cacheMedia(data.url, 'image').catch(function() {});
 return data.url;
 } catch (err) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Aqua image generation error: ' + err.message, 'err');
 throw err;
 }
 }
 const key = API._pollinationsKey();
 const pollUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(realModel) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key);
 API._cacheMedia(pollUrl, 'image').catch(function() {});
 return pollUrl;
 },
 imageUrl(prompt, w, h, model) {
 w = w || 512;
 h = h || 512;
 model = model || ST.settings.imgModel || 'flux';
 if (model.startsWith('aqua:')) {
 throw new Error('Aqua image models require async generateImageUrl. Use await API.generateImageUrl(...)');
 }
 const key = API._pollinationsKey();
 const pollUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(model) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key);
 API._cacheMedia(pollUrl, 'image').catch(function() {});
 return pollUrl;
 },
 async tts(text, voice) {
 voice = voice || 'nova';
 const model = ST.settings.ttsModel || 'openai-audio';
 const key = API._pollinationsKey();
 var base = API._base('pollinations');
 var ttsUrl = base.url + '/audio/speech';
 var ttsHeaders = Object.assign({}, base.headers, { 'Content-Type': 'application/json' });
 try {
 const r = await fetch(ttsUrl, { method: 'POST', headers: ttsHeaders, body: JSON.stringify({ model: model, input: text, voice: voice }) });
 if (!r.ok) {
 const errText = await r.text().catch(function() { return ''; });
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS POST ' + r.status + ': ' + errText.slice(0, 200), 'err');
 throw new Error('TTS ' + r.status + ': ' + (errText.slice(0, 80) || r.statusText));
 }
 const blob = await r.blob();
 return API._cacheAndReturnBlob(blob, 'audio');
 } catch (postErr) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS POST failed (' + postErr.message + '), trying GET fallback...', 'warn');
 try {
 const getUrl = 'https://gen.pollinations.ai/audio/' + encodeURIComponent(text) + '?model=' + encodeURIComponent(model) + '&voice=' + encodeURIComponent(voice) + '&key=' + encodeURIComponent(key);
 const r2 = await fetch(getUrl);
 if (!r2.ok) {
 const err2 = await r2.text().catch(function() { return ''; });
 Ctrl && Ctrl.dlog && Ctrl.dlog('TTS GET ' + r2.status + ': ' + err2.slice(0, 200), 'err');
 throw new Error('TTS GET ' + r2.status + ': ' + (err2.slice(0, 80) || r2.statusText));
 }
 const blob = await r2.blob();
 return API._cacheAndReturnBlob(blob, 'audio');
 } catch (getErr) {
 throw new Error('TTS failed — POST: ' + postErr.message + ' | GET: ' + getErr.message);
 }
 }
 },
 async transcribe(audioBlob) {
 const model = ST.settings.sttModel || 'whisper-large-v3';
 var base = API._base('pollinations');
 var fd = new FormData();
 fd.append('file', audioBlob, 'recording.webm');
 fd.append('model', model);
 var h = { 'Authorization': base.headers['Authorization'] };
 var r = await fetch(base.url + '/audio/transcriptions', { method: 'POST', headers: h, body: fd });
 if (!r.ok) { var t = await r.text(); throw new Error('STT ' + r.status + ': ' + t.slice(0, 100)); }
 var d = await r.json();
 return d.text || '';
 },
 async fetchModels(provider) {
 provider = provider || 'pollinations';
 try {
 var base = API._base(provider);
 var r = await fetch(base.url + '/models', { method: 'GET', headers: base.headers });
 if (!r.ok) throw new Error(provider + ' models: ' + r.status);
 var d = await r.json();
 var raw = Array.isArray(d) ? d : (d.data || []);
 return raw.map(function(m) {
 return { id: m.id, name: m.name || m.id, provider: provider, desc: m.description || m.owned_by || '', object: m.object || 'model', raw: m };
 });
 } catch (err) {
 Ctrl && Ctrl.dlog && Ctrl.dlog('Failed to fetch ' + provider + ' models: ' + err.message, 'warn');
 return [];
 }
 }
};
