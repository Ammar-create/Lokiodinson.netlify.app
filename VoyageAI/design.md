```markdown
# 🧭 Voyage AI — Design Document

> A browser-native AI workstation. Zero dependencies. Zero frameworks. Zero compromises.

---

## Table of Contents

- [Overview](#overview)
- [Design Philosophy](#design-philosophy)
- [Color System](#color-system)
  - [Dark Theme](#dark-theme)
  - [Light Theme](#light-theme)
  - [Accent Colors](#accent-colors)
  - [Status Colors](#status-colors)
- [Typography](#typography)
- [Spacing & Layout](#spacing--layout)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Components](#components)
  - [Buttons](#buttons)
  - [Inputs](#inputs)
  - [Custom Select](#custom-select)
  - [Toggles](#toggles)
  - [Sliders](#sliders)
  - [Cards](#cards)
  - [Context Menus](#context-menus)
  - [Toasts](#toasts)
  - [Media Picker](#media-picker)
  - [Badges & Tags](#badges--tags)
- [Pages](#pages)
  - [Onboarding](#onboarding)
  - [Chat](#chat)
  - [Sidebar](#sidebar)
  - [Module Selector](#module-selector)
  - [Typing Bar](#typing-bar)
  - [Empty State](#empty-state)
  - [Image Generation](#image-generation)
  - [Settings](#settings)
- [Architecture](#architecture)
  - [File Structure](#file-structure)
  - [Dependency Graph](#dependency-graph)
  - [CSS Load Order](#css-load-order)
- [Feature Map](#feature-map)
- [Timeline](#timeline)

---

## Overview

**Voyage AI** is a fully client-side AI workstation that runs entirely in the browser. It connects to multiple AI providers (AquaDevs, Groq, and any OpenAI-compatible API), supports 16 callable tools, multi-agent orchestration, image/video generation, and a full memory engine — all without any framework, bundler, or server.

| Attribute | Value |
|-----------|-------|
| Name | Voyage AI |
| Runtime | Browser-native |
| Framework | None (vanilla JS) |
| Bundler | None (ES modules) |
| Dependencies | Zero |
| Data Layer | IndexedDB |
| Total Files | 16 (1 HTML + 5 CSS + 10 JS) |
| Total Features | 90 |
| Dev Timeline | 6 days |

---

## Design Philosophy

- **Zero browser-native components** — Every select, toggle, slider, file picker, and dropdown is custom-built
- **True dark and light themes** — Not inverted colors. Each theme is independently designed
- **User-configurable accent** — 8 preset accent colors, recolor the entire UI instantly via CSS custom properties
- **Distinctive typography** — DM Sans for UI, JetBrains Mono for code and stats
- **Purposeful motion** — Animations for state changes, not decoration. Every transition has a functional reason
- **Single-entry architecture** — One `index.html`, everything else is CSS and ES modules

---

## Color System

### Dark Theme

The default theme. Near-black surfaces with controlled depth hierarchy.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#09090B` | App background, chat area |
| `--bg-secondary` | `#131316` | Sidebar, top bar, typing bar |
| `--bg-tertiary` | `#1A1A1F` | Input fields, code blocks, cards |
| `--bg-elevated` | `#222228` | Modals, dropdowns, popovers |
| `--bg-hover` | `#2A2A32` | Hover states on interactive elements |

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#F4F4F5` | Headings, body text, message content |
| `--text-secondary` | `#A1A1AA` | Labels, descriptions, inactive nav items |
| `--text-tertiary` | `#71717A` | Placeholders, metadata, secondary info |
| `--text-muted` | `#52525B` | Timestamps, stats, disabled text |

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | `rgba(255,255,255,0.06)` | Card borders, section dividers |
| `--border-default` | `rgba(255,255,255,0.1)` | Input borders, standard separators |
| `--border-strong` | `rgba(255,255,255,0.16)` | Focused inputs, active states |

