# deploy/

VPS deployment artifacts for the **mock API** — the Node/Express stand-in for
the Go backend that serves the read-only `GET` routes from JSON seed files
(`frontend/mock-server/`). This lets the public site point at a working API
before the handwritten Go service (`backend/`) is stood up.

> This deploys the **mock** backend, not the Go API. See `AGENTS.md`.

## What's here

- **`docker-compose.yml`** — the compose file that lives on the droplet. The
  service is bound to `127.0.0.1:8080` only; the box keeps **zero open inbound
  ports** and the Cloudflare Tunnel is the sole ingress. See
  [`../docs/decision-points/vps.md`](../docs/decision-points/vps.md) §4.

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

## Deploying

CI does this — [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml)
builds + pushes the image, then reaches the droplet over the Cloudflare Tunnel
and runs `docker compose pull && docker compose up -d`. The deploy job is a
**stub**: wire up the repo secrets it lists before it will run.

Manual deploy, from the droplet (in the directory holding `docker-compose.yml`):

```bash
docker compose pull
docker compose up -d
```
