import { spawn } from "child_process"

export function runOha(url: string, outfile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `oha --output-format json -z 10s ${url} -o ${outfile}`
    
    const proc = spawn(
      'docker',
      [
        "exec",
        "infra-oha-1", // container name
        "sh", // run a shell
        "-c", // pass command as string
        command
      ],
      { stdio: "inherit"}
    )
    
    proc.on("error", (error: Error) => {
      reject(error)
    })

    proc.on("close", (code: number | null) => {
      if (code === 0) resolve()
      else reject(new Error(`Oha failed with exit code ${code ?? "unknown"}`))
    })
  })
}
