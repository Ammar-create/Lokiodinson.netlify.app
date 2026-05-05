# Theatro — API Providers

Complete documentation for LLM provider integrations.

---

## Provider Overview

| Provider | ID | Default Status | Key Storage |
|----------|-----|----------------|-------------|
| Pollinations | `P` | ✅ Default (works instantly) | Publishable `pk_` key in code |
| Aqua | `A` | 🔐 User-supplied | IndexedDB |
| Custom | `custom-N` | 🔐 User-supplied | IndexedDB |

---

## Pollinations (Provider P)

### Configuration
```javascript
{
  name: 'Pollinations',
  id: 'P',
  baseUrl: 'https://text.pollinations.ai',
  imageUrl: 'https://image.pollinations.ai',
  audioUrl: 'https://audio.pollinations.ai',
  key: 'pk_XXXXX', // Publishable key, safe in client
  rateLimit: {
    creditsPerHour: 0.4, // Account-level limit
    note: 'Model-specific limits are per 1 credit, multiply by 0.4'
  }
}
```

### Endpoints

#### Chat Completions
```
POST /v1/chat/completions
```

Request:
```json
{
  "model": "llama-scout",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": true
}
```

#### Image Generation
```
GET /image/{prompt}?width=1024&height=1024&seed=42&nologo=true
```

#### TTS
```
GET /audio/{text}?voice=emma&language=en
```

### Available Models (Text)

| Model | ID | Use Case | Rate Limit |
|-------|-----|----------|------------|
| Llama 4 Scout | `llama-scout` | Characters, Controllers | Per-account |
| Llama 4 Maverick | `llama-4` | Premium characters | Per-account |
| Mistral Small 3.1 | `mistral` | Fallback character | Per-account |
| GPT-5.4 Nano | `gpt-5.4-nano` | Fast controllers | Per-account |
| Gemini Flash 2.5 | `gemini-flash` | Alternative | Per-account |
| Qwen 3 TTS Flash | `qwen3-tts-flash` | TTS generation | Per-account |

### Available Models (Image)

| Model | ID | Notes |
|-------|-----|-------|
| ZImage | `zimage` | Default image gen |

### Rate Limit Handling

```javascript
// Client-side tracking
let creditsUsed = 0;
const creditsPerHour = 0.4;

function checkRateLimit() {
  const remaining = creditsPerHour - creditsUsed;
  const percentUsed = (creditsUsed / creditsPerHour) * 100;
  
  if (percentUsed >= 80) {
    showWarning('Approaching rate limit. Consider adding Aqua key.');
  }
  
  return remaining > 0;
}
```

---

## Aqua (Provider A)

### Configuration
```javascript
{
  name: 'Aqua',
  id: 'A',
  baseUrl: 'https://api.aqua.ai/v1',
  key: null, // User must supply
  models: {
    text: ['grok-4.1-thinking', 'grok-4.2', 'grok', 'llama-4'],
    image: [],
    audio: []
  }
}
```

### User Key Flow

1. User visits Settings → Providers
2. Pastes Aqua API key
3. Key validated with test request
4. Stored encrypted in IndexedDB
5. Premium models become available

### Available Models (Text)

| Model | ID | Tier | Use Case |
|-------|-----|------|----------|
| Grok 4.1 Thinking | `grok-4.1-thinking` | Standard | Main Controller |
| Grok 4.2 | `grok-4.2` | Standard | Scenario Controller |
| Grok 4 Fast | `grok` | Standard | Creative Controller |
| Llama 4 Maverick | `llama-4` | Standard | Premium characters |

### Model Assignment Strategy

```javascript
// Default assignments
const DEFAULT_ASSIGNMENTS = {
  // Pollinations only
  characters: { primary: 'llama-scout', fallback: 'mistral' },
  mainController: 'llama-scout',
  scenarioController: 'llama-scout',
  creativeController: 'llama-scout',
  image: 'zimage',
  tts: 'qwen3-tts-flash',
  stt: 'whisper-large-v3',
  
  // With Aqua key
  charactersAqua: { primary: 'llama-4', fallback: 'llama-scout' },
  mainControllerAqua: 'grok-4.1-thinking',
  scenarioControllerAqua: 'grok-4.2',
  creativeControllerAqua: 'grok'
};
```

---

## Custom Provider

### Configuration
```javascript
{
  name: 'My OpenAI API',
  id: 'custom-1',
  baseUrl: 'https://api.openai.com/v1',
  key: 'sk-...',
  models: [], // Auto-fetched from /v1/models
  compatibility: 'openai' // or 'generic'
}
```

### OpenAI-Compatible Requirements

Must support:
- `POST /v1/chat/completions` with streaming (SSE)
- `GET /v1/models` (optional, for auto-discovery)
- Standard message format: `{role, content}`

---

## Provider Implementation

### Provider Base Class

```javascript
// providers/providerBase.js
class ProviderBase {
  constructor(config) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
  }
  
  // Required
  async chatComplete(messages, options)
  async chatStream(messages, onChunk, options)
  
  // Optional
  async generateImage(prompt, options)
  async textToSpeech(text, voice)
  async speechToText(audioBlob)
  async fetchModels()
  
  // Utilities
  getHeaders() { return { 'Authorization': `Bearer ${this.config.key}` }; }
  handleError(response) { ... }
}
```

### Adding a New Provider

```javascript
// providers/myProvider.js
import { ProviderBase } from './providerBase.js';

class MyProvider extends ProviderBase {
  async chatComplete(messages, options) {
    const response = await fetch(`${this.config.baseUrl}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ messages, ...options })
    });
    
    if (!response.ok) {
      throw new ProviderError(response.status, await response.text());
    }
    
    return response.json();
  }
  
  async chatStream(messages, onChunk, options) {
    const response = await fetch(`${this.config.baseUrl}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ messages, stream: true, ...options })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Parse SSE or NDJSON
      onChunk(this.parseChunk(chunk));
    }
  }
}
```

---

## Error Handling

### Provider Errors

```javascript
class ProviderError extends Error {
  constructor(status, message, provider) {
    super(message);
    this.status = status;
    this.provider = provider;
    this.retryable = status >= 500 || status === 429;
  }
}
```

### Retry Strategy

```javascript
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, backoffMs = 1000 } = options;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!err.retryable || i === maxRetries - 1) throw err;
      
      const delay = backoffMs * Math.pow(2, i);
      await sleep(delay);
    }
  }
}
```

---

## Security Notes

- **Pollinations `pk_` key:** Safe in client code, limited scope
- **Aqua key:** Never logged, never in URLs, IndexedDB only
- **Custom keys:** Same handling as Aqua
- **No key transmission to our servers:** Direct browser → provider only