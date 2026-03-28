#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8080}"

echo "Checking ${BASE_URL}/health/live"
curl -fsS "${BASE_URL}/health/live" >/dev/null

echo "Checking ${BASE_URL}/health/ready"
curl -fsS "${BASE_URL}/health/ready" >/dev/null

echo "Checking ${BASE_URL}/api/bazaar"
curl -fsS "${BASE_URL}/api/bazaar" >/dev/null

echo "Smoke test OK"

