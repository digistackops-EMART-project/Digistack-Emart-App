#!/bin/bash
# ============================================================
# scripts/deploy/deploy-books.sh
# Builds and deploys the Books Service (Node.js + PostgreSQL).
# Run:  sudo bash scripts/deploy/deploy-books.sh [--skip-build]
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKIP_BUILD=${1:-""}

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run as root"

# ── Pre-flight ────────────────────────────────────────────────
[[ -f /etc/emart/books.env ]] || die "/etc/emart/books.env not found. Run configure-env.sh first."
systemctl is-active --quiet postgresql || die "PostgreSQL is not running"
command -v node &>/dev/null || die "Node.js not installed. Run install.sh first."

# ── Create directories ────────────────────────────────────────
mkdir -p /opt/emart/books-service
mkdir -p /var/log/emart
chown emart:emart /opt/emart/books-service
chown emart:emart /var/log/emart

# ── npm install (production deps only) ───────────────────────
if [[ "$SKIP_BUILD" != "--skip-build" ]]; then
    info "Installing Books Service npm dependencies..."
    cd "$REPO_DIR/books-service"
    npm ci --omit=dev --silent
    ok "npm ci done (production deps only)"
fi

# ── Copy service files to deployment directory ────────────────
info "Deploying Books Service files to /opt/emart/books-service/..."
rsync -a --delete \
    --exclude 'node_modules' \
    --exclude 'tests' \
    --exclude '.env*' \
    --exclude 'db' \
    "$REPO_DIR/books-service/" \
    /opt/emart/books-service/

# Copy node_modules
rsync -a "$REPO_DIR/books-service/node_modules/" /opt/emart/books-service/node_modules/

chown -R emart:emart /opt/emart/books-service
ok "Files deployed"

# ── Install / update systemd unit ────────────────────────────
cat > /etc/systemd/system/emart-books.service <<'UNIT'
[Unit]
Description=Emart Books Service (Node.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=emart
Group=emart

WorkingDirectory=/opt/emart/books-service
EnvironmentFile=/etc/emart/books.env

ExecStart=/usr/bin/node src/server.js

Restart=on-failure
RestartSec=10
StartLimitBurst=3

StandardOutput=append:/var/log/emart/books-service.log
StandardError=append:/var/log/emart/books-service.log

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable emart-books --quiet
systemctl restart emart-books
ok "emart-books service restarted"

# ── Wait for readiness ────────────────────────────────────────
info "Waiting for Books Service to be ready (max 60s)..."
for i in $(seq 1 20); do
    if curl -sf http://localhost:8082/health/ready -o /dev/null; then
        ok "Books Service is UP and ready"
        exit 0
    fi
    sleep 3
done

die "Books Service did not become healthy. Check: journalctl -u emart-books -n 50"
