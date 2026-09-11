import { createFileRoute } from '@tanstack/react-router'
import { getResults, saveUploadResult } from '@/server/db/queries'
import { resultFiltersSchema } from '@/server/filters'
import { apiRateLimit } from '@/server/rate-limit'
import { uploadPayloadSchema } from '@/server/upload-schema'

export const Route = createFileRoute('/api/results')({
  server: {
    middleware: [apiRateLimit],
    handlers: {
      // Orchestrator upload (infra <-> display contract). Response shape must
      // stay identical: { ok, resultId, machineId, metricId } with 201.
      POST: async ({ request }) => {
        let raw: unknown
        try {
          raw = await request.json()
        } catch {
          return new Response('Invalid JSON body', { status: 400 })
        }

        const parsed = uploadPayloadSchema.safeParse(raw)
        if (!parsed.success) {
          return new Response('Invalid upload payload', { status: 400 })
        }

        const saved = await saveUploadResult(parsed.data)

        return Response.json(
          {
            ok: true,
            resultId: saved.result.result_id,
            machineId: saved.machine.machine_id,
            metricId: saved.metrics.metric_id,
          },
          { status: 201 }
        )
      },
      GET: async ({ request }) => {
        const searchParams = new URL(request.url).searchParams
        const parsed = resultFiltersSchema.safeParse(Object.fromEntries(searchParams))
        if (!parsed.success) {
          return new Response('Invalid filters', { status: 400 })
        }

        const results = await getResults(parsed.data)
        return Response.json({ results })
      },
    },
  },
})