### Light Theme

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FAFAFA` | App background |
| `--bg-secondary` | `#F4F4F5` | Sidebar, top bar |
| `--bg-tertiary` | `#E8E8EC` | Inputs, cards |
| `--bg-elevated` | `#FFFFFF` | Modals, dropdowns |
| `--bg-hover` | `#E4E4E7` | Hover states |

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#18181B` | Primary text |
| `--text-secondary` | `#52525B` | Secondary text |
| `--text-tertiary` | `#71717A` | Tertiary text |
| `--text-muted` | `#A1A1AA` | Muted text |

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | `rgba(0,0,0,0.04)` | Subtle borders |
| `--border-default` | `rgba(0,0,0,0.08)` | Standard borders |
| `--border-strong` | `rgba(0,0,0,0.14)` | Strong borders |

### Accent Colors

Accent is applied via HSL CSS variables so the entire UI recolors with a single change:

```css
--accent-h: 215;    /* Hue */
--accent-s: 92%;    /* Saturation */
--accent-l: 56%;    /* Lightness */
--accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
--accent-soft: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.12);
--accent-medium: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.25);
--accent-glow: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.08);
```

**8 Preset Accents:**

| Name | H | S | L | Preview |
|------|---|---|---|---------|
| Blue (default) | 215 | 92% | 56% | ██ `hsl(215,92%,56%)` |
| Purple | 262 | 83% | 58% | ██ `hsl(262,83%,58%)` |
| Green | 142 | 71% | 45% | ██ `hsl(142,71%,45%)` |
| Rose | 346 | 77% | 55% | ██ `hsl(346,77%,55%)` |
| Orange | 25 | 95% | 53% | ██ `hsl(25,95%,53%)` |
| Amber | 47 | 96% | 53% | ██ `hsl(47,96%,53%)` |
| Cyan | 187 | 85% | 43% | ██ `hsl(187,85%,43%)` |
| Neutral | 0 | 0% | 55% | ██ `hsl(0,0%,55%)` |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#34D399` | Model online indicator, save confirmations |
| `--warning` | `#FBBF24` | Private chat badge, rate limit warnings |
| `--error` | `#F87171` | Delete actions, errors, destructive operations |
| `--info` | `var(--accent)` | Informational states |

---

## Typography

**Primary Font:** DM Sans — geometric, clean, slightly warm  
**Monospace Font:** JetBrains Mono — for code, stats, technical readouts

Google Fonts import:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Token | Size | Weight | Letter Spacing | Line Height | Usage |
|-------|------|--------|----------------|-------------|-------|
| H1 | 32px | 700 | -0.03em | 1.2 | Page titles |
| H2 | 24px | 600 | -0.02em | 1.3 | Section headings |
| H3 | 18px | 600 | -0.01em | 1.4 | Card titles, subsections |
| Body | 15px | 400 | normal | 1.6 | Message content, descriptions |
| Small | 13px | 400 | normal | 1.5 | Labels, metadata |
| Mono | 13px | 400 | normal | 1.5 | Code, stats, technical data |
| Muted | 12px | 400 | normal | 1.4 | Timestamps, secondary metadata |

---

## Spacing & Layout

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps (tag padding, icon margins) |
| `--space-2` | 8px | Small gaps (between related items) |
| `--space-3` | 12px | Default component gaps |
| `--space-4` | 16px | Section padding, card padding |
| `--space-5` | 20px | Message padding, form padding |
| `--space-6` | 24px | Section margins, layout padding |
| `--space-8` | 32px | Large section breaks |
| `--space-12` | 48px | Page-level spacing |

**Layout constants:**
- Sidebar width: `280px`
- Max content width: `1200px`
- Typing bar max width: `720px` (centered)

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Small buttons, code inline, tags |
| `--radius-md` | 12px | Cards, inputs, dropdown items |
| `--radius-lg` | 16px | Chat demo frames, modals, large cards |
| `--radius-xl` | 20px | Typing bar, onboarding modal |
| `--radius-pill` | 999px | Chips, pills, toggles, badges, tool buttons |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.5)` | Modals, floating panels |
| `--shadow-glow` | `0 0 24px var(--accent-soft)` | Focused inputs, primary buttons on hover |

---

## Components

### Buttons

Four variants + two sizes. All custom. No native `<button>` styling.

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| Primary | `var(--accent)` | `#fff` | transparent | brightness(1.1) + glow |
| Secondary | `var(--bg-tertiary)` | `var(--text-primary)` | `var(--border-default)` | bg-hover + border-strong |
| Ghost | transparent | `var(--text-secondary)` | transparent | bg-tertiary + text-primary |
| Danger | `rgba(248,113,113,0.1)` | `var(--error)` | `rgba(248,113,113,0.2)` | bg opacity increase |

