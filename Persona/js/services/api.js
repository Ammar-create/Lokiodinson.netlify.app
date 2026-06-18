/***** API SERVICE *****/
import { store } from '../core/store.js';

export const api = {
  endpoint(model) {
    const s = store.raw().settings;
    if (model.startsWith('aqua:')) {
      const real = model.slice(5);
      if (s.aquaKey) {
        return { url: 'https://api.aquadevs.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.aquaKey}` }, model: real, provider: 'aqua' };
      }
      return { ...this._pollinationsEndpoint(), model: real, provider: 'pollinations' };
    }
    const m = MODELS.find(x => x.id === model);
    if (m?.provider === 'aqua' && s.aquaKey) {
      return { url: 'https://api.aquadevs.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.aquaKey}` }, model, provider: 'aqua' };
    }
    if (s.customUrl && s.customKey) {
      return { url: s.customUrl.replace(/\/$/, '') + '/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.customKey}` }, model, provider: 'custom' };
    }
    return { ...this._pollinationsEndpoint(), model, provider: 'pollinations' };
  },
  _pollinationsEndpoint() {
    const k = store.get('settings.pollinationsKey') || 'pk_LUy70Tu8OwLI1HrU';
    return { url: 'https://gen.pollinations.ai/v1/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` } };
  },
  _base(provider) {
    const s = store.raw().settings;
    if (provider === 'aqua' && s.aquaKey) {
      return { url: 'https://api.aquadevs.com/v1', headers: { Authorization: `Bearer ${s.aquaKey}` } };
    }
    if (provider === 'custom' && s.customUrl && s.customKey) {
      return { url: s.customUrl.replace(/\/$/, '') + '/v1', headers: { Authorization: `Bearer ${s.customKey}` } };
    }
    return { url: 'https://gen.pollinations.ai/v1', headers: { Authorization: `Bearer ${store.get('settings.pollinationsKey') || 'pk_LUy70Tu8OwLI1HrU'}` } };
  },
  _pollinationsKey() {
    return store.get('settings.pollinationsKey') || 'pk_LUy70Tu8OwLI1HrU';
  },

  async chat(msgs, model, opts = {}) {
    const ep = this.endpoint(model);
    const body = { model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp ?? 0.9, stream: false };
    try {
      const r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify(body) });
      if (!r.ok) {
        if (ep.provider === 'aqua') {
          const errText = await r.text();
          console.warn('Aqua fallback to Pollinations:', errText.slice(0, 80));
          const pol = this._pollinationsEndpoint();
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
        try {
          const pol = this._pollinationsEndpoint();
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

  async stream(msgs, model, onChunk, opts = {}) {
    if (!store.get('settings.streaming')) {
      const t = await this.chat(msgs, model, opts);
      onChunk(t, true);
      return;
    }
    const ep = this.endpoint(model);
    try {
      const r = await fetch(ep.url, {
        method: 'POST', headers: ep.headers,
        body: JSON.stringify({ model: ep.model, messages: msgs, max_tokens: opts.maxTokens || 1000, temperature: opts.temp ?? 0.9, stream: true })
      });
      if (!r.ok) {
        if (ep.provider === 'aqua') {
          const fbModel = model.startsWith('aqua:') ? model.slice(5) : model;
          const text = await this.chat(msgs, fbModel, opts);
          onChunk(text, true); return;
        }
        const t = await r.text(); throw new Error(`API ${r.status}: ${t.slice(0, 150)}`);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            try {
              const p = JSON.parse(data);
              const delta = p.choices?.[0]?.delta?.content;
              if (delta) onChunk(delta, false);
            } catch {}
          }
        }
      } catch (err) {
        throw err;
      } finally {
        try { reader.releaseLock(); } catch {}
      }
    } catch (err) {
      throw err;
    }
  },

  async generateImageUrl(prompt, w = 512, h = 512, model = null) {
    model = model || store.get('settings.imgModel') || 'flux';
    const realModel = model.startsWith('aqua:') ? model.slice(5) : model;
    if (model.startsWith('aqua:') && store.get('settings.aquaKey')) {
      let ratio = 'square';
      if (w > h) ratio = 'landscape';
      else if (h > w) ratio = 'portrait';
      const body = { model: realModel, prompt, ratio };
      try {
        const response = await fetch('https://api.aquadevs.com/v1/images/generations', {
          method: 'POST', headers: { Authorization: `Bearer ${store.get('settings.aquaKey')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`Aqua image ${response.status}`);
        const data = await response.json();
        if (!data.success || !data.url) throw new Error('Aqua image response invalid');
        return data.url;
      } catch (err) { throw err; }
    }
    const key = this._pollinationsKey();
    return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${realModel}&width=${w}&height=${h}&nologo=true&key=${encodeURIComponent(key)}`;
  },

  imageUrl(prompt, w = 512, h = 512, model = null) {
    model = model || store.get('settings.imgModel') || 'flux';
    if (model.startsWith('aqua:')) {
      throw new Error('Aqua image models require async generateImageUrl. Use await api.generateImageUrl(...)');
    }
    const key = this._pollinationsKey();
    return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${model}&width=${w}&height=${h}&nologo=true&key=${encodeURIComponent(key)}`;
  },

  async tts(text, voice = 'nova') {
    const model = store.get('settings.ttsModel') || 'openai-audio';
    const key = this._pollinationsKey();
    const base = this._base('pollinations');
    try {
      const r = await fetch(`${base.url}/audio/speech`, {
        method: 'POST',
        headers: { ...base.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: text, voice })
      });
      if (!r.ok) throw new Error(`TTS POST ${r.status}`);
      return URL.createObjectURL(await r.blob());
    } catch (postErr) {
      try {
        const getUrl = `https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?model=${model}&voice=${voice}&key=${encodeURIComponent(key)}`;
        const r2 = await fetch(getUrl);
        if (!r2.ok) throw new Error(`TTS GET ${r2.status}`);
        return URL.createObjectURL(await r2.blob());
      } catch (getErr) { throw new Error(`TTS failed: POST=${postErr.message}, GET=${getErr.message}`); }
    }
  },

  async transcribe(audioBlob) {
    const model = store.get('settings.sttModel') || 'whisper-large-v3';
    const { url, headers } = this._base('pollinations');
    const fd = new FormData();
    fd.append('file', audioBlob, 'recording.webm');
    fd.append('model', model);
    const r = await fetch(`${url}/audio/transcriptions`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: fd });
    if (!r.ok) { const t = await r.text(); throw new Error(`STT ${r.status}: ${t.slice(0, 100)}`); }
    const d = await r.json();
    return d.text || '';
  },

  async fetchModels(provider = 'pollinations') {
    try {
      const { url, headers } = this._base(provider);
      const r = await fetch(`${url}/models`, { headers });
      if (!r.ok) throw new Error(`${provider} models: ${r.status}`);
      const d = await r.json();
      const raw = Array.isArray(d) ? d : d.data || [];
      return raw.map(m => ({ id: m.id, name: m.name || m.id, provider, desc: m.description || m.owned_by || '', object: m.object || 'model', raw: m }));
    } catch (err) { return []; }
  }
};
