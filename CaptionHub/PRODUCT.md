# Product

## Register

product

## Users

Ammar (LokiOdinson) and visitors to his hub, typically at home in the evening about to watch a movie or show. They want subtitles in their own language quickly — or they have a local video file and want the exact matching subtitles, not a guess.

## Product Purpose

CaptionHub searches the OpenSubtitles catalog by movie/show title **or** by file hash (exact match for local video files), lets you filter by language and type, and hands you the subtitle file directly. Runs 100% client-side as a static page inside the main LokiOdinson repository — no server, no functions. The user supplies their own free OpenSubtitles API key.

## Brand Personality

Cosmic, swift, dependable. It belongs to the deep-space family of the hub (cyan/violet on near-black) but behaves like a focused tool: it gets out of the way between you and the subtitle file.

## Anti-references

- Ad-cluttered subtitle download portals with 50-step download flows.
- Generic AI-slop SaaS: purple gradients, glassmorphism cards, gradient text, identical card grids.
- Marketing-page energy for what is a utility (no hero metrics, no fake stats).
- Anything that requires a server — the page must work from any static host.

## Design Principles

1. **The file is the truth.** Hash-based matching for local videos is the headline capability; title search is the fallback.
2. **Speed to download.** Fewest clicks from search → subtitle file. Inline download, no modal chains.
3. **Fit the family.** Share the hub's space DNA (dark, cyan/violet) while staying a restrained product UI.
4. **Honest states.** Clear messaging for missing API key, rate limits, auth-required downloads, and empty results.
5. **Static-first.** Vanilla JS, no build step, relative paths — deployable by dropping a folder into the repo.

## Accessibility & Inclusion

WCAG AA minimum: 4.5:1 text contrast, keyboard-operable controls, visible focus, semantic HTML, `prefers-reduced-motion` respected, `aria-live` for search/status feedback.
