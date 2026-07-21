# agent.md — SunnyDeck Engineering Guide

Read this file before making **any** change inside `fun/SunnyDeck/`. Also read the repository-level `/workspace/Lokiodinson.netlify.app/agent.md` for Git, deployment, and repository-wide rules.

This file exists to prevent repeated broad codebase reads. Start from this architecture map, then inspect only the files and symbols directly related to the requested change. Runtime source remains authoritative if it has changed since this document was written.

---

## 1. Project identity

- **Project:** SunnyDeck
- **Path:** `fun/SunnyDeck/`
- **Entry point:** `index.html`
- **Type:** Static browser application; no framework, bundler, transpiler, or build step
- **Deployment:** The parent repository is served by GitHub Pages
- **Architecture:** Ordered classic deferred scripts sharing the global scope
- **Persistence:** IndexedDB for application data and settings
- **UI skins:** After Hours (modern) and retro/synthwave
- **Primary purpose:** Multi-character roleplay/world simulation with AI chat, spatial maps, whispering, voice, memories, quests, inventory, relationships, world state, journals, and director-driven ambient activity

Do not convert individual scripts to ES modules. Script order and shared globals are intentional dependencies.

---

## 2. Mandatory working protocol

Before editing SunnyDeck:

1. Read the repository root `agent.md`.
2. Read this file.
3. Run the repository Git preflight from the root:

```bash
cd /workspace/Lokiodinson.netlify.app
git status --short --branch
git remote -v
git fetch origin
git log -5 --oneline --decorate
```

4. Preserve all pre-existing modified and untracked files.
5. Identify the smallest relevant set of SunnyDeck files using `grep` before reading whole files.
6. Inspect only the target functions and their direct callers/dependencies.
7. Do not casually reorder `<script>` tags in `index.html`.
8. After editing, run syntax checks, inspect the diff, and test affected desktop/mobile behavior.
9. Stage only task files. Do not include unrelated workspace changes.
10. Commit and push completed repository work unless the user explicitly says not to deploy.

### Efficient inspection rule

Do **not** repeatedly read all of `app.js` or the entire project. Use targeted commands such as:

```bash
grep -RIn "symbolName" fun/SunnyDeck
sed -n '680,840p' fun/SunnyDeck/app.js
node --check fun/SunnyDeck/app.js
```

A normal focused SunnyDeck fix should usually require reading this guide plus targeted excerpts from approximately 2–5 files, not the full codebase.

---

## 3. File map and responsibilities

### Core files

| File | Responsibility |
|---|---|
| `index.html` | All screens, modal shell, chat composer, settings form, stylesheet order, and script load order |
| `style.css` | Base retro UI, general layout, components, dashboard, realm/detail/chat/settings styling |
| `features.css` | Additional feature styling introduced after the original core |
| `phase2.css` | Phase-2 feature UI such as expanded map, inventory, quests, stats, search, and related panels |
| `modern.css` | After Hours (modern) skin overrides; must remain compatible with the same HTML structure |
| `app.js` | Core application state, themes/skins, settings, IndexedDB, realm/session CRUD, screen routing, chat UI, player switching, target/mention UI, modal primitives, and initialization |
| `app-ai.js` | Chat send pipeline, responder routing, character prompt assembly, API calls, TTS, STT, and auto-renaming |
| `history-utils.js` | Shared conversation history formatter and whisper privacy filtering |
| `ROADMAP-PHASE2.md` | Historical architectural and verification context; useful background, not runtime authority |

### Feature modules

| File | Responsibility |
|---|---|
| `avatars.js` | Deterministic pixel avatar drawing, caching, avatar markup, and portrait strip |
| `map.js` | Session positions, zones, distance/earshot logic, player movement, activities, and spatial prompt summaries |
| `bigmap.js` | Fullscreen/expanded map, move mode, D-pad, repeat movement, and keyboard movement |
| `mapedit.js` | Visual map-zone editor with draw/move/resize behavior |
| `world.js` | World clock, phases, weather transitions, map weather visuals, and world prompt notes |
| `sound.js` | Web Audio sound effects, ambient chiptune loop, and weather-aware sound state |
| `dice.js` | Dice RNG, roll history entries, skill checks, slash commands, dice popover, and pending roll prompt context |
| `share.js` | Realm import/export and transcript export; strips unsafe/secret fields |
| `social.js` | Character affinity, moods, relationship analysis, relationship web, and social prompt notes |
| `quests.js` | Quest generation, objective tracking, completion narration, quest prompt note, and quest panel |
| `inventory.js` | Per-character inventory, add/use/give/drop actions, inventory prompt note, and dialogue exchange tracking |
| `stats.js` | Persistent player statistics, achievements, and play-time tracking |
| `search.js` | Global search overlay and grouped result rendering |
| `journal.js` | Realm journal chapter generation and rendering |
| `rewind.js` | Message edit/rewind/branch behavior and chat rerendering |
| `director.js` | Ambient autonomous character activity, visual beats, distant chatter, and stage directions |
| `memory.js` | Long-term character memory notes, distillation, and memory rendering |
| `favicon.svg` | Site icon |
| `.nojekyll` | Prevents Jekyll processing on GitHub Pages |

