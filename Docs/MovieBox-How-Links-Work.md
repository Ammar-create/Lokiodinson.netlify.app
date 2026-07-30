# MovieBox — How the Links Work

**Handoff note for app/website owners** (e.g. Vision TV Plus–style players)

This document explains how **MovieBox stream links** are obtained, based on the open CloudStream plugin pattern (`invokeMoviebox` in CineStream). It is a technical description of the request flow so you can decide whether and how to add MovieBox as a source in your own app.

It is **not** a full implementation, and it is **not** affiliated with MovieBox or Vision TV Plus.

---

## 1. Big picture

Many streaming frontends (including typical “multi-server” web apps) work like this:

```text
TMDB / IMDb id  →  build embed URL  →  <iframe src="https://some-player/...">
```

**MovieBox does not work that way.**

MovieBox works like this:

```text
Movie/series title (+ season/episode for TV)
        ↓
  Authenticate (short-lived token)
        ↓
  Search MovieBox catalog by title
        ↓
  Pick matching subjectId (+ detailPath)
        ↓
  Call download + play APIs
        ↓
  JSON contains real media URLs (mp4 / stream / dash)
        ↓
  Your player plays those URLs directly
```

So:

| Style | What you get | How you play it |
|--------|----------------|-----------------|
| Embed servers (CinemaOS, VidZee, VidLink, …) | A webpage URL | `<iframe>` |
| **MovieBox** | **Direct file/stream URLs** | `<video>`, HLS.js, ExoPlayer, etc. |

---

## 2. Hosts involved

| Role | Host |
|------|------|
| Main API | `https://h5-api.aoneroom.com` |
| Detail / posts API | `https://h5.aoneroom.com` |
| Web referer/origin used in requests | `https://fmoviesunblocked.net` |

Base path prefix on the main API:

```text
/wefeed-h5api-bff/
```

---

## 3. Step-by-step link resolution

### Step 1 — Get a token

```http
GET https://h5-api.aoneroom.com/wefeed-h5api-bff/app/get-latest-app-pkgs?app_name=moviebox
```

- Look at the **response header** named **`x-user`** (not only the body).
- `x-user` is a JSON string. Read the **`token`** field.
- Use it as:

```http
Authorization: Bearer <token>
```

If there is no token, stop. Later calls will fail.

> **Browser note:** CORS often hides custom headers like `x-user`. Native apps (Android/OkHttp, etc.) can read it easily. Web apps usually need their **own backend/proxy** that performs this request server-side and returns the token.

---

### Step 2 — Search by title

```http
POST https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search
Content-Type: application/json
Authorization: Bearer <token>
Accept: application/json
X-Client-Info: {"timezone":"Africa/Nairobi"}
```

**Body example:**

```json
{
  "keyword": "Inception",
  "page": 1,
  "perPage": 24,
  "subjectType": 1
}
```

| Field | Meaning |
|--------|---------|
| `keyword` | Movie or series **title** (not TMDB id) |
| `subjectType` | `1` = movie, `2` = TV series |
| `page` / `perPage` | Pagination |

