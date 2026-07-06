# SunnyDeck — Phase 2 Feature Roadmap

> Handoff document for the next session. Phase 1 (10 features + favicon) is complete and
> pushed on branch `claude/sunnydeck-feature-planning-qdvekh`. This file specs the
> remaining features from the user's original request so implementation can start
> immediately without re-planning.

---

## Context you need before coding

### Architecture (unchanged from Phase 1)
- Dependency-free vanilla-JS SPA served statically from `fun/SunnyDeck/`.
- Classic scripts sharing global scope, loaded in order (index.html):
  `app.js → map.js → memory.js → sound.js → world.js → dice.js → share.js → social.js → quests.js → journal.js → rewind.js → director.js → app-ai.js`
- **All cross-file calls are `typeof`-guarded** (`if(typeof fn==='function')fn()`) so every
  module can be independently absent. Keep this pattern — it's why nothing breaks.
- Persistence: IndexedDB `sunny-deck-retro`, stores `realms` / `sessions` / `settings`,
  `DB_VERSION` stays **1**. New state = optional properties with lazy init
  (pattern: `ensureWorldState`, `ensureSessionSpace`). **Never bump the schema.**
- `dbPut` in app.js wraps records with `dbSanitize()` which strips `_`-prefixed keys
  (DOM refs like `character._mapEl`) and secret fields. New transient state on
  characters/sessions must be `_`-prefixed.
- Rendering: template literals + `esc()` for HTML escaping. Modals via `openModal()`.
  Toasts via `toast()`. Sounds via guarded `sfx(name)` (sound.js).
- Theming: CSS variables in style.css (`--neon-1`, `--surface-2`, `--ok`, `--danger`…),
  5 themes switch by class on `<html>`/`<body>`. `features.css` holds all Phase-1 styles.
  Phase 2 should add **`phase2.css`** (load after features.css) rather than growing it.
- AI calls: `aiJson(prompt, modelStr, maxTokens)` in director.js (JSON-extracting helper).
  Cheap "Task Controller" ticks use `settings.taskModel` / `settings.routerModel`,
  main dialogue uses `settings.chatModel`. Every AI failure path must be a silent
  `console.warn` + graceful skip — never block chat.
- API-cost discipline: batch ticks, busy flags, message-count thresholds
  (see `socialAnalysisTick`, `questCheckTick`, `stageDirectionTick`). Prefer zero-API
  mechanics (the user explicitly said new features must not increase costs).

### Map facts (needed by several Phase-2 features)
- `#chatMap` is the in-chat map container; tokens are absolutely-positioned elements
  stored as `character._mapEl`; positions are percentages in `sess.positions[key] = {x,y}`.
- Zones: `realmZones(realm)`, `zoneOf(key)`, `moveToZone(key, zoneKey)`,
  `moveCharacter(key, x, y)`, `inEarshot(key)`, `setActivity(key, {emoji,label})` — all in map.js.
- world.js appends `#worldTint` + `#weatherFx` inside `#chatMap` (phase/weather classes
  like `phase-night weather-storm` go on `#chatMap` itself). Any fullscreen map must
  carry these classes too.

### Verification harness
- Serve: `python3 -m http.server 8123` from `fun/SunnyDeck/`.
- Playwright chromium binary: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  (NOT `/opt/pw-browsers/chromium/`).
- Existing smoke scripts in the previous session's scratchpad covered 25 checks; rewrite
  equivalents for new features (load → interact → reload → assert persistence; filter
  favicon/net::/AudioContext noise from console errors).

---

## The features (user's own words, from their screenshot)

Priority order below = suggested implementation order (dependencies first, then user-impact).

---

### 1. Expandable fullscreen map + Move button + mobile D-pad + keyboard movement  【Story】
**User ask:** "Can we make the map clickable so that it expands into a 2D view upside,
filling the screen? We have a button labeled 'Move', and for mobile we provide a controller
option that lets the user move left, right, forward, and backward. On the keyboard, the
same movement can be controlled with the appropriate keys."

**File:** `bigmap.js` + styles in `phase2.css`.

- **Expand:** add an `⛶` expand button overlaid on `#chatMap` (and make the map itself
  clickable on non-token areas). Toggles a `.map-fullscreen` class that grows the existing
  `#chatMap` element (CSS `position:fixed; inset:0; z-index` over chat) — do NOT clone the
  map into a second element; reuse the live one so tokens/weather/tint stay in sync.
  ESC or ✕ collapses. Chat input stays reachable: show a slim docked composer at the
  bottom of the fullscreen map (move the existing `#chatInput` row via `appendChild`,
  move it back on collapse — DOM nodes keep their listeners).
- **MOVE button:** in the composer toolbar. Toggles "move mode": on-screen D-pad
  (`◀ ▲ ▼ ▶`, fixed bottom-right, thumb-sized ≥44px targets) appears; each press/hold
  calls `moveCharacter(playerKey, x±step, y±step)` (step ≈ 2.5%, clamp 3..97 / 8..92 —
  same clamps app-ai.js uses). Hold-to-repeat via `setInterval` on `pointerdown`,
  cleared on `pointerup`/`pointerleave`.
