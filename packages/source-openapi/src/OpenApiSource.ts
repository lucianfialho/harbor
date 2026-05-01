import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { loadSpec } from "./parser/loader.js"
import { extractListOperations, extractFields } from "./parser/extractor.js"
import { detectPagination } from "./pagination/detector.js"
import { paginateStream, type ApiRecord } from "./pagination/strategies.js"
import { OpenApiError } from "./errors.js"
import type { AuthConfig } from "./http/auth.js"
import type { FieldInfo } from "./parser/types.js"

export interface OpenApiSourceConfig {
  spec:      string
  auth:      AuthConfig
  baseUrl:   string
  tag:       string
  pageSize?: number
}

export interface OpenApiSourceResult extends Source<ApiRecord, OpenApiError> {
  discover: () => Effect.Effect<ReadonlyArray<FieldInfo>, OpenApiError>
}

export function OpenApiSource(config: OpenApiSourceConfig): OpenApiSourceResult {
  const loadedSpec = Effect.tryPromise({
    try:   () => loadSpec(config.spec),
    catch: (cause) => new OpenApiError({ cause, message: `Failed to load spec: ${String(cause)}` }),
  })

  const getOperation = loadedSpec.pipe(
    Effect.flatMap((spec) => {
      const ops = extractListOperations(spec, config.tag)
      if (ops.length === 0)
        return Effect.fail(new OpenApiError({
          cause: new Error(`No GET list endpoints for tag "${config.tag}"`),
          message: `No GET list endpoints for tag "${config.tag}"`,
        }))
      return Effect.succeed({ op: ops[0]!, spec })
    })
  )

  // Stream.unwrap: Effect<Stream<A,E>> → Stream<A,E>
  // Verified at: references/effect-smol/packages/effect/src/Stream.ts:1750
  const stream: Stream.Stream<ApiRecord, OpenApiError> = Stream.unwrap(
    getOperation.pipe(
      Effect.map(({ op }) => {
        const paginationCfg = detectPagination(op, op.responseSchema)
        if (config.pageSize) paginationCfg.limitVal = config.pageSize
        return paginateStream(config.baseUrl, op.path, config.auth, paginationCfg)
      })
    )
  )

  const count = Effect.succeed(-1 as number) as Effect.Effect<number, OpenApiError>

  const discover = () => getOperation.pipe(
    Effect.map(({ op, spec }) => extractFields(op.responseSchema, spec))
  )

  return {
    stream,
    schema: Schema.Unknown as unknown as Schema.Schema<ApiRecord>,
    count,
    discover,
  }
}
