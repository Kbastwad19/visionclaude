#!/bin/bash
set -e
echo "Building and starting container..."
docker compose up --build -d
echo "Done. Recent logs:"
docker compose logs --tail=20
