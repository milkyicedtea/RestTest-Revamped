/**
 * TanStack Start Production Server (Bun-native)
 *
 * Adapted from the reference implementation:
 * https://github.com/TanStack/router/blob/main/examples/react/start-bun/server.ts
 *
 * - Preloads small static assets into memory (with ETag + gzip)
 * - Serves large assets on-demand from disk
 * - Falls back to the built Start server entry for everything else
 *
 * Environment: PORT (default 3000), ASSET_PRELOAD_MAX_SIZE (default 5MB),
 * ASSET_PRELOAD_ENABLE_ETAG / ASSET_PRELOAD_ENABLE_GZIP (default true)
 *
 * Usage: bun run server.ts
 */

import path from 'node:path'

const SERVER_PORT = Number(process.env.PORT ?? 3000)
// Absolute paths anchored to this script: immune to cwd and to the tsconfig
// `@/*` alias (which maps to ./src — dist is NOT under src).
const PROJECT_ROOT = import.meta.dir
const CLIENT_DIRECTORY = path.join(PROJECT_ROOT, 'dist/client')
const SERVER_ENTRY_POINT = path.join(PROJECT_ROOT, 'dist/server/server.js')

const MAX_PRELOAD_BYTES = Number(process.env.ASSET_PRELOAD_MAX_SIZE ?? 5 * 1024 * 1024)
const ENABLE_ETAG = (process.env.ASSET_PRELOAD_ENABLE_ETAG ?? 'true') === 'true'
const ENABLE_GZIP = (process.env.ASSET_PRELOAD_ENABLE_GZIP ?? 'true') === 'true'
const GZIP_MIN_BYTES = Number(process.env.ASSET_PRELOAD_GZIP_MIN_SIZE ?? 1024)
const GZIP_TYPES = (
  'text/,application/javascript,application/json,application/xml,image/svg+xml'
)
  .split(',')
  .map((type) => type.trim())

interface InMemoryAsset {
  raw: Uint8Array
  gz?: Uint8Array
  etag?: string
  type: string
}

function computeEtag(data: Uint8Array): string {
  return `W/"${Bun.hash(data).toString(16)}-${data.byteLength.toString()}"`
}

function isMimeTypeCompressible(mimeType: string): boolean {
  return GZIP_TYPES.some((type) =>
    type.endsWith('/') ? mimeType.startsWith(type) : mimeType === type,
  )
}

function compressDataIfAppropriate(data: Uint8Array, mimeType: string): Uint8Array | undefined {
  if (!ENABLE_GZIP || data.byteLength < GZIP_MIN_BYTES || !isMimeTypeCompressible(mimeType)) {
    return undefined
  }

  try {
    return Bun.gzipSync(data.buffer as ArrayBuffer)
  } catch {
    return undefined
  }
}

function createResponseHandler(
  asset: InMemoryAsset,
  immutable: boolean,
): (req: Request) => Response {
  return (req) => {
    const headers: Record<string, string> = {
      'Content-Type': asset.type,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    }

    if (ENABLE_ETAG && asset.etag) {
      if (req.headers.get('if-none-match') === asset.etag) {
        return new Response(null, { status: 304, headers: { ETag: asset.etag } })
      }
      headers.ETag = asset.etag
    }

    if (asset.gz && req.headers.get('accept-encoding')?.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip'
      headers['Content-Length'] = String(asset.gz.byteLength)
      return new Response(new Uint8Array(asset.gz), { status: 200, headers })
    }

    headers['Content-Length'] = String(asset.raw.byteLength)
    return new Response(new Uint8Array(asset.raw), { status: 200, headers })
  }
}

async function initializeStaticRoutes(): Promise<Record<string, (req: Request) => Response>> {
  const routes: Record<string, (req: Request) => Response> = {}
  const glob = new Bun.Glob('**/*')
  let loaded = 0

  for await (const relativePath of glob.scan({ cwd: CLIENT_DIRECTORY })) {
    const filepath = path.join(CLIENT_DIRECTORY, relativePath)
    const file = Bun.file(filepath)

    if (!(await file.exists()) || file.size === 0) {
      continue
    }

    const route = `/${relativePath.split(path.sep).join('/')}`
    const type = file.type || 'application/octet-stream'

    if (file.size <= MAX_PRELOAD_BYTES) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      routes[route] = createResponseHandler(
        {
          raw: bytes,
          gz: compressDataIfAppropriate(bytes, type),
          etag: ENABLE_ETAG ? computeEtag(bytes) : undefined,
          type,
        },
        // hashed build output is safe to cache forever; HTML must revalidate
        route.startsWith('/assets/'),
      )
      loaded++
    } else {
      routes[route] = () =>
        new Response(Bun.file(filepath), {
          headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600' },
        })
    }
  }

  console.log(`[server] ${String(loaded)} static assets loaded from ${CLIENT_DIRECTORY}`)
  return routes
}

async function initializeServer() {
  // Static import is impossible: the entry is a vite build artifact
  // (./dist/server/server.js) that only exists after `bun run build`.
  const serverModule = (await import(SERVER_ENTRY_POINT)) as {
    default: { fetch: (request: Request) => Response | Promise<Response> }
  }
  const handler = serverModule.default
  const routes = await initializeStaticRoutes()

  Bun.serve({
    port: SERVER_PORT,
    routes: {
      ...routes,
      '/*': (req) => handler.fetch(req),
    },
    error(error) {
      console.error('[server] uncaught error:', error instanceof Error ? error.message : error)
      return new Response('Internal Server Error', { status: 500 })
    },
  })

  console.log(`[server] listening on http://localhost:${String(SERVER_PORT)}`)
}

initializeServer().catch((error: unknown) => {
  console.error('[server] failed to start:', error)
  process.exit(1)
})