**Sizes:**
- Default: `padding: 10px 20px`, `font-size: 14px`
- Small: `padding: 6px 12px`, `font-size: 12px`

**Icon Button:** `36×36px` circle/square, bg-tertiary, text-secondary. Used for action bars, toolbar icons.

---

### Inputs

All inputs are custom-styled. No browser-native chrome.

- **Text input:** `padding: 10px 14px`, border-radius `var(--radius-md)`, bg-tertiary, border-default
- **Focus state:** border accent + `box-shadow: 0 0 0 3px var(--accent-soft)`
- **Textarea:** Same style, `min-height: 80px`, `resize: vertical`
- **Placeholder color:** `var(--text-muted)`

---

### Custom Select

Replaces all native `<select>` elements. Dropdown positioned absolutely below trigger.

```
┌─────────────────────────────┐
│  Professional            ▾  │  ← Trigger (clickable)
└─────────────────────────────┘
┌─────────────────────────────┐
│  Default                    │
│  Professional          ✓    │  ← Selected option
│  Friendly                   │
│  Concise                    │
│  Creative                   │
└─────────────────────────────┘
```

- Rounded dropdown with `var(--radius-md)`, shadow-lg
- Options have hover state (bg-hover) and selected state (accent color)
- Animates in with `translateY(-4px)` → `0`

---

### Toggles

Custom toggle switch. No native checkbox.

```
OFF:  [  ○         ]  bg-hover, circle left
ON:   [         ○  ]  bg-accent, circle right, white dot
```

- Width: 44px, Height: 24px, Border-radius: 12px
- Circle: 18×18px, transitions position on toggle
- Used in: settings toggles, model enable/disable, feature flags

---

### Sliders

Three-level slider for AI characteristics (Warmth, Enthusiasm, Emoji, Headers).

```
Enthusiasm                    Default
[████][    ][    ]
Less     Default     More
```

- Three segments, click any to set level
- Filled segments use accent color
- Labels below, current value shown top-right

---

### Cards

Settings navigation cards. Icon + title + subtitle + chevron.

```
┌──────────────────────────────────────┐
│ [🧠]  Memory                ›       │
│       Manage stored memories         │
└──────────────────────────────────────┘
```

- bg-secondary, border-subtle, radius-md
- Icon in accent-soft background
- Hover: bg-tertiary, border-default

---

### Context Menus

Floating menus from three-dot (⋯) buttons. Two variants:

**User Message Menu:**
```
┌────────────────────┐
│ ✎  Edit            │
│ ⑃  Fork from here  │
│────────────────────│
│ 🗑  Delete         │  (danger color)
└────────────────────┘
```

**AI Response Menu:**
```
┌────────────────────┐
│ ✂  Copy & Select   │
│ ↗  Share           │
│────────────────────│
│ 🗑  Delete         │  (danger color)
└────────────────────┘
```

- bg-elevated, border-default, radius-md, shadow-lg
- Hover: bg-hover
- Divider between primary and destructive actions

---

### Toasts

Notification toasts. Slide in from right.

```
┌────────────────────────────────────────┐
│ ✅  Settings saved successfully     ✕  │
└────────────────────────────────────────┘
```

Three variants: success (✅), warning (⚠️), error (❌)

---

### Media Picker

Custom file picker that replaces browser native everywhere.

```
┌────────────────────────────────┐
│ 🖼  Image                      │
│     PNG, JPG, WebP up to 20MB  │
│                                │
│ 📄  Document                   │
│     PDF, DOCX, TXT, CSV        │
│                                │
│ 🎵  Audio                      │
│     MP3, WAV, M4A              │
│                                │
│ 📁  Other                      │
│     Any file type              │
└────────────────────────────────┘
```

---

### Badges & Tags

| Badge | Style | Usage |
|-------|-------|-------|
| Private Chat | `warning` bg + text, pill shape | Toggle indicator in topbar |
| Model Tag | accent-soft bg, accent text, pill | Premium/Standard model indicator |
| Capability Tag | Color-coded per type | Model capability labels |

**Tag colors:**
- Text: green (`#34D399`)
- Image: yellow (`#FBBF24`)
- Tools: blue (accent)
- Vision: purple (`#A855F7`)
- Reasoning: red (`#F87171`)

