import type { Platform } from '@/server/upload-schema'

export interface Machine {
  machine_id: string
  cpu_model: string
  cpu_cores: number
  cpu_threads: number
  cpu_speed_ghz: number
  ram_gb: number
  platform: Platform
  created_at: string
}

export interface TestResult {
  result_id: string
  machine_id: string
  language: string
  framework: string
  test_id: string
  endpoint: string
  timestamp: number
  created_at: string
}

export interface ResultMetrics {
  metric_id: string
  result_id: string

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
  error_types?: string
}

export interface FullResult extends TestResult {
  metrics: ResultMetrics
  machine: Machine
}