---

## 4. Script dependency order

The order at the bottom of `index.html` is part of the architecture:

```text
app.js
history-utils.js
avatars.js
map.js
bigmap.js
memory.js
sound.js
world.js
dice.js
share.js
social.js
quests.js
inventory.js
stats.js
search.js
mapedit.js
journal.js
rewind.js
director.js
app-ai.js
```

All scripts use `defer`, execute in document order, and share classic-script global scope.

### Dependency implications

- `app.js` must load first because it defines core globals and UI primitives.
- `history-utils.js` must load before `app-ai.js` and memory consumers that call `buildHistoryFor()`.
- Feature files rely on globals such as `settings`, `currentRealm`, `currentSession`, `esc`, `toast`, `openModal`, `dbPut`, and `hasApiKeys` from `app.js`.
- `app-ai.js` loads last because it consumes helpers from nearly every feature module when assembling prompts and post-reply ticks.
- Do not introduce duplicate top-level `const` or `let` names across these scripts. They share one global lexical environment and duplicate declarations can stop the application from loading.
- Before renaming any global function or variable, search every SunnyDeck script for all references.

---

## 5. Core global state and data flow

### Important globals in `app.js`

- `settings` — merged persisted settings
- `DEFAULT_SETTINGS` — defaults used for new users and missing properties; includes `diceEnabled`, `questsEnabled`, and `inventoryEnabled` (all `false`)
- `currentRealmId` — selected realm ID in realm/detail flows
- `currentRealm` — currently loaded realm object
- `currentSession` — currently loaded roleplay session
- `chatTargetKey` — directly addressed/mentioned character key; empty means automatic routing
- `shoutNext` — whether the next message bypasses normal earshot filtering
- `THEMES` — retro color token sets
- `PROVIDERS` — API provider definitions
- `dd` — custom settings dropdown controller references

### Current player

The active player character is stored as:

```js
currentSession.playerKey
```

`currentPlayer()` resolves the corresponding character from `currentRealm.characters`.

When changing the active player, audit all player-dependent transient UI state, especially:

- `chatTargetKey`
- whisper target validity
- target/mention candidates
- portrait highlighting
- map player highlighting
- inventory panel contents
- player badge/header
- direct and whisper banners

The active player must never remain selectable as their own direct mention target.

### Direct mention/target behavior

Relevant functions in `app.js`:

- `chatTargetCandidates()` — candidates excluding the player and muted characters
- `renderChatTarget()` — renders `AUTO`, `SHOUT`, or a directly selected character
- `openPlayerSwitcher()` — changes `currentSession.playerKey`
- `toggleCharEnabled()` — mutes/unmutes a character and clears invalid targets
- `toggleWhisper()` — enables private whisper mode and selects a sole participant when applicable

Relevant responder logic in `app-ai.js`:

- `pickResponders()` prioritizes `chatTargetKey`
- otherwise filters out the player and muted characters
- applies earshot rules unless whispering or shouting
- falls back to the AI router when multiple candidates remain

Whenever `playerKey` changes, validate or clear `chatTargetKey` **before** rerendering target UI. A stale target can display the new player as their own mention and can also incorrectly influence responder routing.

---

## 6. IndexedDB and persistence

### Database

Defined in `app.js`:

```text
DB_NAME = sunny-deck-retro
DB_VERSION = 1
```

The database contains application records for realms, sessions, and settings. Inspect `dbOpen()`, its upgrade handler, and the `dbGet`/`dbPut` helpers before altering stores or persisted shapes.

### Persistence rules

