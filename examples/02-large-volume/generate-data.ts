/**
 * Generates N fake contacts as a JSONL file for large-volume testing.
 * Usage: bun run examples/02-large-volume/generate-data.ts [count]
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"

const count  = parseInt(process.argv[2] ?? "1000", 10)
const outPath = join(import.meta.dirname, "generated.jsonl")

const lines = Array.from({ length: count }, (_, i) => JSON.stringify({
  email:     `contact${i}@harbor-example.com`,
  firstname: `User`,
  lastname:  `${i}`,
  phone:     `+551199${String(i).padStart(7, "0")}`,
  company:   `Company ${Math.floor(i / 10)}`,
}))

writeFileSync(outPath, lines.join("\n") + "\n", "utf-8")
console.log(`Generated ${count} contacts → ${outPath}`)
