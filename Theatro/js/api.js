'use strict';
var API = {};

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
 var h = { 'Content-Type': 'application/json' };
 var p = API._getProvider('pollinations');
 h['Authorization'] = 'Bearer ' + ((p && p.apiKey) || s.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU');
 return { url: 'https://gen.pollinations.ai/v1/chat/completions', headers: h };
};

API._base = function(provider) { return API._providerBase(provider); };
API._pollinationsKey = function() {
 var p = API._getProvider('pollinations');
 return (p && p.apiKey) || ST.settings.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU';
};

API.trackCall = function(provider) {
 var now = Date.now(); var bucket = ST.rateLimits[provider]; if (!bucket) return;
 bucket.calls.push(now); bucket.calls = bucket.calls.filter(function(t) { return now - t < 3600000; });
};

API.chat = async function(msgs, model, opts) {
 opts = opts || {};
 var ep = API.endpoint(model); API.trackCall(ep.provider);
 var body = { model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: false };
 try {
 var r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify(body) });
 if (!r.ok) {
 if (ep.provider === 'aqua') {
 var errText = await r.text(); if (Ctrl && Ctrl.dlog) Ctrl.dlog('Aqua API ' + r.status + ': ' + errText.slice(0, 100) + ' - fallback', 'warn');
 var pol = API._pollinationsEndpoint(); var fbModel = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 var r2 = await fetch(pol.url, { method: 'POST', headers: pol.headers, body: JSON.stringify({ model: fbModel, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: false }) });
 if (!r2.ok) { var t2 = await r2.text(); throw new Error('Fallback ' + r2.status); }
 var d2 = await r2.json(); return (d2.choices && d2.choices[0] && d2.choices[0].message && d2.choices[0].message.content) || '';
 }
 var t = await r.text(); throw new Error('API ' + r.status);
 }
 var d = await r.json(); return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
 } catch (err) {
 if (ep.provider === 'aqua' && err.message.indexOf('Fallback') === -1) {
 try { var pol2 = API._pollinationsEndpoint(); var fb2 = model.indexOf('aqua:') === 0 ? model.slice(5) : model; var r3 = await fetch(pol2.url, { method: 'POST', headers: pol2.headers, body: JSON.stringify({ model: fb2, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: false }) }); if (!r3.ok) throw new Error('Fallback ' + r3.status); var d3 = await r3.json(); return (d3.choices && d3.choices[0] && d3.choices[0].message && d3.choices[0].message.content) || ''; } catch (fbErr) { throw new Error('Both providers failed'); }
 }
 throw err;
 }
};

API.stream = async function(msgs, model, onChunk, opts) {
 opts = opts || {};
 if (!ST.settings.streaming) { var t0 = await API.chat(msgs, model, opts); onChunk(t0, true); return; }
 var ep = API.endpoint(model); API.trackCall(ep.provider);
 try {
 var r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify({ model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp != null ? opts.temp : 0.9, stream: true }) });
 if (!r.ok) {
 if (ep.provider === 'aqua') { var et = await r.text(); if (Ctrl && Ctrl.dlog) Ctrl.dlog('Stream ' + r.status + ' - fallback', 'warn'); var fb = model.indexOf('aqua:') === 0 ? model.slice(5) : model; var txt = await API.chat(msgs, fb, opts); if (txt) onChunk(txt, true); return; }
 throw new Error('API ' + r.status);
 }
 var reader = r.body.getReader(); var dec = new TextDecoder(); var buf = '';
 try {
 while (true) { var result = await reader.read(); if (result.done) break; buf += dec.decode(result.value, { stream: true }); var lines = buf.split('\n'); buf = lines.pop(); for (var i = 0; i < lines.length; i++) { var line = lines[i]; if (line.indexOf('data: ') !== 0) continue; var data = line.slice(6).trim(); if (data === '[DONE]') { onChunk('', true); return; } try { var p = JSON.parse(data); var delta = p.choices && p.choices[0] && p.choices[0].delta; if (delta && delta.content) onChunk(delta.content, false); } catch (e) {} } }
 } catch (err) { if (Ctrl && Ctrl.dlog) Ctrl.dlog('Stream break: ' + err.message, 'warn'); }
 } finally { try { reader.releaseLock(); } catch (e) {} }
};

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

API.generateImageUrl = async function(prompt, w, h, model) {
 API._syncLegacyKeys();
 w = w || 512; h = h || 512;
 var provId = ST.settings.imgProvider || 'aqua';
 model = model || ST.settings.imgModel || 'zimage';
 if (provId === 'aqua') {
 var realModel = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 var p = API._getProvider('aqua'); var key = (p && p.apiKey) || ST.settings.aquaKey || '';
 if (key) {
 var ratio = 'square'; if (w > h) ratio = 'landscape'; else if (h > w) ratio = 'portrait';
 var r = await fetch('https://api.aquadevs.com/v1/images/generations', { method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: realModel, prompt: prompt, ratio: ratio }) });
 if (!r.ok) throw new Error('Image: ' + r.status);
 var d = await r.json(); if (!d.success || !d.url) throw new Error('Image: no url');
 return d.url;
 }
 }
 var key2 = API._pollinationsKey(); var rm2 = model.indexOf('aqua:') === 0 ? model.slice(5) : model;
 return 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(rm2) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(key2);
};

