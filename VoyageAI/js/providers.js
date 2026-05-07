// ============================================================
// FILE 13: js/providers.js
// Voyage AI — Provider Abstraction Layer
// Handles all API communication: chat, image, video, audio,
// search, embeddings, and model fetching.
// ============================================================

import { store, EventBus, emit, getSetting } from './app.js';
import { generateId } from './utils.js';

// ─── Capability Constants ────────────────────────────────────

const CAP = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  TTS: 'tts',
  STT: 'stt',
  REASONING: 'reasoning',
  VISION: 'vision',
  TOOLS: 'tools',
  EMBEDDINGS: 'embeddings',
  SEARCH: 'search',
  EXTRACT: 'extract'
};

// ─── Endpoint Paths ──────────────────────────────────────────

const ENDPOINTS = {
  [CAP.TEXT]:       '/v1/chat/completions',
  [CAP.IMAGE]:      '/v1/images/generations',
  [CAP.VIDEO]:      '/v1/videos/generations',
  [CAP.TTS]:        '/v1/audio/speech',
  [CAP.STT]:        '/v1/audio/transcriptions',
  [CAP.SEARCH]:     '/v1/search',
  [CAP.EXTRACT]:    '/v1/extract',
  [CAP.EMBEDDINGS]: '/v1/embeddings',
  models:           '/v1/models'
};

// ─── Model Capability Detection ──────────────────────────────

function inferCapabilities(modelName) {
  const name = (modelName || '').toLowerCase();
  const caps = new Set([CAP.TEXT]);

  const IMAGE_PATTERNS = [
    'flux', 'image', 'dall', 'stable', 'midjourney',
    'imagen', 'ideogram', 'nanobanana', 'playground'
  ];
  const VIDEO_PATTERNS = ['video', 'luma', 'runway', 'kling', 'sora', 'pika'];
  const AUDIO_PATTERNS = ['whisper', 'audio', 'speech'];
  const TTS_PATTERNS = ['tts', 'speech-', 'elevenlabs', 'voice'];
  const REASONING_PATTERNS = ['think', 'reason', 'o1', 'o3', 'o4', 'r1', 'qwq'];
  const VISION_PATTERNS = ['vision', 'gpt-4o', 'gpt-5', 'sonnet', 'gemini', 'claude', 'qwen'];
  const EMBEDDING_PATTERNS = ['embed', 'ada-002', 'text-embedding'];
  const SEARCH_PATTERNS = ['search', 'perplexity', 'sonar'];
  const EXTRACT_PATTERNS = ['extract', 'firecrawl', 'jina'];

  if (IMAGE_PATTERNS.some(p => name.includes(p))) caps.add(CAP.IMAGE);
  if (VIDEO_PATTERNS.some(p => name.includes(p))) caps.add(CAP.VIDEO);
  if (TTS_PATTERNS.some(p => name.includes(p))) caps.add(CAP.TTS);
  if (AUDIO_PATTERNS.some(p => name.includes(p))) caps.add(CAP.STT);
  if (REASONING_PATTERNS.some(p => name.includes(p))) { caps.add(CAP.REASONING); caps.add(CAP.TOOLS); }
  if (VISION_PATTERNS.some(p => name.includes(p))) caps.add(CAP.VISION);
  if (EMBEDDING_PATTERNS.some(p => name.includes(p))) caps.add(CAP.EMBEDDINGS);
  if (SEARCH_PATTERNS.some(p => name.includes(p))) caps.add(CAP.SEARCH);
  if (EXTRACT_PATTERNS.some(p => name.includes(p))) caps.add(CAP.EXTRACT);

  // Models with vision generally support tools
  if (caps.has(CAP.VISION)) caps.add(CAP.TOOLS);

  return [...caps];
}

