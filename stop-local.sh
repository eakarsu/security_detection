#!/usr/bin/env bash

set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    echo "Usage: $0"
    echo "Stops only this project's Compose services. It never deletes volumes or kills arbitrary PIDs."
    exit 0
fi

if [ "$#" -gt 0 ]; then
    echo "Unsupported option: $1" >&2
    echo "Data deletion is intentionally not available in this script." >&2
    exit 2
fi

docker compose stop
echo "Project containers stopped. Data volumes were preserved."
