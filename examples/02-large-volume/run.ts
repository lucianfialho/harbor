/**
 * Example 02: Large-Volume with Staging
 *
 * Pattern: Source → Stage → Destination
 * In your project: @harbor/stage-local + @harbor/source-csv
 *
 *   bun run examples/02-large-volume/generate-data.ts 5000
 *   bun run examples/02-large-volume/run.ts --dry-run
 */
import { Effect, Stream } from "effect"
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { join } from "node:path"

const dir      = import.meta.dirname
const stageDir = join(dir, ".stage")
const stageKey = `contacts-${new Date().toISOString().split("T")[0]}`
const jsonlPath    = join(stageDir, `${stageKey}.jsonl`)
const manifestPath = join(stageDir, `${stageKey}.json`)
const sourcePath   = join(dir, "generated.jsonl")

const dryRun = process.argv.includes("--dry-run")
const token  = process.env["HUBSPOT_TOKEN"] ?? ""
if (!dryRun && !token) { console.error("Set HUBSPOT_TOKEN or --dry-run"); process.exit(1) }

function lineStream(path: string) {
  async function* lines() {
    const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
    try { for await (const l of rl) { if (l.trim()) yield l.trim() } } finally { rl.close() }
  }
  return Stream.fromAsyncIterable(lines(), (e) => e as Error)
}

const program = Effect.gen(function*() {
  yield* Effect.promise(() => mkdir(stageDir, { recursive: true }))
  const staged = yield* Effect.promise(() => stat(jsonlPath).then(() => true).catch(() => false))

  if (!staged) {
    console.log("Writing to stage...")
    const count = yield* lineStream(sourcePath).pipe(
      Stream.mapEffect((line) => Effect.promise(() => appendFile(jsonlPath, line + "\n", "utf-8").then(() => 1))),
      Stream.runFold(() => 0, (acc: number, n: number) => acc + n)
    )
    yield* Effect.promise(() => writeFile(manifestPath, JSON.stringify({ total: count, key: stageKey })))
    console.log(`Staged ${count} records`)
  } else {
    const manifest = JSON.parse(yield* Effect.promise(() => readFile(manifestPath, "utf-8")))
    console.log(`Resuming from stage: ${manifest.total} records`)
  }

  if (dryRun) {
    const count = yield* Stream.runCount(lineStream(jsonlPath))
    console.log(`Dry-run: would upsert ${count} contacts from stage`); return
  }

  let ok = 0
  yield* lineStream(jsonlPath).pipe(
    Stream.map((line) => JSON.parse(line) as Record<string, string>),
    Stream.grouped(100),
    Stream.mapEffect((batch) =>
      Effect.promise(() => fetch(`https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: batch.map((c) => ({ id: c["email"], idProperty: "email", properties: c })) }),
      }).then(() => { ok += batch.length; process.stdout.write(`\r${ok} sent`) }))
    ),
    Stream.runDrain
  )
  console.log(`\nDone: ${ok} contacts upserted`)
})

Effect.runPromise(Effect.orDie(program)).catch(console.error)
