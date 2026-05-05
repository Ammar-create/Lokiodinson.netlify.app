# Theatro — Project Blueprint

> A complete living narrative engine where AI characters remember, feel, and evolve.

---

## 🌟 Vision

Theatro is a living narrative engine where multiple AI characters — each with their own soul, voice, appearance, and emotional memory — interact with the user and with each other inside evolving stories.

### Three Core Principles

**1. Characters are people, not bots.**
They remember. They hold grudges. They feel jealousy, fall in love, misunderstand each other. They don't know they're AI. Each character has private memory — they only know what they personally witnessed.

**2. Stories drift naturally.**
No rigid scripts. The Scenario Controller drops surprises, overhears private conversations, pushes characters into unexpected places. The narrative evolves organically.

**3. The user is the director.**
Every behavior, threshold, model, color, voice, frequency is tunable in settings. You craft the experience, characters live it.

---

## 🏗️ Architecture

### Stack
- **Vite + Vanilla JS** — Zero framework overhead
- **IndexedDB** — Client-side storage, no backend
- **Netlify** — Static hosting

### Philosophy
- **Client-only, forever** — No backend we control. Ever.
- **Privacy-first** — All data lives in your browser
- **Zero dependencies** — No npm packages for core functionality

### Four Controllers

| Controller | Trigger | Purpose |
|------------|---------|---------|
| **Main Controller** | Every N messages (default: 10) | Reads chat, updates moods, relationship matrix, long-term summary. Outputs structured JSON directives. |
| **Scenario Controller** | Scenario creation + Main Controller request | Handles scene changes, surprise events, eavesdropping, location shifts |
| **Creative Controller** | On demand | Auto-generates characters from brief prompts |
| **Media Controller** | Manual click OR auto-mode | Generates image/ TTS prompts with emotional tone |

---

## 🎭 Characters

### Attributes
Each character has:
- **Name** — Identity
- **Color** — Visual signature throughout UI
- **Personality** — Core traits, speech patterns
- **Appearance** — Physical description for images/ visualization
- **Voice** — TTS voice preset
- **Model** — Assigned LLM provider and model
- **Avatar** — Base64 image or URL
- **Private Memory** — Events they personally witnessed
- **Relationship Row** — Their feelings toward every other character

### Limits
- Maximum 11 characters per scenario
- One character can be designated as "the user"
- Characters don't know they're AI

---

## 🧠 Memory System (3 Layers)

### 1. Short-term Memory
- Last N messages raw (default: 30, configurable)
- Directly injected into character prompts
- Respected for privacy (characters only see what they witnessed)

### 2. Long-term Summary
- Maintained by Main Controller
- Condensed narrative of key events
- Injected into character prompts for continuity

### 3. Relationship Matrix
- N² JSON structure tracking feelings
- Each pair: `fromId→toId` = `{ mood, intensity, reason }`
- Evolves naturally through controller updates
- Read-only view in side panel

---

## 🔄 Turn Logic

**Strict sequential queue** — Never parallel.

1. Main Controller picks turn order based on narrative flow
2. Each character sees fully updated chat before generating
3. User can pause auto-chat anytime
4. No race conditions, no conflicts

---

## 🎨 UI Principles

### Core Rules
- **Right-side collapsible drawer** on every screen — desktop + mobile
- **No native browser dropdowns or popups EVER**
- **All custom modals** — No `alert()`, `confirm()`, browser-native pickers
- **Color-coded characters** — names, dialogue quotes match character color
- **Italics for actions** — e.g., `*rubs eyes* "Hello."`
- **Streaming typewriter** effect for all AI messages
- **Inline expansion** over modals where possible

### Layout Modes
- **DM Mode** (2 characters) — Intimate, minimal layout
- **Group Mode** (3+) — Avatars emphasized, wider view

### Theme
- **Dark mode first**
- **Light mode available**
- **Mobile parity** — Every feature works on phone

