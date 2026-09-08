#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
port="${1:-8000}"
echo "Spheriverse homepage: http://localhost:${port}"
python -m http.server "$port" --bind 0.0.0.0

