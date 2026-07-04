# Backend API Routes

This document specifies the backend API needed to drive the website. Today every
page renders from hardcoded arrays inside the JSX (`src/Home.jsx`, `src/Blog.jsx`,
`src/photo/data.jsx`, etc.). To make the site data-driven and maintainable, those
arrays should move behind a small read-mostly API.

The site is a personal portfolio — it is **read-heavy and single-author**. The
public surface is entirely `GET`; the only write path is the contact form (and it
is optional). Auth is only needed for the private authoring/admin surface.

- Base URL: `/api`
- Format: JSON (`Content-Type: application/json`)
- Versioning: prefix with `/api/v1` if you expect the shape to churn
- Most list endpoints return a plain JSON array. The dataset is small and
  single-author, so each list returns everything; no pagination.
- The **photo** list endpoints (`/api/albums`, `/api/frames`) are the exception:
  they wrap the array in `{ "data": [...], "meta": {...} }`, where `meta` carries
  the result counts and active filters the gallery UI needs.

---

## 1. Site / Manifest

Drives the hero meta-strip, footer, and the `now` tile on the landing page.

### `GET /api/site`
Returns global site config and the landing-page "now" block.

```json
{
  "version": "1.0",
  "updated": "2026-05-17",
  "hero": {
    "prompts": ["cat manifest", "whoami", "tail -f log"],
    "tagline": "I build, break, then photograph what's left."
  },
  "now": {
    "updatedCadence": "weekly",
    "body": "Reading about post-quantum lattices. Editing a recent batch of shots…",
    "tags": ["kyber", "exposure", "ebpf"]
  },
  "socials": [
    { "key": "linkedin",  "label": "linkedin",  "url": "https://www.linkedin.com/in/ishaanzaveri/" },
    { "key": "instagram", "label": "instagram", "url": "https://www.instagram.com/ishaanzaveriphotography/" },
    { "key": "github",    "label": "github",    "url": "https://ishaanzaveri.github.io/" }
  ],
  "build": { "branch": "main", "lastCommit": "2026-05-17T10:00:00Z" }
}
```

Notes
- `hero.prompts` backs the Tweaks panel "Prompt" radio (`cat manifest`, `whoami`,
  `tail -f log`).
- `build.lastCommit` powers the footer "last commit 4h ago" string; compute the
  relative time on the client.

---

## 2. About / Bio

The About page renders a markdown source file with a line gutter.

### `GET /api/about`
```json
{
  "title": "bio",
  "subtitle": "ishaan zaveri · 2026-05-17",
  "filename": "bio.md",
  "format": "markdown",
  "source": "# bio\n## ishaan zaveri · 2026-05-17\n\n> Software developer in Chicago.\n\nI build large-scale traffic management systems at [Parsons](https://www.parsons.com/) …",
  "encoding": "utf-8",
  "eol": "lf"
}
```

Notes
- Return the **raw markdown** in `source`. The client owns the rendering (it
  deliberately shows the markdown punctuation, line numbers, and byte count).
- `lines` and `bytes` shown in the file bar are derived client-side from `source`.

---

## 3. Projects ("selected work")

Powers the "selected work" grid on the landing page and a future `./work` page.

### `GET /api/projects`
Query params:
- `status` — filter by `shipped | progress | archived`
- `limit` — default 12 (home shows 3, with a "3 of 12 →" affordance)

```json
[
  {
    "slug": "honeycache",
    "name": "honeycache",
    "blurb": "honeypot cache that watches and learns. single binary, ~2k LOC…",
    "stack": ["C", "eBPF", "sqlite"],
    "status": "shipped",
    "metric": "2.1k samples · 412 ★",
    "readmeUrl": "/api/projects/honeycache/readme",
    "order": 1
  }
]
```

The home page shows the first 3 and labels it "3 of 12 →"; the client derives that
total from the array length.

### `GET /api/projects/:slug`
Single project detail (for the "cat readme →" action).

`status` is an enum: `shipped`, `progress`, `archived` — maps to the `Status`
component's three states.

---

## 4. Blog

### `GET /api/posts`
List endpoint backing both the landing "writing" section and the `./blog` page.

Query params:
- `tag` — `systems | security | photo | notes` (the filter row; `all` omits it)
- `limit` — optional cap (landing shows 5, blog shows all)
- `sort` — default `-date` (newest first; the UI labels this `ls -t`)

