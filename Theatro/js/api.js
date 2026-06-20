'use strict';
var API = {};

// ---- helpers ----
API._getProvider = function(id) {
 var provs = ST.settings.providers || [];
 for (var i = 0; i < provs.length; i++) { if (provs[i].id === id) return provs[i]; }
 return null;
};

API._syncLegacyKeys = function() {
 var provs = ST.settings.providers || [];
 var aqua = null; var polli = null;
 for (var i = 0; i < provs.length; i++) {
 if (provs[i].id === 'aqua') aqua = provs[i];
 if (provs[i].id === 'pollinations') polli = provs[i];
 }
 if (aqua && !aqua.apiKey && ST.settings.aquaKey) aqua.apiKey = ST.settings.aquaKey;
 if (polli && !polli.apiKey && ST.settings.pollinationsKey) polli.apiKey = ST.settings.pollinationsKey;
};

API._providerBase = function(providerId) {
 API._syncLegacyKeys();
 var p = API._getProvider(providerId);
 if (p && p.apiKey) return { url: (p.baseUrl || '').replace(/\/$/, ''), headers: { 'Authorization': 'Bearer ' + p.apiKey } };
 if (providerId === 'aqua') return { url: 'https://api.aquadevs.com/v1', headers: { 'Authorization': 'Bearer ' + (ST.settings.aquaKey || '') } };
 return { url: 'https://gen.pollinations.ai/v1', headers: { 'Authorization': 'Bearer ' + (ST.settings.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU') } };
};

API.endpoint = function(model) {
 API._syncLegacyKeys();
 var s = ST.settings;
 if (model.indexOf('aqua:') === 0) {
 var real = model.slice(5);
 var p = API._getProvider('aqua');
 var key = (p && p.apiKey) || s.aquaKey;
 if (key) return { url: ((p && p.baseUrl) || 'https://api.aquadevs.com/v1').replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, model: real, provider: 'aqua' };
 return API._pollinationsEndpoint();
 }
 var m = null;
 for (var i = 0; i < MODELS.length; i++) { if (MODELS[i].id === model) { m = MODELS[i]; break; } }
 if (m && m.provider === 'aqua') {
 var p2 = API._getProvider('aqua');
 var key2 = (p2 && p2.apiKey) || s.aquaKey;
 if (key2) return { url: ((p2 && p2.baseUrl) || 'https://api.aquadevs.com/v1').replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key2 }, model: model, provider: 'aqua' };
 }
 if (s.customUrl && s.customKey) return { url: s.customUrl.replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.customKey }, model: model, provider: 'custom' };
 return API._pollinationsEndpoint();
};

API._pollinationsEndpoint = function() {
 var s = ST.settings;
 var url = 'https://gen.pollinations.ai/v1/chat/completions';
 var h = { 'Content-Type': 'application/json' };
 var p = API._getProvider('pollinations');
 h['Authorization'] = 'Bearer ' + ((p && p.apiKey) || s.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU');
 return { url: url, headers: h };
};

API._base = function(provider) { return API._providerBase(provider); };

API._pollinationsKey = function() {
 var p = API._getProvider('pollinations');
 return (p && p.apiKey) || ST.settings.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU';
};

API.trackCall = function(provider) {
 var now = Date.now();
 var bucket = ST.rateLimits[provider];
 if (!bucket) return;
 bucket.calls.push(now);
 bucket.calls = bucket.calls.filter(function(t) { return now - t < 3600000; });
 if (bucket.calls.length % 10 === 0 && bucket.calls.length > 0) {
 if (Ctrl && Ctrl.dlog) Ctrl.dlog(provider + ': ' + bucket.calls.length + ' calls this hour.', 'warn');
 }
};

// ---- chat ----
API.chat = async function(msgs, model, opts) {
 opts = opts || {};
 var ep = API.endpoint(model);
 API.trackCall(ep.provider);
 var body = { model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: false };
 try {
 var r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify(body) });
 if (!r.ok) {
 if (ep.provider === 'aqua') {
 var errText = await r.text();
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('Aqua API ' + r.status + ': ' + errText.slice(0, 100) + ' - fallback', 'warn');
 var pol = API._pollinationsEndpoint();
 var fbModel = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 var r2 = await fetch(pol.url, { method: 'POST', headers: pol.headers, body: JSON.stringify({ model: fbModel, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: false }) });
 if (!r2.ok) { var t2 = await r2.text(); throw new Error('Pollinations fallback ' + r2.status + ': ' + t2.slice(0, 150)); }
 var d2 = await r2.json(); return (d2.choices && d2.choices[0] && d2.choices[0].message && d2.choices[0].message.content) || '';
 }
 var t = await r.text(); throw new Error('API ' + r.status + ': ' + t.slice(0, 150));
 }
 var d = await r.json(); return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
 } catch (err) {
 if (ep.provider === 'aqua' && err.message.indexOf('Pollinations fallback') === -1) {
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('Aqua error: ' + err.message + ' - fallback', 'warn');
 try {
 var pol2 = API._pollinationsEndpoint();
 var fbModel2 = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 var r3 = await fetch(pol2.url, { method: 'POST', headers: pol2.headers, body: JSON.stringify({ model: fbModel2, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: false }) });
 if (!r3.ok) { var t3 = await r3.text(); throw new Error('Pollinations fallback ' + r3.status + ': ' + t3.slice(0, 150)); }
 var d3 = await r3.json(); return (d3.choices && d3.choices[0] && d3.choices[0].message && d3.choices[0].message.content) || '';
 } catch (fbErr) { throw new Error('Both providers failed'); }
 }
 throw err;
 }
};