- Do not clear IndexedDB to solve migration problems.
- Preserve existing realms, sessions, chat history, memories, quest state, inventory, and settings.
- Prefer lazy initialization for new optional object properties when no index or store change is needed.
- Add new settings by merging defaults with persisted data.
- If adding a nested settings object, merge the nested defaults explicitly; a shallow spread does not fill missing nested properties.
- Keep settings backward-compatible for users with older `cfg` records.
- Keep new per-session data serializable as plain objects/arrays.

### Approximate realm shape

A realm includes fields such as:

- `id`, `name`, `description`, `overview`
- controller/model preferences
- `characters[]`
- map/world configuration
- memories and journal data
- premade/custom metadata

A character commonly includes:

- `key`, `name`, `color`, `voice`
- `description`, `personality`, `keywords`, optional `system`
- map position information

### Approximate session shape

A session includes fields such as:

- `id`, `realmId`, `name`
- `playerKey`
- `history[]`
- `disabledCharacters[]`
- `isWhisper`
- timestamps and rename state
- positions, activities, world state, moods, social state
- optional quest and inventory state

Do not assume every old session has every modern property. Feature modules generally use lazy initialization.

---

## 7. Settings architecture

Settings UI lives in `index.html`; behavior and persistence live in `app.js`.

Key functions:

- `loadSettings()` — loads persisted `cfg`, merges defaults, applies compatibility behavior
- `saveSettings()` — stores settings
- `initSettingsDropdowns()` — creates custom model/world-clock dropdowns
- `fillSettings()` — copies current settings into form controls
- `sSave` handler — validates/copies form values back into `settings`, saves, and returns to dashboard
- `sReset` handler — restores defaults
- `applyFeatureAvailability()` — applies dice/quests/inventory enablement to live UI after load/save/reset
- `applyTheme()` and `applySkin()` — apply retro/modern appearance

### Current optional feature settings

These live in `DEFAULT_SETTINGS` and are all **disabled by default**:

| Setting key | UI control | Default | Meaning when off |
|---|---|---|---|
| `diceEnabled` | `#sDiceEnabled` | `false` | Hide dice button, block `/roll` + `/check` + skill checks, clear pending roll notes |
| `questsEnabled` | `#sQuestsEnabled` | `false` | Hide quest toolbar button/panel; block quest generation, progress ticks, and prompt notes |
| `inventoryEnabled` | `#sInventoryEnabled` | `false` | Hide backpack toolbar button/panel; block inventory prompt notes and exchange ticks |

Settings markup for these toggles is in the **Roleplay Features** section of `index.html`.

Important semantics:

- Disabled means full behavior off, not just hidden UI.
- Existing `session.quest` and `session.inventory` data are preserved while disabled and become active again when re-enabled.
- `renderChatToolbarHTML()` only emits quest/inventory buttons when their settings are enabled.

### Settings implementation requirements

When adding a setting:

1. Add a default in `DEFAULT_SETTINGS`.
2. Make old saved settings inherit the new default.
3. Add the form control in `index.html`.
4. Populate it in `fillSettings()`.
5. Save it in the `sSave` handler.
6. Restore it through `sReset`.
7. Apply it at initial load and when changed.
8. Test both existing-user and first-run behavior.

For optional feature toggles such as dice, quests, or inventory:

- Define whether the toggle controls only the visible UI or the full behavior.
- A true disable should hide/disable its entry points, stop background ticks/API calls, remove prompt context, and safely preserve existing stored feature data for re-enabling later.
- Do not delete existing quest/inventory/roll history when a feature is disabled.
- Existing content should remain recoverable when re-enabled.
- Avoid one-time initialization traps. If a feature binds UI during script evaluation, ensure changing the setting can rebind/unbind it without duplicate event listeners.

SunnyDeck requires custom dropdowns; do not add native `<select>` controls for new settings unless there is a compelling accessibility reason and the user explicitly accepts it.

---

## 8. Chat and AI pipeline

### Send flow

`handleChatSend()` in `app-ai.js` is the main chat flow:

1. Read and trim the composer text.
2. Handle registered slash commands.
3. Verify API configuration.
4. Disable send controls and mark chat busy.
5. Create and persist the player dialogue history entry.
6. Apply shout/whisper metadata.
7. Update stats, sounds, world state, and auto-rename checks.
8. Select responders through `pickResponders()`.
9. For each responder:
   - show typing/speaking state
   - assemble character prompt in `getReply()`
   - call the configured chat model
   - render/persist the reply
   - run TTS if enabled
