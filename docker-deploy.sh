#!/bin/bash
set -e

PORT=18790

# Guard: must run from the repo root that holds docker-compose.yml
if [ ! -f docker-compose.yml ] && [ ! -f compose.yaml ]; then
  echo "ERROR: no docker-compose.yml in $(pwd) — cd to the repo root first."
  exit 1
fi

echo "Stopping current compose project (if any)..."
docker compose down --remove-orphans || true

# Catch orphan containers from a previous compose project (e.g. repo
# moved directories — compose project name is derived from the dir).
SQUATTERS=$(docker ps -q --filter "publish=$PORT" || true)
if [ -n "$SQUATTERS" ]; then
  echo "Port $PORT still held by container(s) — stopping..."
  docker stop $SQUATTERS || true
  docker rm $SQUATTERS 2>/dev/null || true
fi

# Bail loudly if a non-docker process is bound to the port
if command -v ss >/dev/null 2>&1; then
  if ss -ltn "sport = :$PORT" 2>/dev/null | tail -n +2 | grep -q .; then
    echo "ERROR: port $PORT is bound by a non-docker process:"
    ss -ltnp "sport = :$PORT" 2>/dev/null || true
    echo "Free the port and rerun."
    exit 1
  fi
fi

echo "Building and starting container..."
docker compose up --build -d

echo "Container status:"
docker compose ps

echo "Recent logs:"
docker compose logs --tail=20
