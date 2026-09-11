import type { UploadPayload } from "@/types"

export async function uploadResult(payload: UploadPayload, displayApiUrl: string): Promise<void> {
  const response = await fetch(`${displayApiUrl.replace(/\/$/, "")}/api/results`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Upload failed (${response.status}): ${text}`)
  }
}
