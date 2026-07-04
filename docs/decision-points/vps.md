# The VPS — Provider, Size, OS, and Setup

> **Scope.** The hosting architecture is already decided (Option B in
> [`architecture.md`](./architecture.md): Cloudflare Pages + R2 + a small VPS
> behind a Cloudflare Tunnel). This doc drills into just the VPS: **which
> provider, how small an instance, which OS, and exactly what to do on the box.**
> It expands Phase 3 of the setup checklist in
> [`../04-hosting-architecture.md`](../04-hosting-architecture.md).
>
> **Decision: DigitalOcean, Basic Droplet, 1 GB, US region (NYC).** Reasoning below.
>
> Prices are approximate as of **mid-2026** — sanity-check before committing.

---

## 1. What this box actually runs

Sizing follows from the workload, and the workload here is tiny. The VPS runs
**exactly three long-lived processes**, all lightweight:

| Process | Job | Footprint |
|---|---|---|
| **Go API binary** | Serves small JSON `GET`s over local SQLite | A few MB RSS, near-zero idle CPU |
| **`cloudflared`** | Dials out to Cloudflare, terminates the tunnel | ~15–30 MB RSS |
| **Litestream** | Streams the SQLite WAL to R2 continuously | Negligible |

Plus `tailscaled` for admin SSH. That's it. Things this box **does not** do,
which is why it can be the smallest instance on the menu:

- **No image serving.** Derivatives live in R2 behind Cloudflare's CDN. The VPS
  never touches a 30 MB master or a 500 KB WebP.
- **No image conversion.** Derivative generation is a **publish-time step run on
  your own machine (or CI)** — a `libvips`/`sharp` script that reads masters and
  emits WebP/AVIF sizes, then `rclone`/`wrangler` syncs to R2. It does **not**
  run on this box: the initial 100 GB bulk conversion wants far more CPU than a
  $5 droplet (AVIF encode is CPU-bound), and incremental publishes are a handful
  of images that run anywhere in seconds. Keeping conversion off the box also
  means the live server never holds originals.
- **No block storage.** The only persistent data is the SQLite file — a few
  hundred rows of single-author content, kilobytes to low megabytes. The
  droplet's included SSD (25 GB) is already 100× more than needed, and
  Litestream means the disk is not the source of truth anyway.
- **No TLS termination, no nginx.** Cloudflare terminates TLS; the tunnel hands
  the Go process plaintext HTTP on localhost. There is nothing to reverse-proxy.
- **No CDN origin load.** All caching is at Cloudflare's edge.

**Conclusion: 1 vCPU / 1 GB RAM is enough** (RAM is the only thing worth a second
thought — Go GC + cloudflared + Docker — and 1 GB is comfortable). This is a
"smallest thing they sell" workload; bump to 2 GB only if you want idle headroom.

---

## 2. Provider & instance — DigitalOcean

**Chosen: DigitalOcean Basic Droplet, 1 GB, region NYC** (SFO if you'd rather be
west-coast). ~**$6/mo**, IPv4 and 1 TB transfer included, per-second billing
capped at the monthly rate.

DigitalOcean plan ladder (Basic / shared CPU, US regions NYC + SFO):

| Plan | vCPU / RAM | Disk | Transfer | ~/mo |
|---|---|---|---|---|
| Basic 512 MB | 1 / 512 MB | 10 GB | 500 GB | $4 |
| **Basic 1 GB** ⭐ | 1 / 1 GB | 25 GB | 1 TB | **$6** |
| Basic 2 GB | 1 / 2 GB | 50 GB | 2 TB | $12 |

Start on **1 GB ($6)**; it's ample for §1. Resizing up to 2 GB later is a
one-click, few-minutes reboot if you ever want the headroom — no need to
pre-pay for it.

### Why DigitalOcean

Weighed against the alternatives that were researched (full comparison kept below
for the record):

- **US region + polish.** NYC/SFO put the origin near a US audience, and DO's
  docs, dashboard, reliability, and free **Cloud Firewalls** make it the
  lowest-friction box to stand up and forget. Worth ~$1/mo over the cheapest
  option for a box you don't want to babysit.
- **Bundled, predictable pricing.** IPv4 and 1 TB transfer are included in the
  flat $6 — no per-hour IP charge and no egress metering to reason about (the
  API emits only tiny JSON anyway; images never touch the box).
- **Not the cheapest, and that's fine.** Vultr/Linode are ~$5 and Hetzner ~$5,
  but the delta is a rounding error on a ~$6–8/mo total, and DO buys back real
  ops comfort.

### Options that were considered

Right-sized (~1 GB) US-region providers, plus the EU value leader:

