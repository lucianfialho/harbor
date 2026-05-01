/** extractListOperations — internalized from spec2cli, adds list-endpoint filter */
import type { OpenAPISpec, ListOperation, SchemaObject, ParameterObject, FieldInfo } from "./types.js"

export function extractListOperations(spec: OpenAPISpec, tag: string): ListOperation[] {
  const ops: ListOperation[] = []

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem?.get) continue
    const op = pathItem.get
    if (!op.tags?.includes(tag)) continue

    // Only include endpoints that return an array (list endpoints)
    const responseSchema = getResponseSchema(op, spec)
    const isListEndpoint = responseSchema?.type === "array" ||
      (responseSchema?.properties && Object.values(responseSchema.properties).some(
        (p) => resolveSchema(p, spec).type === "array"
      ))
    if (!isListEndpoint && !isLikelyListPath(path)) continue

    ops.push({
      tag,
      path,
      method: "GET",
      summary:        op.summary ?? op.operationId ?? path,
      params:         [...(pathItem.parameters ?? []), ...(op.parameters ?? [])],
      responseSchema,
    })
  }

  return ops
}

function isLikelyListPath(path: string): boolean {
  // /pets, /contacts, /users — ends with plural noun (heuristic)
  const last = path.split("/").filter(Boolean).at(-1) ?? ""
  return !last.startsWith("{") && !last.includes(".")
}

function getResponseSchema(op: { responses?: Record<string, { content?: Record<string, { schema?: SchemaObject }> }> }, spec: OpenAPISpec): SchemaObject | null {
  const success = op.responses?.["200"] ?? op.responses?.["201"]
  if (!success?.content) return null
  const schema = success.content["application/json"]?.schema
  return schema ? resolveSchema(schema, spec) : null
}

export function resolveSchema(schema: SchemaObject, spec: OpenAPISpec): SchemaObject {
  if (!schema.$ref) return schema
  const parts = schema.$ref.replace("#/", "").split("/")
  let resolved: unknown = spec
  for (const part of parts) resolved = (resolved as Record<string, unknown>)?.[part]
  return (resolved as SchemaObject) ?? schema
}

export function extractFields(schema: SchemaObject | null, spec: OpenAPISpec): FieldInfo[] {
  if (!schema) return []
  const target = schema.type === "array" && schema.items
    ? resolveSchema(schema.items, spec)
    : Object.values(schema.properties ?? {}).find((p) => resolveSchema(p, spec).type === "array")
      ? resolveSchema(Object.values(schema.properties ?? {})[0] ?? {}, spec).items ?? schema
      : schema
  const resolved = resolveSchema(target, spec)
  return Object.entries(resolved.properties ?? {}).map(([name, prop]) => ({
    name,
    type:     prop.type ?? "string",
    required: (resolved.required ?? []).includes(name),
  }))
}
