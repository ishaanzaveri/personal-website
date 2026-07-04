# personal-website

```
iz@web:~/site$ cat manifest
```

A terminal/CRT-themed personal portfolio for **Ishaan Zaveri** — developer,
photographer, occasional breaker of things. JetBrains Mono everywhere, ASCII
brackets, shell prompts, a scanline overlay, and a blinking cursor. Five views:
**Home · About · Blog · Photo · Contact**.

This repo has two goals, and they're equally load-bearing:

1. **Ship a personal website** I actually like — a fast, read-mostly portfolio
   with a real photography section.
2. **Learn Go for backend development** by building the API that drives it, for
   real, on real infrastructure. See [the Go learning journey](#the-go-learning-journey).

> **Status:** frontend is built and runs against a mock API. The Go backend
> doesn't exist yet — it's the next milestone. See [Roadmap](#roadmap).

---

## The site

A single-author, read-heavy portfolio. The aesthetic is a terminal on purpose:
`iz@web:~/site$` prompts, `◢`/`▸` glyphs, a command palette (⌘K), and file-bar
chrome around the content.

| View | What it is |
|---|---|
| **Home** | Hero meta-strip, a "now" block, selected work (projects), recent writing, recent frames. |
| **About** | Bio rendered from markdown with a line gutter + byte count — the punctuation is deliberately visible. |
| **Blog** | Tag-filterable post list (`systems / security / photo / notes`) and full markdown posts with fenced code. |
| **Photo** | The real portfolio. Albums, an all-photos gallery, search/filter, a portal modal, and a full-detail page with EXIF + editorial captions. |
| **Contact** | Email + copy button, socials, PGP key. Optional contact form (the only write path). |

Content is **data-driven** — nothing is hardcoded in the JSX. Every view fetches
from the API described in [`docs/01-backend-api-routes.md`](docs/01-backend-api-routes.md).

---

## Stack

**Frontend (building):**
Vite · React 18 · TypeScript · react-router · TanStack Query · CSS Modules +
design tokens · self-hosted JetBrains Mono · `react-markdown` (+ `remark-gfm`,
`rehype-sanitize`).

**Backend (planned — this is the Go part):**
A small, read-mostly JSON API over SQLite. The public surface is entirely `GET`;
the only write path is the contact form. The route + payload contract is already
fully specified in [`docs/01-backend-api-routes.md`](docs/01-backend-api-routes.md)
— the Go implementation just has to satisfy it. Specific libraries are
deliberately **not locked in yet**; picking them is part of the learning (see
below).

Today the frontend develops against an **Express mock server**
(`frontend/mock-server/`) that serves the same routes from JSON seed files. It's
a stand-in for the Go backend, not the real thing.

---

## Architecture

The hosting design (chosen after a full options analysis) is **Cloudflare Pages +
R2 + a small VPS running the Go backend**, tied together with a Cloudflare Tunnel.
It optimizes, in order, for **cost, security, and ease of maintenance** — steady
state ~$6–8/mo, flat.

```
                    ┌── Cloudflare Pages ─────── React static build   (yoursite.com)
                    │
Cloudflare DNS ─────┼── R2 + CDN cache ───────── image derivatives    (images.yoursite.com)
   + WAF            │
                    └── cloudflared tunnel ──▶ [ VPS: Go API + SQLite ]  (api.yoursite.com)
                                                       │
                                               Litestream ──▶ R2         (continuous DB backup)
```

Why it's shaped this way — free image egress via R2, a VPS with **zero open
inbound ports** behind a Cloudflare Tunnel, and SQLite + Litestream instead of a
managed database — is written up in full:

- [`docs/04-hosting-architecture.md`](docs/04-hosting-architecture.md) — the chosen design + a phased setup checklist.
- [`docs/decision-points/architecture.md`](docs/decision-points/architecture.md) — the decision record: every option considered and why the others lost.

---

## Repository layout

```
personal-website/
├─ frontend/          # React app (built) + Express mock API + design tokens
│  ├─ src/            # app shell, primitives, feature pages, hooks, lib, styles
│  ├─ mock-server/    # Express stub of the API (JSON seed data) — placeholder for Go
│  └─ CLAUDE.md       # frontend build guide + conventions
├─ backend/           # the Go API (empty — next milestone)
├─ docs/              # the contract: API routes, components, guidelines, hosting
└─ LICENSE            # AGPL-3.0
```

---

## Getting started

**Requirements:** Node 18+ (frontend). Go will be added when the backend starts.

```bash
cd frontend
npm install
npm run dev      # Vite on :5173 + mock API on :8787 (concurrently)
```

The Vite dev server proxies `/api` → the mock server. Other scripts:

```bash
npm run dev:web   # Vite only
npm run dev:api   # mock API only
npm run build     # typecheck + production build
npm run preview   # preview the production build
```

More frontend detail lives in [`frontend/README.md`](frontend/README.md).

---

## The Go learning journey

The backend is a **deliberate learning project**. I could have pre-rendered the
whole read-only API to static JSON and skipped a server entirely (that was
literally "Option C" in the architecture doc, and it's cheaper). I'm building a
real Go service instead because **operating a real Go backend is the point** —
not just the language, but the whole lifecycle around it.

**What I want to come away understanding:**

- Idiomatic Go for a small HTTP JSON API — project layout, `net/http`, handlers,
  middleware, context, error handling, testing.
- Talking to **SQLite** from Go (`database/sql`, migrations, query patterns) and
  keeping the data layer honest.
- The operational side: building a single static binary, running it in
  `docker-compose`, config, structured logging, graceful shutdown.
- Doing it **safely** — input validation, the contact-form write path, rate
  limiting, and running behind a Cloudflare Tunnel with no open ports.
- Backups that actually restore — SQLite + **Litestream** streaming to R2.

**How the project is set up to make that possible:** the API contract already
exists as a spec ([`docs/01-backend-api-routes.md`](docs/01-backend-api-routes.md)),
and there's a working Express mock serving it. So the Go rewrite has a **fixed
target and a reference implementation** to diff against — I can focus on learning
Go, not on inventing requirements. Library choices (router, SQLite driver, query
tooling) are intentionally left open so that choosing them is part of the
exercise.

Notes and decisions from the build will accumulate here as it progresses.

---

## On the use of AI

I'm being upfront about this because it's central to how the project is built:

- **The frontend, docs, tooling, and most everything else are AI-generated.** I
  direct and review it, but the code itself is written by AI agents. I work on
  this with **Claude Code** and **Codex** in parallel.
- **The Go backend is the exception — it's handwritten by me.** That's the whole
  point of the [learning journey](#the-go-learning-journey): the backend is where
  I'm deliberately doing the work by hand, so AI generating it would defeat the
  purpose.

In short: if it's not in `backend/`, assume it was AI-generated; the Go backend
is mine.

## Roadmap

Sequenced so each phase leaves something working — you can stop after the
frontend and have a live site backed by pre-rendered JSON before the Go backend
exists.

- [x] Docs / spec: API routes, component inventory, frontend guidelines
- [x] Hosting architecture chosen and written up
- [x] Frontend built (all five views) against a mock API
- [ ] **Go backend** — implement the read-only `GET` API over SQLite to the spec
- [ ] `POST /api/contact` (the one write path) + validation + rate limiting
- [ ] Image pipeline — publish-time derivative generation → R2 (`srcset` + blur-up)
- [ ] Deploy: Cloudflare Pages (frontend) + R2 (images)
- [ ] Stand up the VPS: Go API + SQLite in docker-compose behind a `cloudflared` tunnel
- [ ] Litestream → R2 backups (and a tested restore)
- [ ] Hardening: Turnstile on the contact form, rate limits, off-site backup of originals
- [ ] Admin/authoring surface (edit content without redeploying)

---

## Docs

The full contract and design record — API routes, component inventory, frontend
guidelines, and the hosting architecture — is indexed in
[`docs/index.md`](docs/index.md).

---

## License

[AGPL-3.0](LICENSE).
