# Theatro — Controllers

Detailed documentation for the four-controller system.

---

## Overview

Theatro uses four specialized controllers to orchestrate the narrative experience:

```
┌─────────────────┐
│  Main Controller │ ← Every N messages
│  (Narrative DNA) │   Updates mood, matrix, summary
└────────┬────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Scenario Controller │◄────│  Creative Controller │
│   (Scene Director)   │     │  (Character Forge)   │
└────────┬────────────┘     └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Media Controller   │
│  (Asset Generator)   │
└─────────────────────┘
```

---

## Main Controller

### Purpose
The narrative brain. Maintains continuity, emotional coherence, and emergent story evolution.

### Responsibilities
- Read recent chat history
- Update character moods with causal reasoning
- Update relationship matrix (N² feelings)
- Maintain long-term summary
- Detect story beats and trigger scenario changes
- Detect out-of-character moments

### Trigger Conditions
1. **Message count**: Every N messages (default: 10, configurable)
2. **Manual**: User clicks "Run Controller" in side panel
3. **Directive**: User inputs "What happens next"
4. **Auto-trigger**: Dramatic moment detected (optional)

### Output Structure
```javascript
{
  summaryUpdate: {
    add: string[],        // New events to add to summary
    remove: string[],     // Outdated events to remove
    moodShift: string     // Overall tone change
  },
  characterUpdates: {
    [characterId]: {
      mood: string,       // Current emotional state
      moodReason: string, // Why they feel this way
      privateThoughts: string // Internal monologue
    }
  },
  relationshipUpdates: {
    [`${fromId}→${toId}`]: {
      mood: 'friendly' | 'hostile' | 'trusting' | 'suspicious' | ...,
      intensity: 0.0-1.0,
      reason: string
    }
  },
  directives: {
    whatHappensNext: string, // Guidance for Scenario Controller
    triggerScenario: boolean,
    reason: string
  }
}
```

### Mood Vocabulary

**Positive moods:**
- `friendly` — warm, approachable
- `trusting` — believes in someone
- `romantic` — attracted, interested romantically
- `grateful` — appreciative
- `impressed` — admiring qualities
- `protective` — wants to shield/defend

**Negative moods:**
- `hostile` — antagonistic, angry
- `suspicious` — distrustful, wary
- `jealous` — envious, possessive
- `disappointed` — let down
- `resentful` — bitter, holding grudge

**Neutral moods:**
- `curious` — interested, investigating
- `cautious` — careful, guarded
- `indifferent` — uncaring
- `confused` — uncertain, mixed feelings

---

## Scenario Controller

### Purpose
The scene director. Manages locations, time, weather, and dramatic events.

### Responsibilities
- Set and change scene (location, time, weather)
- Inject surprise events
- Handle eavesdropping (creates privacy)
- Coordinate character arrivals/departures
- Maintain dramatic pacing

### Trigger Conditions
1. **Main Controller request** — When narrative needs scene change
2. **Scenario creation** — Initial scene setup
3. **Manual trigger** — User requests in side panel
4. **Timer** — Time-based events (optional)

### Event Types

#### Surprise
Unexpected occurrence that disrupts the flow.
```javascript
{
  type: 'surprise',
  description: 'A glass shatters across the room',
  affectedCharacters: ['char1', 'char2'],
  consequences: ['char1 startles', 'char2 investigates']
}
```

#### Eavesdropping
Character overhears private conversation.
```javascript
{
  type: 'eavesdropping',
  description: 'Maya pauses outside the door, hearing the argument within',
  affectedCharacters: ['maya'],
  privateTo: ['maya'], // Only Maya knows she heard
  consequences: ['maya now knows the secret', 'maya feels conflicted']
}
```
**Effect:** Creates natural jealousy/aggression dynamics. The eavesdropper may act on information others don't know they have.

#### Arrival
Character enters scene.
```javascript
{
  type: 'arrival',
  description: 'The door swings open and Jordan enters, rain dripping from their coat',
  affectedCharacters: ['jordan'],
  consequences: ['jordan is now present', 'others react to arrival']
}
```

#### Departure
Character leaves scene.
```javascript
{
  type: 'departure',
  description: 'Without a word, Alex turns and walks out into the night',
  affectedCharacters: ['alex'],
  consequences: ['alex is no longer present', 'remaining characters react']
}
```

#### Discovery
Character finds something.
```javascript
{
  type: 'discovery',
  description: 'Beneath the floorboard, Sarah finds a rusted key',
  affectedCharacters: ['sarah'],
  consequences: ['sarah now possesses the key', 'key mystery introduced']
}
```

### Privacy Handling
Events marked `privateTo` create invisible context:
- Messages tagged with `isPrivateBetween: ['char1', 'char2']` are only seen by those characters
- Other characters receive filtered chat history
- Eavesdropping creates dramatic irony

