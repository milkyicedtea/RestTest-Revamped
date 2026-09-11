import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import type { WrappedResult } from "@/types"

export function wrapResult(
  language: string,
  framework: string,
  testId: string,
  endpoint: string,
  outfile: string
): WrappedResult {
  const raw = readFileSync(outfile, "utf-8")

  const wrapped: WrappedResult = {
    language,
    framework,
    testId,
    endpoint,
    timestamp: Date.now(),
    oha: JSON.parse(raw)
  }

  const dir = `../results/${language}/${framework}`
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const out = `${dir}/${testId}.json`
  writeFileSync(out, JSON.stringify(wrapped, null, 2))

  return wrapped
}
