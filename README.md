![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue)

# RestTest Revamped

A benchmark suite for REST APIs across languages/frameworks, with:
- containerized test infrastructure
- an interactive orchestrator to run selected tests
- a display web app/API to collect, store, and compare results

## Table of contents
- [Overview](#overview)
- [Current architecture](#current-architecture)
- [Repository structure](#repository-structure)
- [Quick start](#quick-start)
- [How benchmarking works](#how-benchmarking-works)
- [Display API](#display-api)
- [Ports](#ports)
- [Adding frameworks/tests](#adding-frameworkstests)
- [Contributing](#contributing)
- [License](#license)

## Overview

RestTest Revamped is designed for repeatable API performance comparisons.

You run benchmark targets in `infra`, then optionally upload each result to the hosted/local `display` service.
The display service stores machine metadata + flattened metrics in PostgreSQL and serves a frontend for filtering/comparison.

## Current architecture

- **Benchmark side (`infra/`)**
  - PostgreSQL (test DB)
  - DragonflyDB (available for cache tests)
  - benchmark API containers (currently TypeScript/Hono)
  - `oha` container (benchmark engine)
  - orchestrator CLI (`infra/orchestrator`) to select tests and execute them sequentially

- **Display side (`display/`)**
  - Hono API + static frontend serving from `dist/`
  - React + TanStack Router + Mantine client
  - PostgreSQL for uploaded machines/results/metrics
  - optional `caddy_net` external Docker network for reverse proxy setups

## Repository structure

```text
.
├── languages/
│   └── typescript/
│       └── hono/
├── infra/
│   ├── docker-compose.yml
│   ├── oha/
│   ├── orchestrator/
│   │   └── src/
│   └── results/
├── display/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── dbinit/
│   └── src/
│       ├── client/
│       ├── server/
│       └── shared/
├── Clarification.md
├── RestTest.md
└── README.md
```

## Quick start

### Prerequisites
- Docker + Docker Compose
- Bun (for local orchestrator run)

### 1) Start benchmark infrastructure

From project root:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

### 2) Start display stack

From project root:

```bash
docker compose -f display/docker-compose.yml up -d --build
```

> On first boot, display DB schema is created from `display/dbinit/0000_create_database.sql` via `docker-entrypoint-initdb.d`.

### 3) Run orchestrator

```bash
cd infra/orchestrator
bun install
bun run start:bun
```

During prompts you can:
- select all APIs or specific APIs
- enable upload for this run
- provide display URL (default: `http://localhost:4000`)
- auto-detect/confirm/edit machine specs

## How benchmarking works

Execution order is deterministic and sequential:

`framework -> test1 -> test2 -> ... -> next framework`

For each test, orchestrator:
1. runs `oha` in the `infra-oha-1` container
2. writes raw output to `infra/results/`
3. wraps output with metadata (`language`, `framework`, `testId`, `endpoint`, `timestamp`)
4. optionally uploads to display `/api/results` immediately

Benchmark selection/config is defined in:
- `infra/orchestrator/src/config.ts`

## Display API

Base URL: `http://localhost:4000`

- `POST /api/results` — upload one benchmark result payload
- `GET /api/results` — list results with filters/pagination; `language` and `framework` accept multiple comma-separated values (`?language=typescript,rust`), all others are single-value
- `GET /api/machines` — list machine records
- `GET /health` — health check

The same server also serves the built frontend from `/`.

## Ports

### Benchmark infrastructure (`infra/docker-compose.yml`)
- Hono benchmark API: `4101`
- test PostgreSQL host port: `5433` (container `5432`)
- test Dragonfly host port: `6380` (container `6379`)

### Display (`display/docker-compose.yml`)
- display app/API: `4000`
- display PostgreSQL: `5432`

## Adding frameworks/tests

### Add a new framework service
1. Create `languages/<language>/<framework>/` with app code + Dockerfile.
2. Add service to `infra/docker-compose.yml` on `apinet`.
3. Add framework entry to `infra/orchestrator/src/config.ts`:
   - container name
   - port
   - test list (`id`, `endpoint`, optional description)

### Add new tests to an existing framework
Edit only `infra/orchestrator/src/config.ts` tests array for that framework.

## Contributing

Contributions are welcome for:
- new language/framework implementations
- additional benchmark scenarios/endpoints
- display filtering/comparison improvements
- infrastructure reliability and DX improvements

Please keep naming and structure consistent with existing folders and configs.

## License

MIT — see [LICENSE](LICENSE).
