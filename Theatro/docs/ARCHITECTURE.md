# Theatro — Architecture Overview

This document describes the technical architecture of Theatro in detail.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (Screens)                      │
│  Dashboard | Chat | Settings | Creation Forms               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│  scenarioService | characterService | chatService          │
│  memoryService | settingsService | exportService           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Core Layer (State)                         │
│  eventBus | stateManager | router | lifecycle               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────┐
│  Controllers  │   │  Provider Layer  │   │    Storage   │
│  Main         │   │  Registry        │   │  Adapter     │
│  Scenario     │◄──┤  Pollinations    │   │  IndexedDB   │
│  Creative     │   │  Aqua            │   │  (Swappable) │
│  Media        │   │  Custom          │   │              │
│  Queue        │   │  StreamHandler   │   │              │
└───────────────┘   └──────────────────┘   └──────────────┘
```

---

## Layer Communication Rules

### 1. UI Never Calls Providers Directly
**Bad:**
```javascript
// ❌ Wrong
uiButton.onclick = () => pollinations.sendMessage(...)
```

**Good:**
```javascript
// ✅ Correct
uiButton.onclick = () => chatService.sendMessage(...)
// chatService → providerService → providerRegistry → pollinations
```

### 2. Services Never Touch the DOM
Services are pure logic. They emit events via EventBus.

**Bad:**
```javascript
// ❌ Wrong
class ChatService {
  displayMessage(msg) {
    document.getElementById('chat').appendChild(...)  // NO!
  }
}
```

**Good:**
```javascript
// ✅ Correct
class ChatService {
  displayMessage(msg) {
    eventBus.emit('message:received', msg)  // UI listens and renders
  }
}
```

### 3. Controllers Never Know Which Provider Runs Them
Controllers specify model requirements. ProviderRegistry decides.

**Bad:**
```javascript
// ❌ Wrong
class MainController {
  async run() {
    const result = await pollinations.complete({...})  // NO!
  }
}
```

**Good:**
```javascript
// ✅ Correct
class MainController extends ControllerBase {
  async run() {
    const result = await this.complete({  // Uses providerRegistry internally
      model: this.config.models.mainController,
      messages: this.buildPrompt()
    })
  }
}
```

### 4. Storage Always Behind Adapter
IndexedDB today, cloud tomorrow — same API.

```javascript
// storage/storageAdapter.js
export const storage = {
  async get(collection, id) { ... },
  async set(collection, id, data) { ... },
  async query(collection, filters) { ... },
  async delete(collection, id) { ... }
}
```

### 5. Cross-Module Communication via Event Bus
No tight coupling. Modules listen to events they care about.

```javascript
// Publisher
eventBus.emit('character:moodChanged', { characterId, mood, reason })

// Subscriber
eventBus.on('character:moodChanged', ({ characterId, mood }) => {
  sidePanel.updateCharacterMood(characterId, mood)
})
```

---

## Core Modules

### Event Bus
Pub/sub system for decoupled communication.

```javascript
// core/eventBus.js
export const eventBus = {
  on(event, handler),
  off(event, handler),
  emit(event, data),
  once(event, handler)
}
```

### State Manager
Single source of truth for application state.

```javascript
// core/stateManager.js
export const stateManager = {
  get(path),           // Get nested value: stateManager.get('settings.theme')
  set(path, value),    // Set nested value
  subscribe(path, callback),
  getSnapshot()         // Full state for debugging
}
```

State structure:
```javascript
{
  app: { initialized, currentScreen, loading },
  settings: { /* global settings */ },
  scenario: { /* current scenario */ },
  chat: { messages, isStreaming, autoScenarioRunning },
  ui: { sidePanelOpen, activeTab, toasts: [] }
}
```

### Router
Client-side navigation without page reloads.

```javascript
// core/router.js
router.navigate('/chat', { scenarioId: 'abc123' })
router.back()
router.currentRoute  // { path, params, query }
```

### Lifecycle
App initialization and cleanup coordination.

```javascript
// core/lifecycle.js
lifecycle.register('storage', () => storageAdapter.init())
lifecycle.register('providers', () => providerRegistry.init())
lifecycle.start()  // Runs all init phases in order
```

---

## Controller System

### Controller Base Class

```javascript
// controllers/controllerBase.js
class ControllerBase {
  constructor(config)
  
  // Core methods
  async complete(options)  // Call LLM via providerRegistry
  async parseJSON(response)  // Robust JSON parsing with retry
  buildSystemPrompt()
  
  // Event hooks
  onStart()
  onComplete(result)
  onError(error)
}
```

### Controller Queue
Manages sequential execution to prevent race conditions.

```javascript
// controllers/controllerQueue.js
const queue = new ControllerQueue()

queue.enqueue({
  type: 'character',
  characterId: 'char1',
  execute: async () => { ... }
})

queue.enqueue({
  type: 'mainController',
  execute: async () => { ... }
})

