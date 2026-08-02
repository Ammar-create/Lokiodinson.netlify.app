# CaptionHub

Search the [OpenSubtitles](https://opensubtitles.com) catalog for subtitles — by title **or** by file hash (drop a local video file for an exact match). Runs 100% client-side: static files, no server, no build step.

## Setup (one time)

1. Get a free OpenSubtitles API key: <https://opensubtitles.com/consumers/new>
2. Open the app → **Settings** (gear icon) → paste your API key.
3. To enable **downloads**, add your opensubtitles.com username + password (stored only in your browser's localStorage).
4. Done. No deploy step — the folder is static and lives inside the main repo (`/CaptionHub/`).

> Alternative: paste the key as `DEFAULT_API_KEY` in `js/config.js` if you want it baked into the page.

## Features

- **Title search** — query + year, type (movie / series / episode), season & episode, multi-language selection, hearing-impaired filter, sort by downloads / rating / trend / date.
- **Hash search** — drop any video file; the page computes the OpenSubtitles moviehash (MD5 of first + last 64 KB) in-browser and finds the exact matching subtitles. Falls back to a filename search if there's no hash match.
- **Inline results** — expandable rows with uploader, date, rating, FPS, per-file download buttons (multi-CD support).
- **Honest states** — skeletons, empty states, rate-limit / invalid-key / VIP-only download messages.

## Files

```
CaptionHub/
├── index.html      # shell + hero + results + settings dialog
├── css/styles.css  # design system (dark space theme, cyan/violet, OKLCH tokens)
├── js/config.js    # API base, key, language list, sort options
├── js/api.js       # OpenSubtitles REST client (search / login / download)
├── js/md5.js       # MD5 (for moviehash)
├── js/app.js       # state, rendering, search/hash/download flows
├── PRODUCT.md      # product strategy
└── DESIGN.md       # visual design system
```

## API notes

- Base: `https://api.opensubtitles.com/api/v1` (docs: [opensubtitles.stoplight.io](https://opensubtitles.stoplight.io/docs/opensubtitles-api))
- All requests send `Api-Key` + `X-User-Agent` headers. Free tier: ~10 requests/min per IP.
- Search: `GET /subtitles` · Login: `POST /login` · Download: `POST /download` (needs Bearer token).
- Downloads require an account; some subtitles additionally require VIP download rights (API `406`).

## Deploy

Static-only (matches `netlify.toml` in the repo root — functions disabled). Push the repo and Netlify serves `/CaptionHub/`.