// ---- stream ----
API.stream = async function(msgs, model, onChunk, opts) {
 opts = opts || {};
 if (!ST.settings.streaming) { var t0 = await API.chat(msgs, model, opts); onChunk(t0, true); return; }
 var ep = API.endpoint(model);
 API.trackCall(ep.provider);
 try {
 var r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify({ model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: true }) });
 if (!r.ok) {
 if (ep.provider === 'aqua') {
 var errText = await r.text();
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('Aqua stream ' + r.status + ': ' + errText.slice(0, 100) + ' - fallback', 'warn');
 var fbModel = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 var text = await API.chat(msgs, fbModel, opts);
 if (text) onChunk(text, true);
 return;
 }
 var t = await r.text(); throw new Error('API ' + r.status + ': ' + t.slice(0, 150));
 }
 var reader = r.body.getReader();
 var dec = new TextDecoder();
 var buf = '';
 try {
 while (true) {
 var result = await reader.read();
 if (result.done) break;
 buf += dec.decode(result.value, { stream: true });
 var lines = buf.split('\n');
 buf = lines.pop();
 for (var i = 0; i < lines.length; i++) {
 var line = lines[i];
 if (line.indexOf('data: ') !== 0) continue;
 var data = line.slice(6).trim();
 if (data === '[DONE]') { onChunk('', true); return; }
 try { var p = JSON.parse(data); var delta = p.choices && p.choices[0] && p.choices[0].delta; if (delta && delta.content) onChunk(delta.content, false); } catch (e) {}
 }
 }
 } catch (err) {
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('Stream interrupted: ' + err.message, 'warn');
 if (ep.provider === 'aqua') {
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('Aqua stream error - fallback', 'warn');
 try { var fbModel2 = model.indexOf('aqua:') === 0 ? model.slice(5) : model; var text2 = await API.chat(msgs, fbModel2, opts); if (text2) onChunk(text2, true); } catch (fbErr) { if (Ctrl && Ctrl.dlog) Ctrl.dlog('Fallback failed: ' + fbErr.message, 'err'); }
 }
 }
 } finally { try { reader.releaseLock(); } catch (e) {} }
};

// ---- media cache ----
API._cacheMedia = async function(url, kind) {
 if (!url) return;
 try { if (await DB.hasBlob(url)) return; var r = await fetch(url); if (!r.ok) return; var b = await r.blob(); if (b && b.size) await DB.cacheBlob(url, b, kind); } catch (e) {}
};

API._cacheAndReturnBlob = async function(blob, kind) {
 kind = kind || 'audio';
 var pseudoUrl = 'blob://tts/' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
 await DB.cacheBlob(pseudoUrl, blob, kind);
 return DB.getBlobUrl(pseudoUrl);
};

// ---- image ----
API.generateImageUrl = async function(prompt, w, h, model) {
 API._syncLegacyKeys();
 w = w || 512; h = h || 512;
 var provId = ST.settings.imgProvider || 'aqua';
 model = model || ST.settings.imgModel || 'zimage';
 if (provId === 'aqua') {
 var realModel = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 var p = API._getProvider('aqua');
 var key = (p && p.apiKey) || ST.settings.aquaKey || '';
 if (key) {
 var ratio = 'square';
 if (w > h) ratio = 'landscape'; else if (h > w) ratio = 'portrait';
 var r = await fetch('https://api.aquadevs.com/v1/images/generations', { method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: realModel, prompt: prompt, ratio: ratio }) });
 if (!r.ok) { var t = await r.text(); throw new Error('Aqua image: ' + r.status); }
 var d = await r.json();
 if (!d.success || !d.url) throw new Error('Aqua image: no url');
 API._cacheMedia(d.url, 'image').catch(function() {});
 return d.url;
 }
 }
 var key2 = API._pollinationsKey();
 var realModel2 = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 var pollUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(realModel2) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key2);
 return pollUrl;
};

