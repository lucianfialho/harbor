<p align="center">
  <img src="assets/logo.png" alt="Harbor" width="180" />
</p>

<h1 align="center">Harbor</h1>

<p align="center">
  Type-safe data pipeline framework — <strong>Source → Stage → Destination</strong>, powered by Effect
</p>

<p align="center">
  <a href="https://github.com/lucianfialho/harbor/stargazers">
    <img src="https://img.shields.io/github/stars/lucianfialho/harbor?style=social" alt="Stars" />
  </a>
  <img src="https://img.shields.io/badge/Effect-v4-blueviolet" alt="Effect v4" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Bun-1.2-black" alt="Bun" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
</p>

---

## What it looks like

```typescript
import { Effect, Stream } from "effect"
import { CsvSource }           from "@harbor/source-csv"
import { ContactsDestination } from "@harbor/destination-hubspot"

const program = Effect.gen(function*() {
  const source = CsvSource({ path: "contacts.csv", schema: ContactSchema })
  const dest   = ContactsDestination({ token: process.env.HUBSPOT_TOKEN! })

  // Streams line-by-line — 30M records, no memory issues
  return yield* dest.write(source.stream.pipe(Stream.map(transform)))

})

Effect.runPromise(Effect.orDie(program))
  .then(({ ok, errors }) => console.log(`Done: ${ok} ok, ${errors} errors`))
```

That's the whole pipeline. Records flow through `transform` and into `dest.write` one batch at a time — never all in memory at once.

### Testing without filesystem or HTTP

Every source and destination accepts an optional injectable capability:

```typescript
import { fakeCsvFiles }        from "@harbor/source-csv"
import { fakeHubSpotContacts } from "@harbor/destination-hubspot"

it("migrates contacts", async () => {
  const source = CsvSource({
    path:   "ignored.csv",
    schema: ContactSchema,
    files:  fakeCsvFiles([{ email: "a@b.com", name: "Ana" }]),  // ← no disk I/O
  })
  const dest = ContactsDestination(
    { token: "ignored", baseUrl: "ignored" },
    fakeHubSpotContacts()  // ← no HTTP calls
  )

  const result = await Effect.runPromise(dest.write(source.stream.pipe(Stream.map(transform))))
  expect(result.ok).toBe(1)
})
```

---

## Getting Started

```bash
git clone https://github.com/lucianfialho/harbor
cd harbor && bun install

# Run the first example — no HubSpot token needed
cd examples
bun run 01-csv-to-hubspot/run.ts --dry-run
```

---

## Examples

| Example | What it teaches |
|---------|----------------|
| [01-csv-to-hubspot](examples/01-csv-to-hubspot/) | Core pattern: Source → transform → Destination |
| [02-large-volume](examples/02-large-volume/) | Stage pattern: resume after failure, no re-extraction |
| [03-openapi-source](examples/03-openapi-source/) | Coming soon: any OpenAPI spec as a Source |
| [04-custom-transform](examples/04-custom-transform/) | Typed errors, lifecycle stage mapping, field normalization |

---

## The pattern

```
Source  →  [Stage]  →  Destination
```

| Piece | What it does |
|-------|-------------|
| **Source** | Streams records from any external system |
| **Stage** | Persists records between Extract and Load (optional, needed for > 50k) |
| **Destination** | Sends records to the target system |

---

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@harbor/core` | Interfaces: Source, Destination, Stage, Pipeline | ✅ |
| `@harbor/source-csv` | CSV and JSONL source — streaming, no memory accumulation | ✅ |
| `@harbor/stage-local` | Local filesystem staging for dev and small migrations | ✅ |
| `@harbor/destination-hubspot` | HubSpot batch upsert with retry and rate limiting | ✅ |
| `@harbor/source-openapi` | Any OpenAPI spec → Source (auto-pagination) | 🔲 [#9](https://github.com/lucianfialho/harbor/issues/9) |
| `@harbor/stage-gcs` | Google Cloud Storage — required for 30M+ records | 🔲 [#7](https://github.com/lucianfialho/harbor/issues/7) |
| `@harbor/source-activecampaign` | ActiveCampaign source (thin wrapper over source-openapi) | 🔲 [#6](https://github.com/lucianfialho/harbor/issues/6) |
| `@harbor/source-rdstation` | RD Station source (CSV-based + OAuth API) | 🔲 [#8](https://github.com/lucianfialho/harbor/issues/8) |

---

## Why Effect?

Every problem in a data pipeline has a built-in primitive:

| Problem | Effect primitive |
|---------|----------------|
| 30M records without loading into memory | `Stream` — pull-based, lazy |
| HubSpot 429 rate limit | `Schedule.exponential` + `Retry-After` |
| 4 parallel workers | `Stream.mapEffect(..., { concurrency: 4 })` |
| Resume after failure | `Checkpoint` + `Stage` |
| Know exactly what can fail | `Schema.TaggedErrorClass` — typed errors |
| Tracing out of the box | `Effect.fn("name")` → OpenTelemetry spans |

---

## Frequently asked questions

**Does Harbor replace Airbyte?**
No. Harbor is a code-first library for data migration pipelines. It has no UI, no cloud, and no scheduling — just typed TypeScript that you own and run. Think of it as the building block, not the platform.

**What is the Stage? Is it a destination?**
Not quite. Stage is an intermediate store between Source and Destination. It lets you decouple extraction from loading — extract once, retry the load as many times as needed without hitting the source API again.

**Can I add my own Source connector?**
Yes. Implement the `Source<A, E>` interface from `@harbor/core`:
```typescript
interface Source<A, E = never> {
  readonly stream: Stream.Stream<A, E>
  readonly schema: Schema.Schema<A>
  readonly count:  Effect.Effect<number, E>
}
```
That's it. Any stream of records qualifies.

**Does it work with ActiveCampaign / RD Station / Pipedrive?**
Source connectors for those are planned (see issues above). While they're not built yet, the pattern is the same: export a CSV from your CRM and use `CsvSource` — it works for any system that can export CSV.

---

## Development

```bash
bun install

# Test all packages
bun run --cwd packages/source-csv test           # 12 tests
bun run --cwd packages/stage-local test          # 6 tests
bun run --cwd packages/destination-hubspot test  # 4 tests
```

**Requirements**: Bun 1.2+, Node.js 20+

---

## Contributing

All planned work is tracked as [GitHub Issues](https://github.com/lucianfialho/harbor/issues) using the PRP (Product Requirement Plan) format — each issue is a full spec written before implementation starts. Pick one, implement it, open a PR.

---

## License

MIT — built at [Métricas Boss](https://metricasboss.com.br)
