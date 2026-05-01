# Harbor — Guia para o Time

Este arquivo é lido automaticamente pelo Claude Code ao abrir qualquer conversa neste repositório. Ele define os padrões, convenções e o contexto necessário para contribuir com Harbor.

---

## O que é Harbor

Harbor é um framework TypeScript para construir **pipelines de migração de dados** — especificamente para mover dados de CRMs (ActiveCampaign, RD Station, Pipedrive) para o HubSpot. Inspirado no [PyAirbyte](https://github.com/airbytehq/PyAirbyte) mas construído sobre [Effect v4](https://effect.website) (effect-smol).

**Contexto de negócio**: construído na [Métricas Boss](https://metricasboss.com.br) para dar escala ao serviço de migração — em vez de escrever um script one-off por cliente, Harbor é o padrão que qualquer dev do time consegue usar e estender.

---

## Os 4 conceitos centrais

```
Source  →  [Stage]  →  Destination
```

| Conceito | Interface | Arquivo |
|----------|-----------|---------|
| **Source** | `Source<A, E>` | `packages/core/src/Source.ts` |
| **Destination** | `Destination<A, E>` | `packages/core/src/Destination.ts` |
| **Stage** | `Stage<E>` | `packages/core/src/Stage.ts` |
| **Pipeline** | `Pipeline<Raw, Mapped>` | `packages/core/src/Pipeline.ts` |

**Source**: produz um `Stream<A, E>` de registros — pull-based, nunca carrega tudo na memória.
**Destination**: consome um `Stream<A, E>` e envia para o destino (ex: HubSpot).
**Stage**: armazenamento intermediário entre Extract e Load — essencial para volumes > 50k ou quando precisa de resume.

---

## Estrutura de pacotes

```
packages/
├── core/                   interfaces: Source, Destination, Stage, Pipeline, errors
├── source-csv/             CsvSource, JsonLinesSource
├── source-activecampaign/  wrapper sobre source-openapi (pendente PRP #9)
├── source-rdstation/       CSV-based ou OAuth API (pendente)
├── source-openapi/         conector genérico: qualquer OpenAPI spec → Source (pendente PRP #9)
├── stage-local/            LocalStage: JSONL no filesystem (dev/testes)
├── stage-gcs/              GcsStage: Google Cloud Storage para 30M+ (pendente PRP #7)
└── destination-hubspot/    ContactsDestination: batch upsert + retry
```

---

## Padrões de código

### Effect v4 (effect-smol)

Sempre verificar a API no source antes de implementar:
```bash
grep -n "nome_da_funcao" references/effect-smol/packages/effect/src/Stream.ts
```

Padrões obrigatórios:
- `Effect.gen(function*() { ... })` para multi-step workflows
- `Effect.fn("Nome")` para métodos de serviço reutilizáveis
- `Schema.TaggedErrorClass` para erros de domínio
- `Stream.grouped(N)` para batches — **não** `Stream.rechunk`
- `Schedule.both(Schedule.exponential(...), Schedule.recurs(N))` para retry com cap

### Erros tipados

Todo pacote usa erros com `Schema.TaggedErrorClass`:
```typescript
export class CsvError extends Schema.TaggedErrorClass<CsvError>()(
  "harbor/CsvError",         // tag ÚNICA — nunca reusar entre pacotes
  { cause: Schema.Defect, ... }
) {}
```

**Regra crítica**: o `_tag` deve ser único no sistema. `StageError` deve ser importado de `@harbor/core`, não redeclarado.

### Versão do Effect

O projeto usa `effect@4.0.0-beta.59` (effect-smol). Há um conflito de versão no bun workspace: cada pacote tem `effect@3.21.2` em seu `node_modules/` local que precede a v4 da raiz.

- **Para tests**: vitest.config.ts em cada pacote tem `resolve.alias` apontando para a v4 da raiz — funciona corretamente.
- **Para exemplos em bun**: examples/ usam Effect diretamente sem importar `@harbor/*` para evitar o conflito. Tech debt rastreado.
- **Para compilação TypeScript**: tsconfig de cada pacote não deve ter `paths` para `effect` — deixar bun resolver normalmente.

---

## Como adicionar um novo Source connector

1. Criar `packages/source-{nome}/` com `package.json`, `tsconfig.json`, `vitest.config.ts`
2. O `package.json` deve ter `effect` em `peerDependencies` (não `dependencies`)
3. O `vitest.config.ts` DEVE ter o alias para effect v4:
   ```typescript
   resolve: { alias: { "effect": resolve(__dirname, "../../node_modules/effect") } }
   ```
4. Implementar a interface `Source<A, CsvError>` de `@harbor/core`
5. Escrever testes com vitest (mínimo: happy path + arquivo inexistente + schema inválido)
6. Adicionar ao `workspaces` no root `package.json`

**Referência**: ver `packages/source-csv/` como template completo.

---

## Como adicionar um novo Destination

1. Criar `packages/destination-{nome}/` com o mesmo setup de `vitest.config.ts`
2. Implementar `Destination<A, ErrorType>` de `@harbor/core`
3. Usar `Stream.grouped(100)` para batching — verificado em `references/effect-smol/packages/effect/src/Stream.ts:7686`
4. Usar `Schedule.both(Schedule.exponential(...), Schedule.recurs(8))` para retry com cap máximo
5. Tratar erros de rede (`TypeError`) como retryable — não só status codes HTTP

**Referência**: ver `packages/destination-hubspot/` como template.

---

## Como rodar localmente

```bash
bun install

# Testes por pacote
bun run --cwd packages/source-csv test
bun run --cwd packages/stage-local test
bun run --cwd packages/destination-hubspot test

# Exemplos (sem token HubSpot)
cd examples
bun run 01-csv-to-hubspot/run.ts --dry-run
bun run 02-large-volume/generate-data.ts 1000
bun run 02-large-volume/run.ts --dry-run
bun run 04-custom-transform/run.ts
```

---

## Referências locais

| Recurso | Onde está | Para quê |
|---------|-----------|----------|
| Effect v4 source | `references/effect-smol/` | Verificar APIs antes de implementar |
| spec2cli source | `wiki/raw_sources/spec2cli/core.md` | Base do source-openapi |
| Effect llms-full | `wiki/raw_sources/effect/llms-full.md` | Doc completa do Effect |
| PRPs | [GitHub Issues](https://github.com/lucianfialho/harbor/issues) | Specs de cada pacote |
| Wiki de migração | `metricasboss/hubspot` | Contexto de negócio, padrões AC/RD/HS |

---

## Issues abertas (PRPs)

| # | Título | Dependência |
|---|--------|-------------|
| [#9](https://github.com/lucianfialho/harbor/issues/9) | source-openapi (conector genérico) | spec2cli parser |
| [#6](https://github.com/lucianfialho/harbor/issues/6) | source-activecampaign | depende de #9 |
| [#8](https://github.com/lucianfialho/harbor/issues/8) | source-rdstation | depende de #9 + source-csv |
| [#7](https://github.com/lucianfialho/harbor/issues/7) | stage-gcs | independente |
