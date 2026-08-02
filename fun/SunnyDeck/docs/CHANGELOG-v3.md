# SunnyDeck — v3 Changelog

> Complete record of every change shipped during the v3 campaign (2026-08-01 → 2026-08-02).
> Pair this with `../v3.md` (roadmap + per-phase implementation briefs) and `../agent.md`
> (engineering guide). Commits are on `origin/main` of the Lokiodinson repository.

---

## Commit map

| Commit | Date | What shipped |
|---|---|---|
| `a3941fd` | 2026-08-01 | v3 roadmap written (`v3.md`) |
| `3523565` | 2026-08-01 | **Phase 1 — universal OpenAI-compatible providers** |
| `2c13790` | 2026-08-01 | **Phase 2 — per-character history, radio listening, director engine** |
| `5005efd` | 2026-08-01 | **Phase 3 — rooms (map-anchored), door states, map markers** |
| `3febe96` | 2026-08-01 | **Phase 4 — system prompting, voice packs, traits, tone chips** |
| `fc0a782` | 2026-08-01 | **Editable chat prompt template + behavior rules** |
| `ee316ea` | 2026-08-01 | **Phase 5 — relationship engine (emotion vectors + reasons ledger + triadic)** |
| `1279125` | 2026-08-02 | **Phase 6 — unified action menu (composer-row ⋯)** |
| `7408245` | 2026-08-02 | docs: agent.md action-menu section |

---

## Phase 1 — Universal OpenAI-compatible providers

**Files:** `app.js`, `index.html`, `app-ai.js`, `dice.js`, `director.js`, `inventory.js`,
`journal.js`, `memory.js`, `quests.js`, `rewind.js`, `share.js`, `social.js`

- `settings.customProviders[] = {id, name, base, apiKey, models[]}` — add any
  OpenAI-compatible provider (name / base URL / key / fetched models).
- `mergeCustomProviders()` (app.js): rebuilds the runtime `PROVIDERS` map from
  built-ins + customs; mirrors each custom key into `settings['cp_<id>']` so every
  existing `settings[p.keyName]` fetch site works unchanged (6 sites: getReply,
  routeMessage, maybeAutoRename, generateRealmWithAI, aiJson, aiText).
- `providerReady(modelStr)` — per-model key gate; replaced the aqua-only
  `hasApiKeys()` at all 13 gating call sites (chat→`chatModel`, ticks→`taskModel`,
  creation→`creativeModel`). `hasApiKeys()` kept as a loose any-provider check.
- Settings UI: Custom Providers section — add / fetch models (`GET {base}/models`,
  non-blocking) / remove; custom models appear in the creative/task/router/chat
  dropdowns (`allModelOpts`, `refreshModelDropdowns`).
- TTS stays Aqua-only (graceful skip without an aqua key); STT stays Groq.
- Custom keys are named `apiKey` so `SHARE_DENY_KEYS` export stripping covers them.

## Phase 2 — Per-character history, radio listening, director engine

**Files:** `history-utils.js`, `app.js`, `app-ai.js`, `map.js`, `bigmap.js`,
`director.js`, `dice.js`, `inventory.js`, `quests.js`, `world.js`, `avatars.js`,
`index.html`

- **`history-utils.js` (core history system):**
  - `histPush(sess, h[, realm])` — the single write path: assigns monotonic `seq`,
    tags `participants[]` (speaker + whisperTo/targetKey) and `heardBy[]` (everyone in
    radio range) via `histTagEntry`.
  - `histLastSeq`, `histDialogueSince` — seq utilities (legacy no-seq entries never
    count, correct for cadence checks).
  - `syncCharLog(sess, key)` — lazily materializes `sess.charLogs[key]`
    `{syncedSeq, entries[], syncedAll}`; whisper privacy enforced in `charLogEntry`
    (a whisper appears only in speaker + target logs).
  - `buildCharLogLines(sess, key, limit)` — first-person prompt context
    (`You: …` / `X said to you: …` / `You overheard X say: …` / `You heard X shout: …`).
  - `radioRange(sess)` / `radioInRange` — unified adjustable radius (default 14).
- **AI context rule:** `getReply` now feeds each character ONLY their own log
  (`CHAR_LOG_PROMPT_WINDOW = 60`), never the omniscient timeline.