---

## Pages

### Onboarding

Three-step flow. Centered card with step dots.

**Step 1 — Personal Info (skippable):**
- First name, last name, nickname inputs
- Skip + Continue buttons

**Step 2 — Profile Picture (skippable):**
- Image upload area (drop or click)
- Skip + Continue buttons

**Step 3 — API Key (required):**
- Provider selector
- API key input
- "Get Started" button

Step dots: 8px circles, active = 24px rounded bar.

---

### Chat

The core experience. Messages flow vertically with clear visual hierarchy.

**User Message:**
```
┌──────────────────────────────────────┐
│  What is multi-agent orchestration?  │  ← accent bg, white text
└──────────────────────────────────────┘
                                    📋 ⟳ ⋯
```

**AI Response:**
```
[🟣] gpt-5                           ← Avatar + model name

💡 Thought for 3.2 seconds ▾         ← Collapsible thinking pill

[p: The response body with full
   markdown rendering including
   **bold**, `code`, and lists.]

┌─ Code Block ───────────────┐
│ javascript           Copy  │
│────────────────────────────│
│ const agent = new Agent(); │
└────────────────────────────┘

[🖼 Generated image preview]         ← Inline images

📋 ⟳ 🔊 ↗ ⋯                         ← Actions

↑ 847  ↓ 1.2K  ⚡ 78.3  ⏱ 4.1s     ← Stats (mono, muted)
```

**Thinking Block:**
- Collapsed: pill with "Thought for X seconds", click to expand
- Expanded: italic text in bg-tertiary card
- Chevron rotates 180° on expand

**Stats Bar:**
- Input tokens ↑ | Output tokens ↓ | Speed ⚡ | Time ⏱
- JetBrains Mono, text-muted, 11px

**Actions:**
- User: Copy, Regenerate, ⋯ (→ Edit, Fork, Delete)
- AI: Copy, Regenerate, Speak, Share, ⋯ (→ Copy & Select, Delete)

---

### Sidebar

280px fixed width. Vertical flex layout.

```
┌────────────────────────────┐
│ NexusAI              [✎]   │  ← Brand + New Chat
│────────────────────────────│
│ 💬  Chat                   │
│ 🎨  Image Generation       │
│ ⚙   Settings               │
│────────────────────────────│
│ TODAY                      │
│ 💬  Architecture Discussion│  ← Active (accent-soft bg)
│ 💬  React vs Vanilla JS    │
│ 💬  API integration        │
│ YESTERDAY                  │
│ 💬  IndexedDB schema       │
│ 🔒  Private: API keys      │  ← Lock icon for private chats
│────────────────────────────│
│ [M]  Magnus                │  ← User avatar + name
│      AquaDevs · Standard   │
└────────────────────────────┘
```

- Conversations grouped by date (Today, Yesterday, date headers)
- Active chat has accent-soft background
- Private chats show lock icon
- User card at bottom with avatar, name, plan

---

### Module Selector

Top-right dropdown. Provider → Model drill-down.

```
Module ▾
┌──────────────────────────────────┐
│ [A] AquaDevs              ✓     │  ← Active provider
│     34 standard + 17 premium     │
│──────────────────────────────────│
│     gpt-5               Standard │  ← Expanded model list
│     gpt-5.2                      │
│     gemini-3                     │
│     deepseek-v4                  │
│     sonnet-4.6           Premium │
│──────────────────────────────────│
│ [G] Groq                         │  ← Collapsed provider
│     Fast inference + STT & TTS   │
│──────────────────────────────────│
│ [+] Add Provider                 │
│     Connect any OpenAI-compat    │
└──────────────────────────────────┘
```

---

### Typing Bar

Bottom of chat area. Rounded input with left/right actions.

```
[+] Ask anything...                          [↑]

🔵 gpt-5          🔍 Search  💡 Think  🎨 Create
```

- Left: `+` button → custom media picker
- Center: text input, full width
- Right: circular accent send button
- Bottom-left: model dot (green = online) + model name
- Bottom-right: tool chips (toggleable, accent when active)
- Focus state: accent border + glow

---

### Empty State

Centered welcome screen for new chats.

