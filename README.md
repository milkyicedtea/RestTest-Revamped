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

- **Benchmark side (`infra/`, `languages/`) — fully distributed**
  - one shared test PostgreSQL/DragonflyDB server (started with the `db` compose profile)
  - benchmark API containers (currently TypeScript/Hono), each server runs its own compose stack (`api-*` profiles)
  - load generators (oha) can run: natively on their own server, natively on the orchestrator host, or in Docker — locally or remotely (see `infra/orchestrator/src/config.ts` `loadGenerators`)
  - orchestrator CLI (`infra/orchestrator`) runs anywhere (tester PC included); it reaches oha directly/over SSH/docker exec and the API servers over SSH for machine detection

- **Display side (`display/`) — self-contained, unchanged**
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
│   ├── docker-compose.yml      # API + db services, per-server profiles
│   ├── template.env            # per-server compose config template
│   ├── scripts/
│   │   ├── deploy.sh           # per-server deploy (pull + compose up)
│   │   └── install-oha.sh      # one-time oha install for a dedicated LG server
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
- Docker + Docker Compose (on every API/db server)
- Bun (wherever the orchestrator runs — tester PC is fine)
- SSH access from the orchestrator host to each remote server (key-based)

### 1) Provision each server

On every benchmark server (API servers, the shared db server):

```bash
cp infra/template.env infra/.env   # then edit COMPOSE_PROFILES + addresses
./infra/scripts/deploy.sh          # git pull + compose up for its profiles
```

For a dedicated oha server, provision it once:

```bash
sudo ./infra/scripts/install-oha.sh
```

Single-server dev setup still works with the defaults in `template.env`
(all profiles on one machine, everything on localhost).

### 2) Start display stack

From project root (display is unchanged and self-contained):

```bash
docker compose -f display/docker-compose.yml up -d --build
```

> On first boot, display DB schema is created from `display/dbinit/0000_create_database.sql` via `docker-entrypoint-initdb.d`.

### 3) Point servers at each other

- API servers' `infra/.env` must set `DATABASE_URL` to the **db server's** address
  when the db runs on a different machine (default assumes co-located).
  The db server's postgres must therefore listen on its public/WG interface
  and accept connections from the API servers (it stays test-dedicated —
  never share it with display's DB).
- `infra/orchestrator/src/config.ts` maps each framework to a `server` entry
  (`address` = what oha dials, `sshAlias` = how the orchestrator reaches it),
  plus one or more `loadGenerators` (modes: `native-local`, `native-ssh`,
  `docker-local`, `docker-ssh`).
- Firewall the benchmark ports on API servers to the load generator's IP only.

### 4) Run orchestrator

```bash
cd infra/orchestrator
bun install
bun run start:bun
```

During prompts you can:
- select all APIs or specific APIs
- pick the load generator for this session (when several are configured)
- enable upload for this run
- provide display URL (default: `http://localhost:4000`)
- auto-detect/confirm/edit machine specs **per API server** (queried over SSH
  for remote servers; the machine under test is what gets recorded)

## How benchmarking works

Execution order is deterministic and sequential:

`framework -> test1 -> test2 -> ... -> next framework`

For each test, orchestrator:
1. spawns oha (native/SSH/docker per the chosen load generator) against
   `http://<server.address>:<port><endpoint>` and captures the JSON report
   from stdout — nothing is written on the load generator host
2. wraps output with metadata (`language`, `framework`, `testId`, `endpoint`, `timestamp`)
   and stores it under `infra/results/<language>/<framework>/`
3. optionally uploads to display `/api/results` immediately, together with the
   machine specs of the API server hosting that framework

Benchmark selection/config is defined in:
- `infra/orchestrator/src/config.ts`

> Results from different topologies (single-server vs distributed) are not
> directly comparable: cross-server round-trips are baked into every number.
> Keep oha close to the API servers for fair comparisons.

## Display API

Base URL: `http://localhost:4000`

- `POST /api/results` — upload one benchmark result payload
- `GET /api/results` — list results with filters/pagination; `language` and `framework` accept multiple comma-separated values (`?language=typescript,rust`), all others are single-value
- `GET /api/machines` — list machine records
- `GET /health` — health check

The same server also serves the built frontend from `/`.

## Ports

Defaults (all overridable via `infra/.env`, see `infra/template.env`):

### Benchmark infrastructure (`infra/docker-compose.yml`)
- Hono benchmark API: `4101` (`HONO_HOST_PORT`)
- test PostgreSQL host port: `5433` (`POSTGRES_HOST_PORT`, container `5432`)
- test Dragonfly host port: `6380` (`DRAGONFLY_HOST_PORT`, container `6379`)

### Display (`display/docker-compose.yml`)
- display app/API: `4000`
- display PostgreSQL: `5432`

## Adding frameworks/tests

### Add a new framework service
1. Create `languages/<language>/<framework>/` with app code + Dockerfile
   (read `DATABASE_URL`/`PORT` from env, like hono does).
2. Add service to `infra/docker-compose.yml` with an `api-<name>` compose profile.
3. Add framework entry to `infra/orchestrator/src/config.ts`:
   - `server`: name of the server hosting it
   - `port`
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