- **Radio:** `sess.radioRadius` (slider on the fullscreen map) governs both responding
  (`inEarshot`) and overhearing; SHOUT reaches every character's log; whispers never
  overheard. Earshot ring follows the radius.
- **Director engine:** `directorPass(sess, realm)` — cadence pass after exchanges;
  settings `directorModel` + `directorInterval` (default 10), per-session overrides
  (`sess.directorModel`/`sess.directorInterval`); executes `{movements, activities,
  moments}` with validation; busy-flag + graceful failure.
- All 12 history push sites converted to `histPush` (app-ai ×3, dice, director ×3,
  inventory, quests ×2, world ×2). NPC chatter lines carry `targetKey`.
- Gate corrections: ambient beats gate on `chatModel`; stage tick on `routerModel`.
- Portrait click opens `openCharLogModal(key)` — first-person history viewer.
- Settings: Director Model dropdown + Director Interval field.

## Phase 3 — Rooms (map-anchored), door states, map markers

**Files:** `rooms.js` (new), `app.js`, `app-ai.js`, `history-utils.js`, `map.js`,
`bigmap.js`, `search.js`, `quests.js`, `inventory.js`, `social.js`, `memory.js`,
`journal.js`, `director.js`, `rewind.js`, `index.html`

- **DB v2 additive:** new `rooms` store; v1 realms/sessions/settings survive untouched
  (upgrade verified). `dbPut('sessions', isRoomObj)` routes to the rooms store.
- **`rooms.js`:** room = `{id, isRoom, name, description, characters[], playerKey,
  messages[], charLogs{}, moods{}, rels{}, memories{}, anchor, door, settings{},
  createdAt, lastActiveAt}`. One continuous conversation per room.
  - `roomAsSession(room)` — non-enumerable `history` getter aliases `messages` so the
    shared engine (addChatBubble, getReply, char logs, whisper/shout, TTS, rewind
    edit/redo) works with zero forks.
  - `roomPush(room, h)` — tags against ROOM characters.
  - `queueRoomMirror(room, h)` — door-open rooms leak dialogue (player + replies) into
    the anchored session timeline as `mirrored:true` ambient entries; serialized chain;
    **whispers never leak**.
  - Three door states: open (leak both ways) / closed (no leak, free movement) /
    locked (no in/out). Door popover on the room header; door-state markers on the map;
    entering a locked room blocked.
  - Character import from realms = snapshot copy with fresh collision-safe keys +
    `sourceRealmId` provenance.
  - Room create modal (new chars + import picker + custom play-as dropdown);
    export/import room JSON (`sunnydeck-room` format); searchable (Rooms + Room
    Messages groups).
  - Room UI: header (back, name, door, 🎭 play-as), portraits (→ char log), chat,
    composer (mic / input / target AUTO-SHOUT-char / send).
- **Map:** `.room-marker` on anchored zones (door-state color), click enters (locked →
  toast), `🚪 ROOM` button on the fullscreen map anchors a new room to the current
  session + player's zone.
- **isRoom guards** so realm-bound systems never run against rooms: quests
  (start/tick/finish), inventory tick, social tick, memory distill, journal,
  stageDirectionTick, rewind branch, `handleChatSend`.
- `addChatBubble`/`showTyping`/`rerenderChat` target `#roomChat` when in a room.

## Phase 4 — System prompting, voice packs, traits, tone chips

**Files:** `app-ai.js`, `app.js`, `index.html`, `rooms.js`, `social.js`,
`voicepacks.js` (new)

- **Layered system prompt** (`getReply`): IDENTITY (description/personality/traits) →
  STATE (relationship status + memories + activity) → SCENE (spatial/world/social) →
  CONTEXT (quest/inventory/roll/replied) → VOICE (voice pack) → TONE (active tags) →
  hardened RULES (never repeat phrases; react to THIS exact message; let the moment
  breathe; in-character romance/comfort handling).
- **Traits:** `c.traits[]` — simple per-character tags; editable in both character
  forms + room-create rows; imported with realm characters; injected into identity.
- **Voice packs** (`voicepacks.js`): `PREBUILT_VOICELINES` for the 22 premade
  characters (casual/emotional/teasing); `voiceLinesFor(c)` = `c.voiceLines ||
  PREBUILT_VOICELINES[key]`; `ensureVoicePack(c, realm, sess)` lazily auto-distills a
  pack from the character's own log (≥5 spoken lines, one task-model call, busy-flag).