function formatModelName(id) {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Provider Defaults ───────────────────────────────────────

const PROVIDER_DEFAULTS = {
  aquadevs: {
    name: 'AquaDevs',
    baseUrl: 'https://api.aquadevs.com',
    caps: [CAP.TEXT, CAP.IMAGE, CAP.VIDEO, CAP.TTS, CAP.STT, CAP.SEARCH, CAP.EXTRACT, CAP.EMBEDDINGS, CAP.TOOLS]
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com',
    caps: [CAP.TEXT, CAP.STT, CAP.TTS, CAP.TOOLS]
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    caps: [CAP.TEXT, CAP.IMAGE, CAP.VIDEO, CAP.TTS, CAP.STT, CAP.SEARCH, CAP.EXTRACT, CAP.EMBEDDINGS, CAP.TOOLS]
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api',
    caps: [CAP.TEXT, CAP.IMAGE, CAP.TOOLS]
  },
  together: {
    name: 'Together',
    baseUrl: 'https://api.together.xyz',
    caps: [CAP.TEXT, CAP.IMAGE, CAP.TOOLS]
  },
  ollama: {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    caps: [CAP.TEXT, CAP.EMBEDDINGS, CAP.TOOLS]
  },
  custom: {
    name: 'Custom Provider',
    baseUrl: '',
    caps: [CAP.TEXT]
  }
};

const DEFAULT_PROVIDER_ID = 'aquadevs';

// ─── SSE Parser ──────────────────────────────────────────────

function parseSSELine(line) {
  if (!line || !line.startsWith('data: ')) return null;
  const data = line.slice(6).trim();
  if (data === '[DONE]') return { done: true };
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function parseSSEBuffer(buffer) {
  const lines = buffer.split('\n');
  const parsed = [];
  let remainder = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // If this is the last line and doesn't end with newline, it may be incomplete
    if (i === lines.length - 1 && !buffer.endsWith('\n') && line.length > 0) {
      remainder = line;
      continue;
    }

    if (line.length === 0) continue;

    const result = parseSSELine(line);
    if (result) parsed.push(result);
  }

  return { parsed, remainder };
}

// ─── Provider Class ──────────────────────────────────────────

class Provider {
  constructor(config) {
    this.name = config.name || 'Provider';
    this.baseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    this.apiKey = config.apiKey || '';
    this.caps = config.caps || [];
    this.timeout = 120000;
  }

  // ── Chat (Streaming + Non-Streaming) ──

  async chat(messages, options = {}) {
    const {
      model = 'gpt-4o',
      stream = true,
      tools = null,
      temperature = null,
      maxTokens = null,
      reasoning = false
    } = options;

    if (stream) {
      return this._chatStream(messages, { model, tools, temperature, maxTokens, reasoning });
    } else {
      return this._chatSync(messages, { model, tools, temperature, maxTokens, reasoning });
    }
  }

  async _chatStream(messages, opts) {
    const { model, tools, temperature, maxTokens, reasoning } = opts;
    const endpoint = `${this.baseUrl}${ENDPOINTS[CAP.TEXT]}`;

    const body = { model, messages, stream: true };
    if (tools && tools.length > 0) body.tools = tools;
    if (temperature !== null) body.temperature = temperature;
    if (maxTokens !== null) body.max_tokens = maxTokens;

    emit('stream:start', { model });
    const startTime = performance.now();

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(body)
      });
    } catch (err) {
      emit('stream:error', { error: `Network error: ${err.message}` });
      return { content: '', toolCalls: [], error: err.message, model };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      const error = `HTTP ${response.status}: ${errText}`;
      emit('stream:error', { error });
      return { content: '', toolCalls: [], error, model };
    }

    // Stream processing
    let fullContent = '';
    let toolCallsMap = {};
    let usage = null;
    let chunkCount = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { parsed, remainder } = parseSSEBuffer(buffer);
        buffer = remainder;

        for (const chunk of parsed) {
          if (chunk.done) continue;

          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          // Content
          if (delta.content) {
            fullContent += delta.content;
            chunkCount++;

            // Emit every 3rd chunk to reduce event overhead
            if (chunkCount % 3 === 0) {
              emit('stream:chunk', { content: delta.content, fullContent });
            }
          }

          // Reasoning / thinking content
          if (delta.reasoning_content) {
            fullContent += delta.reasoning_content;
            emit('stream:reasoning', { content: delta.reasoning_content });
          }

          // Tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap[idx]) {
                toolCallsMap[idx] = {
                  id: tc.id || `call_${generateId().slice(0, 8)}`,
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
              }
              if (tc.id) toolCallsMap[idx].id = tc.id;
              if (tc.function?.name) toolCallsMap[idx].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
            }
          }

          // Usage (some providers send this at the end)
          if (chunk.usage) {
            usage = chunk.usage;
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim().length > 0) {
        const { parsed } = parseSSEBuffer(buffer + '\n');
        for (const chunk of parsed) {
          if (chunk.done) continue;
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) fullContent += delta.content;
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap[idx]) {
                toolCallsMap[idx] = { id: tc.id || `call_${generateId().slice(0, 8)}`, type: 'function', function: { name: '', arguments: '' } };
              }
              if (tc.function?.name) toolCallsMap[idx].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
            }
          }
          if (chunk.usage) usage = chunk.usage;
        }
      }
    } catch (err) {
      emit('stream:error', { error: `Stream read error: ${err.message}` });
      return { content: fullContent, toolCalls: Object.values(toolCallsMap), error: err.message, model };
    }

    // Final stats
    const duration = performance.now() - startTime;
    const outputTokens = usage?.completion_tokens || Math.ceil(fullContent.length / 4);
    const inputTokens = usage?.prompt_tokens || 0;
    const tokPerSec = duration > 0 ? Math.round((outputTokens / duration) * 1000) : 0;

    const stats = { inputTokens, outputTokens, tokPerSec, duration: Math.round(duration) };
    emit('stream:done', { content: fullContent, stats, model });

    return {
      content: fullContent,
      toolCalls: Object.values(toolCallsMap),
      usage: usage || { prompt_tokens: inputTokens, completion_tokens: outputTokens },
      stats,
      model
    };
  }

  async _chatSync(messages, opts) {
    const { model, tools, temperature, maxTokens } = opts;
    const endpoint = `${this.baseUrl}${ENDPOINTS[CAP.TEXT]}`;

    const body = { model, messages, stream: false };
    if (tools && tools.length > 0) body.tools = tools;
    if (temperature !== null) body.temperature = temperature;
    if (maxTokens !== null) body.max_tokens = maxTokens;

    emit('stream:start', { model });
    const startTime = performance.now();

    const raw = await this._request('POST', ENDPOINTS[CAP.TEXT], body);
    const duration = performance.now() - startTime;

    const choice = raw.choices?.[0];
    const content = choice?.message?.content || '';
    const toolCalls = choice?.message?.tool_calls || [];
    const usage = raw.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || Math.ceil(content.length / 4);
    const tokPerSec = duration > 0 ? Math.round((outputTokens / duration) * 1000) : 0;

    const stats = { inputTokens, outputTokens, tokPerSec, duration: Math.round(duration) };
    emit('stream:done', { content, stats, model });

    return {
      content,
      toolCalls: toolCalls.map(tc => ({
        id: tc.id || `call_${generateId().slice(0, 8)}`,
        type: 'function',
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      })),
      usage,
      stats,
      model
    };
  }

  // ── Image Generation ──

  async generateImage(prompt, options = {}) {
    const { model = 'flux-2', aspectRatio = '1:1', width, height, referenceImage } = options;

    const body = {
      model,
      prompt,
      n: 1
    };

    if (width && height) {
      body.width = width;
      body.height = height;
    } else if (aspectRatio) {
      const [w, h] = this._ratioToSize(aspectRatio);
      body.width = w;
      body.height = h;
    }

    if (referenceImage) {
      body.image = referenceImage; // base64 or URL
    }

    const raw = await this._request('POST', ENDPOINTS[CAP.IMAGE], body);

    const imageData = raw.data?.[0];
    if (!imageData) throw new Error('No image data in response');

    return {
      dataUrl: imageData.url || `data:image/png;base64,${imageData.b64_json}`,
      revisedPrompt: imageData.revised_prompt || prompt
    };
  }

  // ── Video Generation ──

  async generateVideo(prompt, options = {}) {
    const { model = 'kling-2', duration = 5, aspectRatio = '16:9' } = options;

    const body = {
      model,
      prompt,
      duration,
      aspect_ratio: aspectRatio
    };

    // Video generation is often async — returns a task ID
    const raw = await this._request('POST', ENDPOINTS[CAP.VIDEO], body);

    // If the API returns a task ID, we poll for completion
    if (raw.id && !raw.data) {
      return this._pollTask(raw.id, 'video');
    }

    return {
      dataUrl: raw.data?.[0]?.url || '',
      duration: raw.data?.[0]?.duration || duration
    };
  }

  async _pollTask(taskId, type, maxAttempts = 120) {
    const pollInterval = type === 'video' ? 5000 : 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const result = await this._request('GET', `/v1/tasks/${taskId}`);

        if (result.status === 'completed' || result.status === 'succeeded') {
          const item = result.data?.[0] || result.output?.[0] || {};
          return { dataUrl: item.url || item.video_url || '' };
        }

        if (result.status === 'failed') {
          throw new Error(result.error || `${type} generation failed`);
        }

        emit('task:progress', { taskId, type, status: result.status, progress: result.progress });
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
      }
    }

    throw new Error(`${type} generation timed out after ${Math.round((maxAttempts * pollInterval) / 1000)}s`);
  }

  // ── Text-to-Speech ──

  async textToSpeech(text, options = {}) {
    const { model = 'tts-1', voice = 'alloy', speed = 1.0 } = options;

    const endpoint = `${this.baseUrl}${ENDPOINTS[CAP.TTS]}`;

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, input: text, voice, speed })
      });
    } catch (err) {
      throw new Error(`TTS network error: ${err.message}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`TTS failed (HTTP ${response.status}): ${errText}`);
    }

    const blob = await response.blob();
    return {
      blob,
      mimeType: blob.type || 'audio/mpeg',
      url: URL.createObjectURL(blob)
    };
  }

  // ── Speech-to-Text ──

  async speechToText(audioBlob, options = {}) {
    const { model = 'whisper-1', language = '' } = options;

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', model);
    if (language) formData.append('language', language);

    const endpoint = `${this.baseUrl}${ENDPOINTS[CAP.STT]}`;

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        body: formData
      });
    } catch (err) {
      throw new Error(`STT network error: ${err.message}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`STT failed (HTTP ${response.status}): ${errText}`);
    }

    const raw = await response.json();
    return { text: raw.text || '' };
  }

  // ── Web Search ──

  async search(query, options = {}) {
    const { maxResults = 5 } = options;

    try {
      const raw = await this._request('POST', ENDPOINTS[CAP.SEARCH], {
        query,
        max_results: maxResults
      });

      return (raw.results || raw.data || []).map(r => ({
        title: r.title || '',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || r.text || ''
      }));
    } catch {
      return [];
    }
  }

  // ── URL Content Extraction ──

  async extract(url, options = {}) {
    try {
      const raw = await this._request('POST', ENDPOINTS[CAP.EXTRACT], {
        url,
        ...options
      });

      return {
        content: raw.content || raw.text || raw.markdown || '',
        title: raw.title || '',
        description: raw.description || '',
        url: raw.url || url
      };
    } catch (err) {
      throw new Error(`Extract failed: ${err.message}`);
    }
  }

  // ── Text Embeddings ──

  async embeddings(text, options = {}) {
    const { model = 'text-embedding-3-small' } = options;

    const raw = await this._request('POST', ENDPOINTS[CAP.EMBEDDINGS], {
      model,
      input: text
    });

    const vector = raw.data?.[0]?.embedding;
    if (!vector) throw new Error('No embedding returned');
    return vector;
  }

  // ── Model Fetching ──

  async fetchModels() {
    try {
      const raw = await this._request('GET', ENDPOINTS.models);
      const modelsList = raw.data || raw.models || [];

      return modelsList.map(m => {
        const id = m.id || m.name || '';
        const caps = m.capabilities || inferCapabilities(id);

        return {
          id,
          name: formatModelName(id),
          capabilities: Array.isArray(caps) ? caps : inferCapabilities(id),
          contextLength: m.context_length || m.context_window || null,
          maxOutput: m.max_output_tokens || null
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.warn(`Failed to fetch models: ${err.message}`);
      return [];
    }
  }

  // ── Private: HTTP Layer ──

  _headers() {
    const h = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      h['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let response;
    try {
      const fetchOpts = {
        method,
        headers: this._headers(),
        signal: controller.signal
      };

      if (body && method !== 'GET') {
        fetchOpts.body = JSON.stringify(body);
      }

      response = await fetch(url, fetchOpts);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeout / 1000}s`);
      }
      throw new Error(`Network error: ${err.message}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      let errMessage;
      try {
        const errJson = JSON.parse(errText);
        errMessage = errJson.error?.message || errJson.message || errText;
      } catch {
        errMessage = errText;
      }
      throw new Error(`API error (${response.status}): ${errMessage}`);
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  // ── Private: Helpers ──

  _ratioToSize(ratio) {
    const map = {
      '1:1':   [1024, 1024],
      '16:9':  [1792, 1024],
      '9:16':  [1024, 1792],
      '4:3':   [1344, 1024],
      '3:4':   [1024, 1344],
      '3:2':   [1536, 1024],
      '2:3':   [1024, 1536],
      '21:9':  [2016, 864]
    };
    return map[ratio] || [1024, 1024];
  }
}

// ─── Provider Registry ───────────────────────────────────────

const ProviderRegistry = {
  _instances: {},

  async init() {
    // Always create the default AquaDevs provider
    this._instances[DEFAULT_PROVIDER_ID] = new Provider({
      ...PROVIDER_DEFAULTS.aquadevs,
      apiKey: (await store.getSetting('aquadevs_api_key')) || ''
    });

    // Load any user-configured providers
    try {
      const providers = await store.getProviders();
      for (const p of providers) {
        if (!this._instances[p.id]) {
          this._instances[p.id] = new Provider({
            name: p.name,
            baseUrl: p.baseUrl,
            apiKey: p.apiKey,
            caps: p.caps || PROVIDER_DEFAULTS.custom.caps
          });
        }
      }
    } catch {
      // Store may not be ready yet — that's fine
    }
  },

  get(providerId) {
    if (this._instances[providerId]) return this._instances[providerId];

    // Try to create from stored config
    return null;
  },

  async getOrCreate(providerId) {
    if (this._instances[providerId]) return this._instances[providerId];

    // Try loading from store
    try {
      const configs = await store.getProviders();
      const config = configs.find(p => p.id === providerId || p.name === providerId);
      if (config) {
        const key = config.id || providerId;
        this._instances[key] = new Provider({
          name: config.name,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          caps: config.caps || PROVIDER_DEFAULTS.custom.caps
        });
        return this._instances[key];
      }
    } catch {
      // Ignore
    }

    // Check if it's a known provider template
    if (PROVIDER_DEFAULTS[providerId]) {
      this._instances[providerId] = new Provider({
        ...PROVIDER_DEFAULTS[providerId],
        apiKey: ''
      });
      return this._instances[providerId];
    }

    console.warn(`Provider not found: ${providerId}`);
    return null;
  },

  add(id, config) {
    this._instances[id] = new Provider(config);
    return this._instances[id];
  },

  remove(id) {
    if (id === DEFAULT_PROVIDER_ID) return; // Can't remove default
    delete this._instances[id];
  },

  getAll() {
    return this._instances;
  },

  getDefaults() {
    return PROVIDER_DEFAULTS;
  }
};

// ─── System Prompt Builder ───────────────────────────────────

async function buildSystemPrompt() {
  const parts = [];

  // Base instructions
  parts.push(
    'You are Voyage AI, a capable and thoughtful AI assistant. ' +
    'You have access to various tools. Use them when they can help answer the user\'s request more effectively. ' +
    'Be direct and concise unless the user asks for detail.'
  );

  // Tone preferences
  try {
    const tone = await store.getSetting('tone');
    if (tone && tone !== 'Default') {
      parts.push(`Communication tone: ${tone}.`);
    }

    const warmth = await store.getSetting('warmth');
    if (warmth && warmth !== 'Default') {
      parts.push(`Warmth level: ${warmth}. ${warmth === 'More' ? 'Be warm, empathetic, and personable.' : 'Be direct and matter-of-fact.'}`);
    }

    const enthusiasm = await store.getSetting('enthusiasm');
    if (enthusiasm && enthusiasm !== 'Default') {
      parts.push(`Enthusiasm level: ${enthusiasm}. ${enthusiasm === 'More' ? 'Show excitement and energy.' : 'Keep responses measured and calm.'}`);
    }

    const emojiUsage = await store.getSetting('emoji_usage');
    if (emojiUsage && emojiUsage !== 'Default') {
      parts.push(`Emoji usage: ${emojiUsage}. ${emojiUsage === 'More' ? 'Use emojis liberally to express ideas.' : 'Avoid emojis entirely.'}`);
    }

    const headers = await store.getSetting('headers_usage');
    if (headers && headers !== 'Default') {
      parts.push(`Structure: ${headers}. ${headers === 'More' ? 'Use headers, bullet points, and structured formatting.' : 'Write in flowing paragraphs without headers or lists.'}`);
    }

    // Custom instructions
    const customInstructions = await store.getSetting('custom_instructions');
    if (customInstructions?.trim()) {
      parts.push(`User-provided instructions: ${customInstructions.trim()}`);
    }
  } catch {
    // Settings may not be available
  }

  // User context
  try {
    const profile = await store.getProfile();
    if (profile) {
      const userParts = [];
      if (profile.nickname) userParts.push(`nickname: ${profile.nickname}`);
      else if (profile.firstName) userParts.push(`name: ${profile.firstName}`);
      if (profile.occupation) userParts.push(`occupation: ${profile.occupation}`);
      if (profile.additionalInfo) userParts.push(`additional info: ${profile.additionalInfo}`);

      if (userParts.length > 0) {
        parts.push(`User context — ${userParts.join(', ')}.`);
      }
    }
  } catch {
    // Profile may not exist yet
  }

  // Memory context
  try {
    const refMemories = await store.getSetting('reference_memories');
    if (refMemories !== false) {
      const memories = await store.getMemories();
      if (memories.length > 0) {
        const recent = memories.slice(-20);
        const memoryText = recent.map(m => `- ${m.content}`).join('\n');
        parts.push(`Known facts about the user:\n${memoryText}`);
      }
    }
  } catch {
    // Memories may not be available
  }

  return parts.join('\n\n');
}

// ─── Active Provider State ───────────────────────────────────

let _activeProviderId = DEFAULT_PROVIDER_ID;
let _activeModelId = null;

function getActiveProviderId() {
  return _activeProviderId;
}

async function getActiveProvider() {
  const provider = await ProviderRegistry.getOrCreate(_activeProviderId);
  if (!provider) {
    // Fallback to default
    return ProviderRegistry.get(DEFAULT_PROVIDER_ID);
  }
  return provider;
}

async function setActiveProvider(id) {
  const provider = await ProviderRegistry.getOrCreate(id);
  if (!provider) throw new Error(`Provider "${id}" not found`);

  _activeProviderId = id;
  await store.setSetting('active_provider', id);
  emit('provider:changed', { providerId: id, providerName: provider.name });
  return provider;
}

function getActiveModelId() {
  return _activeModelId;
}

async function setActiveModel(modelId) {
  _activeModelId = modelId;
  await store.setSetting('active_model', modelId);
  emit('model:changed', { modelId });
}

async function getActiveModelConfig() {
  const modelId = _activeModelId;
  const providerId = _activeProviderId;

  // Try to find model details
  try {
    const models = await store.getModels(providerId);
    const model = models.find(m => m.id === modelId || m.name === modelId);
    if (model) return { ...model, providerId };
  } catch {
    // Ignore
  }

  return {
    id: modelId,
    name: formatModelName(modelId || 'gpt-4o'),
    providerId,
    capabilities: inferCapabilities(modelId || '')
  };
}

// ─── High-Level Chat Completion ──────────────────────────────

async function chatCompletion(messages, options = {}) {
  const provider = await getActiveProvider();
  const model = options.model || _activeModelId || 'gpt-4o';

  // Build system prompt
  const systemPrompt = await buildSystemPrompt();

  // Prepare messages — system prompt first, then user/assistant messages
  const preparedMessages = [];

  // System message
  const systemMsg = { role: 'system', content: systemPrompt };
  preparedMessages.push(systemMsg);

  // Add conversation messages (skip any existing system messages from caller)
  for (const msg of messages) {
    if (msg.role === 'system') continue; // Already handled
    preparedMessages.push({
      role: msg.role,
      content: msg.content
    });
  }

  // Include tool definitions if available
  let tools = null;
  try {
    const { getToolDefinitions } = await import('./tools.js');
    tools = getToolDefinitions();
  } catch {
    // Tools module may not be available
  }

  // Call provider
  const result = await provider.chat(preparedMessages, {
    model,
    stream: options.stream !== false,
    tools,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    reasoning: options.reasoning
  });

  // Handle tool calls in a loop
  if (result.toolCalls && result.toolCalls.length > 0) {
    return handleToolCalls(provider, preparedMessages, result, { model, tools });
  }

  return result;
}

async function handleToolCalls(provider, messages, result, options) {
  const MAX_ROUNDS = 10;
  let round = 0;
  let currentResult = result;
  const allToolCalls = [];

  while (currentResult.toolCalls?.length > 0 && round < MAX_ROUNDS) {
    round++;

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: currentResult.content || null,
      tool_calls: currentResult.toolCalls
    });

    // Execute each tool call
    const { executeTool } = await import('./tools.js');

    for (const tc of currentResult.toolCalls) {
      let toolResult;
      try {
        let params = {};
        if (tc.function?.arguments) {
          try {
            params = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments;
          } catch {
            params = {};
          }
        }

        toolResult = await executeTool(tc.function?.name, params);
        emit('tool:invoked', { tool: tc.function?.name, result: toolResult });
      } catch (err) {
        toolResult = { error: err.message };
      }

      allToolCalls.push({
        id: tc.id,
        name: tc.function?.name,
        arguments: tc.function?.arguments,
        result: toolResult
      });

      // Add tool result message
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
      });
    }

    // Send tool results back to the model
    currentResult = await provider.chat(messages, {
      model: options.model,
      stream: options.stream !== false,
      tools: options.tools
    });
  }

  // Return final result with all tool calls collected
  return {
    ...currentResult,
    toolCalls: allToolCalls,
    toolRounds: round
  };
}

