# Theatro — Memory System

Detailed documentation for the three-layer memory architecture.

---

## Overview

Theatro uses a three-layer memory system to maintain narrative coherence while respecting character perspective and privacy.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Short-Term (Prompt Context)                      │
│  • Last N messages (default: 30)                           │
│  • Directly injected into prompts                          │
│  • Respects privacy — characters only see witnessed events │
│  • Temporarily held in memory, not stored long-term        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Long-Term Summary                                 │
│  • Condensed narrative maintained by Main Controller         │
│  • Key events, plot developments, revelations                │
│  • Injected as context for continuity                      │
│  • Stored per-scenario in IndexedDB                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Character Private Memory                          │
│  • Events personally witnessed by this character             │
│  • "I saw Alice argue with Bob" vs "I heard they fought"     │
│  • Creates distinct character knowledge and perspective      │
│  • Stored per-character per-scenario in IndexedDB          │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Short-Term Memory

### Purpose
Immediate conversational context. What just happened that the character needs to respond to.

### Implementation
```javascript
// characters/characterEngine.js
function buildCharacterContext(character, scenario, recentMessages) {
  // Filter to only messages this character witnessed
  const witnessedMessages = recentMessages.filter(msg => 
    isMessageWitnessedBy(msg, character.id)
  );
  
  // Format for prompt
  return witnessedMessages.map(msg => ({
    role: msg.characterId === character.id ? 'assistant' : 'user',
    content: formatMessageForPrompt(msg),
    timestamp: msg.timestamp
  }));
}
```

### Privacy Enforcement
```javascript
function isMessageWitnessedBy(message, characterId) {
  // If message has isPrivateBetween, character must be in the list
  if (message.isPrivateBetween?.length > 0) {
    return message.isPrivateBetween.includes(characterId);
  }
  
  // Otherwise, all characters present in scene witnessed it
  return isCharacterPresent(message.timestamp, characterId);
}
```

### Configuration
```javascript
// config/defaults.js
const MEMORY_CONFIG = {
  shortTerm: {
    windowSize: 30,      // Number of messages
    maxAge: null,        // No age limit (count-based)
    includeActions: true // Include *italic* actions
  }
};
```

---

## Layer 2: Long-Term Summary

### Purpose
Narrative continuity across long conversations. Characters "remember" key events even if they're outside the short-term window.

### Structure
```javascript
// scenarios.summary
{
  version: 1,
  lastUpdated: '2026-01-15T14:30:00Z',
  mainEvents: [
    {
      timestamp: '2026-01-15T14:00:00Z',
      description: 'Alice discovered the hidden letter in Bob's desk',
      involved: ['char_alice', 'char_bob'],
      significance: 'major' // major | minor | background
    },
    {
      timestamp: '2026-01-15T14:15:00Z',
      description: 'Maya overheard the argument from the hallway',
      involved: ['char_maya'],
      significance: 'minor',
      privateTo: ['char_maya'] // Only some characters know this happened
    }
  ],
  themes: ['betrayal', 'secrets', 'growing tension'],
  mood: 'suspenseful, tempers flaring',
  locationsVisited: ['The Office', 'The Hallway'],
  timeElapsed: 'Approximately 45 minutes'
}
```

### Update Process
```javascript
// controllers/mainController.js
async function updateSummary(scenario, recentMessages) {
  const prompt = buildSummaryPrompt(scenario.summary, recentMessages);
  
  const result = await provider.complete({
    model: config.models.mainController,
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  });
  
  const updates = JSON.parse(result);
  
  // Merge with existing summary
  scenario.summary.mainEvents.push(...updates.newEvents);
  scenario.summary.themes = updates.updatedThemes;
  scenario.summary.mood = updates.currentMood;
  
  // Save to storage
  await storage.set('scenarios', scenario.id, scenario);
}
```

### Summary Prompt
```
You are updating the long-term summary for a roleplay scenario.

## Current Summary
{existing summary}

## Recent Messages
{last 10 messages}

## Task
1. Identify any new significant events
2. Update ongoing themes
3. Assess current mood/atmosphere
4. Note any location/time changes

## Output Format
{
  "newEvents": [
    {
      "timestamp": "ISO timestamp",
      "description": "What happened",
      "involved": ["charId1", "charId2"],
      "significance": "major|minor|background"
    }
  ],
  "updatedThemes": ["theme1", "theme2"],
  "currentMood": "description of atmosphere",
  "notes": "any additional context"
}
```

---

## Layer 3: Character Private Memory

### Purpose
Distinct character knowledge. Characters remember different things based on what they personally experienced.

### Structure
```javascript
// memories collection
{
  characterId: 'char_alice',
  scenarioId: 'scenario_123',
  events: [
    {
      timestamp: '2026-01-15T14:00:00Z',
      type: 'witnessed',     // witnessed | heard | inferred
      description: 'I found a letter in Bob's desk drawer',
      emotionalImpact: 'shocked and betrayed',
      relatedCharacters: ['char_bob'],
      knowledge: 'full'      // full | partial | inferred
    },
    {
      timestamp: '2026-01-15T14:20:00Z',
      type: 'inferred',
      description: 'Bob seems nervous. I think he knows I found something.',
      emotionalImpact: 'suspicious',
      relatedCharacters: ['char_bob'],
      knowledge: 'inferred'
    }
  ],
  witnessed: ['msg_001', 'msg_002', 'msg_005'] // Message IDs
}
```

### Event Types

**witnessed** — Character directly saw/heard this
```javascript
{
  type: 'witnessed',
  description: 'I saw Jordan crying in the garden',
  knowledge: 'full'
}
```

