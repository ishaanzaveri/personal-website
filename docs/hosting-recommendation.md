# Hosting Recommendation

Last checked: 2026-06-27.

## Short Answer

Use a small VPS for the backend and database:

```text
example.com        -> Cloudflare Pages frontend
api.example.com    -> Go backend on a VPS
SQLite             -> local persistent disk on the VPS
static.example.com -> object storage or CDN-backed image bucket
backups            -> offsite object storage
```

For this project, the best cheap setup is:

1. **Frontend:** Cloudflare Pages Free.
2. **Backend:** Go service on a small VPS.
3. **Database:** SQLite on the VPS disk.
4. **Images:** Cloudflare R2 first if public image traffic may grow.
5. **Backups:** automated SQLite and media backups to object storage.

This is cheaper than a fully managed cloud stack, avoids database subscription cost, and keeps the photo-heavy part away from the Go server.

## Why VPS + Go + SQLite

A personal website with many pictures and few blog posts is a good fit for SQLite on a VPS because writes should be light and mostly admin-driven. SQLite is fast, reliable, and operationally simple when there is only one application server writing to it.

Use SQLite for:

- Blog posts and drafts.
- Photo metadata, captions, tags, albums, dimensions, and blurhash values.
- Contact form submissions.
- Admin settings.
- Simple counters or analytics.

Do **not** store original photos or large image binaries in SQLite. Store the images as files or objects, then keep metadata and URLs in SQLite.

The main tradeoff is that a VPS is not serverless. You own OS updates, firewalling, deploy scripts, monitoring, and backups. The cost is lower, but the responsibility is higher.

## Recommended Architecture

```text
Browser
  |
  | HTML/CSS/JS
  v
Cloudflare Pages

Browser
  |
  | JSON API
  v
Caddy or nginx on VPS
  |
  v
Go backend
  |
  v
SQLite file on persistent VPS disk

Browser
  |
  | image requests
  v
Cloudflare R2 / Backblaze B2 / VPS static files
```

The important rule: **do not serve the public photo library through Go unless the photo volume stays tiny**. The Go API should return image URLs and metadata, not stream every image byte.

## VPS Options

Prices and specs change often. Treat these as current shortlist numbers, not permanent facts.

| Provider | Starter plan to consider | Approx. monthly price | Typical included resources | Why pick it | Watch out |
| --- | --- | ---: | --- | --- | --- |
| **Hetzner Cloud** | CX23/CX22-style shared vCPU | About EUR 5-6/month depending on region/current pricing | Around 2 vCPU, 4 GB RAM, 40 GB disk on current entry shared plans | Best price/performance if the available region works for you | US regions can differ; support/account setup can be stricter than DigitalOcean |
| **OVHcloud VPS** | VPS-1 | About $4.54/month in US listing | 2 vCores, 4 GB RAM, 40 GB SSD, daily backup listed | Very cheap, includes generous traffic language | Product/pricing pages vary by region; UI/support can feel less polished |
| **DigitalOcean** | Basic Droplet | Starts at $4/month | Small VM, SSD, outbound transfer starts at 500 GiB/month | Easiest beginner VPS experience, good docs | Less RAM/CPU per dollar than Hetzner/OVH |
| **Akamai/Linode** | Nanode 1 GB | $5/month | 1 vCPU, 1 GB RAM, 25 GB storage, 1 TB transfer | Predictable, mature VPS provider | 1 GB RAM is tighter for Go + builds + SQLite admin tooling |
| **Vultr** | Cloud Compute entry plans | Low-cost plans advertised from about $2.50/month | Varies by IPv6/IPv4, RAM, disk, and location | Cheap global VPS option | Lowest plans can be constrained or region/IPv6-specific |
| **Oracle Cloud Free Tier** | Always Free VM | $0 if you stay within Always Free limits | Free VM resources are available under Oracle's program | Cheapest possible if it works for you | Capacity/account friction; not the simplest operational experience |

### VPS Recommendation

Pick **Hetzner** if you want the best value and are comfortable with its regions and account process.

Pick **DigitalOcean** if you want the smoothest beginner experience and do not mind paying a little more for fewer resources.

Pick **OVHcloud** if its current regional VPS-1 price is available to you and you want very low monthly cost.

I would start with at least **2 GB RAM**, and preferably **4 GB RAM**, so the server has room for the Go process, Caddy/nginx, SQLite, backups, deploys, and occasional image-processing jobs.

## Database Options

