import { sql } from '@/server/db/index'
import type { ResultFilters } from '@/server/filters'
import type { FullResult, Machine, ResultMetrics, TestResult } from '@/server/types'
import type { MachineInput, UploadPayload } from '@/server/upload-schema'

interface FullResultRow {
  result_id: string
  machine_id: string
  language: string
  framework: string
  test_id: string
  endpoint: string
  timestamp: number
  created_at: string
  metric_id: string
  success_rate: number
  total_time: number
  slowest: number
  fastest: number
  average: number
  requests_per_sec: number
  total_data: number
  size_per_request: number
  size_per_sec: number
  latency_p50: number
  latency_p75: number
  latency_p90: number
  latency_p95: number
  latency_p99: number
  rps_mean: number
  rps_stddev: number
  rps_max: number
  rps_min: number
  rps_p50: number
  rps_p75: number
  rps_p90: number
  rps_p95: number
  rps_p99: number
  dns_dialup_avg: number
  dns_dialup_fastest: number
  dns_dialup_slowest: number
  dns_lookup_avg: number
  dns_lookup_fastest: number
  dns_lookup_slowest: number
  status_200_count: number
  error_count: number
  error_types: string | null
  cpu_model: string
  cpu_cores: number
  cpu_threads: number
  cpu_speed_ghz: number
  ram_gb: number
  platform: Machine['platform']
  machine_created_at: string
}

export async function createMachine(data: MachineInput): Promise<Machine> {
  const [machine] = await sql<Machine[]>`
    INSERT INTO machines (cpu_model, cpu_cores, cpu_threads, cpu_speed_ghz, ram_gb, platform)
    VALUES (${data.cpu_model}, ${data.cpu_cores}, ${data.cpu_threads}, ${data.cpu_speed_ghz}, ${data.ram_gb}, ${data.platform})
    RETURNING *
  `

  return machine
}

export async function findOrCreateMachine(data: MachineInput): Promise<Machine> {
  const [existing] = await sql<Machine[]>`
    SELECT * FROM machines
    WHERE cpu_model = ${data.cpu_model}
      AND cpu_cores = ${data.cpu_cores}
      AND cpu_threads = ${data.cpu_threads}
      AND cpu_speed_ghz = ${data.cpu_speed_ghz}
      AND ram_gb = ${data.ram_gb}
      AND platform = ${data.platform}
    LIMIT 1
  `

  if (existing) {
    return existing
  }

  return createMachine(data)
}

export async function getMachines(): Promise<Machine[]> {
  return sql<Machine[]>`
    SELECT * FROM machines
    ORDER BY created_at DESC
  `
}

export async function createTestResult(
  machine_id: string,
  language: string,
  framework: string,
  test_id: string,
  endpoint: string,
  timestamp: number
): Promise<TestResult> {
  const [result] = await sql<TestResult[]>`
    INSERT INTO test_results (machine_id, language, framework, test_id, endpoint, timestamp)
    VALUES (${machine_id}, ${language}, ${framework}, ${test_id}, ${endpoint}, ${timestamp})
    RETURNING *
  `

  return result
}

