# Theatro — Project Structure

This document describes the organization of files and folders in the Theatro codebase.

---

## Repository Layout

```
theatro/
├── README.md
├── LICENSE
├── package.json
├── vite.config.js
├── index.html
├── netlify.toml
│
├── public/
│   ├── favicon.svg
│   ├── logo.svg
│   ├── logo-mark.svg
│   ├── manifest.json
│   ├── robots.txt
│   └── _redirects
│
├── docs/
│   ├── BLUEPRINT.md
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md
│   ├── API_PROVIDERS.md
│   ├── PROMPT_TEMPLATES.md
│   ├── CONTROLLERS.md
│   ├── MEMORY_SYSTEM.md
│   ├── STORAGE_SCHEMA.md
│   ├── UI_GUIDELINES.md
│   ├── ICON_SYSTEM.md
│   ├── ROADMAP.md
│   ├── CHANGELOG.md
│   └── screenshots/
│
└── src/
    ├── main.js
    ├── app.js
    │
    ├── core/
    ├── controllers/
    ├── characters/
    ├── providers/
    ├── media/
    ├── storage/
    ├── models/
    ├── services/
    ├── ui/
    ├── styles/
    ├── utils/
    ├── config/
    └── assets/
```

---

## Source Directory (`src/`)

### Entry Points

**`main.js`** — Application bootstrap
- Initializes core systems in order
- Mounts the app
- Handles initial routing

**`app.js`** — App shell
- App-level state
- Global error boundaries
- Top-level layout container

---

### Core (`src/core/`)

Fundamental infrastructure used by all other modules.

| File | Purpose |
|------|---------|
| `eventBus.js` | Pub/sub event system for decoupled communication |
| `stateManager.js` | Centralized reactive state management |
| `router.js` | Client-side navigation |
| `lifecycle.js` | Initialization and cleanup coordination |
| `errorHandler.js` | Global error catching and reporting |

---

### Controllers (`src/controllers/`)

LLM-powered orchestration layer.

| File | Purpose |
|------|---------|
| `controllerBase.js` | Abstract base class for all controllers |
| `mainController.js` | Reads chat, updates moods, relationship matrix, summaries |
| `scenarioController.js` | Scene changes, events, eavesdropping, locations |
| `creativeController.js` | Auto-generates characters from prompts |
| `mediaController.js` | Image generation and TTS prompt creation |
| `controllerQueue.js` | Sequential execution manager |
| `prompts/main.prompt.js` | Main Controller system prompts |
| `prompts/scenario.prompt.js` | Scenario Controller system prompts |
| `prompts/creative.prompt.js` | Creative Controller system prompts |
| `prompts/media.prompt.js` | Media Controller system prompts |
| `prompts/character.prompt.js` | Character generation templates |
| `prompts/promptHelpers.js` | Shared prompt building utilities |

---

### Characters (`src/characters/`)

Character behavior and memory management.

| File | Purpose |
|------|---------|
| `characterEngine.js` | Response generation, prompt building |
| `characterMemory.js` | Per-character memory management |
| `relationshipMatrix.js` | N² relationship tracking |
| `turnManager.js` | Turn ordering and queue management |
| `personaReinforcer.js` | Detects and corrects out-of-character behavior |

---

### Providers (`src/providers/`)

LLM provider integrations.

| File | Purpose |
|------|---------|
| `providerBase.js` | Abstract base class for providers |
| `providerRegistry.js` | Provider selection and routing |
| `pollinations.js` | Pollinations API integration |
| `aqua.js` | Aqua API integration |
| `openaiCompatible.js` | Generic OpenAI-compatible provider |
| `modelFetcher.js` | Available model fetching and caching |
| `streamHandler.js` | Streaming response normalization |
| `retryFallback.js` | Retry logic and fallback handling |

---

### Media (`src/media/`)

Image, TTS, and STT functionality.

| File | Purpose |
|------|---------|
| `imageGenerator.js` | Image prompt engineering and generation |
| `ttsEngine.js` | Text-to-speech synthesis and caching |
| `sttEngine.js` | Speech-to-text recording and transcription |
| `mediaCache.js` | Base64 media caching in IndexedDB |
| `base64Utils.js` | Base64 encoding/decoding helpers |

---

### Storage (`src/storage/`)

Data persistence layer.

| File | Purpose |
|------|---------|
| `storageAdapter.js` | Abstract storage interface |
| `indexedDbAdapter.js` | IndexedDB implementation |
| `cloudAdapter.js` | Future cloud storage stub |
| `schemas.js` | Data structure definitions and validation |
| `migrations.js` | Database migration logic |
| `exportImport.js` | JSON export/import functionality |
| `storageQuota.js` | Quota monitoring and warnings |

---

### Models (`src/models/`)

Data structure definitions (schema + validation).

| File | Purpose |
|------|---------|
| `Character.js` | Character data structure and validation |
| `Scenario.js` | Scenario data structure and validation |
| `Message.js` | Message data structure and validation |
| `Memory.js` | Memory data structure |
| `Relationship.js` | Relationship data structure |
| `Settings.js` | Settings data structure and defaults |
| `Provider.js` | Provider configuration structure |
| `index.js` | Barrel export for all models |