| Option | Monthly cost shape | Best for | Pros | Cons | Recommendation |
| --- | --- | --- | --- | --- | --- |
| **SQLite on VPS** | Included in VPS cost | One Go backend, light writes, personal site | Cheapest, fast, simple backups, no DB server | Tied to one server; careful backups required | **Best starting choice** |
| **Postgres on VPS** | Included in VPS cost | More complex queries or multi-tool access | More concurrency and features than SQLite | You maintain Postgres, upgrades, users, backups | Use only if SQLite becomes limiting |
| **Supabase Postgres** | Free/paid managed tiers | Managed Postgres plus auth/storage/admin UI | Nice dashboard, auth, APIs, storage | More platform than you need if Go owns the backend | Good managed option |
| **Neon Postgres** | Free/paid managed tiers | Serverless Postgres | Good if you only want hosted Postgres | External DB latency; plan limits | Good Cloud Run pairing |
| **Google Cloud SQL** | Paid managed database | All-GCP production setup | Mature managed Postgres/MySQL | Usually too expensive for a small personal site | Skip initially |
| **Turso/libSQL** | Free/paid managed SQLite-like DB | SQLite ergonomics without a VPS-bound DB file | Distributed reads, simple client story | Not plain local SQLite; vendor-specific behavior | Interesting, but not needed first |

## SQLite Setup Notes

Use a normal file path on persistent disk, for example:

```text
/var/lib/personal-website/app.db
```

Recommended SQLite settings:

- Enable WAL mode.
- Use foreign keys.
- Keep migrations in the repo.
- Make one Go process the writer.
- Keep the DB file out of the container image and Git repo.
- Back it up before every deploy that runs migrations.

For Go, use a boring database interface so it is possible to move from SQLite to Postgres later without rewriting handlers.

## Image Storage Options

There are two separate image categories:

1. **Published optimized images:** resized WebP/AVIF/JPEG files used by the site.
2. **Original photos:** full-resolution camera exports that should be backed up, not usually served directly.

| Option | Cost shape | Public image delivery | Best for | Pros | Cons | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| **Cloudflare Pages assets** | $0 within Pages limits | Excellent for bundled static assets | Small optimized gallery at launch | Free, simple, CDN included | Repo/build can bloat; Pages file and asset limits | Good for first handful of images |
| **Cloudflare R2** | Free tier, then storage/operation pricing; no egress fee | Excellent with Cloudflare in front | Public image library | No egress fee, S3-compatible, pairs well with Cloudflare | Object-storage workflow; operation charges | **Best default for growing public images** |
| **Backblaze B2** | Low storage cost, 10 GB free, egress included up to 3x stored data | Good, especially with CDN partner | Images and backups | Cheap, simple, S3-compatible | Egress rules matter if hot content exceeds allowance | Strong alternative |
| **Hetzner Object Storage** | Base monthly bundle includes storage and egress | Good if using Hetzner/Europe | Larger archives with predictable bundle | Cheap per TB bundle | Minimum monthly base cost; regions matter | Good if already using Hetzner |
| **Wasabi** | Per-TB pricing, no request/egress fees in normal use | Good for larger hot storage | Big libraries/backups above small scale | Predictable per-TB pricing | Minimum storage duration and upcoming price changes | Better later, not day one |
| **AWS S3** | Storage + requests + egress | Excellent but expensive if public | Enterprise/cloud-native workflows | Most mature ecosystem | Egress and request costs can surprise | Not cheapest for this site |
| **Google Cloud Storage** | Storage + operations + egress | Good, especially all-GCP | All-GCP architecture | Mature, integrates with Cloud Run | Public image egress can dominate cost | Use only if you accept GCP costs |
| **Local VPS disk** | Included until disk fills | Fine for low traffic | Tiny private/public image set | Very simple | Backups and bandwidth are your problem; can fill disk | Avoid for main photo library |

### Image Recommendation

Use **Cloudflare R2** for public image objects once the gallery grows beyond a small starter set. Keep optimized display versions in R2 and optionally put a custom hostname in front:

```text
static.example.com
```

Keep original full-resolution photos somewhere separate from the site deployment. Originals are backup/archive data, not web-serving data.

## Backup Options

Backups should cover:

- SQLite database.
- Uploaded image originals, if any.
- Optimized image objects, if the bucket is the source of truth.
- Server config: Caddy/nginx config, systemd units, env var templates, deploy scripts.

