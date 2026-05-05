# Contributing to Theatro

Thanks for your interest in Theatro! This document explains how to contribute effectively.

---

## 🧭 Before You Start

Read these first:
- [`README.md`](./README.md) — project overview
- [`docs/BLUEPRINT.md`](./docs/BLUEPRINT.md) — full design
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — layer rules

---

## 🛡️ Hard Rules (Non-Negotiable)

These are architectural commitments. PRs that violate them will be rejected.

1. **No backend code.** Theatro is frontend-only.
2. **No raster images** shipped in the repo. All icons must be inline SVG.
3. **No native browser dropdowns, popups, or alerts.** Use custom overlays.
4. **No direct provider calls from UI.** UI → Service → Provider.
5. **No DOM access in services.** Services are pure logic.
6. **Storage only through `storageAdapter`.** Never call IndexedDB directly.
7. **Cross-module communication via Event Bus.** No tight coupling.

---

## 🔧 Dev Setup

```bash
git clone https://github.com/Ammar-create/Lokiodinson.netlify.app.git
cd Lokiodinson.netlify.app/Theatro
npm install
npm run dev
```

---

## 🌿 Branch & PR Flow

1. Fork / branch from `main`
2. Use a descriptive branch name: `feat/relationship-matrix`, `fix/scrollLock`, `docs/api-providers`
3. Keep commits small and focused
4. Reference an issue in your PR description if applicable
5. Fill out the PR template fully

---

## 🎨 Style

- **Vanilla JS** (ES2022+ modules)
- 2-space indent
- Prefer named exports
- File header comment explaining the module's role
- No `console.log` in committed code — use `utils/logger.js`
- Run `npm run lint` (when configured) before pushing

---

## 🐛 Reporting Bugs

Use the bug report issue template. Include:
- Browser + version
- Reproduction steps
- Expected vs actual behavior
- Screenshots / console errors if applicable

---

## ✨ Suggesting Features

Use the feature request template. Explain:
- The problem it solves
- How it fits Theatro's three core principles
- Whether it can be implemented client-side only

---

## ❓ Questions

Open an issue using the question template — or just ask in discussions.

Welcome to the stage. 🎭
