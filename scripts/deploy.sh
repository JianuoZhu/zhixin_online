#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-${BACKEND_DIR}/.venv}"
RUN_SEED="${RUN_SEED:-0}"

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "Missing ${BACKEND_DIR}/.env. Copy backend/.env.example and fill production values first." >&2
  exit 1
fi

if [[ ! -f "${FRONTEND_DIR}/.env" ]]; then
  echo "Missing ${FRONTEND_DIR}/.env. Copy frontend/.env.example and fill production values first." >&2
  exit 1
fi

echo "==> Preparing backend virtual environment"
"${PYTHON_BIN}" -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/python" -m pip install --upgrade pip
"${VENV_DIR}/bin/python" -m pip install -r "${BACKEND_DIR}/requirements.txt"
mkdir -p "${BACKEND_DIR}/uploads"

echo "==> Initializing database schema"
(
  cd "${BACKEND_DIR}"
  "${VENV_DIR}/bin/python" scripts/init_db.py
)

echo "==> Ensuring bootstrap admin exists"
(
  cd "${BACKEND_DIR}"
  "${VENV_DIR}/bin/python" scripts/create_admin.py
)

if [[ "${RUN_SEED}" == "1" ]]; then
  echo "==> Seeding demo data"
  (
    cd "${BACKEND_DIR}"
    "${VENV_DIR}/bin/python" scripts/seed.py
  )
fi

echo "==> Building frontend"
(
  cd "${FRONTEND_DIR}"
  npm ci
  npm run build
)

echo "Deployment build finished."
echo "Restart the API service and reload Nginx after this script succeeds."