// Executes strictly in order, never parallel
```

---

## Provider System

### Provider Registry

```javascript
// providers/providerRegistry.js
export const providerRegistry = {
  register(provider)
  getProviderForModel(modelId)
  getProvider(name)
  listAvailableModels()
  
  // Main API
  async complete({ model, messages, temperature, ... })
  async stream({ model, messages, onChunk })
  async generateImage({ prompt, ... })
  async textToSpeech({ text, voice, ... })
  async speechToText({ audio, ... })
}
```

### Provider Implementations

Each provider extends `ProviderBase`:

```javascript
// providers/providerBase.js
class ProviderBase {
  constructor(config)
  
  // Required implementations
  async chatComplete(messages, options)
  async chatStream(messages, options)
  async generateImage(prompt, options)
  async textToSpeech(text, voice)
  async speechToText(audioBlob)
  
  // Optional
  async fetchModels()
  getRateLimitStatus()
}
```

### Stream Handler
Normalizes streaming across different provider implementations.

```javascript
// providers/streamHandler.js
export async function* handleStream(response) {
  // Normalizes SSE, NDJSON, etc. into consistent chunk format
  yield { type: 'content', text: '...' }
  yield { type: 'content', text: '...' }
}
```

---

## Character System

### Character Engine

```javascript
// characters/characterEngine.js
export const characterEngine = {
  // Generation
  async generateResponse(character, context)
  
  // Memory
  getPrivateMemory(characterId, scenarioId)
  addToPrivateMemory(characterId, scenarioId, event)
  
  // Prompt building
  buildCharacterPrompt(character, context, options)
  
  // Persona enforcement
  async checkInCharacter(character, message)
  async correctOutOfCharacter(character, message)
}
```

### Relationship Matrix

```javascript
// characters/relationshipMatrix.js
export const relationshipMatrix = {
  get(scenarioId, fromId, toId)  // Returns { mood, intensity, reason }
  set(scenarioId, fromId, toId, data)
  updateFromEvent(scenarioId, fromId, toId, eventType, context)
  getAllForCharacter(scenarioId, characterId)
}
```

Storage format:
```javascript
{
  scenarioId: "scenario123",
  matrix: {
    "alice→bob": { mood: "friendly", intensity: 0.7, reason: "Shared secret" },
    "bob→alice": { mood: "suspicious", intensity: 0.4, reason: "Caught lying" }
  }
}
```

---

## Memory System

### Three-Layer Architecture

```
┌────────────────────────────────────────────┐
│  Layer 1: Short-term (Prompt Context)     │
│  - Last N messages                         │
│  - Injected directly into prompts          │
│  - Respects privacy (witnessed only)        │
└────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│  Layer 2: Long-term Summary               │
│  - Condensed by Main Controller            │
│  - Key events, plot points                 │
│  - Injected as context                      │
└────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│  Layer 3: Character Private Memory        │
│  - Events witnessed by this character       │
│  - Used for personality consistency         │
│  - Stored per-character per-scenario        │
└────────────────────────────────────────────┘
```

---

## Media System

### Image Generator

```javascript
// media/imageGenerator.js
export const imageGenerator = {
  async generate({
    prompt,
    character,      // Optional: use character's appearance
    style,          // Optional: art style override
    size = '1024x1024'
  })
  
  buildPrompt(character, context, style)  // Prompt engineering
}
```

### TTS Engine

```javascript
// media/ttsEngine.js
export const ttsEngine = {
  async synthesize({
    text,
    voice,          // Voice preset
    speed = 1.0,
    emotion         // Emotional tone hint
  })
  
  // Caching
  getCacheKey(text, voice)
  getFromCache(key)
  addToCache(key, audioBlob)
}
```

### STT Engine

```javascript
// media/sttEngine.js
export const sttEngine = {
  async transcribe(audioBlob)
  
  // Recording
  startRecording()
  stopRecording()
  isRecording()
}
```

---

## Security Model

### API Key Handling

**Provider P (Pollinations):**
- Publishable `pk_` key safe in client code
- No server proxy needed

**Provider A (Aqua):**
- User-supplied key stored in IndexedDB
- Never logged, never transmitted except to provider API

**Custom Providers:**
- Same handling as Aqua
- Stored encrypted in IndexedDB (optional enhancement)

### Content Safety

- Characters have no content filter bypass
- Llama models chosen for appropriate balance
- User controls all content via settings

---

## Performance Considerations

### IndexedDB
- Batch writes where possible
- Indexed queries for message retrieval
- Lazy loading for old scenarios

### Provider Calls
- Exponential backoff for retries
- Parallel model fetching for comparison
- Streaming for responsive UX

### UI Rendering
- Virtual scrolling for long chats
- Debounced search/filter
- CSS containment for complex layouts

---

## Error Handling Strategy

### Levels

1. **Provider Level** — retry, fallback, graceful degradation
2. **Controller Level** — JSON parse retry, skip cycle if fails
3. **Service Level** — user-facing error messages, recovery options
4. **UI Level** — toast notifications, inline error states

### Recovery Patterns

```javascript
// Retry with exponential backoff
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxRetries - 1) throw err
      await delay(1000 * Math.pow(2, i))
    }
  }
}

// Fallback model
async function withFallback(primaryFn, fallbackFn) {
  try {
    return await primaryFn()
  } catch {
    return await fallbackFn()
  }
}
```