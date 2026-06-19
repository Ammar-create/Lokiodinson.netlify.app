'use strict';
// ===== API =====
const API = {
 endpoint(model) {
 const s = ST.settings;
 // aqua: prefix convention — strip prefix for real Aqua model ID
 if (model.startsWith('aqua:')) {
 const real = model.slice(5);
 if (s.aquaKey)
 return { url: 'https://api.aquadevs.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.aquaKey}` }, model: real, provider: 'aqua' };
 // No Aqua key configured — fall back to Pollinations
 return { ...API._pollinationsEndpoint(), model: real, provider: 'pollinations' };
 }
 const m = MODELS.find(x => x.id === model);
 if (m?.provider === 'aqua' && s.aquaKey)
 return { url: 'https://api.aquadevs.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.aquaKey}` }, model, provider: 'aqua' };
 if (s.customUrl && s.customKey)
 return { url: s.customUrl.replace(/\\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.customKey}` }, model, provider: 'custom' };
 return { ...API._pollinationsEndpoint(), model, provider: 'pollinations' };
 },
 _pollinationsEndpoint() {
 const s = ST.settings;
 const url = 'https://gen.pollinations.ai/v1/chat/completions';
 const h = { 'Content-Type': 'application/json' };
 h['Authorization'] = `Bearer ${s.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU'}`;
 return { url, headers: h };
 },
 _base(provider) {
 const s = ST.settings;
 if (provider === 'aqua' && s.aquaKey)
 return { url: 'https://api.aquadevs.com/v1', headers: { 'Authorization': `Bearer ${s.aquaKey}` } };
 if (provider === 'custom' && s.customUrl && s.customKey)
 return { url: s.customUrl.replace(/\\/$/, '') + '/v1', headers: { 'Authorization': `Bearer ${s.customKey}` } };
 return { url: 'https://gen.pollinations.ai/v1', headers: { 'Authorization': `Bearer ${s.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU'}` } };
 },
 // Helper: get the Pollinations API key for query-param usage (image URLs, GET TTS, etc.)
 _pollinationsKey() {
 return ST.settings.pollinationsKey || 'pk_LUy70Tu8OwLI1HrU';
 },

 // Rate limit tracking — log calls, show reminder every 10 calls for pollinations
 trackCall(provider) {
 const now = Date.now();
 const bucket = ST.rateLimits[provider];
 if (!bucket) return;
 bucket.calls.push(now);
 bucket.calls = bucket.calls.filter(t => now - t < 3600000);
 if (bucket.calls.length % 10 === 0 && bucket.calls.length > 0) {
 Ctrl?.dlog?.(`Pollinations: ${bucket.calls.length} calls this hour. pk_ keys are limited to 1 pollen/hr. Monitor your balance at gen.pollinations.ai/account/balance`, 'warn');
 }
 },

 async chat(msgs, model, opts = {}) {
 const ep = API.endpoint(model);
 API.trackCall(ep.provider);
 const body = { model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp ?? 0.9, stream: false };
 try {
 const r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify(body) });
 if (!r.ok) {
 if (ep.provider === 'aqua') {
 const errText = await r.text();
 Ctrl?.dlog?.(`Aqua API ${r.status}: ${errText.slice(0, 100)} — falling back to Pollinations`, 'warn');
 const pol = API._pollinationsEndpoint();
 const fbModel = model.startsWith('aqua:') ? model.slice(5) : model;
 const r2 = await fetch(pol.url, { method: 'POST', headers: pol.headers, body: JSON.stringify({ ...body, model: fbModel }) });
 if (!r2.ok) { const t = await r2.text(); throw new Error(`Pollinations fallback ${r2.status}: ${t.slice(0, 150)}`); }
 const d = await r2.json(); return d.choices?.[0]?.message?.content || '';
 }
 const t = await r.text(); throw new Error(`API ${r.status}: ${t.slice(0, 150)}`);
 }
 const d = await r.json(); return d.choices?.[0]?.message?.content || '';
 } catch (err) {
 if (ep.provider === 'aqua' && !err.message.includes('Pollinations fallback')) {
 Ctrl?.dlog?.(`Aqua error: ${err.message} — falling back to Pollinations`, 'warn');
 try {
 const pol = API._pollinationsEndpoint();
 const fbModel = model.startsWith('aqua:') ? model.slice(5) : model;
 body.model = fbModel;
 const r = await fetch(pol.url, { method: 'POST', headers: pol.headers, body: JSON.stringify(body) });
 if (!r.ok) { const t = await r.text(); throw new Error(`Pollinations fallback ${r.status}: ${t.slice(0, 150)}`); }
 const d = await r.json(); return d.choices?.[0]?.message?.content || '';
 } catch (fbErr) { throw new Error(`Both providers failed: Aqua=${err.message}, Pollinations=${fbErr.message}`); }
 }
 throw err;
 }
 },
