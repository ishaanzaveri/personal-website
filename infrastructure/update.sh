#!/usr/bin/env bash
#
# Poll GHCR for a newer mock-api image and redeploy only if the digest changed.
#
# This is the box side of the pull-based deploy: CI just publishes the image to
# GHCR; this script — driven by the systemd timer from install-timer.sh — pulls
# it down and restarts the container when there's something new. Safe to run by
# hand or on a schedule; it's a no-op when the image is already up to date.
#
# Prereqs on the box:
#   - Docker Engine + compose plugin
#   - the invoking user is in the `docker` group
#   - `docker login ghcr.io` has been run once (GHCR packages are private)
set -euo pipefail

# Operate relative to this script so cwd / the caller's directory don't matter.
cd "$(dirname "$(readlink -f "$0")")"

COMPOSE_FILE="docker-compose.yml"
SERVICE="mock-api"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

# Single source of truth for the image ref: read it straight from the compose file.
image="$(docker compose -f "$COMPOSE_FILE" config --images "$SERVICE" | head -n1)"

before="$(docker image inspect --format '{{.Id}}' "$image" 2>/dev/null || true)"

log "checking $image"
docker compose -f "$COMPOSE_FILE" pull --quiet "$SERVICE"

after="$(docker image inspect --format '{{.Id}}' "$image" 2>/dev/null || true)"

if [ "$before" = "$after" ]; then
  log "up to date (${after:-none}) — nothing to do"
  exit 0
fi

log "new image: ${before:-none} -> ${after} — redeploying"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker image prune -f >/dev/null
log "redeploy complete"
