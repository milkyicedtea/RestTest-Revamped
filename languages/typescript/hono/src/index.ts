import { SQL } from 'bun'
import { Hono } from 'hono'
import { logger } from 'hono/logger'

const db = new SQL(process.env.DATABASE_URL ?? "postgres://postgres:password@postgres:5432/benchmark")

const app = new Hono()

app.use('*', logger())

// health check used by docker
app.get("/health", (c) => {
  return c.text("OK")
})

// basic hello world test
app.get("/", (c) => {
  return c.json({ message: "Hello from Hono!" })
})

// postgres read test
app.get("/pg/read", async (c) => {
  const result = await db`SELECT NOW() as now`
  return c.json(result[0])
})

Bun.serve({
  port: Number(process.env.PORT ?? 4101),
  fetch: app.fetch
})