export async function createResultMetrics(
  resultId: string,
  payload: UploadPayload
): Promise<ResultMetrics> {
  const errorDistribution = payload.oha.errorDistribution ?? {}
  const errorCount = Object.values(errorDistribution).reduce((total, count) => total + count, 0)
  const errorTypes =
    Object.keys(errorDistribution).length > 0 ? JSON.stringify(errorDistribution) : null

  const [metrics] = await sql<ResultMetrics[]>`
    INSERT INTO result_metrics (
      result_id,
      success_rate,
      total_time,
      slowest,
      fastest,
      average,
      requests_per_sec,
      total_data,
      size_per_request,
      size_per_sec,
      latency_p50,
      latency_p75,
      latency_p90,
      latency_p95,
      latency_p99,
      rps_mean,
      rps_stddev,
      rps_max,
      rps_min,
      rps_p50,
      rps_p75,
      rps_p90,
      rps_p95,
      rps_p99,
      dns_dialup_avg,
      dns_dialup_fastest,
      dns_dialup_slowest,
      dns_lookup_avg,
      dns_lookup_fastest,
      dns_lookup_slowest,
      status_200_count,
      error_count,
      error_types
    )
    VALUES (
      ${resultId},
      ${payload.oha.summary.successRate},
      ${payload.oha.summary.total},
      ${payload.oha.summary.slowest},
      ${payload.oha.summary.fastest},
      ${payload.oha.summary.average},
      ${payload.oha.summary.requestsPerSec},
      ${payload.oha.summary.totalData},
      ${payload.oha.summary.sizePerRequest},
      ${payload.oha.summary.sizePerSec},
      ${payload.oha.latencyPercentiles.p50},
      ${payload.oha.latencyPercentiles.p75},
      ${payload.oha.latencyPercentiles.p90},
      ${payload.oha.latencyPercentiles.p95},
      ${payload.oha.latencyPercentiles.p99},
      ${payload.oha.rps.mean},
      ${payload.oha.rps.stddev},
      ${payload.oha.rps.max},
      ${payload.oha.rps.min},
      ${payload.oha.rps.percentiles.p50},
      ${payload.oha.rps.percentiles.p75},
      ${payload.oha.rps.percentiles.p90},
      ${payload.oha.rps.percentiles.p95},
      ${payload.oha.rps.percentiles.p99},
      ${payload.oha.details.DNSDialup.average},
      ${payload.oha.details.DNSDialup.fastest},
      ${payload.oha.details.DNSDialup.slowest},
      ${payload.oha.details.DNSLookup.average},
      ${payload.oha.details.DNSLookup.fastest},
      ${payload.oha.details.DNSLookup.slowest},
      ${payload.oha.statusCodeDistribution['200'] ?? 0},
      ${errorCount},
      ${errorTypes}
    )
    RETURNING *
  `

  return metrics
}

export async function saveUploadResult(
  payload: UploadPayload
): Promise<{ machine: Machine; result: TestResult; metrics: ResultMetrics }> {
  const machine = await findOrCreateMachine(payload.machine)
  const result = await createTestResult(
    machine.machine_id,
    payload.language,
    payload.framework,
    payload.testId,
    payload.endpoint,
    payload.timestamp
  )
  const metrics = await createResultMetrics(result.result_id, payload)

  return { machine, result, metrics }
}

