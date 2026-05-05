# Theatro — Storage Schema

Complete IndexedDB schema and data model documentation.

---

## Database Configuration

```javascript
const DB_CONFIG = {
  name: 'theatro_v1',
  version: 1,
  stores: [
    'characters',
    'scenarios', 
    'messages',
    'memories',
    'relationships',
    'settings',
    'providers',
    'cache',
    'media'
  ]
};
```

---

## Characters Store

Purpose: Character definitions (NPCs and user's character)

### Schema
```javascript
{
  id: 'char_7f8d3a2e',           // UUID
  
  // Identity
  name: 'Alice Chen',
  color: '#7c3aed',              // Hex color for UI
  
  // Personality
  personality: {
    summary: 'A brilliant but socially awkward physicist',
    traits: ['analytical', 'curious', 'socially awkward', 'kind'],
    speakingStyle: 'Precise, uses technical metaphors, occasionally pauses mid-sentence'
  },
  
  // Appearance (for images and visualization)
  appearance: {
    description: 'Mid-30s, Asian, glasses, messy bun, always has coffee stains',
    age: 34,
    distinctiveFeatures: ['wire-rimmed glasses', 'coffee-stained lab coat', 'constant pen behind ear']
  },
  
  // Voice settings
  voice: {
    gender: 'female',
    pitch: 'medium',
    pace: 'thoughtful',
    tone: 'earnest'
  },
  
  // Model assignment
  modelId: 'llama-scout',
  providerId: 'P',               // 'P' = Pollinations, 'A' = Aqua
  
  // Avatar
  avatar: {
    type: 'base64',              // 'base64' | 'url' | 'generated'
    data: 'data:image/png;base64,...', // or URL string
    generatedPrompt: '...'       // If AI-generated
  },
  
  // Special flags
  isUser: false,                 // Only one true across app
  isArchived: false,             // Soft delete
  
  // Metadata
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z'
}
```

### Indexes
- `name` — For search
- `isUser` — For finding user's character
- `isArchived` — For filtering
- `updatedAt` — For sorting

---

## Scenarios Store

Purpose: Roleplay scenarios/sessions

### Schema
```javascript
{
  id: 'scn_9a4b2c1d',
  
  // Basic info
  name: 'The Hidden Lab',
  lore: 'A secret research facility where strange experiments are conducted...',
  
  // Characters in this scenario
  characterIds: ['char_7f8d3a2e', 'char_3b2c9d1a'],
  
  // Scenario-specific settings (override globals)
  settings: {
    aiKnowsUser: false,          // AI treats user as regular character
    autoImage: false,            // Auto-generate images
    autoTTS: false,              // Auto-generate voice
    controllerFrequency: 10,     // Override global
    autoScenario: false          // Auto-play mode
  },
  
  // References (not embedded — separate stores)
  messageIds: ['msg_001', 'msg_002', 'msg_003'],
  
  // Layer 2: Long-term summary
  summary: {
    version: 1,
    lastUpdated: '2026-01-15T14:30:00Z',
    mainEvents: [...],
    themes: [...],
    mood: '...',
    locationsVisited: [...],
    timeElapsed: '...'
  },
  
  // Layer 3: Relationship matrix (embedded for quick access)
  matrix: {
    'char_a→char_b': { mood, intensity, reason },
    // ...
  },
  
  // Branching
  parentId: null,                // If branched from another scenario
  branchPoint: null,             // Message ID where branch occurred
  
  // Scene state
  scene: {
    location: 'Laboratory B',
    time: 'Late night',
    weather: null,
    atmosphere: 'Tense, flickering lights'
  },
  
  // Metadata
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T14:30:00Z',
  lastAccessedAt: '2026-01-15T14:30:00Z'
}
```

### Indexes
- `characterIds` (multiEntry) — Find scenarios containing a character
- `parentId` — Find branches of a scenario
- `updatedAt` — Sort by recent
- `lastAccessedAt` — Sort by activity

---

## Messages Store

Purpose: Individual chat messages

### Schema
```javascript
{
  id: 'msg_a1b2c3d4',
  
  // References
  scenarioId: 'scn_9a4b2c1d',
  characterId: 'char_7f8d3a2e',  // null for user messages if user has no character
  
  // Content
  content: 'I think I've found something...',
  actions: '*adjusts glasses nervously*', // Separate from dialogue
  
  // Formatting
  formatted: '...',              // Pre-formatted version
  
  // Media
  imageUrl: 'data:image/...',    // Generated or uploaded image
  audioUrl: 'data:audio/...',    // Generated TTS
  
  // Privacy
  isPrivateBetween: ['char_a', 'char_b'], // null = public to all present
  
  // Context
  location: 'Laboratory B',      // Where this happened
  timestamp: '2026-01-15T14:30:00Z',
  
  // Generation metadata
  generation: {
    model: 'llama-scout',
    provider: 'P',
    tokensUsed: 150,
    generationTime: 2300,          // ms
    temperature: 0.7
  },
  
  // User interactions
  userActions: {
    regenerated: false,
    regeneratedFrom: null,
    branched: false,
    bookmarked: false
  }
}
```

### Indexes
- `scenarioId` — Get all messages in scenario
- `characterId` — Get all messages by character
- `timestamp` — Chronological sorting
- `isPrivateBetween` (multiEntry) — Find private messages

---

## Memories Store

Purpose: Character private memory (Layer 3)

### Schema
```javascript
{
  id: 'char_a:scn_9a4b2c1d',     // `${characterId}:${scenarioId}`
  
  characterId: 'char_7f8d3a2e',
  scenarioId: 'scn_9a4b2c1d',
  
  events: [
    {
      id: 'mem_001',
      timestamp: '2026-01-15T14:00:00Z',
      type: 'witnessed',         // witnessed | heard | inferred
      
      // What they know
      description: 'I found a strange device in the lab',
      
      // Emotional context
      emotionalImpact: 'curious and uneasy',
      
      // Who was involved
      relatedCharacters: ['char_3b2c9d1a'],
      
      // Certainty level
      knowledge: 'full',           // full | partial | inferred
      
      // Source (if heard)
      sourceCharacterId: null,
      
      // Related message
      messageId: 'msg_001'
    }
  ],
  
  // Reference tracking
  witnessedMessageIds: ['msg_001', 'msg_002'],
  
  // Metadata
  lastUpdated: '2026-01-15T14:30:00Z'
}
```

### Indexes
- `characterId` — Get all memories for a character
- `scenarioId` — Get all memories in a scenario

---

## Relationships Store

Purpose: N² relationship matrix per scenario

### Schema
```javascript
{
  scenarioId: 'scn_9a4b2c1d',     // Also the key
  
  matrix: {
    'char_alice→char_bob': {
      mood: 'hostile',
      intensity: 0.9,
      reason: 'Discovered hidden truth',
      history: [
        {
          timestamp: '2026-01-15T14:00:00Z',
          mood: 'friendly',
          intensity: 0.7,
          reason: 'Shared coffee',
          triggeredBy: 'msg_001'
        },
        {
          timestamp: '2026-01-15T14:30:00Z',
          mood: 'hostile',
          intensity: 0.9,
          reason: 'Discovered hidden truth',
          triggeredBy: 'msg_010'
        }
      ]
    }
  },
  
  lastUpdated: '2026-01-15T14:30:00Z'
}
```

---

## Settings Store

Purpose: Global application settings

### Schema
```javascript
{
  id: 'global',
  
  version: 1,                    // For migrations
  
  // Provider configuration
  providers: {
    P: {
      enabled: true,
      key: 'pk_...',             // Pollinations publishable key
      models: {
        chat: 'llama-scout',
        image: 'zimage',
        tts: 'qwen3-tts-flash',
        stt: 'whisper-large-v3'
      }
    },
    A: {
      enabled: false,
      key: null,                 // User-supplied, encrypted at rest
      models: {
        mainController: 'grok-4.1-thinking',
        scenarioController: 'grok-4.2',
        creativeController: 'grok',
        characters: 'llama-4'
      }
    },
    custom: []                   // { name, baseUrl, key, models: {} }
  },
  
  // Controller settings
  controllers: {
    main: {
      enabled: true,
      frequency: 10,             // Messages between runs
      model: 'llama-scout',
      customPrompt: null
    },
    scenario: {
      enabled: true,
      model: 'llama-scout',
      customPrompt: null
    },
    creative: {
      model: 'llama-scout',
      customPrompt: null
    },
    media: {
      autoImage: false,
      autoTTS: false
    }
  },
  
  // Memory settings
  memory: {
    shortTermWindow: 30,
    summaryFrequency: 10,
    matrixUpdateFrequency: 10
  },
  
  // Chat behavior
  chat: {
    autoScenarioSpeed: 2000,     // ms between messages
    streaming: true,
    typewriterSpeed: 30,         // ms per character
    userColor: '#3b82f6'         // Global user color
  },
  
  // Appearance
  appearance: {
    theme: 'dark',               // 'dark' | 'light' | 'system'
    font: 'system',
    sidePanelDefaultOpen: true,
    roleplayFormat: 'standard'   // 'standard' | 'compact'
  },
  
  // Voice & Audio
  audio: {
    micDevice: null,             // Device ID or null for default
    silenceThreshold: 500,       // ms
    ttsSpeed: 1.0,
    ttsAutoPlay: false
  },
  
  // Privacy & Storage
  privacy: {
    autoSave: true,
    saveFrequency: 5000,         // ms
    analyticsEnabled: false
  },
  
  // Advanced
  advanced: {
    debugVisible: false,
    showControllerOutput: false,
    showTokenCounts: false,
    showTiming: false,
    promptEditing: false,
    consoleLogging: false
  },
  
  // Prompt versions (for tracking custom prompts)
  prompts: {
    mainController: { version: 1, custom: null },
    scenarioController: { version: 1, custom: null },
    creativeController: { version: 1, custom: null },
    mediaController: { version: 1, custom: null },
    character: { version: 1, custom: null }
  },
  
  lastModified: '2026-01-15T14:30:00Z'
}
```

---

## Providers Store

Purpose: Cached provider metadata

### Schema
```javascript
{
  id: 'pollinations_models',
  providerId: 'P',
  lastFetched: '2026-01-15T14:30:00Z',
  models: [
    {
      id: 'llama-scout',
      name: 'Llama 4 Scout 17B 16E',
      type: 'chat',
      contextWindow: 128000,
      capabilities: ['chat', 'code'],
      description: 'Fast, efficient general model'
    }
  ],
  etag: '...'                    // For conditional requests
}
```

---

## Cache Store

Purpose: Temporary caching for non-critical data

### Schema
```javascript
{
  id: 'tts:abc123',
  type: 'tts',
  key: 'hash of text+voice',
  data: 'data:audio/mp3;base64,...',
  createdAt: '2026-01-15T14:30:00Z',
  expiresAt: '2026-02-15T14:30:00Z'
}
```

---

## Media Store

Purpose: Generated and uploaded media

### Schema
```javascript
{
  id: 'media_abc123',
  type: 'image',                 // 'image' | 'audio'
  
  // Data
  data: 'data:image/png;base64,...',
  
  // Metadata
  prompt: '...',                 // Generation prompt
  model: 'zimage',
  characterId: 'char_7f8d3a2e',  // If character-specific
  scenarioId: 'scn_9a4b2c1d',
  messageId: 'msg_001',
  
  createdAt: '2026-01-15T14:30:00Z'
}
```

---

## Migrations

### Version 1 (Initial)
```javascript
const MIGRATIONS = {
  1: async (db) => {
    // Create all stores
    const stores = ['characters', 'scenarios', 'messages', 'memories', 
                    'relationships', 'settings', 'providers', 'cache', 'media'];
    
    for (const storeName of stores) {
      const store = db.createObjectStore(storeName, { keyPath: 'id' });
      
      // Add indexes per schema
      switch (storeName) {
        case 'characters':
          store.createIndex('isUser', 'isUser', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          break;
        case 'messages':
          store.createIndex('scenarioId', 'scenarioId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          break;
        // ... etc
      }
    }
    
    // Insert default settings
    await store.put('settings', DEFAULT_SETTINGS);
  }
};
```

---

## Export/Import Format

### Full Export
```javascript
{
  version: 'theatro-1.0',
  exportedAt: '2026-01-15T14:30:00Z',
  
  settings: { ... },
  characters: [ ... ],
  scenarios: [ ... ],
  messages: [ ... ],          // All messages
  memories: [ ... ],
  relationships: [ ... ],
  media: [ ... ]              // Base64 encoded
}
```

### Scenario-Only Export
```javascript
{
  version: 'theatro-scenario-1.0',
  exportedAt: '...',
  
  scenario: { ... },
  characters: [ ... ],        // Only characters in scenario
  messages: [ ... ],          // Only messages in scenario
  memories: [ ... ],          // Only relevant memories
  relationships: { ... },     // Matrix for this scenario
  media: [ ... ]
}
```