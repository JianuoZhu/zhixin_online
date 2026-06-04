#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
DATABASE_URL="${DATABASE_URL:-}"

if [[ -z "${DATABASE_URL}" && -f "${ROOT_DIR}/backend/.env" ]]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "${ROOT_DIR}/backend/.env" | tail -n 1 | cut -d '=' -f 2-)"
fi

DATABASE_URL="${DATABASE_URL%$'\r'}"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"
DATABASE_URL="${DATABASE_URL%\'}"
DATABASE_URL="${DATABASE_URL#\'}"

if [[ -z "${DATABASE_URL}" ]]; then
  echo "DATABASE_URL is required, or define it in backend/.env." >&2
  exit 1
fi

PG_DUMP_URL="${DATABASE_URL/postgresql+psycopg2:/postgresql:}"
mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/zhixin-$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump "${PG_DUMP_URL}" | gzip > "${BACKUP_FILE}"

echo "Backup written to ${BACKUP_FILE}"
