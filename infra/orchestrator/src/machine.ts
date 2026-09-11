import { readFileSync } from "fs"
import { cpus, totalmem } from "os"
import { text, isCancel, confirm } from "@clack/prompts"
import type { MachineInput, Platform } from "@/types"

function normalizePlatform(platform: NodeJS.Platform): Platform {
  if (platform === "win32") return "windows"
  if (platform === "darwin") return "macos"
  if (platform === "linux") return "linux"
  return "unknown"
}

function detectCpuModel(): string {
  const model = cpus()[0]?.model?.trim() ?? ""
  return model.length > 0 ? model : "Unknown CPU"
}

function detectLinuxPhysicalCores(): number | null {
  try {
    const cpuInfo = readFileSync("/proc/cpuinfo", "utf-8")
    const blocks = cpuInfo.split("\n\n").map((block) => block.trim()).filter((block) => block.length > 0)

    const physicalCoreIds = new Set<string>()

    for (const block of blocks) {
      const physicalId = block.match(/^physical id\s*:\s*(\d+)$/m)?.[1]
      const coreId = block.match(/^core id\s*:\s*(\d+)$/m)?.[1]

      if (physicalId && coreId) {
        physicalCoreIds.add(`${physicalId}:${coreId}`)
      }
    }

    if (physicalCoreIds.size > 0) {
      return physicalCoreIds.size
    }

    const cpuCores = Number(cpuInfo.match(/^cpu cores\s*:\s*(\d+)$/m)?.[1] ?? "0")
    const sockets = new Set(Array.from(cpuInfo.matchAll(/^physical id\s*:\s*(\d+)$/gm), (match) => match[1])).size

    if (Number.isFinite(cpuCores) && cpuCores > 0) {
      return sockets > 0 ? cpuCores * sockets : cpuCores
    }

    return null
  } catch {
    return null
  }
}

function detectCpuCores(): number {
  if (process.platform === "linux") {
    const linuxCores = detectLinuxPhysicalCores()
    if (linuxCores && linuxCores > 0) {
      return linuxCores
    }
  }

  return cpus().length
}

function detectCpuThreads(): number {
  return cpus().length
}

function detectCpuSpeedGhz(): number {
  const speedMhz = cpus()[0]?.speed ?? 0
  const speedGhz = speedMhz / 1000
  return Number(speedGhz.toFixed(2))
}

function detectRamGb(): number {
  const gb = totalmem() / 1024 / 1024 / 1024
  return Math.max(1, Math.round(gb))
}

async function askString(message: string, initialValue: string): Promise<string> {
  const value = await text({ message, initialValue })

  if (isCancel(value)) {
    throw new Error("Input cancelled")
  }

  return value.trim().length > 0 ? value : initialValue
}

async function askNumber(message: string, initialValue: number): Promise<number> {
  const value = await text({ message, initialValue: String(initialValue) })

  if (isCancel(value)) {
    throw new Error("Input cancelled")
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return initialValue
  }

  return parsed
}

async function askPlatform(initialValue: Platform): Promise<Platform> {
  const value = await text({
    message: "Platform (linux/windows/macos/unknown)",
    initialValue
  })

  if (isCancel(value)) {
    throw new Error("Input cancelled")
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === "linux" || normalized === "windows" || normalized === "macos" || normalized === "unknown") {
    return normalized
  }

  return initialValue
}

export async function resolveMachineInput(): Promise<MachineInput> {
  const autoDetected: MachineInput = {
    cpu_model: detectCpuModel(),
    cpu_cores: detectCpuCores(),
    cpu_threads: detectCpuThreads(),
    cpu_speed_ghz: detectCpuSpeedGhz(),
    ram_gb: detectRamGb(),
    platform: normalizePlatform(process.platform)
  }

  const useDetected = await confirm({
    message: `Use detected machine specs? (${autoDetected.cpu_model}, ${autoDetected.cpu_cores} cores, ${autoDetected.cpu_threads} threads, ${autoDetected.ram_gb}GB RAM, ${autoDetected.platform})`,
    initialValue: true
  })

  if (isCancel(useDetected)) {
    throw new Error("Input cancelled")
  }

  if (useDetected) {
    return autoDetected
  }

  return {
    cpu_model: await askString("CPU model", autoDetected.cpu_model),
    cpu_cores: await askNumber("CPU cores", autoDetected.cpu_cores),
    cpu_threads: await askNumber("CPU threads", autoDetected.cpu_threads),
    cpu_speed_ghz: await askNumber("CPU speed in GHz", autoDetected.cpu_speed_ghz),
    ram_gb: await askNumber("RAM in GB", autoDetected.ram_gb),
    platform: await askPlatform(autoDetected.platform)
  }
}
