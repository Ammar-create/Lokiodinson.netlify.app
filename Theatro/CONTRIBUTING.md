# Contributing to Theatro

Thank you for your interest in contributing to Theatro! This document provides guidelines and instructions for contributing.

## 🎯 Development Philosophy

Theatro is designed to be:
- **Client-only forever** — No backend code, ever
- **Zero external dependencies** for core functionality
- **Privacy-first** — User data stays in their browser
- **Accessible** — Full feature parity across desktop and mobile

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`

## 📋 Code Standards

### JavaScript
- ES2020+ features
- Vanilla JS (no frameworks)
- Functional patterns preferred
- JSDoc comments for all public APIs

### CSS
- CSS custom properties for theming
- Mobile-first responsive design
- No external CSS frameworks

### Architecture Rules
1. UI never calls Providers directly — always through Services
2. Services never touch the DOM — pure logic
3. Controllers never know which Provider runs them
4. Storage always behind adapter
5. Cross-module communication via Event Bus

## 📝 Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

## 🧪 Testing

- Manual testing required for UI changes
- Test IndexedDB operations in private browsing mode
- Verify mobile responsiveness
- Test with both light and dark themes

## 📱 Mobile Considerations

Every feature must work on mobile:
- Touch-friendly targets (min 44px)
- Side panel swipe gestures
- Responsive layouts
- Virtual keyboard handling

## 🎨 UI Guidelines

- Dark mode first, light mode available
- Color-coded characters throughout
- No native browser dropdowns or alerts
- All icons are inline SVG
- Streaming typewriter effect for AI messages

## 🔒 Security

- Never commit API keys
- All provider keys stored in IndexedDB only
- No server-side code that could expose keys

## ❓ Questions?

Open an issue with the `question` label or reach out to maintainers.