# Theatro

**A Multi-LLM Roleplay Universe**

Theatro is a client-only, frontend-only multi-LLM roleplay chat application where AI characters with their own personalities, memories, and emotions interact with the user and each other in evolving narratives.

## 🌟 Vision

Theatro is a living narrative engine where multiple AI characters — each with their own soul, voice, appearance, and emotional memory — interact with the user and with each other inside evolving stories.

**Core Principles:**
1. **Characters are people, not bots.** They remember, hold grudges, feel jealousy, fall in love, misunderstand each other. They don't know they're AI.
2. **Stories drift naturally.** No rigid scripts. The Scenario Controller drops surprises, overhears private conversations, pushes characters into unexpected places.
3. **The user is the director.** Every behavior, threshold, model, color, voice, frequency is tunable in settings.

## 🏗️ Architecture

**Stack:** Vite + Vanilla JS, IndexedDB for storage, deployed as a static site.

**Key Features:**
- **Client-only, Zero Backend** — All API calls go directly browser → LLM provider → browser
- **Multi-LLM Support** — Each character can run on a different model
- **Four Controllers** — Main, Scenario, Creative, and Media controllers orchestrate the experience
- **3-Layer Memory** — Short-term, long-term summary, and relationship matrix
- **Strict Sequential Queue** — Never parallel, always orderly turns

## 🚀 Quick Start

```bash
npm install
npm run dev
```

The app works instantly with default Pollinations settings. Add your Aqua API key in settings for premium models.

## 📖 Documentation

- [Blueprint](docs/BLUEPRINT.md) — Complete project vision and specifications
- [Architecture](docs/ARCHITECTURE.md) — Technical architecture details
- [Structure](docs/STRUCTURE.md) — File organization
- [API Providers](docs/API_PROVIDERS.md) — LLM provider integration
- [Prompt Templates](docs/PROMPT_TEMPLATES.md) — Controller prompt system
- [Controllers](docs/CONTROLLERS.md) — Controller behavior and logic
- [Memory System](docs/MEMORY_SYSTEM.md) — Memory implementation
- [Storage Schema](docs/STORAGE_SCHEMA.md) — IndexedDB schema
- [UI Guidelines](docs/UI_GUIDELINES.md) — Design system
- [Icon System](docs/ICON_SYSTEM.md) — SVG icon architecture

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 9+

### Scripts
- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

## 📦 Deployment

Built for Netlify static hosting:

```bash
npm run build
# Deploy dist/ folder to Netlify
```

## 📝 License

MIT License — see [LICENSE](LICENSE) file.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🙏 Acknowledgments

Built with love for storytellers, roleplayers, and AI enthusiasts.