10. Run post-exchange systems such as stage direction, quest tracking, social analysis, and inventory tracking.
11. Clear pending roll context.
12. Restore send controls and focus.

### Prompt assembly

`getReply()` combines:

- character identity, description, personality, and custom system text
- current player identity
- privacy-filtered conversation history
- active tone tags
- spatial/map context
- current activity
- long-term memory
- world time/weather
- relationship/mood context
- active quest context
- inventory context
- pending dice/skill-check outcome

When disabling a feature, remove both its UI and its prompt/background contribution. Leaving hidden feature prompt notes active is not a complete disable.

### API behavior

- Provider/model strings use `provider:model` format.
- Aqua uses Bearer authorization for text and TTS endpoints.
- Groq is used for speech-to-text.
- Never commit keys.
- Never put keys into URLs, logs, exported realms, transcripts, screenshots, or user-visible errors.
- Preserve non-200 handling and avoid assuming response JSON is valid.
- Avoid unnecessary AI calls; several systems intentionally use cheap task models and minimum-message thresholds.

---

## 9. Whisper privacy — critical invariant

Whisper privacy is a high-risk cross-cutting requirement.

### History metadata

Whisper messages carry `whisperTo`. `history-utils.js` exposes:

```js
buildHistoryFor(sess, forCharKey, limit)
```

Behavior:

- System messages are excluded.
- Omniscient callers (`forCharKey == null`) can see all history.
- A character-specific caller can see a whisper only if that character is the whisper target or speaker.

### Privacy must be preserved in

- visible chat history
- responder prompt history
- memory extraction/distillation
- summaries and journals where privacy is expected
- rewind/edit behavior
- exports and transcripts where applicable
- ambient/director logic
- any new search or analytics feature

Do not replace `buildHistoryFor()` with raw `sess.history` in character-specific AI contexts. New AI features must explicitly decide whether they are omniscient or character-specific.

When changing players or whisper participants:

- clear invalid direct targets
- ensure the new player is excluded from target candidates
- prevent muted characters from remaining active targets
- exit whisper mode safely if no valid participants remain

---

## 10. Maps, movement, and earshot

`map.js` owns the spatial model:

- session-space initialization
- map positions
- zones
- movement
- distance calculations
- earshot checks
- character activities
- spatial prompt summaries

Important concepts:

- The player and NPCs have stored positions.
- Normal messages can only be answered by nearby characters.
- `SHOUT` bypasses normal earshot and can cause characters to approach.
- Direct targeting still participates in responder selection and must remain valid.
- `bigmap.js` handles expanded/fullscreen controls and keyboard/D-pad movement.
- `mapedit.js` edits realm zone geometry.

When changing player identity, verify map highlighting and movement ownership—not only the chat header.

---

## 11. Feature systems

### Dice and skill checks (`dice.js`)

- Client-side cryptographic RNG where available
- Supports formulas such as `1d20` and `3d6+2`
- Stores roll entries in session history as `kind: 'roll'`
- Skill checks can ask a task model to set a DC
- `pendingRollNote` forces the next AI response to honor the outcome without mentioning numbers/dice
- Slash commands include `/roll` and `/check`
- UI binds to `#diceBtnChat` and creates a popover

If dice are disabled, address all of:

- composer dice button
- popover binding
- `/roll` and `/check`
- `skillCheck()` direct calls
- pending roll prompt note
- background/stat side effects

Current implementation:

- Defaults off via `settings.diceEnabled === false`
- `requireDice()` guards slash commands / skill checks / popover open
- `rollPromptNote()` returns empty when dice are disabled
- `#diceBtnChat` is hidden by `applyFeatureAvailability()` and `bindDiceUI()`
- When enabled, skill checks still roll client-side and inject outcome notes into the normal roleplay reply pipeline

### Quests (`quests.js`)

- Generates quest JSON using an AI controller
- Stores quest state on `session.quest`
- Tracks objectives after dialogue thresholds
- Adds quest context to character prompts
- Renders `#questPanel`
- Toolbar entry is created in `renderChatToolbarHTML()` in `app.js`

A quest toggle should preserve stored quest state while preventing new generation, progress checks, prompt injection, and visible quest UI when disabled.

