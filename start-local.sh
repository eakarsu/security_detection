#!/usr/bin/env bash
set -euo pipefail

# Backward-compatible entry point. The safe launcher never kills existing
# processes and never applies migrations or seed data during startup.
exec "$(cd "$(dirname "$0")" && pwd)/start.sh" "$@"
