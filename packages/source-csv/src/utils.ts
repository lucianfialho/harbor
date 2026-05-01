import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { resolve, isAbsolute } from "node:path"

/** Reject path traversal attempts and return an absolute path. */
export function safePath(p: string): string {
  const abs = isAbsolute(p) ? p : resolve(process.cwd(), p)
  if (abs.includes("..")) throw new Error(`Path traversal rejected: ${p}`)
  return abs
}

/** Count non-empty lines in a file (for JSONL: total records; for CSV: subtract 1 for header). */
export async function countNonEmptyLines(path: string): Promise<number> {
  let count = 0
  const rl = createInterface({ input: createReadStream(safePath(path)), crlfDelay: Infinity })
  for await (const line of rl) {
    if (line.trim().length > 0) count++
  }
  return count
}