Toggle checkpoints are `startQuest()`, `questCheckTick()`, `questPromptNote()`, `renderQuestPanel()`, and `openQuestUI()`- each returns early unless enabled. Only new data-affecting AI calls and prompt injection are blocked when disabled; saved quest content remains on the session.

### Inventory/backpack (`inventory.js`)

- Stores inventories per character under `session.inventory[characterKey]`
- Supports add, use, give, and drop
- Adds carried items to character prompts
- Can infer explicit item exchanges using a task model
- Toolbar entry comes from `inventoryBtnHTML()`
- Panel renders into `#invPanel`

A backpack toggle should preserve stored items while hiding UI and stopping inventory prompt/background exchange tracking.

Toggle checkpoints are `inventoryBtnHTML()`, `bindInventoryBtn()`, `inventoryPromptNote()`, `inventoryTick()`, and `renderInvPanel()`- each returns early or hides the panel when disabled. Existing inventory objects are preserved across disable/re-enable.

### Social (`social.js`)

- Tracks pairwise affinity and moods
- Produces social prompt notes
- Renders relationship web and mood chips
- Uses message thresholds to limit analysis calls

### World (`world.js`)

- Tracks in-world minutes, phase, and weather
- Supports off/exchange/hybrid clock behavior
- Renders world HUD and weather particles
- Provides prompt context

### Director (`director.js`)

- Creates ambient character activity and stage directions
- Uses timers and current-screen lifecycle hooks
- Must be stopped when leaving relevant screens

### Memory and journal

- Memory distillation and journal generation can process conversation history.
- Whisper filtering must be considered before any new history consumption.

---

## 12. UI structure and design constraints

### Screens in `index.html`

- `screen-dash` — dashboard and recent activity
- `screen-browse` — realm browser/import/new realm
- `screen-create` — realm creation workflow
- `screen-detail` — realm overview, characters, memories, relationships, journal, sessions
- `screen-chat` — map, header, world HUD, portraits, tags, quest/inventory panels, chat, composer
- `screen-settings` — appearance, keys, models, defaults, sound/world options

`showScreen(id)` in `app.js` manages screen switching and calls feature lifecycle hooks.

### Shared UI primitives

- `openModal()`, `closeModal()`
- `toast()`
- `createDropdown()`
- custom player/target popovers
- toolbar icon buttons

### Design rules

- Preserve both modern and retro skins.
- Test any structural UI change in both skins.
- Do not replace custom dropdowns with native selects.
- Preserve keyboard focus visibility.
- Keep mobile safe-area and dynamic-height behavior.
- Avoid horizontal overflow in chat header, toolbar, composer, settings, and fullscreen map.
- Respect reduced-motion behavior when adding animation.
- Use meaningful labels/tooltips for icon-only controls.

---

## 13. Common change maps

### Player switch / mention bug

Inspect only:

- `app.js`: `openPlayerSwitcher()`, `chatTargetCandidates()`, `renderChatTarget()`, `refreshChatHeader()`, `highlightPlayerToken()`
- `app-ai.js`: `pickResponders()`
- optionally `map.js`/`avatars.js` if visual ownership does not update

Expected invariant: after switching to character X, X is not the direct target, is not shown in the mention button, and is excluded from responder candidates.

This is now enforced directly in `openPlayerSwitcher()` by clearing `chatTargetKey` when it equals the newly active player and rerendering the target control before removing the popover.

### Add a settings toggle

Inspect only:

- `index.html`: settings controls
- `app.js`: `DEFAULT_SETTINGS`, `loadSettings()`, `fillSettings()`, save/reset handlers, `applyFeatureAvailability()`
- relevant feature file
- `app-ai.js` if the feature affects prompts/background ticks
- relevant CSS only if UI changes

For dice/quests/inventory specifically, also verify:

1. default is off for new and upgraded users (missing key inherits `false` from `DEFAULT_SETTINGS`)
2. UI entry points disappear when disabled
3. slash commands / prompt notes / background ticks stop
4. stored feature data remains recoverable after re-enable

### Whisper/privacy change

Inspect:

- `history-utils.js`
- `app.js` whisper/target UI
- `app-ai.js` routing and reply history
- every requested feature that consumes history (memory, journal, director, exports, etc.)

### Chat routing issue

Inspect:

- `app-ai.js`: `pickResponders()`, `routeMessage()`, `handleChatSend()`
- `app.js`: target and mute state
- `map.js`: earshot logic when spatial behavior is implicated

