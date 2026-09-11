import { multiselect, select, isCancel, text } from "@clack/prompts"
import type { Config, ResolvedFramewrok } from "@/config"
import type { UploadSessionOptions } from "@/types"
import { resolveMachineInput } from "@/machine"

export async function chooseFramework(config: Config): Promise<Array<ResolvedFramewrok>> {
  // flatten while keeping language name
  const flat: Array<ResolvedFramewrok> = config.langauges.flatMap(lang => 
    lang.frameworks.map(fw => ({ ...fw, language: lang.name }))
  )
  
  const mode = await select({
    message: "Do you want to run all APIs or choose?",
    options: [
      { label: "Run all", value: "all" },
      { label: "Let me choose", value: "choose" }
    ]
  })
  
  if (mode === "all") {
    return flat
  }
  
  const choices = await multiselect({
    message: "Select APIs to benchmark",
    options: flat.map((f) => ({
      label: `${f.language}/${f.name}`,
      value: f
    }))
  })
  
  if (typeof choices === "symbol") {
    throw new Error("Selection cancelled")
  }

  return choices
}

export async function chooseUploadOptions(): Promise<UploadSessionOptions> {
  const mode = await select({
    message: "Upload each result to display API?",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" }
    ]
  })

  if (isCancel(mode) || mode === "no") {
    return { enabled: false }
  }

  const displayApiUrl = await text({
    message: "Display API URL",
    placeholder: "http://localhost:4000",
    initialValue: process.env.DISPLAY_API_URL ?? "http://localhost:4000"
  })

  if (isCancel(displayApiUrl)) {
    throw new Error("Selection cancelled")
  }

  const machine = await resolveMachineInput()

  return {
    enabled: true,
    displayApiUrl: displayApiUrl.trim(),
    machine
  }
}
