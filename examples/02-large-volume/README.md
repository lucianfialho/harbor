# Example 02: Large-Volume Pipeline with LocalStage

**Pattern**: `Source → Stage → Destination`

For migrations with > 50k records, staging decouples extraction from loading. If the destination fails midway, resume from the stage without re-extracting.

## What it demonstrates

- `JsonLinesSource`: streaming JSONL (one JSON per line)
- `LocalStage`: intermediate filesystem storage
- Resume: if stage key already exists, skip extraction
- `--dry-run`: count records in stage without calling HubSpot

## Run it

```bash
# 1. Generate test data
bun run examples/02-large-volume/generate-data.ts 5000

# 2. Dry-run (no HubSpot needed)
bun run examples/02-large-volume/run.ts --dry-run

# 3. Real run
HUBSPOT_TOKEN=pat-na1-xxx bun run examples/02-large-volume/run.ts
```

## The stage pattern

```
First run:    Source → Stage.write → done
Second run:   Stage.read → Destination (no re-extraction)
```

The stage key is `contacts-YYYY-MM-DD`. If it exists, skip write. This makes the pipeline **idempotent** — running twice on the same day reads from stage, not the source.

## Files

| File | Purpose |
|------|---------|
| `generate-data.ts` | Generates N fake JSONL contacts |
| `run.ts` | Pipeline with stage (~45 lines) |
| `.stage/` | Created at runtime — add to `.gitignore` |
