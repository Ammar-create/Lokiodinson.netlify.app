# 🎭 Theatro

> A living narrative engine where multiple AI characters — each with their own soul, voice, appearance, and emotional memory — interact with the user and with each other inside evolving stories.

**Theatro** is a client-only, frontend-only multi-LLM roleplay chat application. Characters are people, not bots. Stories drift naturally. The user is the director.

🌐 **Live:** [lokiodinson.netlify.app/Theatro](https://lokiodinson.netlify.app/Theatro)

---

## ✨ Core Principles

1. **Characters are people, not bots.** They remember, hold grudges, feel jealousy, fall in love, misunderstand each other. They don't know they're AI.
2. **Stories drift naturally.** No rigid scripts. The Scenario Controller drops surprises, overhears private conversations, pushes characters into unexpected places.
3. **The user is the director.** Every behavior, threshold, model, color, voice, and frequency is tunable in settings.

---

## 🏗️ Architecture

- **Stack:** Vite + Vanilla JS, IndexedDB for storage, deployed as a static site on Netlify.
- **Zero backend.** All API calls go directly browser → LLM provider → browser.
- **Four Controllers:** Main, Scenario, Creative, Media — orchestrate the world.
- **Three Memory Layers:** short-term raw, long-term summary, and an N×N relationship matrix.
- **Strict turn queue** — characters never speak in parallel.

See [`docs/BLUEPRINT.md`](./docs/BLUEPRINT.md) for the full design.

---

## 🚀 Quick Start

```bash
# clone
git clone https://github.com/Ammar-create/Lokiodinson.netlify.app.git
cd Lokiodinson.netlify.app/Theatro

# install
npm install

# run dev server
npm run dev

# build for production
npm run build
```

The app works **instantly** out of the box using Pollinations as the default provider (no API key required). For premium models, paste your Aqua API key in Settings.

---

## 🔌 Providers

| Provider | Status | Notes |
|---|---|---|
| **Pollinations** | Default, ships with app | Publishable `pk_` key, safe in client |
| **Aqua** | User-supplied key | Standard tier, stored in IndexedDB |
**Custo* blekey | our own n
-- 📁 Repository Layout

```
Theatro/
├── docs/         Design documents
├── public/       Static assets (favicon, manifest, logos)
└── src/
    ├── core/         Event bus, state, router, lifecycle
    ├── controllers/  Main, Scenario, Creative, Media controllers
    ├── characters/   Character engine, memory, relationship matrix
    ├── providers/    Pollinations, Aqua, OpenAI-compatible adapters
    ├── media/        Image, TTS, STT
    ├── storage/      IndexedDB adapter (swappable)
    ├── models/       Data models
    ├── services/     Business logic
    ├── ui/           Screens, components, layouts, side panel
    ├── styles/       CSS (dark-first, light theme available)
    ├── utils/        Helpers
    ├── config/       Defaults, constants, presets
    └── assets/icons/ Inline SVG icon system (categorized)
```

See [`docs/STRUCTURE.md`](./docs/STRUCTURE.md) for the full tree.

---

## 🛡️ Hard Rules

- **No backend.** Ever. (For v1.)
- **No raster images** shipped with the app — all icons are inline SVG.
- **No native browser dropdowns, popups, or alerts** — every UI element is custom.
- **Storage is swappable** — IndexedDB today, cloud-ready tomorrow.
- **Avatars** stored as base64 in IndexedDB, or as URL strings if pasted.

---

## 📚 Documentation

- [`BLUEPRINT.md`](./docs/BLUEPRINT.md) — vision, architecture, decisions
- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — layer rules, data flow
- [`STRUCTURE.md`](./docs/STRUCTURE.md) — repository tree
- [`API_PROVIDERS.md`](./docs/API_PROVIDERS.md) — provtion
EMPLATES./docs/TEMPLmd) — conpts
- [LLERS.md`](NTROcontrolhaviors
-YSTEM.mYSTEM.md) — lained
- [EMmd`](./docs/STORAGE_SCHEMA.md) — IndexedDB schema
- [`UI_GUIDELINES.md`](./docs/UI_GUIDELINES.md) — visual rules
- [`ICON_SYSTEM.md`](./docs/ICON_SYSTEM.md) — SVG icon conventions
- [`ROADMAP.md`](./docs/ROADMAP.md) — what's next
- [`CHANGELOG.md`](./docs/CHANGELOG.md) — release history

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

---

## 📜 License

MIT — see [`LICENSE`](./LICENSE).

---

🎭 *"All the world's a stage, and all the AIs merely players..."*
