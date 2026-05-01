/**
 * Example 01: CSV → HubSpot
 *
 * In your project: import { CsvSource } from "@harbor/source-csv"
 * This example shows the same pattern inline for clarity.
 *
 *   bun run examples/01-csv-to-hubspot/run.ts --dry-run
 *   HUBSPOT_TOKEN=pat-xxx bun run examples/01-csv-to-hubspot/run.ts
 */
import { Effect, Schema, Stream } from "effect"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { join } from "node:path"

const ContactRow = Schema.Struct({
  email:   Schema.String,
  name:    Schema.String,
  phone:   Schema.optional(Schema.String),
  company: Schema.optional(Schema.String),
})

async function* readCsvLines(path: string): AsyncGenerator<unknown> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  let header: string[] | null = null
  for await (const line of rl) {
    if (!header) { header = line.split(","); continue }
    const vals = line.split(",")
    yield Object.fromEntries(header.map((h, i) => [h.trim(), vals[i]?.trim() ?? ""]))
  }
}

const decode = Schema.decodeUnknownSync(ContactRow)

const dryRun = process.argv.includes("--dry-run")
const token  = process.env["HUBSPOT_TOKEN"] ?? ""

if (!dryRun && !token) { console.error("Set HUBSPOT_TOKEN or --dry-run"); process.exit(1) }

const program = Effect.gen(function*() {
  const csvPath = join(import.meta.dirname, "contacts.csv")

  const stream = Stream.fromAsyncIterable(readCsvLines(csvPath), (e) => e).pipe(
    Stream.map((row) => { try { return decode(row) } catch { return null } }),
    Stream.filter((v) => v !== null)
  )

  const records = yield* Stream.runCollect(stream)
  console.log(`Found ${records.length} contacts`)

  if (dryRun) {
    records.forEach((c) => console.log(`  → ${c.email}`))
    console.log(`Dry-run: would upsert ${records.length} contacts`)
    return { ok: 0, errors: 0 }
  }

  // Batch upsert to HubSpot
  const batches = []
  for (let i = 0; i < records.length; i += 100) batches.push(records.slice(i, i + 100))
  let ok = 0
  for (const batch of batches) {
    const inputs = batch.map((c) => {
      const [firstname, ...rest] = c.name.split(" ")
      return { id: c.email, idProperty: "email", properties: { email: c.email, firstname, lastname: rest.join(" "), phone: c.phone, company: c.company } }
    })
    const res = yield* Effect.tryPromise(() => fetch(`https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs }),
    }))
    ok += batch.length
    console.log(`Batch ${batches.indexOf(batch) + 1}/${batches.length}: ${res.status}`)
  }
  return { ok, errors: 0 }
})

Effect.runPromise(Effect.orDie(program)).then(({ ok, errors }) => {
  console.log(`Done: ok=${ok} errors=${errors}`)
}).catch(console.error)
