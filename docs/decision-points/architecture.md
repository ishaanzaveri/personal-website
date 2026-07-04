# Hosting & Architecture — Options Analysis

> **This is the decision record: the full options analysis behind the chosen
> architecture.** The decision itself and the setup checklist live in
> [`../04-hosting-architecture.md`](../04-hosting-architecture.md). We chose
> **Option B** (Cloudflare Pages + R2 + small VPS). This doc is kept so the
> reasoning — and the roads not taken — stay on record.

This doc evaluates how to host the site: React frontend, Go backend (the current
Express server is a stub), and **100 GB+ of photos**. Optimization targets, in
order: **cost, security, ease of maintenance**.

> Prices below are approximate as of mid-2026 — sanity-check before committing.

---

## 1. What the workload actually is

Before comparing architectures, it's worth being precise about the shape of the
problem, because it eliminates most of the hard parts:

- **Read-heavy, single-author.** Per `01-backend-api-routes.md`, the entire
  public API surface is `GET` over a small dataset. The only write path is the
  contact form, and it's optional. There is no multi-user state, no sessions,
  no payments — nothing that *requires* an always-on database or server.
- **The 100 GB is originals, not what visitors download.** Nobody should ever
  be served a 30 MB RAW/full-res JPEG in a gallery grid. What the site serves
  are **derivatives** (resized WebP/AVIF at 2–4 sizes), which for a full
  gallery is typically **2–10 GB total**, not 100 GB. The originals are an
  *archival/storage* problem; the derivatives are the *serving* problem.
  Treating these as separate concerns is the single biggest cost lever.
- **Egress, not storage, is where image hosting gets expensive.** Storing
  100 GB costs $0.50–$2.50/mo almost anywhere. Serving it repeatedly is where
  AWS-style clouds bite ($0.09/GB egress on S3/CloudFront). The two ways out:
  a provider with free egress (Cloudflare R2, Backblaze B2 via the Bandwidth
  Alliance) or a VPS with a big included-traffic allowance (Hetzner includes
  20 TB).

### The image pipeline (applies to every option)

Whatever hosting you pick, plan for this pipeline; it's where most of the
maintenance effort will live:

```
originals (100 GB, private)          derivatives (~2–10 GB, public)
┌─────────────────────────┐  vips/   ┌──────────────────────────────┐
│ R2 / B2 / external disk │ ───────▶ │ photo-slug/1600.avif          │
│ never served directly   │  sharp   │ photo-slug/800.avif           │
└─────────────────────────┘          │ photo-slug/400.avif (thumb)   │
                                     └──────────────────────────────┘
```

- Generate derivatives **at publish time** (a small Go or Node script using
  `libvips`/`sharp`), not on-the-fly. On-the-fly resizing (Cloudflare Image
  Resizing, imgproxy) adds cost/complexity you don't need for a single-author
  site where publishing is a deliberate act.
- Keep a manifest (JSON or SQLite) mapping photo → variants → dimensions so
  the frontend can render `srcset` and blur-up placeholders.
- Originals can live in the cheapest cold storage you trust (R2, B2, or even
  just your own backup drives + one cloud copy). They don't need to be near
  the website at all.

---

## 2. The options

### Option A — Everything on one VPS (your idea #1)

```
DNS ──▶ [ VPS: nginx ──▶ Go API ──▶ SQLite ]
                └──▶ static React build
                └──▶ /images from attached volume
```

- **Cost:** VPS ~$5–8/mo (Hetzner CAX11 ~€4, DO/Vultr ~$6) + block storage.
  This is the pain point you identified: 100 GB of block storage is ~€5/mo at
  Hetzner but **$10/mo at DigitalOcean**, and it scales linearly as the photo
  library grows. A Hetzner **Storage Box** (1 TB for ~€4/mo, mountable via
  SSHFS/SMB) softens this but adds a moving part. Total: **~$9–16/mo**.
- **Security:** everything is on one public box — you own OS patching,
  TLS renewal, fail2ban/SSH hardening, and the blast radius of any compromise
  is the whole site *and* your photo archive. nginx as "load balancer" is
  over-dimensioned: with one origin there's nothing to balance; it's just a
  reverse proxy (Caddy does the same with automatic TLS and less config).
- **Maintainability:** one box, one `docker-compose.yml`, one place to look —
  genuinely simple *until* something breaks at 2am or the disk fills. You also
  give up CDN caching: every image request hits your box, so gallery browsing
  from another continent is noticeably slow.
