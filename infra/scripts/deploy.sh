#!/usr/bin/env bash
# Deploy this server's benchmark stack: pulls the repo, then brings up the
# compose services selected by COMPOSE_PROFILES in infra/.env.
#
# Usage: ./deploy.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${REPO_ROOT}"

if [[ ! -f infra/.env ]]; then
  echo "infra/.env missing — copy infra/template.env and adjust per-server values first." >&2
  exit 1
fi

git pull --ff-only

docker compose -f infra/docker-compose.yml up -d --build

docker compose -f infra/docker-compose.yml ps
