# Hosting Architecture

This is the hosting architecture for the site: **Cloudflare Pages + R2 + a small
VPS running the Go backend**, tied together with a Cloudflare Tunnel. It
optimizes, in order, for **cost, security, and ease of maintenance**.

For the full comparison of alternatives and the reasoning behind rejecting them,
see the decision record in
[`decision-points/architecture.md`](./decision-points/architecture.md).

---

## The architecture

```
                    ┌── Cloudflare Pages ─────── React static build   (yoursite.com)
                    │
Cloudflare DNS ─────┼── R2 + CDN cache ───────── image derivatives    (images.yoursite.com)
   + WAF            │
                    └── cloudflared tunnel ──▶ [ VPS: Go API + SQLite ]  (api.yoursite.com)
                                                       │
                                               Litestream ──▶ R2         (continuous DB backup)

  R2 bucket: photos-web       (public, CDN-cached)  ── resized WebP/AVIF derivatives
  R2 bucket: photos-originals (private)             ── 100 GB+ full-res masters
```

Four moving parts, each doing one job:

- **Cloudflare Pages** serves the React build. Deploys on `git push`; no server.
- **R2** stores photos in two buckets — a public one for the small set of resized
  derivatives the site actually serves, and a private one for the 100 GB+ of
  originals that visitors never touch.
- **A small VPS** runs the Go API against a local SQLite database. It has **no
  open inbound ports**; all traffic reaches it through a Cloudflare Tunnel.
- **Litestream** streams the SQLite database to R2 continuously, so the DB is
  always restorable without a managed database service.

---

## Why this design

### The 100 GB is a storage problem, not a serving problem
Visitors are never served a 30 MB full-res master. A publish-time script
generates resized WebP/AVIF **derivatives** (a few sizes each, ~2–10 GB total
for the whole gallery), and those are what the site serves. The 100 GB of
originals sit in a private bucket as an archive. Separating these is the single
biggest cost lever — it turns "100 GB of hot storage" into "a few GB served +
100 GB cold."

### R2 makes photo hosting cheap and predictable
R2 storage is ~$0.015/GB-mo and, critically, **egress is free**. That's what
made the VPS-disk approach unattractive (block storage is $5–10/mo per 100 GB
and grows linearly) and what makes AWS the wrong tool here (S3/CloudFront charge
$0.09/GB egress — one popular gallery post could cost more than a year of this
setup). With Cloudflare's CDN cached in front of the public bucket, most image
requests never even bill as an R2 read.

### The Cloudflare Tunnel is the security keystone
Running `cloudflared` on the VPS means it dials **out** to Cloudflare; nothing
dials in. The box has zero open inbound ports — no public nginx, no exposed 443,
SSH reachable only over Tailscale or the tunnel. Every request to the API passes
through Cloudflare first, so WAF, rate limiting, and bot filtering come for free.
The blast radius of a compromise is contained: the frontend and images are
static and immutable, and the one live box holds no photo originals.

### SQLite + Litestream instead of a managed database
The dataset is a few hundred rows of single-author content (see
`01-backend-api-routes.md` — the public API is entirely read-only `GET`). A
managed Postgres would cost ~$15/mo and add a service to babysit for no benefit.
SQLite is a local file; Litestream replicates it to R2 for continuous,
restorable backups at pennies per month.

### Failure modes are decoupled
If the VPS goes down, the frontend, gallery, and blog keep working — only the
dynamic bits (contact form, "now" freshness) pause. No single failure takes the
whole site offline.

**Steady-state cost: ~$6–8/mo, flat** — the VPS is the only fixed cost that
matters, and image costs stay flat (~+$1.50/mo per additional 100 GB) no matter
how the archive grows.

---

## Setup checklist

Ordered so each phase leaves you with something working. You can pause after
Phase 2 and have a fully functional public site (backed by pre-rendered JSON)
before standing up the VPS.

### Phase 0 — Accounts & domain
- [ ] Register / move the domain to **Cloudflare DNS**
- [ ] Create a **Cloudflare account** and enable **R2** (requires a card on file)
- [ ] Decide the subdomain layout: `yoursite.com` (site),
      `images.yoursite.com` (photos), `api.yoursite.com` (backend)

### Phase 1 — Images (do this first; it unblocks the frontend)
- [ ] Create R2 bucket **`photos-originals`** — keep it **private**
- [ ] Create R2 bucket **`photos-web`** — attach custom domain
      `images.yoursite.com`, enable public access
- [ ] Write the **derivative-generation script** (Go + `libvips`, or Node +
      `sharp`): reads a master, emits 2–4 resized WebP/AVIF sizes + a thumbnail
- [ ] Have the script also emit a **manifest** (photo → variants → dimensions)
      for `srcset` and blur-up placeholders
- [ ] Upload originals to `photos-originals` and derivatives to `photos-web`
      via **`rclone`** or **`wrangler r2`**
- [ ] Create **scoped R2 API tokens** for the publish script (write to buckets;
      nothing else)
- [ ] Point the frontend's photo data at `images.yoursite.com` with `srcset`

### Phase 2 — Frontend (public site goes live here)
- [ ] Connect the repo to **Cloudflare Pages**; set build command + output dir
- [ ] Configure the production domain `yoursite.com`
- [ ] Verify auto-deploy on `git push` to `main`
- [ ] (Optional) Serve the read-only API as **pre-rendered JSON** so the public
      site is fully functional before the backend exists

### Phase 3 — Backend VPS
- [ ] Provision the **smallest VPS** (Hetzner CAX11 / DO / Vultr)
- [ ] Base hardening: non-root user, key-only SSH, automatic security updates,
      firewall default-deny inbound
- [ ] Install **Tailscale** (or equivalent) for admin SSH — do not expose 22
- [ ] Deploy the **Go API + SQLite** via `docker-compose`
- [ ] Install and configure **`cloudflared`**; create a tunnel routing
      `api.yoursite.com` → the local Go service
- [ ] Confirm the VPS has **no open inbound ports** (no public 80/443/22)
- [ ] Set up **Litestream** to replicate SQLite → R2; test a **restore**

### Phase 4 — Hardening & hygiene
- [ ] Add **Turnstile** to the contact form (edge CAPTCHA)
- [ ] Add a **Cloudflare rate-limit rule** on `/api`
- [ ] Configure a **second copy of originals** (Backblaze B2 or a home drive) —
      backups on a different vendor than the primary
- [ ] Add an **uptime check** on `api.yoursite.com` (UptimeRobot / Cloudflare
      health check)
- [ ] Document the **publish workflow** (add photos → run script → sync → deploy)
      so future-you remembers it

---

## Quick reference

| Component | Choice | Approx. cost |
|---|---|---|
| Frontend hosting | Cloudflare Pages | $0 |
| Image storage + CDN | R2 (2 buckets) + Cloudflare cache | ~$1.60/mo per 100 GB, $0 egress |
| Backend | Go + SQLite on a small VPS | ~$4–6/mo |
| DB backup | Litestream → R2 | pennies |
| Ingress to VPS | Cloudflare Tunnel (`cloudflared`) | $0 |
| Bot / abuse protection | Cloudflare WAF + Turnstile + rate limit | $0 |
| **Total steady state** | | **~$6–8/mo** |
