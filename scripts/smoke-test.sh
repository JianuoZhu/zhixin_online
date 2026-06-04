#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:8000}"
FRONTEND_URL="${FRONTEND_URL:-}"

echo "==> Checking API health: ${API_URL}/api/health"
curl --fail --silent --show-error "${API_URL%/}/api/health"
echo

if [[ -n "${FRONTEND_URL}" ]]; then
  echo "==> Checking frontend: ${FRONTEND_URL}"
  curl --fail --silent --show-error --head "${FRONTEND_URL%/}/" >/dev/null
fi

echo "Smoke test passed."
