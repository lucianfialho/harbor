# Harbor — Product Context

## What it is
Harbor is a TypeScript data pipeline framework for migrating CRM data into HubSpot. It implements a **Source → Stage → Destination** pattern inspired by Airbyte, built on Effect (effect-smol v4).

Built at Métricas Boss for CRM migration services.

## Users
- TypeScript/Effect developers building data integrations
- Engineers at agencies doing CRM migrations (ActiveCampaign, RD Station → HubSpot)
- Internal Métricas Boss team learning Effect patterns through the codebase

## Brand tone
- Technical but clear — we write code, not marketing copy
- Direct, no fluff — "30M records, no memory issues" not "enterprise-grade scalability"
- Effect-native — we speak the language of typed errors, spans, layers
- Open source, humble — this is a framework we built for ourselves and open-sourced

## Strategic principles
1. **Code as curriculum** — Harbor teaches Effect patterns. The source code IS the documentation.
2. **Real constraints** — 30M contacts, HubSpot rate limits, GCS staging are real. The framework must handle them.
3. **Observability first** — Effect.fn spans on every operation. No printf debugging.

## Anti-references
- NOT enterprise SaaS landing pages with hero illustrations and 3D floating elements
- NOT generic "developer tools" pages with generic grid patterns
- NOT dark mode for dark mode's sake

## Aesthetic
- Clean, high-contrast, code-forward
- Fumadocs UI dark theme base (fd-* CSS variables)
- Code blocks with syntax highlighting take center stage
- Monospace for package names, property names, terminal commands
- Minimal animations — purpose-driven only