```json
[
  {
    "slug": "a-honeypot-cache-that-watches-and-learns",
    "date": "2026-05-12",
    "tag": "systems",
    "title": "a honeypot cache that watches and learns",
    "blurb": "single binary, ~2k LOC. how the cache decides what is worth keeping…",
    "readMinutes": 8
  }
]
```

Notes
- The filter pills show per-tag counts, e.g. `systems (8)`. Since the blog page
  fetches the full list, the client derives those counts from the array.
- `readMinutes` is an integer; the UI renders `8 min`. The BlogPost view also
  derives an approximate word count (`readMinutes * 230`) — optionally return a
  real `words` field instead.

### `GET /api/posts/:slug`
Full post, used by the `BlogPost` detail view. `body` is a raw markdown string;
the client renders it (and must sanitize the output before injecting HTML).

```json
{
  "slug": "a-honeypot-cache-that-watches-and-learns",
  "date": "2026-05-12",
  "tag": "systems",
  "title": "a honeypot cache that watches and learns",
  "blurb": "single binary, ~2k LOC…",
  "readMinutes": 8,
  "words": 1840,
  "commit": "a1b2c3d",
  "tags": ["cache", "go", "systems", "eviction"],
  "body": "The cache started as a joke…\n\n## the first three designs were wrong\n\n1. LRU with a twist…\n\n```go\nfunc (c *Cache) shouldKeep(e *entry) bool {\n  …\n}\n```\n\n> A cache that forgets on a timer tells you nothing…"
}
```

