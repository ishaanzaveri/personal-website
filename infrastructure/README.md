# infrastructure/

VPS deployment for the **mock API** — the Node/Express stand-in for the Go
backend that serves the read-only `GET` routes from JSON seed files
(`frontend/mock-server/`). This lets the public site point at a working API
before the handwritten Go service (`backend/`) is stood up.

> This deploys the **mock** backend, not the Go API. See `AGENTS.md`.

## How deploys work (pull-based)

CI never touches the box. The droplet keeps **zero open inbound ports** — the
Cloudflare Tunnel is the only ingress — so instead of pushing a deploy in, the
box **pulls**:

```
push to main ─▶ GitHub Actions builds + pushes image ─▶ GHCR
                                                          │
   VPS: mock-api-update.timer (every 5 min) ─── polls ────┘
                                              │
                            new digest? ─▶ docker compose pull + up -d
```

No SSH, no deploy keys, no `cloudflared access ssh`, no CI secrets. The build
half is [`../.github/workflows/build-mock-backend.yml`](../.github/workflows/build-mock-backend.yml);
the pull half is the timer below.

## What's here

- **`docker-compose.yml`** — the compose file the container runs from. The
  service is bound to `127.0.0.1:8080` only; the box keeps zero open inbound
  ports and the Cloudflare Tunnel routes `api.<domain>` here. See
  [`../docs/decision-points/vps.md`](../docs/decision-points/vps.md) §4.
- **`update.sh`** — polls GHCR; runs `docker compose pull` and, only if the
  image digest actually changed, `docker compose up -d`. A no-op otherwise.
- **`install-timer.sh`** — installs the `mock-api-update` systemd service +
  timer that runs `update.sh` every 5 minutes.

## Setup on the VPS

Clone the repo to `~/git/personal-website`, then, one time:

```bash
# 1. Docker access + registry login (GHCR packages are private)
sudo usermod -aG docker "$USER"     # then log out/in so the group takes effect
docker login ghcr.io                # username = your GitHub user; password = a
                                    # PAT with read:packages

# 2. First deploy
cd ~/git/personal-website/infrastructure
docker compose up -d

# 3. Install the 5-minute auto-update timer
./install-timer.sh
```

After that, every push to `main` that changes the mock server publishes a new
image, and the box picks it up within ~5 minutes on its own.

## The image

Built from [`../frontend/mock-server/Dockerfile`](../frontend/mock-server/Dockerfile)
(multi-stage, distroless runtime) and published to GHCR as
`ghcr.io/ishaanzaveri/personal-website/mock-api`.

Build & run locally:

```bash
docker build -t mock-api frontend/mock-server
docker run --rm -p 8080:8787 mock-api
curl localhost:8080/api/site
```

## Operating the timer

```bash
systemctl status mock-api-update.timer      # is it active?
systemctl list-timers mock-api-update.timer # when does it next run?
sudo systemctl start mock-api-update.service # force a check right now
journalctl -u mock-api-update.service -f     # watch deploy logs
```

To deploy manually without waiting for the timer, just run `./update.sh` (or
`docker compose pull && docker compose up -d`) from this directory.
