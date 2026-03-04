#!/bin/bash
# ============================================================
# scripts/db/books/run-migrations.sh
# DB team pipeline script: runs Flyway migrations for booksdb.
# Must run BEFORE Books Service starts on each deployment.
#
# Pipeline stages:
#   dev  → staging → prod (each has its own DB_HOST/DB_NAME)
#
# Run:  bash scripts/db/books/run-migrations.sh [migrate|info|validate|repair]
# ============================================================
set -euo pipefail

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GRN}[ OK ]${NC}  $*"; }
info() { echo -e "${BLU}[INFO]${NC}  $*"; }
warn() { echo -e "${YEL}[WARN]${NC}  $*"; }
die()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMMAND=${1:-info}

# Load from /etc/emart/books.env if present (server) or .env (local)
if [[ -f /etc/emart/books.env ]]; then
    source /etc/emart/books.env
elif [[ -f "$REPO_DIR/books-service/.env" ]]; then
    source "$REPO_DIR/books-service/.env"
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-booksdb}
DB_USER=${DB_USER:-emart_books}
DB_PASSWORD=${DB_PASSWORD:-}

info "=== Books DB Migration — Flyway ==="
info "Command: $COMMAND"
info "Target:  ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""

# Delegate to books-service migration script
DB_HOST="$DB_HOST" \
DB_PORT="$DB_PORT" \
DB_NAME="$DB_NAME" \
DB_USER="$DB_USER" \
DB_PASSWORD="$DB_PASSWORD" \
    bash "$REPO_DIR/books-service/db/run-flyway.sh" "$COMMAND"

ok "Migration command '$COMMAND' completed"