export async function getResults(filters: ResultFilters): Promise<FullResult[]> {
  const language = filters.language?.length ? filters.language.join(',') : null
  const framework = filters.framework?.length ? filters.framework.join(',') : null
  const testIds = filters.test_ids?.length ? filters.test_ids.join(',') : null
  const platform = filters.platform ?? null
  const minCores = filters.min_cores ?? null
  const maxCores = filters.max_cores ?? null
  const minThreads = filters.min_threads ?? null
  const maxThreads = filters.max_threads ?? null
  const minRam = filters.min_ram ?? null
  const maxRam = filters.max_ram ?? null
  const limit = typeof filters.limit === 'number' ? filters.limit : 100
  const offset = typeof filters.offset === 'number' ? filters.offset : 0

  const rows = await sql<FullResultRow[]>`
    SELECT
      tr.result_id,
      tr.machine_id,
      tr.language,
      tr.framework,
      tr.test_id,
      tr.endpoint,
      tr.timestamp,
      tr.created_at,
      rm.metric_id,
      rm.success_rate,
      rm.total_time,
      rm.slowest,
      rm.fastest,
      rm.average,
      rm.requests_per_sec,
      rm.total_data,
      rm.size_per_request,
      rm.size_per_sec,
      rm.latency_p50,
      rm.latency_p75,
      rm.latency_p90,
      rm.latency_p95,
      rm.latency_p99,
      rm.rps_mean,
      rm.rps_stddev,
      rm.rps_max,
      rm.rps_min,
      rm.rps_p50,
      rm.rps_p75,
      rm.rps_p90,
      rm.rps_p95,
      rm.rps_p99,
      rm.dns_dialup_avg,
      rm.dns_dialup_fastest,
      rm.dns_dialup_slowest,
      rm.dns_lookup_avg,
      rm.dns_lookup_fastest,
      rm.dns_lookup_slowest,
      rm.status_200_count,
      rm.error_count,
      rm.error_types,
      m.cpu_model,
      m.cpu_cores,
      m.cpu_threads,
      m.cpu_speed_ghz,
      m.ram_gb,
      m.platform,
      m.created_at AS machine_created_at
    FROM test_results tr
    JOIN result_metrics rm ON rm.result_id = tr.result_id
    JOIN machines m ON m.machine_id = tr.machine_id
      AND (${language}::text IS NULL OR tr.language = ANY(string_to_array(${language}, ${','})::text[]))
      AND (${framework}::text IS NULL OR tr.framework = ANY(string_to_array(${framework}, ${','})::text[]))
      AND (${testIds}::text IS NULL OR tr.test_id = ANY(string_to_array(${testIds}, ${','})::text[]))
      AND (${platform}::text IS NULL OR m.platform = ${platform})
      AND (${minCores}::int IS NULL OR m.cpu_cores >= ${minCores})
      AND (${maxCores}::int IS NULL OR m.cpu_cores <= ${maxCores})
      AND (${minThreads}::int IS NULL OR m.cpu_threads >= ${minThreads})
      AND (${maxThreads}::int IS NULL OR m.cpu_threads <= ${maxThreads})
      AND (${minRam}::int IS NULL OR m.ram_gb >= ${minRam})
      AND (${maxRam}::int IS NULL OR m.ram_gb <= ${maxRam})
    ORDER BY tr.timestamp DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  return rows.map((row) => ({
    result_id: row.result_id,
    machine_id: row.machine_id,
    language: row.language,
    framework: row.framework,
    test_id: row.test_id,
    endpoint: row.endpoint,
    timestamp: Number(row.timestamp),
    created_at: row.created_at,
    machine: {
      machine_id: row.machine_id,
      cpu_model: row.cpu_model,
      cpu_cores: Number(row.cpu_cores),
      cpu_threads: Number(row.cpu_threads),
      cpu_speed_ghz: Number(row.cpu_speed_ghz),
      ram_gb: Number(row.ram_gb),
      platform: row.platform,
      created_at: row.machine_created_at,
    },
    metrics: {
      metric_id: row.metric_id,
      result_id: row.result_id,
      success_rate: Number(row.success_rate),
      total_time: Number(row.total_time),
      slowest: Number(row.slowest),
      fastest: Number(row.fastest),
      average: Number(row.average),
      requests_per_sec: Number(row.requests_per_sec),
      total_data: Number(row.total_data),
      size_per_request: Number(row.size_per_request),
      size_per_sec: Number(row.size_per_sec),
      latency_p50: Number(row.latency_p50),
      latency_p75: Number(row.latency_p75),
      latency_p90: Number(row.latency_p90),
      latency_p95: Number(row.latency_p95),
      latency_p99: Number(row.latency_p99),
      rps_mean: Number(row.rps_mean),
      rps_stddev: Number(row.rps_stddev),
      rps_max: Number(row.rps_max),
      rps_min: Number(row.rps_min),
      rps_p50: Number(row.rps_p50),
      rps_p75: Number(row.rps_p75),
      rps_p90: Number(row.rps_p90),
      rps_p95: Number(row.rps_p95),
      rps_p99: Number(row.rps_p99),
      dns_dialup_avg: Number(row.dns_dialup_avg),
      dns_dialup_fastest: Number(row.dns_dialup_fastest),
      dns_dialup_slowest: Number(row.dns_dialup_slowest),
      dns_lookup_avg: Number(row.dns_lookup_avg),
      dns_lookup_fastest: Number(row.dns_lookup_fastest),
      dns_lookup_slowest: Number(row.dns_lookup_slowest),
      status_200_count: Number(row.status_200_count),
      error_count: Number(row.error_count),
      error_types: row.error_types ?? undefined,
    },
  }))
}

export interface FilterOptions {
  languages: string[]
  testIds: string[]
  frameworks: { language: string; framework: string }[]
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const pairs = await sql<{ language: string; framework: string }[]>`
    SELECT DISTINCT language, framework
    FROM test_results
    ORDER BY language, framework
  `
  const testIds = await sql<{ test_id: string }[]>`
    SELECT DISTINCT test_id
    FROM test_results
    ORDER BY test_id
  `

  return {
    languages: [...new Set(pairs.map((pair) => pair.language))],
    frameworks: pairs,
    testIds: testIds.map((row) => row.test_id),
  }
}