---

### Services (`src/services/`)

Business logic layer — UI never touches providers directly.

| File | Purpose |
|------|---------|
| `scenarioService.js` | Scenario CRUD and management |
| `characterService.js` | Character CRUD and validation |
| `chatService.js` | Message sending, streaming, regeneration |
| `memoryService.js` | Memory layer management |
| `settingsService.js` | Settings persistence and validation |
| `exportService.js` | Data export/import orchestration |
| `autoChatService.js` | Auto-scenario mode management |
| `branchService.js` | Scenario branching logic |
| `providerService.js` | Provider API abstraction for services |

---

### UI (`src/ui/`)

User interface components and screens.

#### Screens (`src/ui/screens/`)
Full-page views.

| File | Purpose |
|------|---------|
| `Welcome.js` | First-time user experience |
| `Dashboard.js` | Scenario and character overview |
| `ChatScreen.js` | Main roleplay interface |
| `ScenarioCreate.js` | Create new scenario wizard |
| `CharacterCreate.js` | Create/edit character form |
| `ScenarioIndex.js` | Browse all scenarios |
| `CharacterIndex.js` | Browse all characters |
| `Settings.js` | Settings interface container |

#### Components (`src/ui/components/`)
Reusable UI components.

| File | Purpose |
|------|---------|
| `MessageBubble.js` | Chat message display |
| `CharacterCard.js` | Character preview card |
| `ScenarioCard.js` | Scenario preview card |
| `ColorPicker.js` | Custom color selector |
| `ModelSelector.js` | LLM model picker (custom overlay) |
| `VoiceSelector.js` | TTS voice picker |
| `ProviderBadge.js` | Provider indicator badge |
| `AvatarUploader.js` | Image upload/URL/paste input |
| `AvatarDisplay.js` | Avatar rendering (base64 or URL) |
| `StreamingText.js` | Typewriter/ streaming text effect |
| `RoleplayFormatter.js` | Formats *actions* and "dialogue" |
| `ImageInline.js` | Inline image display |
| `AudioPlayer.js` | Audio playback with controls |
| `MicButton.js` | Recording button with visualizer |
| `ToastNotification.js` | Toast notification system |
| `ConfirmDialog.js` | Custom confirmation modal |
| `InputField.js` | Styled text input |
| `TextArea.js` | Styled textarea with auto-resize |
| `Toggle.js` | Custom toggle switch |
| `Slider.js` | Custom range slider |
| `Button.js` | Consistent button component |
| `Badge.js` | Status and label badges |
| `Tabs.js` | Tab navigation |
| `Accordion.js` | Collapsible sections |
| `SearchBar.js` | Search with clear button |
| `EmptyState.js` | Empty state illustration |
| `LoadingState.js` | Loading spinner/skeleton |
| `ErrorState.js` | Error display with retry |

#### Side Panel (`src/ui/sidePanel/`)
Right-side drawer contents.

| File | Purpose |
|------|---------|
| `SidePanel.js` | Drawer container and shell |
| `WhatHappensNext.js` | Text input for controller directives |
| `BriefDetails.js` | Style notes editor |
| `RelationshipView.js` | Matrix visualization (read-only) |
| `MemoryView.js` | Summary display (read-only) |
| `DebugPanel.js` | Live controller logs |
| `ActiveCharacters.js` | Character list with mood indicators |
| `SceneInfo.js` | Current location/time/weather |
| `ScenarioSettings.js` | Per-scenario overrides |

#### Settings (`src/ui/settings/`)
Settings screen sections.

| File | Purpose |
|------|---------|
| `SettingsLayout.js` | Settings page layout |
| `ProvidersSection.js` | API key management |
| `ModelsSection.js` | Default model selection |
| `ControllersSection.js` | Controller frequency and prompts |
| `MemorySection.js` | Memory layer configuration |
| `ChatBehaviorSection.js` | Auto-scenario, streaming, typewriter |
| `AppearanceSection.js` | Theme, fonts, colors |
| `VoiceAudioSection.js` | Audio device and TTS settings |
| `PrivacyStorageSection.js` | Data management and export |
| `AdvancedSection.js` | Debug options and reset |
| `PromptEditorSection.js` | Custom prompt editing |

#### Scenario Creation (`src/ui/scenarioCreation/`)
Scenario wizard components.

| File | Purpose |
|------|---------|
| `ScenarioForm.js` | Main scenario form |
| `CharacterPicker.js` | Multi-select character chooser |
| `ScenarioOverrides.js` | Per-scenario settings |
| `LoreEditor.js` | Rich text lore editor |

#### Character Creation (`src/ui/characterCreation/`)
Character wizard components.

| File | Purpose |
|------|---------|
| `CharacterForm.js` | Main character form |
| `PersonalityEditor.js` | Personality traits input |
| `AppearanceEditor.js` | Physical description input |
| `AutoCreatePanel.js` | AI-assisted character generation |

