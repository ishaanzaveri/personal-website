#!/usr/bin/env bash
#
# Install a systemd timer that polls GHCR every 5 minutes and redeploys the mock
# API whenever a new image is published (see update.sh). This is the whole
# "deploy" mechanism — CI publishes to GHCR, the box pulls. No SSH, no inbound
# port, no CI secrets.
#
# Run once on the VPS, from this directory:
#   ./install-timer.sh
# Re-run any time to update the unit definitions. Needs sudo (writes unit files
# under /etc/systemd/system and reloads systemd).
#
# The timer runs update.sh as *you* (not root) so it uses your docker group
# membership and your `docker login ghcr.io` credentials. Make sure both are set
# up first:
#   sudo usermod -aG docker "$USER"      # then re-login
#   docker login ghcr.io                 # GHCR packages are private
set -euo pipefail

INFRA_DIR="$(dirname "$(readlink -f "$0")")"
# When invoked via sudo, SUDO_USER is the real user; fall back to USER otherwise.
RUN_USER="${SUDO_USER:-$USER}"
UNIT="mock-api-update"

if [ "$RUN_USER" = "root" ]; then
  echo "Refusing to run the deploy as root — invoke this as your normal user (sudo is used internally)." >&2
  exit 1
fi

chmod +x "${INFRA_DIR}/update.sh"

echo "Installing ${UNIT}.timer"
echo "  runs: ${INFRA_DIR}/update.sh"
echo "  as:   ${RUN_USER}"
echo "  every: 5 minutes"
echo

sudo tee /etc/systemd/system/${UNIT}.service >/dev/null <<EOF
[Unit]
Description=Poll GHCR and redeploy the mock API if a new image is available
Wants=network-online.target
After=network-online.target docker.service
Requires=docker.service

[Service]
Type=oneshot
User=${RUN_USER}
WorkingDirectory=${INFRA_DIR}
ExecStart=${INFRA_DIR}/update.sh
EOF

sudo tee /etc/systemd/system/${UNIT}.timer >/dev/null <<EOF
[Unit]
Description=Run ${UNIT}.service every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=30s
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ${UNIT}.timer

echo
echo "Installed. Handy commands:"
echo "  status:    systemctl status ${UNIT}.timer"
echo "  schedule:  systemctl list-timers ${UNIT}.timer"
echo "  run now:   sudo systemctl start ${UNIT}.service"
echo "  logs:      journalctl -u ${UNIT}.service -f"
