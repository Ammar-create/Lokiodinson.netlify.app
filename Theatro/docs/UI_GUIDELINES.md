# Theatro — UI Guidelines

Design system and interface specifications.

---

## Design Principles

1. **Dark mode first** — Light mode is secondary
2. **Color-coded characters** — Every character has a signature color
3. **No native browser UI** — All pickers, modals, alerts are custom
4. **Mobile parity** — Every feature works on phone
5. **Inline expansion** — Prefer expanding content over modals
6. **Streaming feedback** — Always show progress/activity

---

## Color System

### Semantic Colors
```css
:root {
  /* Primary brand */
  --color-primary: #8b5cf6;
  --color-primary-light: #a78bfa;
  --color-primary-dark: #7c3aed;
  
  /* Surfaces */
  --color-bg: #0b0b10;
  --color-surface: #13131a;
  --color-surface-elevated: #1a1a24;
  --color-surface-highlight: #252535;
  
  /* Text */
  --color-text: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  
  /* Accents */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Borders */
  --color-border: #27273a;
  --color-border-subtle: #1e1e2e;
}
```

### Character Colors
Characters are assigned from a curated palette:

```javascript
const CHARACTER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange  
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
];
```

Colors must have:
- Minimum contrast 4.5:1 against dark background
- Minimum contrast 3:1 against light background
- Distinct enough that adjacent characters are distinguishable

---

## Typography

### Font Stack
```css
:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 
               'Liberation Mono', monospace;
}
```

### Type Scale
```css
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### Line Heights
```css
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

---

## Spacing

### Scale
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### Layout Values
```css
:root {
  --sidebar-width: 320px;
  --header-height: 64px;
  --input-height: 56px;
  --max-content-width: 1200px;
}
```

---

## Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;
}
```

---

## Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
  
  /* Elevation */
  --elevation-1: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --elevation-2: 0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2);
  --elevation-3: 0 10px 20px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.2);
}
```

---

## Transitions

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  
  /* Specific */
  --transition-color: color 150ms ease;
  --transition-transform: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-opacity: opacity 150ms ease;
  --transition-all: all 200ms ease;
}
```

---

## Breakpoints

```css
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
  --bp-2xl: 1536px;
}
```

Usage:
```css
@media (min-width: 768px) {
  /* Tablet and up */
}

@media (min-width: 1024px) {
  /* Desktop */
}
```

---

## Z-Index Scale

```css
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-toast: 600;
  --z-tooltip: 700;
}
```

---

## Components

### Buttons

**Primary**
```css
.btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: var(--transition-all);
}

.btn-primary:hover {
  background: var(--color-primary-light);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

**Secondary**
```css
.btn-secondary {
  background: var(--color-surface-elevated);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

**Ghost**
```css
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover {
  background: var(--color-surface);
  color: var(--color-text);
}
```

### Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.card-elevated {
  background: var(--color-surface-elevated);
  box-shadow: var(--elevation-1);
}
```

### Input Fields

```css
.input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.875rem;
  color: var(--color-text);
  font-size: var(--text-base);
  transition: var(--transition-color);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}
```

### Modals

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal-backdrop);
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  z-index: var(--z-modal);
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}
```

---

## Message Formatting

### Roleplay Format
```
*rubs eyes sleepily* "I don't know what you're talking about."
```

Rendered:
- `*rubs eyes sleepily*` — Italic, muted color, no quotes
- `"I don't know what you're talking about."` — Character color, quoted

### CSS
```css
.message-content .action {
  font-style: italic;
  color: var(--color-text-muted);
}

.message-content .dialogue {
  color: var(--character-color);
}

.message-content .dialogue::before,
.message-content .dialogue::after {
  content: '"';
  color: var(--color-text-muted);
}
```

---

## Side Panel

### Desktop (>1024px)
- Fixed width: 320px
- Collapsible with toggle button
- Persists state in settings

### Mobile (<1024px)
- Slide-out drawer
- Full height, 85% width
- Backdrop overlay
- Swipe to close

---

## Touch Targets

Minimum 44×44px for all interactive elements:

```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Animation

### Typewriter Effect
```css
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

.streaming-text {
  overflow: hidden;
  white-space: nowrap;
  animation: typewriter steps(40) 0.5s;
}
```

Actually use JS for character-by-character:
```javascript
function* typewriterEffect(text, onChar) {
  for (const char of text) {
    onChar(char);
    yield delay(config.typewriterSpeed);
  }
}
```

### Loading States
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.streaming-dots span {
  animation: bounce 0.6s ease-in-out infinite;
}

.streaming-dots span:nth-child(2) { animation-delay: 0.1s; }
.streaming-dots span:nth-child(3) { animation-delay: 0.2s; }
```

---

## Accessibility

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove default outline, add custom */
button:focus:not(:focus-visible) {
  outline: none;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Text
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```