| Backup target | Cost shape | Best for | Pros | Cons | Recommendation |
| --- | --- | --- | --- | --- | --- |
| **Backblaze B2** | 10 GB free, then low per-GB pricing; egress allowance tied to stored data | SQLite backups and media backups | Cheap, S3-compatible, good backup reputation | Egress policy matters during large restores | **Best cheap offsite backup target** |
| **Cloudflare R2** | 10 GB-month free tier, then usage-based; no egress fees | Backups plus public images if already using R2 | One provider for image serving and backups | Not as backup-focused as B2 | Good if you want fewer providers |
| **Hetzner Storage Box** | Fixed monthly plans | VPS/server backups, Borg/restic | Very good with Hetzner servers | Not object storage; less useful for public image delivery | Great if using Hetzner |
| **Hetzner Object Storage** | Base bundle | Backups and image archive | Cheap at 1 TB+ scale | Has base monthly cost | Good at larger scale |
| **AWS S3 Glacier / Deep Archive** | Very low storage, retrieval costs/time | Cold archives | Durable and cheap for rarely restored data | Restore is slower and more complex | Use for long-term originals only |
| **Google Cloud Storage Archive** | Low storage, retrieval/egress charges | Cold all-GCP backups | Integrates with GCP | Restore and egress can cost | Only if all-GCP |
| **VPS provider snapshots** | Usually add-on percentage or fixed fee | Fast full-server rollback | Easy disaster rollback | Not enough by itself; same provider risk | Use as secondary convenience only |
| **Local laptop/NAS** | Hardware you own | Extra copy of originals | No cloud bill | Not offsite unless duplicated | Good third copy, not sole backup |

### Backup Recommendation

Use **Litestream** or a scheduled SQLite backup job to push database backups to **Backblaze B2** or **Cloudflare R2**.

Suggested minimum policy:

```text
SQLite:
  hourly backups for 24 hours
  daily backups for 30 days
  monthly backups for 12 months

Images:
  source originals backed up immediately
  optimized public images reproducible from originals when possible

Server:
  config files stored in Git where safe
  secrets stored separately
```

Do not rely only on VPS snapshots. They are useful for fast rollback, but they are not a substitute for offsite backups.

## Deployment Shape

Use Caddy unless you already prefer nginx. Caddy gives you simple automatic HTTPS.

```text
/opt/personal-website/backend       -> Go binary or Docker Compose app
/var/lib/personal-website/app.db    -> SQLite database
/var/backups/personal-website/      -> local temporary backup staging
/etc/caddy/Caddyfile                -> reverse proxy config
```

Example services:

```text
personal-website.service    -> Go backend
litestream.service          -> continuous SQLite replication, if using Litestream
backup.timer                -> extra scheduled backups, if not using Litestream
```

## Cheapest Deployment Order

1. Launch the frontend on Cloudflare Pages.
2. Rent a small VPS.
3. Deploy the Go backend behind Caddy.
4. Store the SQLite database on persistent VPS disk.
5. Add automated SQLite backups before storing anything important.
6. Start with optimized images in the frontend only if the gallery is tiny.
7. Move public images to Cloudflare R2 or Backblaze B2 as the gallery grows.
8. Add VPS snapshots only as a convenience layer.

## Final Recommendation

Start with:

| Piece | Recommendation |
| --- | --- |
| Frontend | Cloudflare Pages Free |
| Backend | Go on a 2-4 GB RAM VPS |
| Database | SQLite on persistent VPS disk |
| Reverse proxy | Caddy |
| Public images | Cloudflare R2 when image volume grows |
| DB backups | Litestream or scheduled backups to Backblaze B2/R2 |
| Original photo archive | Backblaze B2, Hetzner Storage Box, local NAS, or another offsite backup |

This keeps the monthly bill low, keeps the architecture easy to reason about, and still leaves a clean path to managed Postgres later if the backend outgrows SQLite.

## Sources

- [Cloudflare Pages pricing](https://pages.cloudflare.com/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Hetzner Cloud pricing](https://www.hetzner.com/cloud)
- [Hetzner Object Storage pricing](https://www.hetzner.com/pressroom/object-storage/)
- [OVHcloud cheap VPS pricing](https://us.ovhcloud.com/vps/cheap-vps/)
- [DigitalOcean Droplets pricing](https://www.digitalocean.com/products/droplets)
- [DigitalOcean Droplet billing docs](https://docs.digitalocean.com/products/droplets/details/pricing/)
- [Akamai/Linode cloud pricing](https://www.akamai.com/cloud/pricing)
- [Vultr pricing](https://www.vultr.com/pricing/)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Backblaze B2 pricing](https://www.backblaze.com/cloud-storage/pricing)
- [Wasabi pricing](https://wasabi.com/pricing)
- [Wasabi 2026 pricing notice](https://docs.wasabi.com/docs/may-2026-wasabi-pricing)
- [AWS S3 pricing](https://aws.amazon.com/s3/pricing/)
- [Google Cloud Storage pricing](https://cloud.google.com/storage/pricing)
- [Google Cloud Run pricing](https://cloud.google.com/run/pricing)