`body` is standard markdown (headings, lists, fenced code blocks, blockquotes —
the constructs the prototype's `POST_BODY` already covers). `commit` can be a real
git short-hash or a stable hash of the slug.

### `GET /feed.xml`
RSS feed. The UI advertises `/feed.xml` ("plain RSS, no tracking") in two places.
Serve `application/rss+xml`, newest first, full or summary content.

---

## 5. Photography

This is the richest data domain. Today it lives in `src/photo/data.jsx` as
`FRAMES`, `ALBUMS`, and derived lookups.

### `GET /api/albums`
```json
{
  "data": [
    {
      "id": "dumbo-dusk",
      "title": "DUMBO Dusk",
      "subtitle": "Brooklyn waterfront",
      "location": "Brooklyn, NY",
      "date": "2025-08-12",
      "count": 6,
      "coverFrameId": "p001"
    }
  ],
  "meta": { "total": 6 }
}
```

### `GET /api/albums/:id`
Album metadata plus its frames (for the album hero band + scoped gallery).
Equivalent to `FRAMES_BY_ALBUM[id]` joined with the album record. Returns the
album fields alongside a `frames` array and a `meta` block (`{ "total": <count> }`).

### `GET /api/frames`
The master photo list. Backs the all-photos gallery, the landing "recent frames"
strip, search, and deep-links.

Query params:
- `album` — scope to one album
- `tag` — repeatable (`?tag=street&tag=night`); OR-match, mirrors `filterFrames`
- `q` — free-text search across id, camera, lens, location, EXIF, tags
- `limit` — landing strip uses 6
- `sort` — default `-date`

```json
{
  "data": [
    {
      "id": "p001",
      "album": "dumbo-dusk",
      "aspectRatio": "3/2",
      "camera": "Leica Q3",
      "lens": "28mm Summilux",
      "aperture": "ƒ2.0",
      "shutter": "1/125",
      "iso": "ISO 400",
      "location": "Brooklyn · Front St",
      "date": "2025-08-12",
      "tags": ["street", "color", "golden hour"],
      "image": {
        "src": "https://cdn.example.com/frames/p001.jpg",
        "variants": [
          { "width": 480,  "src": "https://cdn.example.com/frames/p001-480.jpg" },
          { "width": 960,  "src": "https://cdn.example.com/frames/p001-960.jpg" },
          { "width": 1440, "src": "https://cdn.example.com/frames/p001-1440.jpg" },
          { "width": 2048, "src": "https://cdn.example.com/frames/p001-2048.jpg" }
        ],
        "width": 6625,
        "height": 4417,
        "filename": "p001.jpg",
        "blurhash": "…",
        "placeholder": { "hue": 30, "lightness": 0.40 }
      },
      "caption": {
        "title": "Front Street, the hour the brick turns gold.",
        "paragraphs": ["DUMBO empties out right before sunset…"],
        "note": "// metered for the highlights, let the shadows fall."
      }
    }
  ],
  "meta": { "total": 35, "filteredBy": { "tag": [], "q": "" } }
}
```

Notes
- The current build has **no real images** — it draws gradient placeholders from
  `hue`/`lightness`. Keep `placeholder` in the payload as a graceful fallback /
  loading shim, but `image.src` is the real field once photos exist.
- `image.src` is the canonical web JPEG URL. `image.variants` powers responsive
  `srcset`; each variant is a resized JPEG keyed by max width. `width` and
  `height` are the original image dimensions after orientation metadata is
  applied, and `filename` is useful for search/debugging.
- `caption` is the editorial story used on the full-detail page. Most frames have
  a generated caption; return `null` and let the client synthesize from EXIF when
  there's no hand-written one (mirrors `captionFor`).
- EXIF fields (`camera`, `lens`, `aperture`, `shutter`, `iso`) should ideally be
  parsed server-side from the uploaded RAW/JPEG rather than entered by hand.

### `GET /api/frames/:id`
Single frame with full caption + EXIF — used by the modal and detail page when
deep-linking (e.g. landing → `./photo` with a target frame).

### `GET /api/frames/meta`
Facets for the search/filter band so the client doesn't compute them from the full
list (`ALL_TAGS`, `ALL_LOCATIONS`, `ALL_CAMERAS`).

```json
{
  "tags": ["architecture", "b&w", "color", "golden hour", "landscape", "neon", "night", "portrait", "street", "studio", "wide"],
  "locations": ["Brooklyn", "Iceland", "Manhattan", "Tokyo", "…"],
  "cameras": ["Fuji X-T5", "Leica Q3", "Sony A7iv"]
}
```

---

## 6. Contact

The contact page shows an email + a copy button and links. No form exists today,
but if you add one:

### `POST /api/contact`
```json
{ "name": "…", "email": "…", "message": "…", "pgp": false }
```
- Validate + rate-limit (this is the only unauthenticated write path).
- Add spam protection (honeypot field, hCaptcha/Turnstile, or signed nonce).
- Return `202 Accepted` and deliver async (email/webhook). Never echo the message
  back unsanitized.

### `GET /api/pgp` / `GET /pgp.asc`
Serve the public PGP key as `text/plain` for the `./pgp.asc` button.

---

## 7. Admin / Authoring (private)

Everything above is public read. To edit content without redeploying, add an
authenticated authoring surface. Keep it entirely separate from the public API.

- `POST/PUT/PATCH/DELETE /api/admin/posts/:slug`
- `POST/PUT/PATCH/DELETE /api/admin/projects/:slug`
- `POST/PUT/PATCH/DELETE /api/admin/albums/:id`
- `POST /api/admin/frames` — multipart upload; server extracts EXIF, generates
  thumbnails + blurhash, writes to object storage/CDN.
- `PUT /api/admin/site` / `PUT /api/admin/about`

Auth
- Single author → a simple session cookie or a personal access token is enough.
- Protect with CSRF on cookie-based writes; gate behind your own login.

---

## Cross-cutting concerns

| Concern | Recommendation |
|---|---|
| Caching | Public `GET`s are highly cacheable. Send `Cache-Control: public, max-age=300, stale-while-revalidate=86400` and `ETag`s. |
| Errors | Consistent shape: `{ "error": { "code": "not_found", "message": "…" } }` with correct HTTP status. |
| CORS | Lock to the site origin(s). |
| Rate limiting | Required on `POST /api/contact`; light limits elsewhere. |
| Images | Serve from a CDN with responsive variants (`?w=`), `blurhash`/LQIP for load-in, and long cache lifetimes. |
| Static option | Because the site is single-author and read-mostly, all public endpoints can also be **pre-rendered to static JSON** at build time (SSG) instead of a live server. The shapes above stay identical. |

## Route summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/site` | Global config, hero, now-block, socials, footer |
| GET | `/api/about` | Bio markdown source |
| GET | `/api/projects` | Selected work list |
| GET | `/api/projects/:slug` | Project detail / readme |
| GET | `/api/posts` | Blog list (+ tag counts) |
| GET | `/api/posts/:slug` | Blog post (block body) |
| GET | `/feed.xml` | RSS feed |
| GET | `/api/albums` | Album list |
| GET | `/api/albums/:id` | Album + its frames |
| GET | `/api/frames` | Photo list (filter/search) |
| GET | `/api/frames/:id` | Single frame + caption/EXIF |
| GET | `/api/frames/meta` | Tag/location/camera facets |
| POST | `/api/contact` | Contact message (optional) |
| GET | `/api/pgp`, `/pgp.asc` | Public PGP key |
| * | `/api/admin/**` | Authenticated authoring |
