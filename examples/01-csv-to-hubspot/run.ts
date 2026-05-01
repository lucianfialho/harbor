/**
 * Example 01: CSV → HubSpot (simulação de migração real)
 *
 * Usa os packages @harbor/* com Context.Service + Layer:
 *   - CsvFiles.layer     → lê CSV do filesystem real
 *   - HubSpotContacts.fake() → simula upsert sem chamar HubSpot
 *   - HubSpotContacts.live() → upsert real no HubSpot
 *
 *   bun run examples/01-csv-to-hubspot/run.ts --dry-run
 *   HUBSPOT_TOKEN=pat-xxx bun run examples/01-csv-to-hubspot/run.ts
 */
import { Effect, Layer, Schema, Stream } from "effect"
import { CsvSource, CsvFiles } from "@harbor/source-csv"
import { ContactsDestination, HubSpotContacts, type HubSpotContact } from "@harbor/destination-hubspot"
import { join } from "node:path"

// Schema dos campos do CSV
const ContactRow = Schema.Struct({
  email:   Schema.String,
  name:    Schema.String,
  phone:   Schema.optional(Schema.String),
  company: Schema.optional(Schema.String),
})

// Transform: CSV → HubSpotContact (split name → firstname + lastname)
function transform(row: typeof ContactRow.Type): HubSpotContact {
  const [firstname = "", ...rest] = row.name.trim().split(" ")
  return { email: row.email.toLowerCase(), firstname, lastname: rest.join(" "), phone: row.phone, company: row.company }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

const dryRun = process.argv.includes("--dry-run")
const token  = process.env["HUBSPOT_TOKEN"] ?? ""

if (!dryRun && !token) { console.error("Set HUBSPOT_TOKEN or use --dry-run"); process.exit(1) }

const csvPath = join(import.meta.dirname, "contacts.csv")
const config  = { token, baseUrl: "https://api.hubapi.com" }

const source = CsvSource({ path: csvPath, schema: ContactRow })
const dest   = ContactsDestination(config)

// O pipeline: source.stream → transform → dest.write
const program = Effect.gen(function*() {
  const total = yield* source.count
  console.log(`Found ${total} contacts in CSV`)

  const result = yield* dest.write(source.stream.pipe(Stream.map(transform)))
  return result
})

// Layers: CsvFiles.layer lê o filesystem, HubSpotContacts controla onde vai
const layers = Layer.merge(
  CsvFiles.layer,
  dryRun ? HubSpotContacts.fake() : HubSpotContacts.live(config)
)

console.log(`Mode: ${dryRun ? "dry-run (no HubSpot calls)" : "live → HubSpot"}`)

Effect.runPromise(
  program.pipe(Effect.provide(layers), Effect.orDie)
).then(({ ok, errors }) => {
  console.log(`Done: ${ok} ok, ${errors} errors`)
}).catch(console.error)
