#!/bin/bash
set -e
echo "Pulling latest..."
git pull
echo "Building and starting container..."
docker compose up --build -d
echo "Done. Recent logs:"
docker compose logs --tail=20
