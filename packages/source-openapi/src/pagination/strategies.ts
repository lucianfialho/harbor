/**
 * Pagination strategies using Stream.paginate from effect-smol v4.
 * Verified: references/effect-smol/packages/effect/src/Stream.ts:1618
 * paginate(s, f: (s) => Effect<[ReadonlyArray<A>, Option<S>]>) → Stream<A>
 * Items are emitted individually — paginate flattens each page's array.
 */
import { Effect, Option, Stream } from "effect"
import { executeRequest, type PageParams } from "../http/request.js"
import type { AuthConfig } from "../http/auth.js"
import type { PaginationConfig } from "./detector.js"
import { OpenApiError } from "../errors.js"

export type ApiRecord = Record<string, unknown>

function extractItems(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) return data as ApiRecord[]
  if (data && typeof data === "object") {
    for (const key of ["data", "items", "results", "records", "contacts", "users", "pets"]) {
      const val = (data as Record<string, unknown>)[key]
      if (Array.isArray(val)) return val as ApiRecord[]
    }
    for (const val of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(val)) return val as ApiRecord[]
    }
  }
  return []
}

function extractNextCursor(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const next = d["next"]
    ?? (d["_links"] as Record<string, unknown> | undefined)?.["next"]
    ?? d["next_cursor"]
  return typeof next === "string" ? next : null
}

export function paginateStream(
  baseUrl: string, path: string, auth: AuthConfig, cfg: PaginationConfig
): Stream.Stream<ApiRecord, OpenApiError> {
  const req = (params: PageParams) => Effect.tryPromise({
    try:   () => executeRequest("GET", baseUrl, path, params, auth),
    catch: (cause) => new OpenApiError({ cause, message: String(cause) }),
  })

  if (cfg.strategy === "single") {
    return Stream.fromEffect(
      req({ [cfg.limitKey]: cfg.limitVal }).pipe(Effect.map((r) => extractItems(r.data)))
    ).pipe(Stream.flatMap((items) => Stream.fromIterable(items)))
  }

  if (cfg.strategy === "offset") {
    return Stream.paginate(0 as number, (offset) =>
      req({ [cfg.offsetKey]: offset, [cfg.limitKey]: cfg.limitVal }).pipe(
        Effect.map((r) => {
          const items = extractItems(r.data)
          return [items, items.length >= cfg.limitVal
            ? Option.some(offset + items.length) : Option.none<number>()] as const
        })
      )
    )
  }

  if (cfg.strategy === "page") {
    return Stream.paginate(1 as number, (page) =>
      req({ [cfg.offsetKey]: page, [cfg.limitKey]: cfg.limitVal }).pipe(
        Effect.map((r) => {
          const items = extractItems(r.data)
          return [items, items.length >= cfg.limitVal
            ? Option.some(page + 1) : Option.none<number>()] as const
        })
      )
    )
  }

  // cursor / next_url
  return Stream.paginate(null as string | null, (cursor) =>
    req({ ...(cursor ? { [cfg.offsetKey]: cursor } : {}), [cfg.limitKey]: cfg.limitVal }).pipe(
      Effect.map((r) => {
        const items  = extractItems(r.data)
        const nextCursor = extractNextCursor(r.data)
        return [items, nextCursor && items.length > 0
          ? Option.some(nextCursor) : Option.none<string>()] as const
      })
    )
  )
}
