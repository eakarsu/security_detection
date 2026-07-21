#!/usr/bin/env bash

# Safe release launcher. Database migrations and account provisioning are
# deliberate, separate operator actions; startup never mutates a schema or
# kills a process it did not start.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="${RUNTIME_PROJECT_SOURCE:-$PROJECT_DIR}"
: "${PORT:?PORT is required; choose an unused API port explicitly}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required; choose an unused UI port explicitly}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"

if [ "${#JWT_SECRET}" -lt 32 ]; then
  echo "JWT_SECRET must contain at least 32 characters" >&2
  exit 1
fi

for command in npm lsof; do
  command -v "$command" >/dev/null || {
    echo "Missing prerequisite: $command" >&2
    exit 1
  }
done

[ -d "$SOURCE_DIR/backend/nodejs/node_modules" ] && [ -d "$SOURCE_DIR/frontend/node_modules" ] || {
  echo "Missing Node dependencies. Run npm ci in backend/nodejs and frontend." >&2
  exit 1
}
[ -f "$SOURCE_DIR/backend/nodejs/dist/index.js" ] || {
  echo "Node API production build is missing; run npm run build in backend/nodejs." >&2
  exit 1
}
[ -f "$SOURCE_DIR/frontend/build/index.html" ] || {
  echo "Frontend production build is missing; run npm run build in frontend." >&2
  exit 1
}

for port in "$PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already occupied; refusing to terminate its process." >&2
    exit 1
  fi
done

pids=()
cleanup() {
  trap - INT TERM EXIT
  if [ "${#pids[@]}" -gt 0 ]; then
    kill "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

export JWT_SECRET DATABASE_URL
export NODE_ENV=production
export FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:${FRONTEND_PORT}}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://127.0.0.1:${FRONTEND_PORT}}"

(
  cd "$SOURCE_DIR/backend/nodejs"
  PORT="$PORT" exec npm run start:prod
) &
pids+=("$!")

(
  cd "$SOURCE_DIR/frontend"
  VITE_API_URL="http://127.0.0.1:${PORT}" \
  exec npm exec -- vite preview --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort
) &
pids+=("$!")

echo "NodeGuard started without applying migrations or provisioning data."
echo "Frontend: http://127.0.0.1:${FRONTEND_PORT}"
echo "Node API: http://127.0.0.1:${PORT}"

while true; do
  for child_pid in "${pids[@]}"; do
    if ! kill -0 "$child_pid" 2>/dev/null; then
      if wait "$child_pid"; then
        child_status=0
      else
        child_status=$?
      fi
      echo "A service exited; stopping the remaining services." >&2
      exit "$child_status"
    fi
  done
  sleep 1
done
