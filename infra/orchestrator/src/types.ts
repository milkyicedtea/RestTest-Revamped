export type Platform = "linux" | "windows" | "macos" | "unknown"

export interface MachineInput {
  cpu_model: string
  cpu_cores: number
  cpu_threads: number
  cpu_speed_ghz: number
  ram_gb: number
  platform: Platform
}

export interface WrappedResult {
  language: string
  framework: string
  testId: string
  endpoint: string
  timestamp: number
  oha: {
    summary: {
      successRate: number
      total: number
      slowest: number
      fastest: number
      average: number
      requestsPerSec: number
      totalData: number
      sizePerRequest: number
      sizePerSec: number
    }
    latencyPercentiles: {
      p50: number
      p75: number
      p90: number
      p95: number
      p99: number
    }
    rps: {
      mean: number
      stddev: number
      max: number
      min: number
      percentiles: {
        p50: number
        p75: number
        p90: number
        p95: number
        p99: number
      }
    }
    details: {
      DNSDialup: {
        average: number
        fastest: number
        slowest: number
      }
      DNSLookup: {
        average: number
        fastest: number
        slowest: number
      }
    }
    statusCodeDistribution: Record<string, number>
    errorDistribution?: Record<string, number>
  }
}

export interface UploadPayload extends WrappedResult {
  machine: MachineInput
}

export interface UploadSessionOptions {
  enabled: boolean
  displayApiUrl?: string
  machine?: MachineInput
}