### Persistence change

Inspect:

- `app.js`: DB constants, upgrade code, sanitization, DB helpers
- feature-specific lazy initialization
- import/export normalization in `share.js` if persisted realm/session shapes are exported

---

## 14. Verification checklist

### Static checks

Run at minimum:

```bash
cd /workspace/Lokiodinson.netlify.app
node --check fun/SunnyDeck/app.js
node --check fun/SunnyDeck/app-ai.js
node --check fun/SunnyDeck/history-utils.js
# plus every changed JS file
git diff --check
git diff -- fun/SunnyDeck
```

Also check:

- duplicate IDs in changed HTML
- duplicate global `const`/`let` names
- stale references after renames
- script order unchanged unless deliberately justified
- no keys/secrets in the diff

### Focused functional checks

For player/target changes:

1. Open a realm/session.
2. Directly target character A.
3. Switch the player to character A.
4. Verify target resets to `AUTO` or another valid whisper participant.
5. Open the mention menu and confirm the current player is absent.
6. Send a message and confirm the current player is not selected as a responder.
7. Repeat in whisper mode and with muted characters.

For feature toggles:

1. Verify defaults on a clean/empty settings record.
2. Verify old settings records receive the intended default.
3. Toggle off and save.
4. Confirm toolbar/composer UI disappears or disables.
5. Confirm slash/direct entry points are blocked.
6. Confirm prompt notes and post-exchange AI ticks do not run.
7. Confirm stored quest/inventory/history data remains intact.
8. Re-enable and confirm data/UI returns without duplicate handlers.
9. Test both retro and modern skins.
10. Test desktop and narrow mobile layouts.

### Visual checks

Use static screenshot tools where possible or browser automation for interactive state. Check approximately:

- desktop: 1280×800
- mobile: 375×812
- modern skin
- retro skin
- open popovers/panels
- settings controls
- chat header/composer overflow

Do not claim interactive behavior works from syntax checks alone.

---

## 15. Known architectural hazards

1. **Shared global lexical scope:** duplicate top-level declarations across files can break all scripts.
2. **Script order:** moving `app-ai.js` or a dependency earlier can produce missing-global failures.
3. **Shallow settings merge:** nested settings need explicit nested merging.
4. **One-time UI binding:** feature scripts that bind immediately may not respond correctly to runtime setting changes unless reinitialization is designed.
5. **Stale direct target:** changing `playerKey` without clearing/validating `chatTargetKey` causes self-mention and routing bugs.
6. **Whisper leakage:** raw history use in character prompts or memory tools can reveal private messages.
7. **Background API calls:** hiding a button does not disable quest/inventory/social/task-model processing.
8. **Old session shapes:** older records may lack modern fields; use lazy defaults.
9. **Modern/retro divergence:** a fix that looks correct in one skin may overflow or disappear in the other.
10. **Transient feature panels:** quest/inventory/poplayer popovers can remain open or stale across player/screen changes if not explicitly refreshed.
11. **Asynchronous persistence:** player/target/settings changes should be persisted and UI updates should not assume a write succeeded silently.
12. **Native selects:** avoid introducing them; use the project’s custom dropdown pattern.

---

## 16. Deployment and completion

SunnyDeck is part of the parent repository. After completing and verifying a task:

```bash
cd /workspace/Lokiodinson.netlify.app
git status --short
git diff --check
git diff -- fun/SunnyDeck
git add fun/SunnyDeck/<only-task-files>
git commit -m "fix: concise SunnyDeck change"
git pull --rebase origin main
git push origin main
git status --short --branch
```

GitHub Pages deploys automatically from `main`.

Never stage unrelated root files, temporary screenshots, generated artifacts, credentials, or pre-existing user changes.

---

## 17. Documentation maintenance

When feature toggles, player-switch invariants, or settings keys change, update this file in the same commit as the code. Current feature flags that must stay documented: `diceEnabled`, `questsEnabled`, `inventoryEnabled`.

Update this `agent.md` when a SunnyDeck change materially alters:

- script order or dependencies
- persistent storage shape
- settings architecture
- major global functions/state
- feature module responsibilities
- privacy rules
- verification requirements

Do not update it for tiny implementation details that are obvious from a local function. Keep it accurate enough that future work begins with targeted inspection rather than another full-project read.
