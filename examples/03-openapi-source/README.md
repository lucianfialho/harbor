# Example 03: OpenAPI Source (Coming Soon)

**Pattern**: `OpenAPI Spec → Source → Destination`

This example will demonstrate `@harbor/source-openapi` — a generic connector that turns any OpenAPI spec into a Harbor Source.

```typescript
// Future API (PRP #9 — not yet implemented)
import { OpenApiSource } from "@harbor/source-openapi"

const source = OpenApiSource({
  spec:    "https://api.activecampaign.com/openapi.json",
  auth:    { type: "apiKey", headerName: "Api-Token", value: token },
  baseUrl: `https://${account}.api-us1.com/api/3`,
  tag:     "contacts",
})

// source.stream → Stream<Record, SourceError>
// source.discover() → { fields: [...], pagination: "offset" }
```

## Why this matters

Instead of writing a custom connector per CRM, you provide an OpenAPI spec and Harbor auto-detects:
- Which endpoints list the data (`GET /contacts`)
- What pagination strategy to use (offset, cursor, next_url)
- What fields are available (`discover()`)

## Status

- [ ] PRP #9 (source-openapi) — connector implementation
- [ ] PRP #6 (source-activecampaign) — thin wrapper using source-openapi
- [ ] PRP #8 (source-rdstation) — thin wrapper using source-openapi

Track progress at: https://github.com/lucianfialho/harbor/issues/9
