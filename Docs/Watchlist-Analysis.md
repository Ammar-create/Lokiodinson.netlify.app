# Cosmic Watchlist — Deep Technical Analysis

> **File:** `Watchlist/index.html`  
> **Size:** ~129 KB (single-file application)  
> **Live URL:** https://lokiodinson.netlify.app/watchlist/  
> **Theme:** Deep-space glassmorphism (cosmic/navy/cyan)  
> **Author:** Libertas 🕊️

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Visual Design System](#2-visual-design-system)
3. [State & Data Layer](#3-state--data-layer)
4. [Category System](#4-category-system)
5. [Entry Management](#5-entry-management)
6. [Smart Search (OMDB + TMDB)](#6-smart-search-omdb--tmdb)
7. [Import / Export & Data Portability](#7-import--export--data-portability)
8. [AI Chat Assistant](#8-ai-chat-assistant)
9. [Settings & Configuration](#9-settings--configuration)
10. [UX Micro-Interactions](#10-ux-micro-interactions)
11. [Complete API Surface](#11-complete-api-surface)
12. [Known Behaviors & Edge Cases](#12-known-behaviors--edge-cases)

---

## 1. Architecture Overview

Cosmic Watchlist is a **zero-dependency, single-file Progressive Web App** written entirely in vanilla HTML/CSS/JavaScript. It persists all data locally in the browser via **IndexedDB** and communicates with three external APIs:

- **OMDB API** (`fc9b875a`) — metadata fallback / IMDb linkage
- **TMDB API** (`0666d38936ae64a3e537a6d6989fcae0`) — primary poster + modern metadata
- **User-configured OpenAI-compatible endpoint** — conversational AI assistant

### Single-File Structure

| Section | Lines | Purpose |
|---------|-------|---------|
| `<head>` + CSS | ~1–950 | Design tokens, keyframes, responsive grid, component styles |
| `<body>` markup | ~951–1600 | Static DOM: header, sidebar, modals, chat interface |
| `<script>` JavaScript | ~1601–end | DB init, state, rendering, event binding, API wrappers |

There is **no build step**, no bundler, and no external JS libraries. The only external assets are Google Fonts (Space Grotesk, Crimson Pro).

---

## 2. Visual Design System

### CSS Custom Properties (Design Tokens)

```css
--deep-space: #0a0a0f;
--cosmic-navy: #12121f;
--nebula-purple: #2d1b4e;
--cyan-glow: #00f0ff;
--warm-amber: #ff6b35;
--soft-lavender: #b8b8ff;
--text-primary: #f0f0f5;
--text-secondary: #8a8aa3;
--glass-bg: rgba(255,255,255,.03);
--glass-border: rgba(255,255,255,.08);
--success: #10b981;
--warning: #f59e0b;
--danger: #ef4444;
```

These tokens drive every surface in the app, guaranteeing visual consistency.

### Animated Starfield Background
- A fixed `div#starfield` covers the viewport (`pointer-events: none`).
- Two large blurred radial gradients (`.nebula-1`, `.nebula-2`) drift via a `float` keyframe animation over 20 seconds.
- On script init, **150 stars** are dynamically injected:
  - Randomized `left`/`top` percentages
  - Random `--duration` (2–5 s) and `--opacity` (0.3–1.0)
  - `animation-delay` spread across 5 seconds so they never twinkle in unison

### Card 3D Hover Effect
Each watch card has a `mousemove` listener that updates CSS variables `--mouse-x` and `--mouse-y`. A `::before` pseudo-element renders a 600 px radial gradient centered on the cursor, producing a localized glow that follows the mouse.

### Scrollbars & Selection
Custom WebKit scrollbar styling (thin, purple track, cyan thumb). Text selection uses a translucent cyan wash (`rgba(0,240,255,.3)`).

### Responsive Breakpoints

| Breakpoint | Layout Change |
|------------|---------------|
| `max-width: 900px` | Sidebar collapses above content; chat modal goes full-height |
| `max-width: 640px` | Stack search row vertically; header centers; cards go 2-column |
| `max-width: 420px` | Cards go single-column |

---

## 3. State & Data Layer

### IndexedDB Schema

```
Database: CosmicWatchlistDB
Version: 1

Object Store: entries
  keyPath: id (autoIncrement)
  Index: category (non-unique)

Object Store: categories
  keyPath: name
```

All DB access is wrapped in Promise-based helpers:
- `getAll(store)` — retrieve every record
- `addItem(store, data)` — insert new record
- `putItem(store, data)` — upsert (used for updates)
- `deleteItem(store, key)` — remove by key
- `getEntry(id)` — fetch single entry by primary key

### In-Memory State Object

```js
state = {
  currentCategory: 'watchlist',   // active sidebar tab
  categories: [],                 // cached category list
  deleteTarget: null,            // {type, id} for confirmation modal
  editingId: null,             // entry being edited
}
```

State is ephemeral; the IndexedDB is the **single source of truth**. On every mutating operation, the app re-fetches from IndexedDB and re-renders.

### Implicit Sorting
Entries are sorted by an `order` field (with `id` fallback). New entries receive `order = Date.now()`. This preserves manual ordering without exposing a drag-and-drop UI.

---

## 4. Category System

### CRUD Operations
- **Create:** Modal prompts for lowercase name; duplicates rejected.
- **Read:** Sidebar renders every category as a pill with live item count.
- **Update (Rename):** Right-click context menu → rename. All entries in that category are migrated in a loop.
- **Delete:** Right-click context menu → delete. Confirmation modal warns that entries inside the category will also be destroyed.

### Context Menu Implementation
A native `contextmenu` event is prevented, and a custom absolutely-positioned `div.context-menu` is injected at `e.pageX / e.pageY`. Clicking elsewhere removes it.

### Default Category
If the database is empty on first load, a `"watchlist"` category is auto-seeded.

---

## 5. Entry Management

### Data Model

```js
{
  id: 1,
  title: "Breaking Bad",
  type: "series",          // series | movie | anime | franchise
  category: "watchlist",
  year: "2008–2013",
  seasons: "5",
  episodes: "62",
  runtime: "49 min",
  totalWatchTime: "~62 hours",
  genre: "Crime, Drama, Thriller",
  plot: "...",
  imdbLink: "https://www.imdb.com/title/...",
  poster: "https://image.tmdb.org/t/p/w500...",
  progress: "Season 1 Episode 1",
  notes: "Personal notes...",
  isCompleted: false,
  progressPercent: 0,
  order: 1712345678901,
  createdAt: 1712345678901
}
```

### Modal Flows
1. **Add** — empty form, custom selects rebuilt, `tempPoster` cleared.
2. **Add (from Bot)** — pre-populated with search result fields + poster URL.
3. **Edit** — loads existing record; `refreshEntryBtn` becomes visible.

### Custom Select Component
Because the user prefers custom selects over native `<select>`, the app builds its own:
- `buildCustomSelect(containerId, options, value, onChange)`
- Trigger div toggles a dropdown menu via class-based CSS transitions.
- Click-outside detection closes all open menus.
- Selected option gets the `.active` class and cyan highlight.

Two instances exist in the entry modal: **Type** and **Category**.

### Progress Tracking
- `progressPercent` is parsed from the text field or set to `100` when `isCompleted === true`.
- A linear gradient bar (`cyan → lavender`) visualizes the percentage.
- Completed cards get a pulsing green "Done" badge with a CSS box-shadow animation.

### Stats Panel (Sidebar)
Live-updating counters:
- **Total Items** — count of all entries across all categories.
- **Completed** — count of `isCompleted` entries.
- **Watch Time** — summed from `totalWatchTime` (regex-parses hours and minutes).
Bar widths are calculated relative to simple heuristics (`total > 0`, `hours / 10 * 100`).

---

## 6. Smart Search (OMDB + TMDB)

### Algorithm: `smartMovieSearch(title)`

1. **Parallel fetch** of OMDB (`?t=`) and TMDB multi-search (`/search/multi`).
2. If TMDB returns results, iterate through them and score each match:

| Condition | Score |
|-----------|-------|
| Exact title match against OMDB title | +150 |
| Exact title match against query | +120 |
| Substring match with OMDB title | +60 |
| Substring match with query | +40 |
| Year exact match | +80 |
| Year within ±1 | +30 |

3. Best match ≥ threshold proceeds to TMDB detail fetch (`/movie/{id}` or `/tv/{id}`).
4. Returns a composite object: `{ omdb, tmdb, tmdbItem, matchScore }`.

### Enrichment Pipeline: `enrichEntry(entry)`
Takes an entry and backfills missing fields from the search result:
- **Poster** → TMDB `poster_path` (primary), OMDB `Poster` (fallback)
- **Seasons/Episodes** → TMDB `number_of_seasons` / `number_of_episodes`
- **Runtime** → TMDB `episode_run_time[0]` or `runtime`, then OMDB
- **Year** → first segment of TMDB date, then OMDB `Year`
- **Plot** → TMDB `overview`, then OMDB `Plot`
- **Genre** → TMDB genres joined, then OMDB `Genre`
- **Type inference** → `first_air_date ? series : movie`
- **Total watch time** → calculated math:  
  `episodes × runtime_mins ÷ 60` for series,  
  `runtime_mins ÷ 60` for movies.

### Bot Results Panel
After search, the UI shows:
- **Poster box** with left/right navigation arrows if multiple poster URLs exist.
- **Metadata tags** — type pill (amber for movie, lavender for series), year, IMDb rating, season/episode counts, runtime.
- **Plot** + top actors.
- **Action buttons:**
  - "Add to Watchlist" → opens entry modal pre-filled.
  - "Copy IMDb Link" → writes to clipboard.
  - "Download Poster" → fetches blob, creates object URL, triggers `<a download>`.

### Refresh Metadata Button (Edit Mode)
When editing an existing entry, clicking "Refresh Metadata" re-runs `smartMovieSearch` against the current title field and overwrites empty fields in the form (not saving until the user clicks Save).

---

## 7. Import / Export & Data Portability

### Export
Serializes the entire database to a JSON object:
```json
{
  "version": 1,
  "exportedAt": "2026-06-06T...",
  "categories": ["watchlist", "anime"],
  "entries": [ /* full records */ ]
}
```
Downloads as `cosmic-watchlist-YYYY-MM-DD.json`.

### Import
Accepts multiple JSON shapes:
1. **Standard export** — `{ entries: [], categories: [] }`
2. **Bare array** — `[{...}, {...}]` (categories inferred)
3. **Keyed object** — `{ "watchlist": [...], "anime": [...] }` (each key becomes category)

Import process:
- Validates that entries exist.
- Calculates next `order` value by scanning existing records.
- Iterates through imports and **enriches each entry** via TMDB/OMDB (can be slow for large lists — shows progress toast every 3 items if > 8 entries).
- New categories are auto-created in IndexedDB.
- `initApp()` is called at the end to refresh the UI.

### Refresh Missing Posters
A dedicated settings action scans all entries lacking a poster and runs `enrichEntry` on each. Progress toasts fire every 3 entries for large libraries.

---

## 8. AI Chat Assistant

### Configuration
Users provide an **OpenAI-compatible base URL**, API key, and model ID in Settings. The app auto-completes the path:
- If ends with `/v1/chat/completions` → use as-is
- If ends with `/v1` → append `/chat/completions`
- Otherwise → append `/v1/chat/completions`

### Session Management
Sessions are stored in `localStorage` as a JSON array:
```js
{
  id: "sess_timestamp_random",
  title: "First 30 chars of first user message…",
  messages: [{role, content}],
  createdAt: timestamp,
  updatedAt: timestamp
}
```
- A session selector dropdown in the chat header allows switching between past chats.
- "New Chat" creates a fresh session.
- Deleting a session falls back to the next oldest, or auto-creates a new one.

### System Prompt Architecture
A default system prompt is stored as a template string with placeholders:
- `{{CATEGORIES}}` — comma-separated list of current categories
- `{{ENTRIES}}` — bullet list of every entry with title/type/category/status
- `{{TODAY}}` — ISO date string
- `{{SEARCH_INSTRUCTION}}` — conditional text based on the "Model has web search" toggle

The prompt instructs the model to output XML-style action blocks:
```xml
<Action>{"action":"add_entries","entries":[...]}</Action>
```

Supported actions:
1. **`add_entries`** — bulk insert; each entry is enriched via TMDB/OMDB before saving.
2. **`delete_entry`** — removes by title match (exact, then substring fallback).
3. **`update_entry`** — rename, mutate fields, optionally re-fetch metadata.
4. **`create_category`** — adds new category if it doesn't exist.

### Streaming Implementation
- Uses `fetch()` with `stream: true` and reads the response body via `ReadableStream.getReader()`.
- Parses Server-Sent Event lines (`data: {...}`) and extracts `choices[0].delta.content`.
- Appends tokens live to the assistant's bubble, auto-scrolling the chat body.
- AbortController allows request cancellation (exposed but not bound to a cancel button in current UI).

### Action Execution
After the stream ends:
1. All `<Action>...</Action>` blocks are extracted via regex.
2. Actions are removed from displayed text so the user sees clean prose.
3. Each action is executed sequentially.
4. A small inline status spinner appears below the bubble during execution.
5. Results are appended as a system message to the session history.

### Prompt Guide
A collapsible panel inside the chat modal provides clickable prompt chips that auto-fill the textarea:
- Harry Potter franchise
- Arrowverse collection
- Add an anime
- Mark completed
- What to watch next?
- Summarize completed
- Fix entry title + poster

---

## 9. Settings & Configuration

### Data Tab
- **Export JSON** → triggers instant download.
- **Import JSON** → hidden file input, parsed on change.
- **Refresh Missing Posters** → bulk enrichment scan.

### AI Configuration Tab
- **API Base URL** — free-text, auto-normalized on send.
- **API Key** — password input.
- **Model ID** — e.g. `gpt-4o-mini`.
- **Web Search Toggle** — CSS-only toggle switch; affects system prompt instructions.

### Advanced System Prompt
Collapsible textarea (220 px min-height) allowing full customization of the AI persona. Changes persist to `localStorage` under key `cosmicSettings`.

### Settings Persistence
```js
localStorage.setItem('cosmicSettings', JSON.stringify({
  apiUrl, apiKey, modelId, systemPrompt, enableSearch
}));
```
Settings are read on every chat send and on app init (to toggle AI button visibility).

---

## 10. UX Micro-Interactions

### Modals
- CSS transition on `opacity` (overlay) + `transform: scale(...)` (modal).
- Backdrop click closes modal.
- Body scroll locked while open.

### Toast Notifications
- Stacked fixed container in top-right.
- 4 types: info (cyan), success (green), warning (amber), error (red).
- Auto-dismiss after 3.5 s with slide-out animation.

### Keyboard Shortcuts
- `Enter` in search input → triggers search.
- `Enter` (no Shift) in chat textarea → sends message.
- `Shift + Enter` in chat textarea → newline (native behavior).

### Loading Spinners
Pure CSS: `border-top-color` set to `--cyan-glow`, rotated via `@keyframes spin`.

### Context Menu
- Right-click category pill → rename / delete.
- Click-outside removes menu.
- Reuses a single injected DOM node pattern.

---

## 11. Complete API Surface

### OMDB
```
GET https://www.omdbapi.com/?apikey={OMDB_KEY}&t={title}
```
Returns: JSON with Title, Year, Released, Runtime, Genre, Plot, Poster, imdbID, totalSeasons, Type, etc.

### TMDB
```
GET https://api.themoviedb.org/3/search/multi?api_key={TMDB_KEY}&query={title}
GET https://api.themoviedb.org/3/{media_type}/{id}?api_key={TMDB_KEY}
```
Returns: Search results + detailed TV/movie objects with poster_path, number_of_seasons, number_of_episodes, episode_run_time, overview, genres, etc.

### AI Completion
```
POST {userBaseUrl}/v1/chat/completions
Headers: Authorization: Bearer {apiKey}, Content-Type: application/json
Body: { model, messages, stream: true, temperature: 0.8, max_tokens: 4000 }
```
Supports any provider using the OpenAI HTTP + SSE streaming contract (e.g., OpenRouter, Groq, local Ollama with `--ngrok`, etc.).

---

## 12. Known Behaviors & Edge Cases

### 1. Hardcoded API Keys
Both OMDB and TMDB keys are baked into the client-side source. TMDB keys have rate limits (40 requests / 10 seconds for free tier); heavy import operations may hit caps.

### 2. No Authentication / Multi-User
IndexedDB is local to the browser profile. There is no cloud sync or user accounts.

### 3. Poster Hotlinking
Posters are direct URLs to `image.tmdb.org`. If TMDB changes its CDN path or the user blocks cross-origin images, posters break silently (the `onerror` handler hides the `<img>` and reveals the letter fallback).

### 4. AI Action Fragility
The regex `<Action>([\s\S]*?)<\/Action>` relies on well-formed JSON inside XML tags. If the model emits malformed JSON or breaks tags across chunks, the action is silently skipped.

### 5. Entry Ordering
`order` is initialized as `Date.now()` and auto-increments during import. There is no UI to manually reorder entries (drag-and-drop not implemented), so new entries always append to the end of the current category.

### 6. Single-File Monolith
At 129 KB, the file is large but still manageable. However, any edit requires modifying the entire file. Splitting into `style.css` + `app.js` would improve maintainability but is not currently done.

### 7. Session Storage vs. DB Entries
Chat sessions live in `localStorage`, not IndexedDB. Clearing browser local storage wipes chat history but preserves the watchlist.

### 8. Poster Download
The download feature fetches the image as a Blob, creates an object URL, and triggers a transient `<a download>` click. CORS on TMDB images sometimes prevents this — the catch block shows a toast error.

---

## Summary

Cosmic Watchlist is a remarkably complete local-first media tracker. Its single-file architecture trades maintainability for extreme portability (drop `index.html` on any static host and it works). The integration of OMDB + TMDB provides robust metadata enrichment, while the AI assistant layer transforms it from a passive tracker into an active curation tool capable of bulk operations via natural language.