- **Relationship state:** `relationshipStatusNote` (social.js) — mood + bond with the
  player → STATE layer (superseded by `relationshipNoteFor` in Phase 5).
- **Tone chips:** `TONE_PRESETS = [flirty, romantic, serious, playful, tense, angry,
  whisper]` rows in session + room composers; toggle `activeTags` (whisper chip
  toggles whisper mode); getReply reads the same field for both.
- **Voice/TTS (user decision):** default model = `aqua:mimo-v2.5-tts`; voicedesign /
  voiceclone marked optional; TTS fields hidden until an Aqua key is present
  (`applyTtsVisibility`).

## Phase 4b — Editable prompt templates

**Files:** `app.js`, `app-ai.js`, `index.html`

- `settings.promptChat` (default `DEFAULT_CHAT_TEMPLATE`) + `settings.promptRules`
  (default `DEFAULT_RULES`) editable in Settings → "Prompts & Rules", with reset
  buttons.
- Template variables: `{{identity}} {{state}} {{scene}} {{context}} {{voice}}
  {{tone}} {{rules}} {{history}}` — replaced per reply in `getReply`
  (`.replaceAll`). Missing variables render empty; saving without
  `{{identity}}`/`{{rules}}`/`{{history}}` warns; empty saved values fall back to
  defaults.
- The per-character `system` field remains the per-character editable prompt.
  Internal task prompts stay fixed (JSON-contract plumbing).

## Phase 5 — Relationship engine

**Files:** `rels.js` (new), `app-ai.js`, `app.js`, `index.html`, `rooms.js`

- **Model:** per-pair DIRECTIONAL vectors over `EMOTION_KEYS = [hatred, love,
  jealousy, loyalty, friendship, happiness, comfort]` (−100..+100), stored per
  container (`realm.rels` / `room.rels`). Pair records: `{key, dir:{charKey: vector},
  ledger[], summary, seeded, updatedAt}`.
- `relGetPair(container, a, b)` — lazy pair creation + **one-time seeding from legacy
  affinity** (friendship +score·0.6, comfort +0.3, happiness +0.2, hatred −score·0.6).
- `relApplyEvent(container, from, to, deltas, type, summary, observedBy)` — clamps
  deltas (±20) and vectors (±100), appends to the **reasons ledger** (cap 40).
- `relObserve(container, observer, a, b, sentiment, summary)` — **triadic** shifts for
  witnessed interactions (positive/negative/jealous; jealousy scales with the
  observer's love for b); only on existing pairs (bounded).
- `relDecay(container)` — emotions drift toward zero after ≥1 day; hatred/jealousy
  fastest, comfort/loyalty slowest.
- `relationshipTick(container, context)` — container = rels holder (realm/room),
  context = history holder (session/room; same object for rooms). Fires after ≥6 new
  dialogue messages; task-model extraction of `events` + `observations` with strict
  validation + **hallucination-presence guard** (observations only for observers with
  fresh char-log entries). Wired from `handleChatSend` (`(realm, sess)`) and `roomSend`
  (`(room, room)`); saves to the correct store.
- `relationshipNoteFor(charKey, realm, sess)` — mood + the character's own direction
  (top 3 emotions ≥15) + pair summary → getReply STATE layer (falls back to
  `relationshipStatusNote`).
- UI: "Relationships" button on realm detail → `openRelPanel(realm)`.

## Phase 6 — Unified action menu

**Files:** `app.js`, `index.html`, `rooms.js`, `dice.js`

- Composer-row **⋯** button right of the target selector, in both composers
  (`#actionMenuBtn` / `#roomActionMenuBtn`).
- **`ACTION_ITEMS` registry** — `{id, icon, label, scope:'both'|'session'|'room',
  enabled(), active(), run(btn)}`; `openActionMenu(btn)` renders a popover (reuses
  `.target-popover` + auto-close) with scope/disabled filtering.
- Items: Whisper · Play as · Dice · Inventory · Quests · Voice sound · Ambient life ·
  Fullscreen map/radio · Door (anchored rooms) · Add tag.
- Toolbar slimmed to player badge + map toggle/expand; `#diceBtnChat` permanently
  hidden (menu-only); room composer 🤫 button removed (whisper menu-only).
- **Minimal-skin redesign still pending the user's direction brief** (the earlier
  minimal design was rejected; scope lives in `v3.md` Pillar 8).