API.imageUrl = function(prompt, w, h, model) {
 w = w || 512; h = h || 512; model = model || ST.settings.imgModel || 'zimage';
 if ((ST.settings.imgProvider || 'aqua') === 'aqua' || model.indexOf('aqua:') === 0) throw new Error('Use await API.generateImageUrl()');
 return 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + encodeURIComponent(model) + '&width=' + w + '&height=' + h + '&nologo=true&key=' + encodeURIComponent(API._pollinationsKey());
};

// ---- TTS with clear error messages ----
API.tts = async function(text, opts) {
 API._syncLegacyKeys();
 opts = opts || {};
 var p = API._getProvider(ST.settings.ttsProvider || 'aqua');
 var baseUrl = ((p && p.baseUrl) || 'https://api.aquadevs.com/v1').replace(/\/$/, '');
 var apiKey = (p && p.apiKey) || ST.settings.aquaKey || '';

 if (!apiKey) {
 throw new Error('No Aqua API key. Open Settings > Providers > Aqua and paste your key in the API Key field, then tap Save All.');
 }

 var model, body = { input: text };
 if (opts.voiceClone) { model = ST.settings.ttsVoicecloneModel || 'mimo-v2.5-tts-voiceclone'; body.audio = { voice: opts.voiceClone }; }
 else if (opts.voiceDescription && !opts.useStandardVoice) { model = ST.settings.ttsVoicedesignModel || 'mimo-v2.5-tts-voicedesign'; body.instructions = opts.voiceDescription; }
 else { model = ST.settings.ttsModel || 'mimo-v2.5-tts'; body.audio = { voice: opts.voice || ST.settings.defVoice || 'Mia' }; }
 body.model = model;

 var fullUrl = baseUrl + '/audio/speech';
 var apiHeaders = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
 var bodyStr = JSON.stringify(body);
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('TTS: ' + model, 'dinfo');

 var lastErr = '';
 var proxies = [null, 'https://corsproxy.io/?' + encodeURIComponent(fullUrl)];
 for (var i = 0; i < proxies.length; i++) {
 var proxyUrl = proxies[i]; var url = proxyUrl || fullUrl; var isProxy = !!proxyUrl;
 var headers = isProxy ? { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } : apiHeaders;
 try {
 var r = await fetch(url, { method: 'POST', headers: headers, body: bodyStr });
 if (!r.ok) {
 var errText = ''; try { errText = await r.text(); } catch (e2) {}
 if (r.status === 401 || r.status === 403) throw new Error('Aqua rejected your API key (HTTP ' + r.status + '). Check Settings > Providers > Aqua.');
 if (r.status === 502 || r.status === 503) { lastErr = 'Aqua TTS server returned ' + r.status + '. Server may be down or API key is invalid.'; continue; }
 throw new Error('TTS HTTP ' + r.status + ': ' + (errText.slice(0, 100) || 'unknown'));
 }
 var data = await r.json();
 if (!data.success || !data.url) { lastErr = 'TTS response missing audio URL.'; continue; }
 if (Ctrl && Ctrl.dlog) Ctrl.dlog('TTS ok: ' + data.filename + (isProxy ? ' [proxy]' : ''), 'ok');
 var mp3Resp = await fetch(data.url);
 if (!mp3Resp.ok) throw new Error('MP3 download failed: ' + mp3Resp.status);
 var blob = await mp3Resp.blob();
 return API._cacheAndReturnBlob(blob, 'audio');
 } catch (err) {
 if (err.message === 'Failed to fetch') { lastErr = 'Network blocked' + (isProxy ? ' (proxy too)' : '') + '.'; continue; }
 throw err;
 }
 }
 throw new Error(lastErr || 'TTS failed. Check your Aqua API key in Settings > Providers.');
};

API.transcribe = async function(audioBlob) {
 API._syncLegacyKeys();
 var provId = ST.settings.sttProvider || 'pollinations';
 var model = ST.settings.sttModel || 'whisper-large-v3';
 var fd = new FormData(); fd.append('file', audioBlob, 'recording.webm'); fd.append('model', model);
 if (provId === 'aqua') {
 var p = API._getProvider('aqua'); var baseUrl = ((p && p.baseUrl) || 'https://api.aquadevs.com/v1').replace(/\/$/, ''); var apiKey = (p && p.apiKey) || ST.settings.aquaKey || '';
 if (!apiKey) throw new Error('No Aqua API key for STT.');
 var r = await fetch(baseUrl + '/audio/transcriptions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey }, body: fd });
 if (!r.ok) throw new Error('STT ' + r.status);
 var d = await r.json(); return d.text || '';
 }
 var base = API._base('pollinations'); var h2 = { 'Authorization': base.headers['Authorization'] };
 var r2 = await fetch(base.url + '/audio/transcriptions', { method: 'POST', headers: h2, body: fd });
 if (!r2.ok) throw new Error('STT ' + r2.status);
 var d2 = await r2.json(); return d2.text || '';
};

API.fetchModels = async function(provider) {
 provider = provider || 'pollinations';
 try {
 var base = API._base(provider);
 var r = await fetch(base.url + '/models', { method: 'GET', headers: base.headers });
 if (!r.ok) throw new Error(provider + ' models: ' + r.status);
 var d = await r.json(); var raw = Array.isArray(d) ? d : (d.data || []);
 return raw.map(function(m) { return { id: m.id, name: m.name || m.id, provider: provider, desc: m.description || m.owned_by || '' }; });
 } catch (err) { if (Ctrl && Ctrl.dlog) Ctrl.dlog('Model fetch failed: ' + err.message, 'warn'); return []; }
};