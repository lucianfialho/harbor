<p align="center">
  <img src="assets/logo.png" alt="Harbor" width="180" />
</p>

# Harbor

> Type-safe data pipeline framework — Source → Stage → Destination, powered by Effect

Harbor is a TypeScript framework for building data migration pipelines. Inspired by [Airbyte](https://airbyte.com) but designed for the [Effect](https://effect.website) ecosystem: every step is typed, composable, and resumable.

Built at [Métricas Boss](https://metricasboss.com.br) for migrating CRM data (ActiveCampaign, RD Station) into HubSpot at scale.

---

## The pattern

```
Source  →  [Stage]  →  Destination
```

| Piece | What it does | When to use |
|-------|-------------|------------|
| **Source** | Streams records from an external system | Always |
| **Stage** | Persists records between Extract and Load | > 50k records, or when you need resume |
| **Destination** | Sends records to the target system | Always |

---

## Packages

| Package | Description |
|---------|-------------|
| `@harbor/core` | Interfaces: Source, Destination, Stage, Pipeline |
| `@harbor/source-csv` | CSV and JSONL source (streaming, no memory accumulation) |
| `@harbor/stage-local` | Local filesystem staging for dev and small migrations |
| `@harbor/destination-hubspot` | HubSpot batch upsert with retry and rate limiting |

**Coming soon**: `@harbor/source-openapi` (any OpenAPI spec → Source), `@harbor/stage-gcs` (Google Cloud Storage for 30M+ records), `@harbor/source-activecampaign`, `@harbor/source-rdstation`.

---

## Quickstart

```bash
git clone https://github.com/lucianfialho/harbor
cd harbor
bun install

# Run example — no HubSpot token needed
cd examples
bun run 01-csv-to-hubspot/run.ts --dry-run
```

---

## Examples

All examples run with `bun run examples/0X/run.ts --dry-run`:

```
examples/
├── 01-csv-to-hubspot/     Core pattern: CSV → transform → HubSpot
├── 02-large-volume/       Stage pattern: Source → Stage → Destination
├── 03-openapi-source/     Coming soon: any OpenAPI spec as Source
└── 04-custom-transform/   Typed errors and field normalization
```

---

## Why Effect?

Every problem in a data pipeline has a built-in primitive:

| Problem | Effect primitive |
|---------|----------------|
| 30M records without loading into memory | `Stream` — pull-based, lazy |
| Rate limit (HubSpot 429) | `Schedule.exponential` + `Retry-After` |
| 4 parallel workers | `Stream.mapEffect(..., { concurrency: 4 })` |
| Resume after failure | `Checkpoint` + `Stage` |
| Typed errors | `Schema.TaggedErrorClass` |
| Tracing | `Effect.fn("name")` → spans |

---

## Architecture

```
packages/
├── core/                   ← Source, Destination, Stage, Pipeline types
├── source-csv/             ← CsvSource, JsonLinesSource
├── source-activecampaign/  ← (coming) thin wrapper over source-openapi
├── source-rdstation/       ← (coming) CSV-based or OAuth API
├── source-openapi/         ← (coming) any OpenAPI spec → Source
├── stage-local/            ← LocalStage (filesystem JSONL)
├── stage-gcs/              ← (coming) GcsStage for 30M+
└── destination-hubspot/    ← ContactsDestination (batch upsert)
```

Each package follows the same pattern: typed errors, Effect Stream, vitest tests.

---

## Development

```bash
bun install

# Build all packages
bunx tsc -p packages/core/tsconfig.json
bunx tsc -p packages/source-csv/tsconfig.json
# ...

# Test all
bun run --cwd packages/source-csv test       # 12 tests
bun run --cwd packages/stage-local test      # 6 tests
bun run --cwd packages/destination-hubspot test  # 4 tests
```

**Requirements**: Bun 1.2+, Node.js 20+

---

## Issues (PRPs)

All planned work is tracked as [GitHub Issues](https://github.com/lucianfialho/harbor/issues) using the PRP (Product Requirement Plan) format — each issue is a full spec before implementation starts.

---

## License

MIT
