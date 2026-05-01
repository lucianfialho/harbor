# Example 04: Custom Transform with Typed Errors

**Pattern**: `Source → custom transform → Destination`

Shows how to write a transform that maps, normalizes, and validates records — with typed errors for invalid data.

## What it demonstrates

- Field mapping: `nome` → `firstname` + `lastname`
- Enum mapping: `estagio` (PT) → `lifecyclestage` (HubSpot internal)
- Phone normalization: any format → E.164 (`+55...`)
- `TransformError`: typed error from `@harbor/core` for invalid records
- `Stream.catchAll`: skip bad records, continue pipeline

## Key pattern

```typescript
// Each record goes through transform individually
const transformed = source.stream.pipe(
  Stream.mapEffect(transformRow),  // Effect<HubSpotContact, TransformError>
  Stream.catchAll(() => Stream.empty)  // skip bad records
)
```

`transformRow` returns `Effect.fail(TransformError)` for invalid records. `Stream.catchAll` catches it and replaces with an empty stream — the pipeline continues with the next record.

## Run it

```bash
bun run examples/04-custom-transform/run.ts
```

Uses the same `contacts.csv` from example 01 as input.

## Adding your own fields

1. Add columns to `SourceRow` schema
2. Map them in `transformRow`
3. Add to `HubSpotContact` return object

The TypeScript compiler will catch any missing fields.