#### Layouts (`src/ui/layouts/`)
Page layout shells.

| File | Purpose |
|------|---------|
| `AppLayout.js` | Root app shell with header/footer |
| `ChatLayout.js` | Chat-specific layout (DM vs Group) |
| `DashboardLayout.js` | Dashboard grid layout |
| `SettingsLayout.js` | Settings page structure |

---

### Styles (`src/styles/`)

CSS organization.

| File | Purpose |
|------|---------|
| `main.css` | Main entry, imports all others |
| `reset.css` | CSS reset and normalization |
| `variables.css` | CSS custom properties (design tokens) |
| `animations.css` | Keyframe animations |
| `typography.css` | Font loading and text styles |
| `utilities.css` | Utility classes |

#### Themes (`src/styles/themes/`)

| File | Purpose |
|------|---------|
| `dark.css` | Dark theme variables |
| `light.css` | Light theme variables |

#### Component Styles (`src/styles/components/`)

| File | Purpose |
|------|---------|
| `messageBubble.css` | Chat message styles |
| `characterCard.css` | Character card styles |
| `scenarioCard.css` | Scenario card styles |
| `colorPicker.css` | Color picker styles |
| `modelSelector.css` | Model dropdown styles |
| `avatarDisplay.css` | Avatar rendering styles |
| `streamingText.css` | Typewriter effect styles |
| `toast.css` | Toast notification styles |
| `dialog.css` | Modal dialog styles |
| `button.css` | Button component styles |
| `toggle.css` | Toggle switch styles |
| `inputField.css` | Input field styles |
| `slider.css` | Range slider styles |

#### Screen Styles (`src/styles/screens/`)

| File | Purpose |
|------|---------|
| `dashboard.css` | Dashboard layout styles |
| `chatScreen.css` | Chat interface styles |
| `scenarioCreate.css` | Scenario creation styles |
| `characterCreate.css` | Character creation styles |
| `settings.css` | Settings page styles |
| `welcome.css` | Welcome screen styles |

#### Side Panel Styles (`src/styles/sidePanel/`)

| File | Purpose |
|------|---------|
| `sidePanel.css` | Drawer styles |
| `debugPanel.css` | Debug log styles |
| `relationshipView.css` | Matrix visualization styles |
| `memoryView.css` | Memory display styles |

#### Layout Styles (`src/styles/layouts/`)

| File | Purpose |
|------|---------|
| `appLayout.css` | App shell styles |
| `chatLayout.css` | Chat layout variants |
| `dashboardLayout.css` | Dashboard grid styles |

---

### Utils (`src/utils/`)

Utility functions.

| File | Purpose |
|------|---------|
| `id.js` | UUID/unique ID generation |
| `time.js` | Date/time formatting and parsing |
| `jsonSafe.js` | Safe JSON parsing with fallbacks |
| `debounce.js` | Debounce/throttle utilities |
| `throttle.js` | Rate limiting |
| `tokenCounter.js` | Approximate token counting |
| `colorUtils.js` | Color manipulation (hex, hsl, contrast) |
| `textFormat.js` | Text formatting helpers |
| `validators.js` | Input validation |
| `logger.js` | Conditional logging |
| `dom.js` | DOM manipulation helpers |
| `fileUtils.js` | File reading/writing |
| `eventKeys.js` | Keyboard shortcut handling |

---

### Config (`src/config/`)

Application configuration.

| File | Purpose |
|------|---------|
| `defaults.js` | Default values for all settings |
| `modelDefaults.js` | Default model assignments |
| `providerConfig.js` | Provider-specific configuration |
| `voicePresets.js` | TTS voice definitions |
| `colorPalette.js` | Default color options |
| `constants.js` | App-wide constants |
| `featureFlags.js` | Feature toggles |

---

### Assets (`src/assets/`)

Static assets.

| Path | Purpose |
|------|---------|
| `fonts/` | Custom font files |
| `icons/` | SVG icon system (see ICON_SYSTEM.md) |

---

## File Naming Conventions

- **Components:** PascalCase (`MessageBubble.js`)
- **Utilities:** camelCase (`jsonSafe.js`)
- **Styles:** camelCase matching component (`messageBubble.css`)
- **Constants:** SCREAMING_SNAKE_CASE in files, camelCase filenames
- **Index files:** `index.js` for barrel exports

---

## Import Patterns

### Barrel Exports
Most folders have an `index.js` for clean imports:

```javascript
// Instead of:
import { MessageBubble } from '../ui/components/MessageBubble.js'
import { CharacterCard } from '../ui/components/CharacterCard.js'

// Use:
import { MessageBubble, CharacterCard } from '../ui/components/index.js'
```

### Path Aliases (Vite Config)

```javascript
// vite.config.js
resolve: {
  alias: {
    '@core': '/src/core',
    '@ui': '/src/ui',
    '@utils': '/src/utils',
    '@config': '/src/config'
  }
}
```

Usage:
```javascript
import { eventBus } from '@core/eventBus.js'
import { MessageBubble } from '@ui/components/MessageBubble.js'
```