| Provider | Plan | vCPU / RAM | Transfer | IPv4 | ~/mo | Note |
|---|---|---|---|---|---|---|
| **DigitalOcean** ⭐ | Basic 1 GB | 1 / 1 GB | 1 TB | incl. | **$6** | Chosen — US region, best polish/DX. |
| Vultr | Regular 1 GB | 1 / 1 GB | 1 TB | incl. | $5 | Cheapest solid; widest US locations. |
| Vultr | IPv6-only | 1 / 0.5–1 GB | 0.5–1 TB | ✗ | $2.50 | Works here (tunnel dials out) but needs NAT64 for IPv4-only `apt`/GitHub. |
| Linode/Akamai | Nanode 1 GB | 1 / 1 GB | 1 TB | incl. | $5 | Akamai backbone; very polished. |
| AWS Lightsail | 1 GB | 2 / 1 GB | 2 TB | incl. | $5 | Amazon's flat-rate VPS; pick only to stay in AWS console. |
| Contabo | Cloud VPS | 4 / 8 GB | ~unmetered | incl. | ~$7 | Huge RAM/value, but oversubscribed + rough edges. Skipped. |
| Hetzner | CAX11 (ARM) | 2 / 4 GB | 20 TB | +€0.50 | ~$5 | Best raw value, but **EU-only** (see latency note). |

**Why not Hetzner** (the raw-value winner): Hetzner Cloud is **EU-only**
(Germany/Finland). For a US-based operator that's a transatlantic hop to the
origin (~90–160 ms) on any request that isn't edge-cached. It's a fine choice
*if* you edge-cache the read-only API (which makes origin location nearly
irrelevant), but DO's US region removes the question entirely for ~$1 more.

**Why not a hyperscaler VM** (AWS/GCP/Azure): a comparable 2 vCPU / 4 GB
burstable instance (t4g.medium / e2-medium / B2s) is **~$27–34/mo on-demand** —
**5–6× DigitalOcean** — because they meter the public IPv4 (~$3.65/mo since 2024)
and don't bundle transfer. Even a 3-year commitment only gets to ~$13–15/mo,
still 2–3×. You'd be paying for orchestration/IAM/regional breadth this one
tiny always-on service doesn't use. (GCP's always-free `e2-micro` is the lone
$0 exception, but it's 1 GB, single-region, and not worth the constraints here.)

### A note on origin latency

Most of the site never touches this box — the React app (Pages), images (R2),
and any pre-rendered JSON are served from **Cloudflare's edge**, near each
visitor, regardless of where the droplet lives. The origin's location only
matters for requests that actually reach it: **uncached dynamic API GETs** and
the **contact-form POST**. Since the public API is read-only single-author data,
**edge-cache those GET responses** (short TTL, or cache + purge-on-publish) and
origin location stops mattering for reads too. The one guaranteed origin hit —
the contact POST — is a rare, deliberate action where latency is invisible. A US
droplet (DO NYC) is simply the safe default that needs no caching gymnastics to
feel fast for a US audience.

---

## 3. Operating system

The Go API ships as a **statically linked binary in a container**, so the host
distro's userland is almost irrelevant to the app — it only needs a kernel,
Docker, and a package manager. That frees the choice to optimize for **boring,
long-lived, low-maintenance**.