- **Verdict:** workable, but you'd be paying VPS-disk prices for object-storage
  data and taking on the most ops burden of any option. Only pick this if you
  *want* to run a server as a learning exercise.

### Option B — Cloudflare Pages + R2 + small VPS for Go (your idea #2) ⭐ recommended

```
                    ┌── Cloudflare Pages ── React static build
Cloudflare DNS ─────┼── R2 (custom domain, cached) ── image derivatives
                    └── cloudflared tunnel ──▶ [ VPS: Go API + SQLite ]
                                                       │
                                               Litestream ──▶ R2 (DB backup)
```

- **Cost:**
  - Cloudflare Pages: **$0** (free tier is far beyond a personal site's needs).
  - R2: $0.015/GB-mo → 100 GB originals + derivatives ≈ **$1.60/mo**, and
    **egress is $0** — this is what kills the storage-space problem from
    Option A. Reads are $0.36/million; with Cloudflare's CDN cache in front
    of the R2 custom domain, most requests never even count as reads.
  - VPS: **~$4–6/mo** — the Go API is tiny (small JSON over SQLite), the
    smallest instance anywhere is ample.
  - **Total: ~$6–8/mo, flat**, regardless of how big the photo archive grows
    (each additional 100 GB ≈ +$1.50/mo).
- **Security:** this is where the design quietly shines.
  - Run **`cloudflared` (Cloudflare Tunnel)** on the VPS instead of exposing
    ports. The VPS then has **zero open inbound ports** — no public nginx, no
    port 443, SSH reachable only via Tailscale/tunnel. The API is only
    reachable through Cloudflare, which gives you WAF, rate limiting, and bot
    filtering for free.
  - R2 buckets: derivatives bucket public via custom domain
    (`images.yoursite.com`); originals bucket **private**, accessed only by
    your publish script with scoped API tokens.
  - Contact form: protect with **Turnstile** (free CAPTCHA) at the edge.
  - Compromise blast radius: frontend and images are static/immutable; only
    the small API box is a live target, and it holds no originals.
- **Maintainability:**
  - Frontend deploys are `git push` → Pages builds automatically. Zero servers.
  - Images deploy via a publish script (`rclone`/`wrangler` sync to R2).
  - The VPS runs exactly two processes (Go binary + cloudflared, or one
    docker-compose). SQLite + **Litestream** streaming replication to R2 gives
    you continuous, restorable DB backups for pennies — no managed DB needed.
  - Failure modes are decoupled: if the VPS dies, the site, gallery, and blog
    keep working; only the dynamic bits (contact form, "now" freshness) pause.
- **Verdict:** best cost/security/maintenance balance while keeping a real Go
  backend. This is the architecture to build.

### Option C — No servers at all: fully static + edge functions

```
Cloudflare DNS ──┬── Pages ── React build + /api/*.json (pre-rendered!)
                 ├── R2 ── image derivatives
                 └── Pages Functions/Worker ── contact form only ──▶ email/D1
```

The observation that makes this possible: **your API is read-only GET over a
small dataset**. Every endpoint in `01-backend-api-routes.md` except the
contact form can be **pre-rendered to static JSON at build time**. A Go program
still exists — but as a *build-time generator* (reads content/SQLite, emits
`/api/site.json`, `/api/albums.json`, …) rather than a runtime server. The
contact form becomes one small Worker (Turnstile check → email via a mail API
or insert into D1).

- **Cost: ~$1.60/mo** (R2 storage only; Pages + Workers free tier covers the
  rest). The cheapest possible version of this site.
- **Security: near-perfect.** There is nothing running to attack. No VPS, no
  SSH, no patching, no open ports. Your entire attack surface is one contact
  form handler.
- **Maintainability:** nothing to babysit — but publishing requires a build
  (edit content → CI → deploy), and you give up runtime dynamism (no live
  view counters, no admin UI that writes at runtime, "now" block updates via
  commit). You also don't get to run/operate a long-lived Go service, if
  learning that is part of the point.
- **Verdict:** objectively the best fit for the *current* spec on all three of
  your criteria. Choose Option B over this only if you want a real runtime
  backend (admin/authoring API, future dynamic features, or Go-service
  experience for its own sake).

### Option D — All-in on one cloud's serverless (Workers + D1, or Fly.io)

Two sub-flavors, both "no VPS but still a runtime backend":

- **Cloudflare Workers + D1 + R2:** rewrite the backend as Workers
  (TypeScript; Go via TinyGo/WASM is possible but rough). Cost ≈ $0–5/mo.
  Downside: you lose idiomatic Go, take on Workers' runtime quirks, and deepen
  Cloudflare lock-in for the one component that's easiest to host anywhere.
- **Fly.io / Railway / Render for the Go app:** deploy the Go binary as a
  container with a volume for SQLite. Cost ~$3–7/mo. Nicer DX than a raw VPS
  (deploys from Dockerfile, TLS handled), but: Fly volumes are single-node
  (SQLite needs Litestream anyway), free tiers keep shrinking, and per-app
  platforms are pricier than a VPS once you run more than one thing.
- **Verdict:** reasonable, not better. Compared to Option B you trade a
  known-cost $5 VPS for platform pricing and either a language compromise
  (Workers) or platform lock-in (Fly). Consider Fly.io if you never want to
  SSH into anything but still want runtime Go.

### Options considered and rejected

- **AWS S3 + CloudFront + EC2/Lambda:** egress pricing makes a 100 GB photo
  site the worst-case customer ($0.09/GB out; one viral gallery post could
  cost more than a year of Option B). Great platform, wrong pricing model for
  this workload.
- **Backblaze B2 instead of R2:** B2 is cheaper at rest ($0.006/GB-mo ≈
  $0.60/100 GB) and egress through Cloudflare is free via the Bandwidth
  Alliance. Legitimate alternative — but it adds a second vendor and the R2
  price difference (~$1/mo) doesn't buy back the extra glue. **Do consider B2
  as the *off-site backup* target for originals** (backup ≠ same vendor as
  primary is good hygiene).
- **NAS at home + Cloudflare Tunnel:** $0/mo marginal and full control, but
  your uplink, your uptime, your power bill, and a tunnel into your home
  network for a public website. Fine for originals *backup*; not for serving.
- **Managed Postgres anywhere:** the dataset is a few hundred rows of
  single-author content. SQLite (+ Litestream) is strictly simpler, faster,
  and ~$15/mo cheaper than the cheapest managed Postgres. Revisit only if you
  ever add multi-writer or relational-heavy features.

---

## 3. Comparison

| | A: One VPS | B: Pages+R2+VPS ⭐ | C: Fully static | D: Serverless/Fly |
|---|---|---|---|---|
| Monthly cost (100 GB) | ~$9–16 | ~$6–8 | ~$1.60 | ~$0–7 |
| Cost growth per +100 GB | +$5–10 | +$1.50 | +$1.50 | +$1.50 |
| Egress bill risk | capped (Hetzner) / real (others) | none | none | none (CF) / some (Fly) |
| Attack surface | whole box, public | 1 small box, no open ports | ~zero | platform-managed |
| Ops you own | OS, TLS, nginx, disk, backups | 1 tiny box + backups | none | app config only |
| Global image latency | poor (no CDN) | CDN-cached | CDN-cached | CDN-cached |
| Runtime Go backend | yes | **yes** | no (build-time only) | yes (Fly) / no (Workers) |
| If one part dies | whole site down | static parts survive | n/a | platform-dependent |
| Lock-in | none | low (VPS portable; R2 is S3-API) | medium (CF) | medium–high |

---

## 4. Recommendation

**Build Option B, sequenced so you can stop early if C turns out to be enough:**

1. **Images first (this unblocks everything):** derivative-generation script
   (Go + libvips), two R2 buckets (`photos-originals` private,
   `photos-web` public behind `images.yoursite.com`), `rclone` sync for
   originals. Point the frontend's photo data at the R2 domain with `srcset`.
2. **Frontend:** connect the repo to Cloudflare Pages; deploy the React build.
   At this point the whole public site can run against pre-rendered JSON —
   you are effectively at Option C and could stop here.
3. **Backend, when the dynamic surface justifies it:** smallest Hetzner/DO
   VPS, Go API + SQLite in docker-compose, `cloudflared` tunnel (no open
   ports), Litestream → R2. Route `api.yoursite.com` (or `/api/*`) through
   the tunnel.
4. **Hardening & hygiene:** Turnstile on the contact form, Cloudflare rate
   limit on `/api`, scoped R2 API tokens, second copy of originals on B2 or a
   home drive, uptime check (UptimeRobot/Cloudflare health check) on the API.

Expected steady state: **~$6–8/mo**, one tiny server with zero open inbound
ports, image costs flat no matter how the archive grows, and the static parts
of the site surviving any backend outage.