---

## Creative Controller

### Purpose
Character forge. Auto-generates complete characters from brief prompts.

### Trigger
User request in character creation flow.

### Input
Brief description (e.g., "a mysterious bartender with a hidden past")

### Output
```javascript
{
  name: 'Elias Thorne',
  color: '#7c3aed',
  personality: {
    summary: 'A guarded but perceptive bartender who sees everything',
    traits: ['observant', 'secretive', 'empathetic', 'world-weary'],
    speakingStyle: 'Measured, rarely wastes words. Uses bar metaphors.'
  },
  appearance: {
    description: 'Late 40s, salt-and-pepper hair pulled back, scar above left eyebrow, always polishing a glass',
    age: 48,
    distinctiveFeatures: ['scar', 'perpetually polishing glass', 'intense gaze']
  },
  voice: {
    gender: 'male',
    pitch: 'low',
    pace: 'measured',
    tone: 'warm but guarded'
  },
  background: {
    origin: 'Former detective, left the force under mysterious circumstances',
    occupation: 'Bartender at The Rusty Anchor',
    secret: 'Knows who really committed the crime that ended his career'
  },
  suggestedModel: 'llama-scout',
  imagePrompt: 'A weathered man in his late 40s with salt-and-pepper hair pulled back, standing behind a dimly lit bar. He has a prominent scar above his left eyebrow and is absentmindedly polishing a whiskey glass. Warm amber lighting, noir atmosphere, cinematic composition. 8k, detailed, realistic.'
}
```

---

## Media Controller

### Purpose
Asset generator. Creates images and TTS with emotional awareness.

### Trigger
- Manual: User clicks 🖼️ or 🔊 on message
- Auto-mode: After every N messages (if enabled in settings)

### Image Generation

**Input:**
- Character appearances
- Scene context
- Action/moment to capture

**Output:**
```javascript
{
  prompt: 'Detailed image generation prompt',
  style: 'cinematic',
  composition: 'medium shot',
  lighting: 'dramatic side lighting'
}
```

**Process:**
1. Analyze scene and characters
2. Compose detailed prompt
3. Call image provider (default: Pollinations `zimage`)
4. Cache result as base64
5. Display inline in chat

### TTS Enhancement

**Input:**
- Raw message text
- Character voice profile
- Current mood

**Output:**
```javascript
{
  enhancedText: 'Text with emotional pacing',
  voice: 'voice_preset',
  speed: 1.0,
  emphasis: ['key', 'words']
}
```

**Process:**
1. Analyze emotional content
2. Add pacing hints (not SSML — provider-dependent)
3. Select appropriate voice
4. Call TTS provider
5. Cache and play audio

---

## Controller Queue

All controllers run through a strict sequential queue to prevent race conditions:

```javascript
class ControllerQueue {
  constructor() {
    this.queue = [];
    this.running = false;
  }
  
  async enqueue(job) {
    this.queue.push(job);
    if (!this.running) await this.process();
  }
  
  async process() {
    this.running = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      await this.execute(job);
    }
    this.running = false;
  }
}
```

**Job Types:**
- `character` — Character response generation
- `mainController` — Narrative analysis
- `scenarioController` — Scene management
- `mediaController` — Asset generation

**Priority:**
1. User messages (immediate)
2. Controllers (scheduled)
3. Media (background)

---

## Error Handling

### JSON Parse Failures
```javascript
async function safeControllerRun(controller, prompt) {
  try {
    const response = await provider.complete(prompt);
    return JSON.parse(response);
  } catch (parseError) {
    // Retry with stricter reminder
    const retryPrompt = prompt + '\n\nCRITICAL: Your last response was not valid JSON. Return ONLY valid JSON.';
    const response = await provider.complete(retryPrompt);
    return JSON.parse(response);
  }
}
```

### Skip on Failure
If controller fails after retry:
- Log error to Debug Panel
- Skip this cycle
- Resume normal chat flow
- User can manually retry

---

## Debug Panel

The side panel includes live controller streaming:

```
┌─────────────────────────────────────┐
│ 🐞 Debug Panel                       │
├─────────────────────────────────────┤
│ [14:32:01] Main Controller triggered│
│ [14:32:03] Analyzing 10 messages... │
│ [14:32:05] Summary updated ✓         │
│ [14:32:06] 3 relationship changes   │
│ [14:32:07] Requesting scenario...    │
│                                      │
│ [RAW OUTPUT]                         │
│ {                                    │
│   "summaryUpdate": {...},            │
│   ...                                │
│ }                                    │
└─────────────────────────────────────┘
```

Users can see:
- Controller trigger timestamps
- Processing steps
- Raw JSON output (if enabled in Advanced settings)
- Error details