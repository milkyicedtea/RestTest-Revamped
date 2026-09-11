import { createMiddleware } from '@tanstack/react-start'

const WINDOW_MS = 60_000
const LIMIT = 60

const hits = new Map<string, number[]>()
let callsSinceCleanup = 0

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
}

function prune(windowStart: number): void {
  for (const [key, timestamps] of hits.entries()) {
    const recent = timestamps.filter((t) => t > windowStart)
    if (recent.length === 0) {
      hits.delete(key)
    } else {
      hits.set(key, recent)
    }
  }
}

// Fixed-window limiter, keyed by forwarded client IP. Replaces
// hono-rate-limiter (60 req/min per IP on the public API routes).
export const apiRateLimit = createMiddleware().server(({ request, next }) => {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  if (++callsSinceCleanup >= 1000) {
    callsSinceCleanup = 0
    prune(windowStart)
  }

  const key = clientKey(request)
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)

  if (recent.length >= LIMIT) {
    return new Response('Too many requests, please try again later.', {
      status: 429,
    })
  }

  recent.push(now)
  hits.set(key, recent)

  return next()
})
