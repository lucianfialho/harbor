/**
 * Example 04: Custom Transform with Typed Errors
 *
 * Shows field mapping, normalization, and typed errors in a pipeline.
 * In your project: use @harbor/core TransformError, @harbor/source-csv
 *
 *   bun run examples/04-custom-transform/run.ts
 */
import { Data, Effect, Stream } from "effect"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { join } from "node:path"

// Typed transform error — mirrors @harbor/core TransformError
class TransformError extends Data.TaggedError("TransformError")<{
  recordId: string
  reason:   string
}> {}

interface HubSpotContact {
  email:          string
  firstname:      string
  lastname:       string
  phone?:         string
  lifecyclestage: string
}

const LIFECYCLE: Record<string, string> = {
  Lead: "lead", Qualificado: "marketingqualifiedlead",
  Oportunidade: "opportunity", Cliente: "customer",
}

function transform(row: Record<string, string>): Effect.Effect<HubSpotContact, TransformError> {
  if (!row["email"]?.includes("@"))
    return Effect.fail(new TransformError({ recordId: row["email"] ?? "?", reason: "invalid email" }))

  const [firstname = "", ...rest] = (row["name"] ?? "").trim().split(" ")
  const digits = (row["phone"] ?? "").replace(/\D/g, "")

  return Effect.succeed({
    email:          row["email"].toLowerCase(),
    firstname,
    lastname:       rest.join(" "),
    phone:          digits ? `+55${digits.replace(/^55/, "")}` : undefined,
    lifecyclestage: LIFECYCLE[row["estagio"] ?? ""] ?? "lead",
  })
}

async function* readCsv(path: string): AsyncGenerator<Record<string, string>> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  let header: string[] | null = null
  for await (const line of rl) {
    if (!header) { header = line.split(",").map((h) => h.trim()); continue }
    const vals = line.split(",")
    yield Object.fromEntries(header.map((h, i) => [h, vals[i]?.trim() ?? ""]))
  }
}

const csvPath = join(import.meta.dirname, "..", "01-csv-to-hubspot", "contacts.csv")

const program = Effect.gen(function*() {
  let ok = 0, errors = 0

  yield* Stream.fromAsyncIterable(readCsv(csvPath), (e) => e).pipe(
    Stream.mapEffect(transform),
    Stream.tap((c) => Effect.sync(() => { console.log(`✓ ${c.email} → ${c.lifecyclestage}`); ok++ })),
    Stream.catchCause((cause) => {
      const e = cause.failures?.[0] as TransformError | undefined
      errors++; console.log(`✗ ${e?.recordId ?? "?"}: ${e?.reason ?? cause}`); return Stream.empty
    }),
    Stream.runDrain
  )

  console.log(`\nDone: ok=${ok} errors=${errors}`)
})

Effect.runPromise(Effect.orDie(program)).catch(console.error)
