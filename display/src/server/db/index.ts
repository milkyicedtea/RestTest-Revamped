import { SQL } from 'bun'

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB } = process.env

const url = `postgres://${POSTGRES_USER || 'postgres'}:${POSTGRES_PASSWORD || 'password'}@${POSTGRES_HOST || 'localhost'}:${POSTGRES_PORT || '5432'}/${POSTGRES_DB || 'public'}`

// Bun SQL pools default to max: 10 with idleTimeout: 0 (idle connections are
// never closed). Vite dev re-evaluates server modules on every HMR/watch
// restart, so a bare `new SQL(...)` at module scope leaks a fresh pool each
// time until Postgres hits max_connections ("sorry, too many clients
// already"). Cache the pool on globalThis so re-imports reuse it, and bound
// every pool's connections so stray instances self-drain.
const globalForSql = globalThis as typeof globalThis & { __resttestSql?: SQL }

export const sql =
  globalForSql.__resttestSql ??
  new SQL({
    url,
    max: 10,
    idleTimeout: 30,
    maxLifetime: 1800,
    connection: { application_name: 'resttest-display' },
  })

globalForSql.__resttestSql = sql

let closing = false
function closePool(): void {
  if (closing) return
  closing = true
  void sql.close({ timeout: 1 })
}

process.once('SIGINT', closePool)
process.once('SIGTERM', closePool)
process.once('exit', closePool)