- **Keyboard:** WASD + arrow keys, active only while chat screen is active AND focus is
  NOT in `#chatInput`/any input/textarea (check `document.activeElement`). Same
  `moveCharacter` calls. `keydown` with repeat is fine (native auto-repeat).
- **Persistence:** positions already debounce-save via map.js (`schedulePosSave` pattern) —
  no new storage.
- **Zero API cost.** Movement already affects gameplay via `inEarshot` — that's the payoff.
- Hooks: one guarded `initBigMap()` call in `openSession` after `initSessionMap`;
  `bigmapOnScreenChange(id)` from `showScreen` to force-collapse when leaving chat.

### 2. Pixel avatar generator  【Characters】
**User ask:** "Pixel avatar generator. The pixel avatar generator should not be hard-coded
inside the main code; at least we can do that for the built-in three realms."

**File:** `avatars.js`.

- **Procedural, deterministic, zero API:** seed a tiny PRNG (mulberry32) from
  `hash(character.key + character.name)` and generate a 16×16 mirrored-half pixel sprite
  (classic identicon-style: generate left 8 columns, mirror to right) on a `<canvas>`,
  colored from the character's existing accent color + 2 derived shades (HSL rotate).
  Add face heuristics: 2 eye pixels at fixed rows, optional mouth row, hair band from a
  second seed byte — looks like a character, not a QR code.