### Side Panel Contents
- 🎯 What Happens Next — Text directive to controllers
- 📝 Brief Details — Persistent style notes
- 🧠 Relationship Matrix — Read-only view
- 📜 Memory Summary — Read-only view
- 🐞 Debug Panel — Live controller streaming logs
- 👥 Active Characters — List with status
- 🎬 Scene Info — Current location, time, weather
- ⚙️ Scenario Settings — Per-scenario overrides

---

## 🖼️ Asset Rules — CRITICAL

### Raster Images
**NO RASTER IMAGES shipped with app.**

All app icons are inline SVG components. No external image hosting dependencies.

### Avatar Storage
- **Uploaded images** → Base64 in IndexedDB
- **Pasted URLs** → Stored as strings
- **AI-generated** → Base64-cached

### SVG Icon System
Organized by category:
- `navigation/` — Directional, structural
- `actions/` — User actions (send, edit, delete, etc)
- `media/` — Images, audio, playback
- `scenario/` — Scene, location, weather, time
- `character/` — Personas, avatars, traits
- `controllers/` — Controller indicators
- `ui/` — Settings, panels, theme toggles
- `emotions/` — Heart, anger, trust, etc
- `status/` — Loading, connected, error states
- `providers/` — Model and provider badges
- `features/` — Auto-improve, auto-scenario, etc
- `decorative/` — Logo, masks, stage elements
- `placeholders/` — Generic avatars

Each icon: configurable size, color (`currentColor`), strokeWidth, className.
Animated icons (Loading, StreamingDots) use CSS animations — no GIFs.

---

## 🔌 Provider & Model Strategy

### Provider P — Pollinations (Default)
- **Publishable `pk_` key** — Safe in client code
- Rate limit: 0.4 credits/hour for the account
- Endpoints: `/v1/chat/completions`, `/v1/models`, `/image/{prompt}`, `/audio/{text}?voice=...`
- OpenAI-compatible

### Provider A — Aqua (User-supplied)
- User pastes their own key
- Stored in IndexedDB
- Standard tier — no context limit, no request limit
- Premium controller models available

### Custom Slot
- Any OpenAI-compatible URL + key
- User-configurable

### Default Model Assignments

**Pollinations only (out-of-box):**
- Characters: `llama-scout` (Llama 4 Scout 17B 16E) primary, `mistral` fallback
- Main/Scenario Controller: `llama-scout` or `gpt-5.4-nano`
- Image: `zimage` (ZImage)
- TTS: Qwen 3 TTS Flash
- STT: Whisper Large v3

**With Aqua key:**
- Main Controller: `grok-4.1-thinking`
- Scenario Controller: `grok-4.2`
- Creative Controller: `grok` (Grok 4 Fast)
- Characters: `llama-4` (Llama 4 Maverick)

### Content Policy Stance
- **Llama models preferred** — Unrestricted enough for strong language without policy violations
- **NO Kimi K2.5 for characters** — Too unrestricted, crosses problematic territory
- Llama Scout / Maverick / Mistral are the "sweet spot"

---

## 🎯 Key Features

### Chat Features
- **Per-message buttons:** 🖼️ image gen, 🔊 voice gen, 🔄 regenerate, 🌿 branch

### Input Options
- **Type** — Standard text input
- **🎤 Mic** — Whisper Large v3 transcribes (never auto-sends)
- **✨ Auto-Improve** — Generates reply as your character, editable before sending
- **▶ Auto-Scenario** — Fully autonomous chat, you watch/pause

### Auto Modes Clarified
| Mode | Behavior |
|------|----------|
| **Auto-Improve** | Personal assistant — generates reply *as your character*, editable |
| **Auto-Scenario** | Whole chat runs autonomously, you're a passive observer, can pause/rejoin |

### Regenerate vs Branch
- **🔄 Regenerate** — Replaces current AI message with new take. Original lost.
- **🌿 Branch** — Original scenario untouched. New scenario created from that point. Auto-named: `"School Party" → "School Party-2"`. Both live independently.