```
           💬
    What are you working on?
Start a conversation or try a template below

 [✍️ Write code] [🔍 Research] [🎨 Generate] [📊 Analyze]
```

- Horizontally scrollable template cards below greeting
- Each card: thumbnail image + label
- Clicking card starts chat with preset prompt

---

### Image Generation

Full page, accessed from sidebar.

```
┌──────────────────────────────────────┐
│ 🎨 Image Generation                  │
│ Create images with AI...             │
│──────────────────────────────────────│
│                                      │
│ Prompt                               │
│ ┌──────────────────────────────────┐ │
│ │ A futuristic cyberpunk city at   │ │
│ │ night, neon lights...            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Aspect Ratio                         │
│ [1:1 ✓] [9:16] [16:9] [4:3] [Custom]│
│                                      │
│ Reference Image (Optional)           │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│ │      🖼 Drop or click         │   │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                      │
│ [✨ Generate Image]     [flux-2 ▾]   │
│                                      │
│ Gallery — 6 images                   │
│ ┌────┐ ┌────┐ ┌────┐                │
│ │    │ │    │ │    │                │
│ └────┘ └────┘ └────┘                │
│ ┌────┐ ┌────┐ ┌────┐                │
│ │    │ │    │ │    │                │
│ └────┘ └────┘ └────┘                │
└──────────────────────────────────────┘
```

- Gallery grid: 3 columns, hover shows prompt overlay
- Click image → download or copy prompt
- Ratio chips: standard presets + custom input
- Reference: file upload OR URL paste

---

### Settings

Card-based navigation, matching the sidebar panel pattern.

**Settings Navigation:**

```
MY AI
┌────────────────────────────────────┐
│ 👤  Personalization        ›       │
│     Tone, characteristics          │
├────────────────────────────────────┤
│ 🧠  Memory                  ›       │
│     Manage stored memories         │
└────────────────────────────────────┘

ACCOUNT
┌────────────────────────────────────┐
│ ✎   Profile                 ›       │
│     Name, picture, nickname        │
└────────────────────────────────────┘

PREFERENCES
┌────────────────────────────────────┐
│ ◐   Appearance              ›       │
│     Theme, accent, streaming       │
├────────────────────────────────────┤
│ 🔌  Providers               ›       │
│     API keys, models, tools        │
└────────────────────────────────────┘
```

**Personalization Tab:**
- Tone selector (custom dropdown)
- 4 characteristic sliders (3-level): Warmth, Enthusiasm, Emoji, Headers/Lists
- Custom instructions textarea
- Web search toggle

**Memory Tab:**
- Memory list (clickable items with icon, text, date)
- Long-press to delete
- Save new memory button
- Toggles: Reference memories, Reference chat history
- Personal fields: nickname, occupation, additional info

**Profile Tab:**
- Profile picture upload
- First name, last name, nickname inputs

**Appearance Tab:**
- Theme: Dark / Light / System (custom select)
- Accent color: 8 presets (clickable dots)
- Streaming: enable/disable toggle

**Providers Tab:**
- Provider cards with model list
- Per-model toggles (enable/disable)
- Per-model capability tags
- "Add Provider" form: name, base URL, API key
- Auto-fetch models via `/v1/models`

---

## Architecture

### File Structure

```
voyage-ai/
├── index.html                 ← Single entry point
│
├── /css
│   ├── base.css               ← Reset, CSS variables, themes, accent colors, typography
│   ├── layout.css             ← Sidebar, top bar, main area, responsive breakpoints
│   ├── components.css         ← Buttons, modals, dropdowns, toggles, cards, inputs
│   ├── chat.css               ← Chat bubbles, thinking block, stats bar, typing bar, markdown
│   └── settings.css           ← Settings cards, sliders, memory manager, provider config, onboarding
│
└── /js
    ├── app.js                 ← Boot, initialization, global event bus, theme loader
    ├── router.js              ← Page navigation (chat, image gen, settings), history management
    ├── store.js               ← IndexedDB wrapper, all CRUD, schema, migrations, state management
    ├── ui.js                  ← DOM rendering, sidebar, top bar, empty state, template cards, media picker
    ├── chat.js                ← Chat rendering, markdown, streaming, thinking block, actions, fork
    ├── settings.js            ← Settings page: all tabs, sliders, memory, profile, provider config
    ├── providers.js           ← Provider abstraction, AquaDevs, auto-fetch models, streaming handler
    ├── tools.js               ← 16 tool definitions, tool router, code sandbox, GitHub, visualizer
    ├── agents.js              ← Multi-agent orchestrator, workflow engine, memory engine, MCP client
    ├── media.js               ← Custom media picker, file upload, drag-and-drop, preview handling
    └── utils.js               ← Helpers: debounce, formatters, share API, notifications, ID generation
```

