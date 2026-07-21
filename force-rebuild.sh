#!/usr/bin/env bash

set -euo pipefail

: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD before building.}"
: "${JWT_SECRET:?Set JWT_SECRET before building.}"

if [ "${#JWT_SECRET}" -lt 32 ]; then
    echo "JWT_SECRET must be at least 32 characters." >&2
    exit 1
fi

docker compose config --quiet
docker compose build --no-cache --parallel

echo "Images rebuilt. Existing containers and data volumes were not changed."
echo "Start them explicitly with: docker compose up -d"
