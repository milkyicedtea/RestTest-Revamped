import { mkdirSync, existsSync } from "fs"
import type { ResolvedFramewrok } from "@/config"
import { runOha } from "@/oha"
import { wrapResult } from "@/formatter"
import { uploadResult } from "@/upload"
import type { UploadSessionOptions } from "@/types"

export async function runFramework(framework: ResolvedFramewrok, uploadOptions: UploadSessionOptions): Promise<void> {
  for (const t of framework.tests) {
    if (!existsSync("../results")) mkdirSync("../results", { recursive: true })

    const url = `http://${framework.container}:${framework.port}${t.endpoint}`
    const tempHost = `../results/oha_${framework.language}_${framework.name}_${t.id}.json`
    const tempContainer = `/app/results/oha_${framework.language}_${framework.name}_${t.id}.json`

    console.log(`Running ${framework.language}/${framework.name} -> ${t.id}`)

    await runOha(url, tempContainer)

    const wrapped = wrapResult(framework.language, framework.name, t.id, t.endpoint, tempHost)

    if (uploadOptions.enabled && uploadOptions.displayApiUrl && uploadOptions.machine) {
      await uploadResult({ ...wrapped, machine: uploadOptions.machine }, uploadOptions.displayApiUrl)
      console.log(`Uploaded ${framework.language}/${framework.name} -> ${t.id}`)
    }
  }
}