- **API:** `avatarDataURL(character, size)` → cached data-URI (cache in a plain Map keyed
  by `key|size`; it's deterministic so no persistence needed).
- **Where used:** chat bubbles' avatar circles, map tokens, character cards in realm
  detail, session rows. Everywhere currently showing initials/emoji: keep the existing
  render as the fallback when `typeof avatarDataURL!=='function'`.
- **Not hard-coded:** works for ANY character (imported realms, user-created) because it
  derives purely from key/name/color. Optionally allow premade casts a curated palette
  via an `avatarStyle` field, but no per-character sprite data in code.
- Optional setting `pixelAvatarsEnabled:true` in DEFAULT_SETTINGS.

### 3. Inventory & props  【World】
**File:** `inventory.js`.

- Data: `sess.inventory = { [charKey]: [{id, name, emoji, desc, qty, addedAt}] }`,
  lazy-init. Cap 30 items/character, clamp name ≤ 40 chars.
- **UI:** 🎒 button in chat toolbar → panel (quest-panel styling) listing the player's
  items; +ADD opens a small modal (emoji picker = free-text emoji field + name + qty).
  Per-item: give-to-character dropdown, drop (delete), use (pushes a `kind:'event'`
  narration "X uses Y" so the AI sees it in the transcript — zero extra API calls).
- **AI awareness (rides existing calls, no new ones):** `inventoryPromptNote(charKey, sess)`
  → "You are carrying: …" injected into `getReply()` sys, same guarded pattern as
  `questPromptNote`/`socialPromptNote`.
- **Optional cheap tick:** `inventoryTick(sess, realm)` after exchanges (busy flag +
  ≥4-new-messages threshold, Task Controller ≤80 tokens) returning
  `{"gained":[{key,name,emoji}],"lost":[ids]}` when the conversation clearly implies item
  transfer ("here, take my sword"). Validate hard; most exchanges → `{}`. This mirrors
  `stageDirectionTick` exactly.
- Props on the map: optional stretch — render item drops as tiny map tokens; skip if time-boxed.

### 4. Stats & achievements  【Polish】
**File:** `stats.js`.

- Data: `settings.stats = {messagesSent, repliesReceived, rollsMade, crits, fumbles,
  questsCompleted, branchesMade, realmsCreated, chaptersWritten, playMs, byRealm:{...}}` —
  lives in the settings record (global, cross-realm). Increment via a single exported
  `bumpStat(name, n=1, realmId)` called (guarded) from the existing hook points:
  `handleChatSend` (sent/replies), dice.js (rolls/crits), quests.js (questsCompleted),
  rewind.js (branches), journal.js (chapters).
- Achievements: static table of ~20 authored achievements
  (`{id, name, desc, emoji, test(stats)}`) — e.g. "First Words" (1 msg), "Chatterbox"
  (500), "Natural 20", "Snake Eyes", "Quest Complete ×5", "Time Traveler" (first branch),
  "Novelist" (first story export), "Weathered the Storm". `settings.unlocked = {id: ts}`.
  Check after each `bumpStat`; on unlock → special toast + `sfx('achievement')`
  (**already exists in sound.js**).
- **UI:** "STATS" section on the dashboard or its own screen: stat tiles + achievement
  grid (locked = dimmed silhouette). Zero API.

### 5. Global search  【Polish】
**File:** `search.js`.

- 🔍 button in the dashboard header → search overlay (modal-style, full-height).
  Debounced (200ms) case-insensitive substring search across:
  realms (name/overview), characters (name/personality), sessions (name),
  **session history text** (iterate `sess.history`, match `h.text`), journal chapters,
  memories, quests, inventory items.
- Implementation: on open, `dbGetAll('realms')` + `dbGetAll('sessions')` once into memory
  (data volumes are tiny — this is a local single-user app; no index needed).
- Results grouped by type with highlighted match (`<mark>` via safe split-on-match around
  `esc()`ed text). Click → deep link: realm → `openRealmDetail`, session/history hit →
  `openSession(id)` then scroll chat to the matching bubble (find by timestamp, flash it).
- Zero API. Keyboard: `/` or `Ctrl+K` opens it from the dashboard (not while typing in chat).

### 6. Visual map editor  【World】
**File:** `mapedit.js`. Biggest UI lift — schedule late.

- Edit **zones** of a realm: "EDIT MAP" button in realm detail (non-premade realms, or
  copy-on-edit for premades) → fullscreen editor canvas showing the map background +
  existing zones as draggable/resizable rectangles.
- Operations: add zone (click-drag draws rect), rename (dblclick), pick emoji, delete,
  drag to move, corner handle to resize. Store in the SAME shape `realmZones()` already
  reads (inspect map.js `realmZones` + the `crGenerate` zone filter in app.js for the
  canonical shape/normalization before writing anything).
- Save → `dbPut('realms', realm)`; open sessions pick zones up next `openSession`.
- Pure DOM + pointer events; no canvas lib, no API. `phase2.css` for handles/grid.
- Validation: max ~12 zones, min size 8%, clamp inside 0..100, unique keys (slugified name).

### 7. "More visualization"  【World — vague ask, interpret sensibly】
The user said: "The current application is just too much text only; I want more visualization."
Features 1, 2, 3, 4 and 6 above ARE most of the answer (fullscreen map, pixel avatars,
inventory panel, stat tiles, map editor). Additional cheap wins if time remains:
- Portrait strip: row of pixel avatars above chat showing who's present/in earshot
  (dim when out of range) — piggybacks on avatars.js + `inEarshot`.
- Affinity hearts/daggers on map tokens between high-|score| pairs (data already exists
  in `realm.affinities`).
- Session cards: mini map thumbnail (clone zone rects, tiny scale) instead of text rows.

### 8. Professional / minimalist UI mode  【Polish — LARGEST item, do LAST】
**User ask:** "I want an industry-standard, high-end, polished UI… minimalistic UI like
ChatGPT/Claude/Gemini. Retro UI available in settings, **but not by default** — clicking
it converts to retro."

⚠️ **Note the default flip:** the user wants the NEW minimal UI as the DEFAULT and retro
as the opt-in. Confirm once at session start (it changes first-run experience for any
existing users), then:

- **Approach: a 6th "theme" is not enough** — retro look is baked into structure (Press
  Start 2P font, pixel borders, scanlines, chunky buttons). Implement as a **UI skin
  layer**: `<html data-skin="modern|retro">` +  a `modern.css` that (a) neutralizes the
  retro base (system-ui/Inter font stack, remove pixel/scanline effects, soft radii,
  subtle shadows, 8px spacing grid, muted palette with one accent) and (b) restyles the
  ~15 core components (buttons, cards, modals, inputs, chat bubbles, toolbar, settings,
  panels). Selectors: prefix everything with `[data-skin="modern"]` so retro CSS is
  untouched and zero-risk.
- Settings: `uiSkin:'modern'` in DEFAULT_SETTINGS (new installs default modern); a
  prominent skin toggle in Settings AND a small toggle on the dashboard. Existing users:
  on first load after upgrade, if `settings.uiSkin` is undefined, keep `'retro'` and show
  a one-time toast "New minimal UI available in Settings" (don't yank the UI out from
  under them).
- The 5 retro color themes remain retro-skin-only; modern skin ships light + dark
  (respect `prefers-color-scheme`, manual override in settings).
- Budget a full theme-sweep smoke test: every screen × {modern-light, modern-dark,
  5 retro themes}.

---

## Suggested session plan (next session)

1. `phase2.css` scaffold + script tags for all new files (empty stubs) — everything
   typeof-guarded, so the app keeps working after each step. **Commit per feature.**
2. avatars.js (small, high visible impact, unblocks visualization items) ✦ ~30 min
3. bigmap.js (expand + MOVE + D-pad + keyboard) ✦ the user's most explicit ask
4. inventory.js ✦ then stats.js (reuses sfx('achievement'))
5. search.js
6. mapedit.js
7. modern skin (modern.css) — big; possibly its own session
8. Playwright smoke suite for all of it; commit + push to
   `claude/sunnydeck-feature-planning-qdvekh` (or a new branch if that PR merged —
   see repo instructions about restarting merged branches).

## Constraints restated (from the user)
- Features must NOT change existing capabilities, increase API costs, or break anything —
  add-ons only. Prefer zero-API mechanics; any AI tick must be batched/cheap/optional.
- Exceeding 10 total features is fine; at least 10 required (Phase 1 delivered 10;
  Phase 2 adds ~8 more).
- "You have no limitations" on file structure — split freely.