**Typical success shape** (simplified):

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "subjectId": "1234567890",
        "subjectType": 1,
        "title": "Inception",
        "detailPath": "inception-xxxxx",
        "hasResource": true,
        "cover": { "url": "https://..." },
        "imdbRatingValue": "8.8"
      }
    ]
  }
}
```

Important fields per item:

- **`subjectId`** — required id for later calls  
- **`title`** — match carefully (see §5)  
- **`detailPath`** — often already present; needed for play/download  
- **`hasResource`** — whether streams are likely available  

Sometimes the JSON nests an extra `data` object. Normalize with:

```text
payload = json.data.data ?? json.data ?? json
```

---

### Step 3 — Resolve `detailPath` (if missing)

If search already returned `detailPath`, you can skip this.

Otherwise:

```http
GET https://h5.aoneroom.com/wefeed-h5-bff/web/post/list/subject?id=<subjectId>
```

Read something like:

```text
data.items[0].subject.detailPath
```

Example: `project-loki-wQ8iFwfMWC5`

---

### Step 4 — Fetch the actual links

Build query:

```text
subjectId=<id>&detailPath=<path>
```

For TV episodes also add:

```text
&se=<season>&ep=<episode>
```

Then call **both** (in parallel is fine):

```http
GET https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/download?subjectId=...&detailPath=...
GET https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/play?subjectId=...&detailPath=...
```

**Headers used by the reference implementation:**

```http
Authorization: Bearer <token>
Accept: application/json
X-Client-Info: {"timezone":"Africa/Nairobi"}
Referer: https://fmoviesunblocked.net/spa/videoPlayPage/movies/<detailPath>?id=<subjectId>&type=/movie/detail
Origin: https://fmoviesunblocked.net
```

---

### Step 5 — Read URLs out of the JSON

After unwrapping `data`, the useful arrays are:

#### From **download** response

| Array | Field | Use |
|--------|--------|-----|
| `downloads[]` | `url`, `resolution`, `vipLocked` | Direct quality links |
| `captions[]` | `url`, `lanName` / `lan` | Subtitle files |

#### From **play** response

| Array | Field | Use |
|--------|--------|-----|
| `streams[]` | `url`, `resolution` / `resolutions`, `vipLocked` | Stream links |
| `dash[]` | `url`, `vipLocked` | DASH / auto quality |

**Rules from the reference plugin (CloudStream / CineStream `invokeMoviebox`):**

1. **`vipLocked` is only a per-entry flag** — it does **not** mean “MovieBox is VIP-only” or that free users get nothing useful.  
2. Take every entry where `url` is non-empty **and** `vipLocked` is **not** true. Those free links are what CloudStream plays.  
3. In practice that free set commonly includes normal qualities **including 720p and 1080p** (plus DASH “Auto” when unlocked). Higher tiers (e.g. some 4K / promo rows) may be marked VIP and simply ignored.  
4. Deduplicate by resolution (if download already added 1080, don’t add the same res again from streams).  
5. Attach playback headers when requesting the media URL:

```http
Referer: https://fmoviesunblocked.net/
Origin: https://fmoviesunblocked.net
```

### About `vipLocked` (important)

The official app may upsell VIP, so the JSON can mix free and VIP rows in one list. Example shape:

```json
{
  "downloads": [
    { "url": "https://.../720.mp4",  "resolution": 720,  "vipLocked": false },
    { "url": "https://.../1080.mp4", "resolution": 1080, "vipLocked": false },
    { "url": "https://.../2160.mp4", "resolution": 2160, "vipLocked": true }
  ]
}
```

CloudStream does **not** implement VIP login. It just does:

```text
if (url is not empty AND vipLocked is false) → emit playable ExtractorLink
```

So in CloudStream you still get **watchable links up through typical free max quality (often 1080p)**.  
VIP rows are dropped quietly; they are not required for normal playback.

Do **not** treat `vipLocked` as “this whole title is unusable.” Only skip the locked rows.

**What you end up showing the user (free links):**

```text
MovieBox [Original]  1080p  →  https://.../....mp4   (or m3u8)
MovieBox [Original]   720p  →  https://...
MovieBox [Hindi]      720p  →  https://...
MovieBox Auto [Original] (DASH) → https://.../.mpd
+ subtitle tracks
```

Those free `url` values are the **playable links**.

---

## 4. End-to-end diagram

```text
User picks "Loki" S01E01 in your app
              │
              ▼
[1] GET get-latest-app-pkgs?app_name=moviebox
        → header x-user.token
              │
              ▼
[2] POST subject/search
        keyword="Loki", subjectType=2
        → list of subjects
              │
              ▼
[3] Title match → subjectId + detailPath
              │
              ▼
[4] GET subject/download?subjectId&detailPath&se=1&ep=1
    GET subject/play?subjectId&detailPath&se=1&ep=1
              │
              ▼
[5] Parse downloads / streams / dash / captions
        → playable URLs + subtitles
              │
              ▼
