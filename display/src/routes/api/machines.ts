import { createFileRoute } from '@tanstack/react-router'
import { getMachines } from '@/server/db/queries'
import { apiRateLimit } from '@/server/rate-limit'

export const Route = createFileRoute('/api/machines')({
  server: {
    middleware: [apiRateLimit],
    handlers: {
      GET: async () => {
        const machines = await getMachines()
        return Response.json({ machines })
      },
    },
  },
})