**Host OS: Ubuntu LTS (24.04, or 26.04 once it's out).**

- **5-year security support** per release and a security-only update stream that
  pairs perfectly with `unattended-upgrades` — the box patches itself and almost
  never changes underneath you.
- The most heavily documented server distro: every tool here (Docker,
  cloudflared, Tailscale, Litestream) publishes Ubuntu/`apt` install paths first,
  and DO ships a clean, well-maintained Ubuntu image that's the platform default.
- One nit worth a habit: Ubuntu leans on **snap** for some packages. Install
  Docker from the **official Docker apt repo** (not the snap) so the container
  runtime behaves predictably — the runbook already does this.
- **Debian stable** is an equally fine alternative — same `apt` world, slightly
  more minimal, no snap. There's no meaningful difference for this box; use
  whichever you're comfortable operating (Ubuntu here).
- **Avoid** as the *host*: Alpine (musl/tooling edge cases aren't worth it on the
  host), and anything bleeding-edge/rolling (Fedora, Arch) — you want the host to
  be the least interesting thing in the system.

**Container base image (separate decision):** the Go binary is static, so the
image should be `scratch` or `gcr.io/distroless/static` — no shell, no package
manager, tiny attack surface. Alpine is fine as a base *inside the container* if
you want a shell for debugging, but distroless/scratch is the better default for
a single static binary.

Rule of thumb: **Ubuntu LTS on the metal, distroless in the container.**

---

## 4. What to do on the box (runbook)

Ordered. Each step is small; the whole thing is ~30 minutes. This is the
expanded version of Phase 3 in the architecture doc. **The end state is a box
with zero open inbound ports** — SSH included.

### 4.1 Provision & first login
- [ ] Create a **Basic 1 GB Droplet**, region **NYC** (or SFO), **Ubuntu LTS** image.
- [ ] Add your **SSH public key** at create time (never a password).
- [ ] (Optional) Attach a **DigitalOcean Cloud Firewall** set to deny all
      inbound — free, and a good belt-and-suspenders alongside host `ufw`.
- [ ] First login as root; confirm you're in.

### 4.2 Base hardening (before anything is exposed)
- [ ] Create a **non-root sudo user**; copy your SSH key to it.
- [ ] **Key-only SSH**: in `/etc/ssh/sshd_config` set `PasswordAuthentication no`,
      `PermitRootLogin no`; reload sshd.
- [ ] **Automatic security updates**: install and enable `unattended-upgrades`.
- [ ] **Firewall default-deny inbound**: `ufw default deny incoming`,
      `default allow outgoing`. Temporarily `ufw allow 22` only until Tailscale is
      up (next step), then remove it.

### 4.3 Admin access without an open port
- [ ] Install **Tailscale**; `tailscale up`. SSH to the box over its Tailscale IP.
- [ ] Verify Tailscale SSH works, then **`ufw delete allow 22`** — port 22 is now
      closed to the public internet. Admin access is Tailscale-only.

### 4.4 Runtime
- [ ] Install **Docker Engine + compose plugin** (official Docker apt repo).
- [ ] Add your user to the `docker` group.
- [ ] Drop the project's `docker-compose.yml` (Go API + SQLite volume) and
      `docker compose up -d`. The Go service listens on **localhost only**
      (e.g. `127.0.0.1:8080`) — it is never bound to a public interface.

### 4.5 Ingress via Cloudflare Tunnel (the keystone)
- [ ] Install **`cloudflared`**.
- [ ] `cloudflared tunnel login`, then create a named tunnel.
- [ ] Route **`api.yoursite.com` → `http://localhost:8080`** in the tunnel config.
- [ ] Install it as a **systemd service** so it survives reboots.
- [ ] Confirm `https://api.yoursite.com/health` responds **through Cloudflare**,
      and that hitting the droplet IP directly on 80/443 gives **nothing**.

### 4.6 Backups
- [ ] Install **Litestream**; configure the SQLite DB → **R2** replica with a
      **scoped R2 token** (write to the backup bucket only).
- [ ] Run it as a **systemd service** (or a compose sidecar).
- [ ] **Test a restore** into a scratch dir — a backup you haven't restored is a
      rumor. Do this now, not after the first incident.

### 4.7 Verify the security posture
- [ ] From off-network, `nmap` the public IP: **no open ports** (no 22/80/443).
- [ ] SSH from a non-Tailscale network fails; over Tailscale succeeds.
- [ ] `docker ps` shows API + (optionally) Litestream healthy; `cloudflared` and
      `tailscaled` are `systemctl enable`d.

### 4.8 Hygiene (later, from Phase 4)
- [ ] Cloudflare **rate-limit rule** on `/api` and **Turnstile** on the contact form.
- [ ] (Recommended) **Edge-cache the read-only API GETs** so the origin is off
      the hot path — see the latency note in §2.
- [ ] **Uptime check** on `api.yoursite.com`.
- [ ] **Second copy of originals** on a different vendor (B2 / home drive).
- [ ] Write down the **publish workflow** so future-you remembers it.

---

## 5. Decision summary

| Question | Answer | Why |
|---|---|---|
| Which provider? | **DigitalOcean** | US region (NYC/SFO), best polish/DX, bundled IPv4 + transfer; ~$1 over the cheapest is worth it for a set-and-forget box. |
| Which plan? | **Basic 1 GB, ~$6/mo** | Three tiny processes, no image serving, DB is kilobytes; resize to 2 GB in one click if ever needed. |
| Why not Hetzner? | EU-only | Transatlantic origin hop unless you edge-cache; DO's US region removes the question for ~$1 more. |
| Why not AWS/GCP/Azure? | 5–6× the cost | Metered IPv4 + unbundled transfer make a comparable VM ~$27–34/mo on-demand for infra this box doesn't use. |
| Which host OS? | **Ubuntu LTS** | Boring, 5-yr support, self-patching, best-documented; static Go binary makes userland irrelevant. |
| Container base? | **distroless/scratch** | Single static binary → minimal image, minimal attack surface. |
| Open ports? | **Zero** | API reachable only via Cloudflare Tunnel; SSH only via Tailscale. |