[6] Your player (not an iframe embed page)
```

---

## 5. Title matching (easy to get wrong)

MovieBox search is **text search**, not TMDB-id search.

Example: searching `"Loki"` can return:

- `Project Loki`
- `Mythical Detective Loki Ragnarok`
- `Loki`
- `Loki [Hindi]`
- unrelated noisy hits

**Do not** take the first result that merely *contains* the word.

Better approach:

| Priority | Match |
|----------|--------|
| Best | Exact title (`Loki`) |
| Great | `Loki [English]`, `Loki [Hindi]`, etc. |
| OK | Title starts with the query |
| Weak | Title only contains the query (`Project Loki`) |

Optional extras:

- Prefer `hasResource: true`  
- Use year from TMDB to break ties  
- Allow the user to pick among top matches if several score high  

---

## 6. How this differs from Vision TV Plus–style servers

Vision-style apps typically keep a dropdown of **embed** servers:

```text
cinemaos  → https://cinemaos.live/watch/movie/{tmdbId}
vidzee    → https://player.vidzee.wtf/embed/movie/{tmdbId}
vidlink   → https://vidlink.pro/movie/{tmdbId}
...
```

Those need **TMDB/IMDb/AniList ids** and load inside an **iframe**.

MovieBox needs:

- a **title string** (from your TMDB metadata is fine),  
- optional **season/episode**,  
- multi-step API calls,  
- then a **direct player** UI (quality list + video element), not an iframe to MovieBox itself.

Suggested product shape:

```text
Server dropdown:
  … existing embed servers …
  MovieBox (Direct)     ← new mode

If embed server selected  → set iframe.src
If MovieBox selected      → run steps 1–5 → show quality buttons → play URL
```

Your existing TMDB browse/search UI can stay unchanged. Only the **watch/play** path gains a “direct” branch.

---

## 7. Minimal pseudocode

```text
function resolveMovieBox(title, season?, episode?):
    token = readTokenFrom(getLatestAppPkgs())
    if not token: return []

    subjectType = season != null ? 2 : 1
    items = postSearch(token, title, subjectType)
    matches = rankByTitle(items, title)   // scored, not first fuzzy hit
    if matches empty: return []

    links = []
    for each match in matches (limit a few):
        detailPath = match.detailPath or fetchDetailPath(match.subjectId)
        downloadJson, playJson = parallel(
            getDownload(token, match.subjectId, detailPath, season, episode),
            getPlay(token, match.subjectId, detailPath, season, episode)
        )
        // Keep free rows only: url present && vipLocked != true
        // (same as CloudStream — free 720/1080 etc. still work)
        links += extractFreeUrls(downloadJson, playJson, match.language)

    return links   // each: { url, quality, label, headers, type }
```

---

## 8. Practical constraints for web apps

| Topic | Reality |
|--------|---------|
| **CORS** | Browser JS often cannot complete this flow cleanly. Token header and authed play/download calls may be blocked. |
| **Best fit** | Native app, desktop client, or **your own backend proxy** that calls MovieBox and returns links to the frontend. |
| **Token lifetime** | JWT-like; cache briefly, refresh when expired. Do not hardcode or commit tokens. |
| **Link lifetime** | Stream URLs may be signed/short-lived; resolve close to playback time. |
| **VIP / `vipLocked`** | Optional flag on **some** quality rows only. CloudStream skips `vipLocked: true` and still plays free links (often up to **1080p**). No VIP account is needed for normal use. |
| **Legal / ToS** | Using third-party streaming APIs may violate terms or copyright rules where you operate. This doc is for understanding the technical flow only. Implement only what you have rights and permission to use. |

---

## 9. What to implement in your app (checklist)

- [ ] Keep TMDB (or existing) metadata as-is for catalog UI  
- [ ] Add a server option: **MovieBox (Direct)**  
- [ ] On select: run token → search → match → download/play  
- [ ] Show returned qualities as a list  
- [ ] Play with native/HLS/DASH player + Referer/Origin when possible  
- [ ] Attach subtitles from `captions` when present  
- [ ] For TV, pass `se` and `ep`  
- [ ] Emit free links only (`vipLocked !== true`) — same as CloudStream; expect normal free qualities including up to ~1080p  
- [ ] If every row is VIP-locked (rare), show empty state — do not invent a VIP paywall in your UI unless you want one  
- [ ] Prefer server-side proxy if the client is a browser  

---

## 10. One-sentence summary

**MovieBox links are not embed page URLs — they are direct media URLs returned by WeFeed/MovieBox H5 APIs after token auth, title search, and play/download requests; your app must resolve them with that multi-step flow and play the resulting `url` fields itself.**

---

## 11. Reference (community / open plugin pattern)

This flow matches the community CloudStream extractor style used in CineStream:

- Function name: `invokeMoviebox`  
- Provider key example: `p_moviebox`  
- Label examples: `MovieBox [language]`, `MovieBox Auto [language] (DASH)`

You do not need that codebase to implement the idea; the HTTP steps above are the whole link story.

---

*Document purpose: educational handoff so a site/app owner can understand MovieBox link resolution and integrate it deliberately in their own product.*
