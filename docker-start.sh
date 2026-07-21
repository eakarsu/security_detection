#!/usr/bin/env bash

set -euo pipefail

: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD before starting Docker services.}"
: "${JWT_SECRET:?Set JWT_SECRET before starting Docker services.}"

if [ "${#JWT_SECRET}" -lt 32 ]; then
    echo "JWT_SECRET must be at least 32 characters." >&2
    exit 1
fi

docker compose config --quiet
docker compose up -d
docker compose ps

echo "Services started without deleting volumes or running migrations/seeds."
echo "Apply reviewed migrations explicitly before application startup."
