# DESIGN.md — CaptionHub

## Theme

**Dark, deep-space utility.** Physical scene: a dim living room, screen glow, user mid-flow toward watching a film. Dark is the honest answer, not a default. Background is a near-black indigo-charcoal; one soft cyan/violet nebula glow sits behind the hero; a faint sparse starfield echoes the hub without becoming decoration (no glass cards, no blur panels).

## Color

OKLCH throughout; hex fallbacks first, OKLCH override second.

| Token | Value (OKLCH) | Role |
|---|---|---|
| `--bg` | `oklch(0.17 0.018 286)` | page background, near-black indigo |
| `--surface` | `oklch(0.21 0.022 286)` | inputs, rows, panels |
| `--surface-2` | `oklch(0.25 0.026 286)` | hover / raised |
| `--border` | `oklch(0.32 0.03 286)` | hairline borders |
| `--ink` | `oklch(0.94 0.008 286)` | primary text |
| `--ink-muted` | `oklch(0.78 0.02 286)` | secondary text (≥4.5:1) |
| `--ink-faint` | `oklch(0.66 0.02 286)` | metadata (≥4.5:1 on surface) |
| `--accent` | `oklch(0.87 0.12 224)` | cyan `#00f0ff` — primary actions, focus, selection |
| `--accent-2` | `oklch(0.82 0.09 290)` | periwinkle `#b8b8ff` — secondary emphasis |
| `--violet` | `oklch(0.60 0.15 305)` | violet `#9b59b6` — decorative only (large/non-text) |
| `--ok` | `oklch(0.80 0.15 150)` | success |
| `--warn` | `oklch(0.80 0.14 75)` | warning |
| `--err` | `oklch(0.66 0.19 25)` | error |

Color strategy: **Restrained** (product default). Cyan is reserved for the primary action, active state, and focus. Periwinkle for secondary emphasis (language chips, badges). Everything else is neutral with a cool violet cast.

## Typography

- **Space Grotesk** (400–700) for everything: headings, labels, body, buttons. Single family per product register.
- **JetBrains Mono** (400–500) for data only: timestamps, FPS, language codes, file counts, version numbers.
- Fixed rem scale, tight ratio (~1.15): `16px` base; h1 `clamp` not needed — product register says fixed: h1 32px, h2 22px, h3 18px.
- Body line length capped 65–75ch; UI density can run tighter.
- Display letter-spacing ≥ -0.02em, never below -0.04em. `text-wrap: balance` on h1–h3.

## Shape & Elevation

- Radius: 10px controls, 12px rows/inputs, 14px popover/dialog. No pill radii on cards, no radius > 16px.
- No "ghost-card" (1px border + wide soft shadow) pairing. Rows use 1px `--border` hairline or `--surface` fill; focus uses a 2px cyan ring, not shadow.
- Shadows only for overlays (dialog/panel): small, tight, low-opacity.

## Components

- **Primary button**: cyan fill, near-black text, 500 weight. Hover: +5% lightness; active: press; focus ring; disabled: 40% opacity.
- **Secondary button / chip**: `--surface` fill, `--border` hairline, ink text. Active chip: cyan-tinted fill + cyan border.
- **Inputs**: `--surface` fill, hairline border, 12px radius, clear focus ring. Placeholder ≥4.5:1 (ink-faint).
- **Result rows**: flat list rows (not cards), 1px hairline separators. Hover: `--surface-2`. Expand inline (no modal).
- **Dropzone**: dashed `--border` outline, surface fill, cyan dashed on dragover.
- **Skeletons**: shimmering neutral blocks during load (motion-safe only).
- **Toast**: bottom-center stack, `--surface-2` fill, semantic left icon, 4s auto-dismiss.
- **Dialog**: native `<dialog>` for settings; dark surface, hairline border, tight shadow.

## Motion

- 160–220ms, ease-out (quint). State-change only: reveal rows, expand, hover, toast in/out.
- Result rows stagger at 24ms steps (max 8). No page-load orchestration.
- `prefers-reduced-motion: reduce` → all transitions/animations collapse to instant (or 1ms).

## Layout

- Sticky header (brand left, status + settings right).
- Hero: h1 → search bar (input + primary button) → language chips → dropzone → collapsible filters.
- Results: meta line (count, page), list, pagination. 1D flex list, responsive by width.
- Mobile: single column; chips wrap; dropzone full width; filters in `<details>`.