**heard** — Character was told about this (secondhand)
```javascript
{
  type: 'heard',
  description: 'Alice told me that Bob has been lying',
  source: 'char_alice',
  knowledge: 'partial' // May be incomplete or biased
}
```

**inferred** — Character deduced this
```javascript
{
  type: 'inferred',
  description: 'Based on how everyone is acting, something happened while I was away',
  knowledge: 'inferred'
}
```

### Privacy Boundaries
```javascript
// When building a character's context
async function getCharacterKnowledge(characterId, scenarioId) {
  const memory = await storage.get('memories', `${characterId}:${scenarioId}`);
  
  // Filter to events this character knows about
  const knownEvents = memory.events.filter(event => 
    event.knowledge !== 'inferred' || characterIncludesInferences(characterId)
  );
  
  return knownEvents.map(event => event.description).join('\n');
}
```

### Memory Creation
Memories are created when:
1. Character witnesses a message (Layer 1 → Layer 3)
2. Main Controller updates with new events
3. Character is told something by another character
4. Eavesdropping event occurs

---

## Relationship Matrix

### Purpose
Track how each character feels about every other character.

### Structure
```javascript
// relationships collection
{
  scenarioId: 'scenario_123',
  matrix: {
    // Format: "fromId→toId"
    "char_alice→char_bob": {
      mood: 'hostile',
      intensity: 0.9,        // 0.0 to 1.0
      reason: 'Discovered Bob was hiding information about her sister',
      history: [
        { timestamp: '2026-01-10', mood: 'friendly', intensity: 0.7, event: 'Shared coffee' },
        { timestamp: '2026-01-15', mood: 'suspicious', intensity: 0.5, event: 'Bob was evasive' },
        { timestamp: '2026-01-15', mood: 'hostile', intensity: 0.9, event: 'Discovered the letter' }
      ]
    },
    "char_bob→char_alice": {
      mood: 'guilty',
      intensity: 0.8,
      reason: 'Caught hiding the truth',
      history: [...]
    }
  }
}
```

### Mood Categories
```javascript
const MOOD_CATEGORIES = {
  positive: ['friendly', 'trusting', 'romantic', 'grateful', 'impressed', 'protective'],
  negative: ['hostile', 'suspicious', 'jealous', 'angry', 'disappointed', 'resentful'],
  neutral: ['curious', 'cautious', 'indifferent', 'confused']
};
```

### Intensity Scale
- `0.0-0.3` — Faint, easily changed
- `0.3-0.6` — Moderate, notable
- `0.6-0.8` — Strong, influences behavior
- `0.8-1.0` — Intense, drives major decisions

### Updates
Matrix updates occur:
1. Main Controller analysis (primary)
2. Direct interaction events
3. User manual adjustment (via side panel)

---

## Prompt Integration

### Building Character Context
```javascript
function buildFullContext(character, scenario) {
  const parts = [];
  
  // 1. Long-term summary (condensed)
  parts.push(`## Story So Far\n${condenseSummary(scenario.summary)}`);
  
  // 2. Your relationships
  const relationships = getCharacterRelationships(character.id, scenario.id);
  parts.push(`## How You Feel About Others\n${formatRelationships(relationships)}`);
  
  // 3. What you remember (private memory)
  const memories = getCharacterPrivateMemory(character.id, scenario.id);
  parts.push(`## What You Remember\n${memories.join('\n')}`);
  
  // 4. Recent context (short-term)
  const recent = getRecentWitnessedMessages(character.id, scenario.id);
  parts.push(`## Recent Events\n${formatMessages(recent)}`);
  
  return parts.join('\n\n');
}
```

### Example Output
```
## Story So Far
Alice discovered a hidden letter in Bob's desk, revealing he knew about her sister's whereabouts. Tensions are high, trust is broken. Maya overheard the confrontation from the hallway.

## How You Feel About Others
- Bob: hostile (0.9/1.0) — He hid the truth about my sister
- Maya: neutral (0.2/1.0) — Haven't interacted much

## What You Remember
- [14:00] I found a letter in Bob's desk drawer. I felt shocked and betrayed.
- [14:15] I confronted Bob. He tried to explain but stumbled over his words.
- [14:20] Maya was nearby. I think she might have heard us.

## Recent Events
Alice: "How could you keep this from me?"
Bob: "I was trying to protect you. I didn't know how to tell you."
Alice: *slams hand on desk* "Protect me? You lied to my face!"
```

---

## Storage Schema

```javascript
// IndexedDB stores
const STORES = {
  memories: {
    keyPath: 'id', // `${characterId}:${scenarioId}`
    indexes: [
      { name: 'characterId', keyPath: 'characterId' },
      { name: 'scenarioId', keyPath: 'scenarioId' }
    ]
  },
  relationships: {
    keyPath: 'scenarioId',
    indexes: []
  },
  scenarios: {
    keyPath: 'id',
    indexes: [
      { name: 'updatedAt', keyPath: 'updatedAt' }
    ]
  }
};
```

---

## Memory Controls

### User-Editable Elements
1. **Long-term summary** — User can edit directly (correct errors, add context)
2. **Private memories** — User can view (read-only by default, editable in debug mode)
3. **Relationship matrix** — Read-only view, manual adjustment in advanced settings

### Clear Memory
Users can:
- Clear short-term (soft reset — keeps summaries)
- Clear all memories for a character (hard reset)
- Clear entire scenario memory (nuclear option)
- Export/import memory data