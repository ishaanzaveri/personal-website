#!/usr/bin/env bash
# Reconcile the running mock API with GHCR; wait for health and roll back failures.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

COMPOSE_FILE="docker-compose.yml"
SERVICE="mock-api"
WAIT_SECONDS="${DEPLOY_WAIT_SECONDS:-120}"
log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# Serialize timer and manual runs. flock is included in Ubuntu's util-linux.
exec 9>".update.lock"
flock -n 9 || { log 'another update is running'; exit 0; }

image="$(compose config --images "$SERVICE")"
container="$(compose ps --all --quiet "$SERVICE")"
running=""
health=""
if [ -n "$container" ]; then
  running="$(docker inspect --format '{{.Image}}' "$container")"
  health="$(docker inspect --format '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container")"
fi

log "checking $image"
compose pull --quiet "$SERVICE"
desired="$(docker image inspect --format '{{.Id}}' "$image")"
if [ "$running" = "$desired" ] && [ "$health" = 'running/healthy' ]; then
  log "up to date ($desired) and healthy"
  exit 0
fi

# Keep the previous image reachable even after a successful pull moves :latest.
rollback="${image%:*}:rollback"
if [ -n "$running" ] && [ "$health" = 'running/healthy' ]; then
  docker image tag "$running" "$rollback"
fi

log "reconciling ${running:-missing} -> $desired"
if compose up -d --no-deps --force-recreate --wait --wait-timeout "$WAIT_SECONDS" "$SERVICE"; then
  log 'deploy healthy'
  exit 0
fi

log 'deploy failed; attempting rollback'
if [ -n "$running" ] && [ "$health" = 'running/healthy' ]; then
  # Restore the local deployment tag. The next poll pulls GHCR again and retries.
  docker image tag "$rollback" "$image"
  if compose up -d --no-deps --force-recreate --wait --wait-timeout "$WAIT_SECONDS" "$SERVICE"; then
    log "restored $running; update will be retried on the next poll"
  else
    log 'rollback failed; operator attention required'
  fi
else
  log 'no previously healthy container is available for rollback'
fi
exit 1
