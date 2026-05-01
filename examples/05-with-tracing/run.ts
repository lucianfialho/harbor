/**
 * Example 05: Observability with Effect's built-in OTel
 *
 * Effect.fn("harbor/...") creates spans automatically.
 * This example shows how to connect those spans to a trace backend.
 *
 * No @opentelemetry/* packages needed — Effect v4 includes OTel natively.
 *
 * Usage:
 *   # Terminal mode (prints spans to console)
 *   bun run examples/05-with-tracing/run.ts
 *
 *   # With collector (Jaeger, Tempo, Honeycomb, Datadog...)
 *   OTLP_ENDPOINT=http://localhost:4318 bun run examples/05-with-tracing/run.ts
 */
import { Effect, Layer, Stream } from "effect"
import { Otlp } from "effect/unstable/observability"
import { FetchHttpClient } from "effect/unstable/http"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { join } from "node:path"

// ── Minimal pipeline (same as example 01) ─────────────────────────────────────

async function* readCsvLines(path: string): AsyncGenerator<unknown> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  let header: string[] | null = null
  for await (const line of rl) {
    if (!header) { header = line.split(","); continue }
    const vals = line.split(",")
    yield Object.fromEntries(header.map((h, i) => [h.trim(), vals[i]?.trim() ?? ""]))
  }
}

const csvPath = join(import.meta.dirname, "..", "01-csv-to-hubspot", "contacts.csv")

const pipeline = Effect.gen(function*() {
  const stream = Stream.fromAsyncIterable(readCsvLines(csvPath), (e) => e).pipe(
    Stream.withSpan("harbor/examples/CsvRead"),   // explicit span on the stream
    Stream.map((row) => row)
  )
  const count = yield* Stream.runCount(stream)
  yield* Effect.log(`Processed ${count} contacts`)
  return { count }
}).pipe(
  Effect.withSpan("harbor/examples/Pipeline", {   // top-level pipeline span
    attributes: { "harbor.source": "contacts.csv" }
  })
)

// ── OTel layer ────────────────────────────────────────────────────────────────

const endpoint = process.env["OTLP_ENDPOINT"]

const OtlpLayer = endpoint
  ? Otlp.layer({
      baseUrl:  endpoint,
      resource: {
        serviceName:    "harbor-migration",
        serviceVersion: "0.0.1",
      },
    }).pipe(Layer.provide(FetchHttpClient.layer))
  : Layer.empty  // no-op when no endpoint — spans still created, just not exported

// ── Run ───────────────────────────────────────────────────────────────────────

const mode = endpoint ? `OTLP → ${endpoint}` : "console (set OTLP_ENDPOINT to export)"
console.log(`Tracing mode: ${mode}`)

Effect.runPromise(
  pipeline.pipe(Effect.provide(OtlpLayer))
).then(({ count }) => {
  console.log(`Done: ${count} contacts`)
  console.log(endpoint ? `Traces exported to ${endpoint}` : "Run with OTLP_ENDPOINT=http://localhost:4318 to send to collector")
}).catch(console.error)