**Total: 16 files** (1 HTML + 5 CSS + 10 JS + 1 DESIGN.md)

### Dependency Graph

```
index.html
  └── app.js (type="module")
        ├── store.js         ← zero dependencies
        ├── utils.js         ← zero dependencies
        ├── router.js        ← imports ui, chat, settings
        ├── providers.js     ← imports store, utils
        ├── tools.js         ← imports store, providers, utils
        ├── agents.js        ← imports store, providers, tools, utils
        ├── ui.js            ← imports store, providers, utils
        ├── chat.js          ← imports store, providers, tools, agents, ui, utils
        ├── settings.js      ← imports store, providers, ui, utils
        └── media.js         ← imports store, utils
```

No circular dependencies. `store.js` and `utils.js` are leaf nodes.

### CSS Load Order

```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/chat.css">
<link rel="stylesheet" href="css/settings.css">
```

Cascade: tokens → structure → components → chat → settings.

---

## Feature Map

### Architecture (6)

| # | Feature |
|---|---------|
| 1 | Single-page vanilla JS web app, no framework, no bundler |
| 2 | 16-file modular structure (1 HTML + 5 CSS + 10 JS) |
| 3 | SVG icon system — architecture accommodates future addition |
| 4 | All data persisted in IndexedDB |
| 5 | Design reviewed and approved |
| 6 | Modular ES module imports, no circular dependencies |

### Onboarding (5)

| # | Feature |
|---|---------|
| 7 | First name input |
| 8 | Last name input |
| 9 | Nickname input (what the AI calls them) |
| 10 | Optional profile picture upload |
| 11 | Skip for personal details, API key required — changeable in settings |

### Provider System (4)

| # | Feature |
|---|---------|
| 12 | Abstract provider layer supporting N providers |
| 13 | AquaDevs fully implemented as primary provider |
| 14 | Groq and others accommodated in architecture |
| 15 | Each provider declares capabilities (chat, image, video, TTS, STT, tools) |

### Module Selector (4)

| # | Feature |
|---|---------|
| 16 | "Module" button at top — floating dropdown on click |
| 17 | Providers listed with icon, name, description, checkmark |
| 18 | Click provider → shows its models |
| 19 | Selected model displayed in typing bar |

### Left Sidebar (4)

| # | Feature |
|---|---------|
| 20 | Conversation history — grouped by date, create, rename, delete, search |
| 21 | "Image Generation" option → navigates to full image gen page |
| 22 | New Chat button |
| 23 | Settings access |

### Main Chat (12)

| # | Feature |
|---|---------|
| 24 | Full markdown rendering (bold, italic, lists, code blocks, links) |
| 25 | Streaming SSE support (toggleable) |
| 26 | Tool calling with inline results |
| 27 | User message actions: Copy, Regenerate, ⋯ menu |
| 28 | User ⋯ menu: Edit, Fork, Delete |
| 29 | Fork: new chat from that message upward |
| 30 | AI response header: model icon + name |
| 31 | Collapsible thinking block: "Thought for X seconds" pill |
| 32 | AI actions: Copy, Regenerate, Speak (TTS) |
| 33 | AI ⋯ menu: Copy & Select, Share, Delete |
| 34 | Stats bar: input tokens, output tokens, tok/s, time |
| 35 | Private chat mode: no history saved, no memory |

### Typing Bar (6)

| # | Feature |
|---|---------|
| 36 | Rounded text input with "Ask anything" placeholder |
| 37 | Circular send button (accent bg, arrow icon) |
| 38 | `+` button → custom media picker |
| 39 | Model icon + name (tap to open model list) |
| 40 | Quick tool toggles (web search, thinking, etc.) |
| 41 | Custom media selector replaces browser native everywhere |

### Image Generation (5)