// ─── Initialization ──────────────────────────────────────────

async function init() {
  // Load saved provider preference
  try {
    const savedProvider = await store.getSetting('active_provider');
    if (savedProvider) _activeProviderId = savedProvider;

    const savedModel = await store.getSetting('active_model');
    if (savedModel) _activeModelId = savedModel;
  } catch {
    // First run — use defaults
  }

  // Initialize registry
  await ProviderRegistry.init();

  // Pre-fetch models for default provider if none saved
  if (!_activeModelId) {
    try {
      const provider = await getActiveProvider();
      const models = await provider.fetchModels();
      if (models.length > 0) {
        // Pick a reasonable default
        const preferred = models.find(m =>
          m.id.includes('gpt-5') || m.id.includes('gpt-4o') || m.id.includes('sonnet')
        ) || models[0];

        _activeModelId = preferred.id;
        await store.setSetting('active_model', _activeModelId);

        emit('model:changed', { modelId: _activeModelId, modelName: preferred.name });
      }
    } catch {
      // Model fetch can fail on first run — that's OK
      _activeModelId = 'gpt-4o';
    }
  }

  emit('providers:ready', { activeProvider: _activeProviderId, activeModel: _activeModelId });
}

// ─── Exports ─────────────────────────────────────────────────

export {
  // Classes
  Provider,
  ProviderRegistry,

  // Constants
  CAP,
  ENDPOINTS,
  PROVIDER_DEFAULTS,
  DEFAULT_PROVIDER_ID,

  // Active state
  getActiveProvider,
  getActiveProviderId,
  setActiveProvider,
  getActiveModelId,
  getActiveModelConfig,
  setActiveModel,

  // Core functions
  chatCompletion,
  buildSystemPrompt,
  inferCapabilities,
  formatModelName,

  // Lifecycle
  init
};