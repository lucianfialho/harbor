# Example 01: CSV → HubSpot

**Pattern**: `Source → transform → Destination`

The simplest Harbor pipeline. Reads contacts from a CSV file and upserts them into HubSpot by email.

## What it demonstrates

- `CsvSource`: streaming CSV without loading into memory
- Field mapping in `transform()`: `name` → `firstname` + `lastname`
- `ContactsDestination`: batch upsert 100 contacts per request
- `--dry-run`: log what would happen without calling HubSpot

## Run it

```bash
# Dry-run — no HubSpot token needed
bun run examples/01-csv-to-hubspot/run.ts --dry-run

# Real run
HUBSPOT_TOKEN=pat-na1-xxx bun run examples/01-csv-to-hubspot/run.ts
```

## Key code

```typescript
const source = CsvSource({ path: "contacts.csv", schema: ContactRow })
const dest   = ContactsDestination({ token, baseUrl: "https://api.hubapi.com" })

yield* dest.write(source.stream.pipe(Stream.map(transform)))
```

That's the whole pipeline. `source.stream` is lazy — records flow through `transform` and into `dest.write` one batch at a time, never all in memory at once.

## The transform function

The CSV has a `name` column (full name). HubSpot wants `firstname` + `lastname`. The transform splits on the first space — a deliberate simplification. For production, use a proper name parser.

## Files

| File | Purpose |
|------|---------|
| `contacts.csv` | 10 fake Brazilian contacts |
| `run.ts` | The pipeline (~50 lines) |