---

## File-by-file change index

| File | Changes across v3 |
|---|---|
| `app.js` | Providers (`customProviders`, `mergeCustomProviders`, `providerReady`, providers UI); DB v2 `rooms` store + `dbPut` isRoom routing; director settings; `openCharLogModal`; rooms-section hook; action menu (`ACTION_ITEMS`, `openActionMenu`, toolbar slimming); traits form fields; TTS default + visibility; editable prompt templates (`DEFAULT_CHAT_TEMPLATE`/`DEFAULT_RULES`); `TONE_PRESETS` + `renderToneChips`; `renderRoomMarkers` hook |
| `app-ai.js` | Own-log context; `histPush` writes; `directorPass` hook; isRoom guard; layered + editable prompt assembly; `relationshipTick(realm, sess)` hook; `relationshipNoteFor` in STATE |
| `history-utils.js` | `histPush`/`histTagEntry` (participants/heardBy + realm override), `histLastSeq`, `histDialogueSince`, `radioRange`/`radioInRange`, `syncCharLog`/`charLogEntry`/`buildCharLogLines` |
| `map.js` | `radioRange` everywhere (earshot, ring, spatial summary); room-marker render hook |
| `bigmap.js` | Radius slider (`#bmRadius`); `🚪 ROOM` anchor button |
| `director.js` | `histPush` writes; chatter `targetKey`; `directorPass` cadence engine; gate corrections (chatModel/routerModel); isRoom guard on stage tick |
| `dice.js` | `histPush`; `providerReady` gate; dice button menu-only |
| `share.js` | `providerReady` gate |
| `social.js` | `providerReady` gate; isRoom guard; `relationshipStatusNote` |
| `quests.js` / `inventory.js` | `histPush`; `providerReady` gates; isRoom guards |
| `journal.js` / `memory.js` | `providerReady` gates; isRoom guards |
| `rewind.js` | `providerReady` gate; branch isRoom guard; `rerenderChat` room-aware |
| `avatars.js` | Portrait click → char-log modal |
| `search.js` | Rooms + Room Messages search groups |
| `world.js` | `histPush` for phase/weather events |
| `voicepacks.js` | NEW — `PREBUILT_VOICELINES` (22 chars), `voiceLinesFor`, `ensureVoicePack` |
| `rels.js` | NEW — relationship engine (see Phase 5) |
| `rooms.js` | NEW — rooms module (see Phase 3) |
| `index.html` | Settings sections (custom providers, director, prompts & rules, TTS wrap); `screen-room`; tone-chip rows; action-menu wraps; `roomsSection`; script tags (rooms.js, voicepacks.js, rels.js) |
| `v3.md` | Roadmap + per-phase implementation briefs |
| `agent.md` | Architecture docs: providers, history/radio/director, rooms, prompting/voice, relationships, action menu |

---

## Data & settings surface (v3 additions)

**Settings keys** (`DEFAULT_SETTINGS`): `customProviders[]`, `directorModel`,
`directorInterval`, `promptChat`, `promptRules`; `ttsModel` default → `aqua:mimo-v2.5-tts`.

**Session fields:** `radioRadius`, `charLogs{}`, `lastDirectorSeq`, `lastRelTickSeq`,
`activeTags` (existing), per-entry `seq`/`participants[]`/`heardBy[]`/`targetKey`.

**Realm fields:** `rels{}` (relationship engine), `traits[]` per character,
`voiceLines[]` per character (optional).

**Room fields:** `{id, isRoom, name, description, characters[], playerKey, messages[],
charLogs{}, moods{}, rels{}, memories{}, activeTags[], anchor, door, settings{},
createdAt, lastActiveAt}`.

**DB:** `sunny-deck-retro` v2 — stores `realms`, `sessions`, `rooms`, `settings`.

---

## Deferred / next

- **Minimal-skin redesign** — pending user direction brief (v3.md Pillar 8).
- Session→room sound leak direction (leak is one-way room→session today).
- Director room-awareness (NPCs entering/leaving rooms).
- Relationship web visualization + per-character emotion UI.
- Overheard-tagged memory distillation (cross-cutting).
- Per-character voice-pack UI (edit/regenerate from the character card).
