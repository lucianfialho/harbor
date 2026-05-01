/** detectPagination — analyzes OpenAPI spec params to determine pagination strategy */
import type { ListOperation, SchemaObject } from "../parser/types.js"

export type PaginationStrategy = "offset" | "page" | "cursor" | "next_url" | "single"

export interface PaginationConfig {
  strategy:  PaginationStrategy
  limitKey:  string    // default query param name for limit/page_size
  offsetKey: string    // default query param name for offset/page/cursor
  limitVal:  number    // default page size
}

export function detectPagination(op: ListOperation, responseSchema: SchemaObject | null): PaginationConfig {
  const paramNames = op.params.filter((p) => p.in === "query").map((p) => p.name.toLowerCase())

  if (paramNames.includes("offset") && paramNames.includes("limit")) {
    return { strategy: "offset", limitKey: "limit", offsetKey: "offset", limitVal: 100 }
  }
  if (paramNames.includes("page") && (paramNames.includes("page_size") || paramNames.includes("per_page"))) {
    const limitKey = paramNames.includes("page_size") ? "page_size" : "per_page"
    return { strategy: "page", limitKey, offsetKey: "page", limitVal: 100 }
  }
  if (paramNames.includes("cursor") || paramNames.includes("after")) {
    const offsetKey = paramNames.includes("cursor") ? "cursor" : "after"
    return { strategy: "cursor", limitKey: "limit", offsetKey, limitVal: 100 }
  }
  if (hasNextUrlInSchema(responseSchema)) {
    return { strategy: "next_url", limitKey: "limit", offsetKey: "offset", limitVal: 100 }
  }

  return { strategy: "single", limitKey: "limit", offsetKey: "offset", limitVal: 100 }
}

function hasNextUrlInSchema(schema: SchemaObject | null): boolean {
  if (!schema?.properties) return false
  const keys = Object.keys(schema.properties).map((k) => k.toLowerCase())
  return keys.includes("next") || keys.includes("_links") || keys.includes("next_cursor")
}