API.imageUrl = function(prompt, w, h, model) {
 w = w || 512; h = h || 512;
 model = model || ST.settings.imgModel || 'zimage';
 if ((ST.settings.imgProvider || 'aqua') === 'aqua' || model.indexOf('aqua:') === 0) throw new Error('Use await API.generateImageUrl()');
 var key = API._pollinationsKey();
 return 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(model) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key);
};

// ---- TTS ----
API.tts = async function(text, opts) {
 API._syncLegacyKeys();
 opts = opts || {};
 var p = API._getProvider(ST.settings.ttsProvider || 'aqua');
 var baseUrl = ((p && p.baseUrl) || 'https://api.aquadevs.com/v1').replace(/\/$/, '');
 var apiKey = (p && p.apiKey) || ST.settings.aquaKey || '';
 if (!apiKey) throw new Error('No Aqua API key. Settings -> Providers.');

 var model, body = { input: text };
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

 var fullUrl = baseUrl + '/audio/speech';
 var apiHeaders = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
 var bodyStr = JSON.stringify(body);
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('TTS: ' + fullUrl + ' model=' + model, 'dinfo');

 var lastErr;
 // Try direct then proxies
 var proxies = [null, 'https://corsproxy.io/?' + encodeURIComponent(fullUrl)];
 for (var i = 0; i < proxies.length; i++) {
 var proxyUrl = proxies[i];
 var url = proxyUrl || fullUrl;
 var isProxy = !!proxyUrl;
 try {
 var r = await fetch(url, { method: 'POST', headers: isProxy ? Object.assign({}, apiHeaders, { 'X-Requested-With': 'XMLHttpRequest' }) : apiHeaders, body: bodyStr });
 if (!r.ok) {
 var errText = await r.text().catch(function() { return ''; });
 if (r.status === 502 || r.status === 503) { lastErr = new Error('Aqua TTS ' + r.status); continue; }
 throw new Error('TTS ' + r.status + ': ' + (errText.slice(0, 100) || r.statusText));
 }
 var data = await r.json();
 if (!data.success || !data.url) { lastErr = new Error('TTS no url'); continue; }
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('TTS ok: ' + data.filename + (isProxy ? ' [proxy]' : ' [direct]'), 'ok');
 var mp3Resp = await fetch(data.url);
 if (!mp3Resp.ok) throw new Error('MP3 download: ' + mp3Resp.status);
 var blob = await mp3Resp.blob();
 API._cacheMedia(data.url, 'audio').catch(function() {});
 return API._cacheAndReturnBlob(blob, 'audio');
 } catch (err) {
 if (err.message === 'Failed to fetch') { lastErr = new Error('CORS blocked'); continue; }
 throw err;
 }
 }
 throw lastErr || new Error('TTS failed');
};

// ---- STT ----
API.transcribe = async function(audioBlob) {
 API._syncLegacyKeys();
 var provId = ST.settings.sttProvider || 'pollinations';
 var model = ST.settings.sttModel || 'whisper-large-v3';
 var fd = new FormData(); fd.append('file', audioBlob, 'recording.webm'); fd.append('model', model);
 if (provId === 'aqua') {
 var p = API._getProvider('aqua');
 var baseUrl = ((p && p.baseUrl) || 'https://api.aquadevs.com/v1').replace(/\/$/, '');
 var apiKey = (p && p.apiKey) || ST.settings.aquaKey || '';
 if (!apiKey) throw new Error('No Aqua API key for STT.');
 var r = await fetch(baseUrl + '/audio/transcriptions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey }, body: fd });
 if (!r.ok) { var t = await r.text(); throw new Error('STT ' + r.status); }
 var d = await r.json(); return d.text || '';
 }
 var base = API._base('pollinations');
 var h = { 'Authorization': base.headers['Authorization'] };
 var r2 = await fetch(base.url + '/audio/transcriptions', { method: 'POST', headers: h, body: fd });
 if (!r2.ok) { var t2 = await r2.text(); throw new Error('STT ' + r2.status); }
 var d2 = await r2.json(); return d2.text || '';
};

// ---- fetch models ----
API.fetchModels = async function(provider) {
 provider = provider || 'pollinations';
 try {
 var base = API._base(provider);
 var r = await fetch(base.url + '/models', { method: 'GET', headers: base.headers });
 if (!r.ok) throw new Error(provider + ' models: ' + r.status);
 var d = await r.json();
 var raw = Array.isArray(d) ? d : (d.data || []);
 return raw.map(function(m) { return { id: m.id, name: m.name || m.id, provider: provider, desc: m.description || m.owned_by || '' }; });
 } catch (err) { if (Ctrl && Ctrl.dlog) Ctrl.dlog('Model fetch failed: ' + err.message, 'warn'); return []; }
};