| # | Feature |
|---|---------|
| 42 | Text-to-image prompt input |
| 43 | Reference image: file upload OR URL paste |
| 44 | Predefined aspect ratios + custom ratio input |
| 45 | Gallery of all generated images (IndexedDB) |
| 46 | Click image → download or copy original prompt |

### Empty State (2)

| # | Feature |
|---|---------|
| 47 | Centered greeting: "What are you working on?" |
| 48 | Horizontally scrollable template cards with thumbnail + label |

### Core Systems (4)

| # | Feature |
|---|---------|
| 49 | Memory Engine — IndexedDB, semantic retrieval via embeddings, vector search |
| 50 | Workflow Engine — task queues, agent chains, retry logic, planning loops |
| 51 | Multi-Agent Orchestrator — spawn agents as JS objects/workers, route tasks |
| 52 | MCP Client (Partial) — protocol logic in JS, browser-limited but ready |

### Callable Tools (16)

| # | Tool | Description |
|---|------|-------------|
| T1 | Image Generation | Calls image model, renders inline |
| T2 | Video Generation | Calls video model, embeds mp4 |
| T3 | Web Search | `/v1/search`, returns results to model |
| T4 | URL Extract | `/v1/extract`, feeds content to model |
| T5 | TTS | Text-to-speech, plays inline |
| T6 | STT | Speech-to-text via mic recording |
| T7 | Code Interpreter | Sandboxed iframe execution |
| T8 | File Processor | PDF, CSV, DOCX, JSON parsing |
| T9 | GitHub Agent | Read repos, commits, PRs via GitHub API |
| T10 | DOM Scraper | Extract structured data from URLs |
| T11 | Document Generator | Export as Markdown, HTML, downloadable file |
| T12 | Reasoning Chain | Multi-step planning with execution |
| T13 | Data Visualizer | Chart.js/D3 configs, interactive charts |
| T14 | Scheduler/Reminder | Browser notifications, persisted in IndexedDB |
| T15 | Embeddings + Search | Vector index, cosine similarity search |
| T16 | Task Manager | Create, track, update, complete tasks |

### Settings (19)

| # | Feature | Section |
|---|---------|---------|
| S1 | Tone selector | Personalization |
| S2 | Characteristic sliders (4 × 3-level) | Personalization |
| S3 | Custom instructions free-text | Personalization |
| S4 | Web search toggle | Personalization |
| S5 | Memory Manager — view all memories | Memory |
| S6 | Long-press to delete memory | Memory |
| S7 | Manually save memories | Memory |
| S8 | Reference saved memories toggle | Memory |
| S9 | Reference chat history toggle | Memory |
| S10 | Personal fields (nickname, occupation, info) | Memory |
| S11 | Profile editor (picture, name, nickname) | Account |
| S12 | Theme: Dark / Light / System | Appearance |
| S13 | Accent color picker with 8 presets | Appearance |
| S14 | Streaming toggle | Appearance |
| S15 | Provider list with model enable/disable | Providers |
| S16 | Add custom provider (name, URL, key) | Providers |
| S17 | Auto-fetch models via `/v1/models` | Providers |
| S18 | Per-model config: type, tools, reasoning, vision | Providers |
| S19 | AI-controlled settings (model can modify any setting) | System |

### UI Principles (3)

| # | Principle |
|---|-----------|
| U1 | Zero browser-native components — everything custom |
| U2 | Custom model selection panel with provider grouping |
| U3 | True dark + light themes with configurable accent |

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|-------------|
| **1** | Design system + foundation | `base.css`, `store.js`, `utils.js`, `app.js`, `index.html`. Theme toggle, accent picker, IndexedDB schema. |
| **2** | Core shell | `layout.css`, `components.css`, `router.js`, `ui.js`. Sidebar, top bar, onboarding flow, settings navigation. |
| **3** | Chat interface | `chat.css`, `chat.js`, `providers.js`. Messages, markdown, streaming, thinking block, actions, stats, typing bar, model selector. |
| **4** | Tools + Image Gen | `tools.js`, `media.js`. All 16 tool definitions, code sandbox, image gen page, gallery, file processor. |
| **5** | Intelligence layer | `agents.js`, `settings.js`. Memory engine, workflow engine, orchestrator, MCP client, full settings page. |
| **6** | Polish + ship | Responsive, edge cases, private mode, share, fork, template cards, testing. |

---