import { config } from "@/config"
import { chooseFramework, chooseUploadOptions } from "@/prompts"
import { runFramework } from "@/runner"

async function main(): Promise<void> {
  const frameworks = await chooseFramework(config)
  const uploadOptions = await chooseUploadOptions()

  for (const f of frameworks) {
    await runFramework(f, uploadOptions)
  }

  console.log("All benchmarks completed")
}

main()