### Private Conversations
- Not literal phone-style DMs — visual UI distinction
- 2 characters alone → DM-style layout (intimate)
- 3+ characters → Group layout (avatars emphasized)
- Characters retain full memory of what happened
- Scenario Controller can trigger eavesdropping events

### User's Character
- Create your own character with full fields
- One toggle: "This is me" — only one across app
- User color persists globally across all scenarios
- "AI knows real user?" setting: ON → your replies take priority, OFF → treated as another character

---

## 💾 Data Model (IndexedDB)

Storage is **swappable** — designed for future cloud migration without rewriting app logic.

### Collections

**characters:**
```
{ id, name, color, personality, appearance, voice, 
  modelId, avatar, isUser, createdAt, updatedAt }
```

**scenarios:**
```
{ id, name, lore, characterIds[], settings{}, messageIds[], 
  summary, matrix, parentId, createdAt, updatedAt }
```

**messages:**
```
{ id, scenarioId, characterId, content, actions, timestamp, 
  imageUrl?, audioUrl?, isPrivateBetween?[] }
```

**memories:**
```
{ characterId, scenarioId, events[], witnessed[] }
```

**relationships:**
```
{ scenarioId, matrix: { "fromId→toId": {...} } }
```

**settings:**
```
{ global config object }
```

**providers:**
```
{ P: {pk_key}, A: {key}, custom: [{name, baseUrl, key}] }
```

---

## ⚙️ Settings Architecture

### Main Settings (Global Defaults)
- **Providers** — P key, A key, custom endpoints
- **Models** — Default for characters, controllers, image, TTS, STT
- **Controllers** — Trigger frequency, activity levels, prompt editing
- **Memory** — Short-term window, summary frequency, matrix updates
- **Chat Behavior** — Auto-scenario speed, streaming, typewriter speed
- **Appearance** — Theme, font, side panel state, user color, roleplay format
- **Voice & Audio** — Mic device, silence threshold, TTS speed, auto-play
- **Privacy & Storage** — Storage backend, auto-save, export/import
- **Advanced** — Debug visibility, raw controller output, token counts, prompt editing

### Per-Scenario Settings (Overrides Globals)
These live in scenario creation, NOT main settings:
- "AI knows real user?" toggle
- Auto-image setting
- Auto-TTS setting
- Controller trigger frequency override
- Plus standard fields: name, lore, characters, opening message

---

## 🛠️ Edge Cases & Safeguards

| Scenario | Safeguard |
|----------|-----------|
| Character breaks character | Main Controller detects, sends silent correction |
| API failure | Auto-fallback to secondary model, exponential backoff |
| Memory loss | Summary + matrix preserved; user can edit summary |
| Race conditions | Strict turn queue, no parallel calls |
| Private chat leakage | Enforced at memory-write, not display |
| IndexedDB quota exceeded | Prompt to archive/export |
| Invalid JSON from controllers | Auto-retry with stricter reminder, skip if fails |
| Pollinations rate limit | Track client-side, warn at 80%, suggest Aqua |
| Character edits mid-scenario | Apply forward only (past messages preserved) |
| Branch during streaming | Disabled until message completes |

---

## 📋 Locked Decisions

| Decision | Answer |
|----------|--------|
| App name | **Theatro** |
| Launch language | English only |
| Backend | None. Frontend-only, forever (v1) |
| Storage | IndexedDB (swappable adapter) |
| Framework | Vite + Vanilla JS |
| Icon system | 100% inline SVG |
| Raster images | None shipped with app |
| Avatar storage | Base64 or URL strings |
| Native dropdowns | **Banned everywhere** — custom overlays only |
| Onboarding | Hybrid — works instantly, banner suggests Aqua key |
| Theme | Dark mode first |
| Mobile | Full parity with desktop |

---

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development phases.