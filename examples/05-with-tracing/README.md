# Example 05: Observability with Effect.fn

**Pattern**: Effect.fn spans → OTel layer → any trace backend

Harbor uses `Effect.fn("harbor/Module.operation")` on every critical operation. This example shows how to connect those spans to a real trace backend — no `@opentelemetry/*` packages needed.

## How it works

```
Effect.fn("harbor/HubSpotContacts.batchUpsert")
  → creates a span automatically
    → Otlp.layer sends it to your collector
      → visible in Jaeger / Honeycomb / Datadog / Tempo
```

## Run it

```bash
# Console mode — no backend needed, spans printed to stdout
bun run examples/05-with-tracing/run.ts

# With a local Jaeger
docker run -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one
OTLP_ENDPOINT=http://localhost:4318 bun run examples/05-with-tracing/run.ts
open http://localhost:16686   # Jaeger UI

# With Honeycomb
OTLP_ENDPOINT=https://api.honeycomb.io \
HONEYCOMB_API_KEY=your-key \
bun run examples/05-with-tracing/run.ts
```

## Connecting your real Harbor pipeline

```typescript
import { Effect, Layer } from "effect"
import { Otlp } from "effect/unstable/observability"
import { FetchHttpClient } from "effect/unstable/http"

const OtlpLayer = Otlp.layer({
  baseUrl:  "http://localhost:4318",
  resource: { serviceName: "harbor-migration" },
}).pipe(Layer.provide(FetchHttpClient.layer))

// Your pipeline — unchanged
const program = Effect.gen(function*() {
  const source = CsvSource({ path: "contacts.csv", schema: ContactSchema })
  const dest   = ContactsDestination({ token: process.env.HUBSPOT_TOKEN! })
  return yield* dest.write(source.stream.pipe(Stream.map(transform)))
})

// Just add .provide(OtlpLayer) — every Effect.fn span starts flowing
Effect.runPromise(program.pipe(Effect.provide(OtlpLayer)))
```

## What you see in traces

```
harbor/ContactsDestination.write ──────── 8.4s
  ├─ harbor/HubSpotContacts.batchUpsert ─ 1.2s   batch 1
  │    └─ retry (429) ─────────────────── 0.3s
  ├─ harbor/HubSpotContacts.batchUpsert ─ 0.9s   batch 2
  └─ harbor/HubSpotContacts.batchUpsert ─ 1.1s   batch 3

harbor/LocalStage.write ─────────────── 38ms
harbor/CsvSource.count ─────────────── 2ms
```

## No external packages needed

Effect v4 ships OTel natively via `effect/unstable/observability`.
`@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http` etc. are NOT required.
