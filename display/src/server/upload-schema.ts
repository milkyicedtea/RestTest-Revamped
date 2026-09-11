import { z } from 'zod'

export const platformSchema = z.enum(['linux', 'windows', 'macos', 'unknown'])

export type Platform = z.infer<typeof platformSchema>

const finiteNumber = z.number()

export const machineInputSchema = z.object({
  cpu_model: z.string(),
  cpu_cores: finiteNumber,
  cpu_threads: finiteNumber,
  cpu_speed_ghz: finiteNumber,
  ram_gb: finiteNumber,
  platform: platformSchema,
})

export type MachineInput = z.infer<typeof machineInputSchema>

const ohaSchema = z.object({
  summary: z.object({
    successRate: finiteNumber,
    total: finiteNumber,
    slowest: finiteNumber,
    fastest: finiteNumber,
    average: finiteNumber,
    requestsPerSec: finiteNumber,
    totalData: finiteNumber,
    sizePerRequest: finiteNumber,
    sizePerSec: finiteNumber,
  }),
  latencyPercentiles: z.object({
    p50: finiteNumber,
    p75: finiteNumber,
    p90: finiteNumber,
    p95: finiteNumber,
    p99: finiteNumber,
  }),
  rps: z.object({
    mean: finiteNumber,
    stddev: finiteNumber,
    max: finiteNumber,
    min: finiteNumber,
    percentiles: z.object({
      p50: finiteNumber,
      p75: finiteNumber,
      p90: finiteNumber,
      p95: finiteNumber,
      p99: finiteNumber,
    }),
  }),
  details: z.object({
    DNSDialup: z.object({
      average: finiteNumber,
      fastest: finiteNumber,
      slowest: finiteNumber,
    }),
    DNSLookup: z.object({
      average: finiteNumber,
      fastest: finiteNumber,
      slowest: finiteNumber,
    }),
  }),
  statusCodeDistribution: z.record(z.string(), finiteNumber),
  errorDistribution: z.record(z.string(), finiteNumber).optional(),
})

// Mirrors the orchestrator's UploadPayload (infra/orchestrator/src/types.ts).
// The infra <-> display contract; an OpenAPI document can be generated from
// this schema via zod's z.toJSONSchema().
export const uploadPayloadSchema = z.object({
  machine: machineInputSchema,
  language: z.string(),
  framework: z.string(),
  testId: z.string(),
  endpoint: z.string(),
  timestamp: finiteNumber,
  oha: ohaSchema,
})

export type UploadPayload = z.infer<typeof uploadPayloadSchema>
