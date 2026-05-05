# Theatro — Development Roadmap

Phased development plan for Theatro.

---

## Phase 1: Foundation (Weeks 1-2)

### Core Infrastructure
- [x] Project structure and documentation
- [ ] Core systems (Event Bus, State Manager, Router)
- [ ] IndexedDB storage adapter with migrations
- [ ] Basic UI framework and theming
- [ ] SVG icon system foundation

### Key Files
- `src/core/eventBus.js`
- `src/core/stateManager.js`
- `src/core/router.js`
- `src/core/lifecycle.js`
- `src/storage/storageAdapter.js`
- `src/storage/indexedDbAdapter.js`
- `src/styles/variables.css`
- `src/styles/main.css`
- `src/assets/icons/IconBase.js`

### Deliverable
App boots, theme loads, basic navigation works.

---

## Phase 2: Provider Layer (Week 3)

### Provider System
- [ ] Provider base class and registry
- [ ] Pollinations integration
- [ ] Aqua integration
- [ ] Model fetching and caching
- [ ] Stream handler
- [ ] Retry/fallback logic

### Key Files
- `src/providers/providerBase.js`
- `src/providers/providerRegistry.js`
- `src/providers/pollinations.js`
- `src/providers/aqua.js`
- `src/providers/modelFetcher.js`
- `src/providers/streamHandler.js`
- `src/providers/retryFallback.js`

### Deliverable
Can make test API calls, stream responses, handle errors.

---

## Phase 3: Character System (Week 4)

### Character Foundation
- [ ] Character data models
- [ ] Character creation UI
- [ ] Avatar upload/base64 handling
- [ ] Color picker component
- [ ] Basic character service

### Key Files
- `src/models/Character.js`
- `src/services/characterService.js`
- `src/ui/characterCreation/CharacterForm.js`
- `src/ui/components/ColorPicker.js`
- `src/ui/components/AvatarUploader.js`

### Deliverable
Can create, save, list characters. Avatars stored as base64.

---

## Phase 4: Basic Chat (Week 5)

### Chat Foundation
- [ ] Scenario data models
- [ ] Scenario creation UI
- [ ] Chat screen layout
- [ ] Message input and display
- [ ] Basic character turn-taking

### Key Files
- `src/models/Scenario.js`
- `src/models/Message.js`
- `src/services/scenarioService.js`
- `src/services/chatService.js`
- `src/ui/screens/ChatScreen.js`
- `src/ui/screens/ScenarioCreate.js`
- `src/ui/components/MessageBubble.js`
- `src/ui/components/InputField.js`

### Deliverable
Can create scenario with characters, have basic back-and-forth chat.

---

## Phase 5: Memory System (Week 6)

### Memory Layer
- [ ] Relationship matrix
- [ ] Character private memory
- [ ] Long-term summary storage
- [ ] Memory service integration

### Key Files
- `src/models/Memory.js`
- `src/models/Relationship.js`
- `src/characters/characterMemory.js`
- `src/characters/relationshipMatrix.js`
- `src/services/memoryService.js`

### Deliverable
Characters maintain context across sessions.

---

## Phase 6: Controllers MVP (Week 7)

### Controller System
- [ ] Controller base class
- [ ] Controller queue
- [ ] Main Controller (simplified)
- [ ] Basic prompt templates

### Key Files
- `src/controllers/controllerBase.js`
- `src/controllers/controllerQueue.js`
- `src/controllers/mainController.js`
- `src/controllers/prompts/main.prompt.js`
- `src/controllers/prompts/character.prompt.js`

### Deliverable
Basic controller runs periodically, updates moods/summary.

---

## Phase 7: Side Panel & Settings (Week 8)

### Settings & Panel
- [ ] Side panel shell
- [ ] Settings screen with all sections
- [ ] Debug panel (basic)
- [ ] Per-scenario settings

### Key Files
- `src/ui/sidePanel/SidePanel.js`
- `src/ui/sidePanel/DebugPanel.js`
- `src/ui/screens/Settings.js`
- `src/ui/settings/*.js`

### Deliverable
Settings fully functional, side panel on all screens.

---

## Phase 8: Media Features (Week 9)

### Media System
- [ ] Image generation
- [ ] TTS engine
- [ ] STT (Whisper) integration
- [ ] Media caching

### Key Files
- `src/media/imageGenerator.js`
- `src/media/ttsEngine.js`
- `src/media/sttEngine.js`
- `src/media/mediaCache.js`

### Deliverable
Can generate images and voice for messages.

---

## Phase 9: Auto Features (Week 10)

### Automation
- [ ] Auto-improve mode
- [ ] Auto-scenario mode
- [ ] Regenerate and branch
- [ ] Turn manager improvements

### Key Files
- `src/services/autoChatService.js`
- `src/services/branchService.js`
- `src/characters/turnManager.js`

### Deliverable
Auto modes work, branching creates new scenarios.

---

## Phase 10: Polish & Release (Week 11-12)

### Polish
- [ ] Full controller system (Scenario, Creative, Media)
- [ ] Complete settings UI
- [ ] Mobile optimization
- [ ] Performance tuning
- [ ] Bug fixes
- [ ] Documentation finalization

### Key Files
- All remaining controller prompts
- All remaining UI components
- Performance optimizations
- Final documentation

### Deliverable
V1.0 release ready for use.

---

## Future Phases

### Phase 11: Advanced Features
- [ ] Scenario templates
- [ ] Character templates
- [ ] Lore library
- [ ] Export/import improvements

### Phase 12: Cloud Sync (Optional)
- [ ] Supabase adapter
- [ ] User accounts (optional)
- [ ] Cross-device sync

### Phase 13: Extensions
- [ ] Plugin system
- [ ] Custom provider support
- [ ] Community sharing

---

## Current Status

**Last Updated:** 2026-01-15

**Phase:** Foundation (Phase 1)

**Completed:**
- [x] Project documentation
- [x] File structure planning
- [x] Build configuration

**In Progress:**
- Core systems setup

**Next Up:**
- Event Bus implementation
- State Manager implementation
- Storage adapter implementation