/** loadSpec — internalized from spec2cli/src/parser/loader.ts */
import { parse as parseYaml } from "yaml"
import type { OpenAPISpec } from "./types.js"

export async function loadSpec(source: string): Promise<OpenAPISpec> {
  const raw = await fetchSource(source)
  const parsed = parseContent(raw) as Record<string, unknown>

  // Swagger 2.0 → minimal OpenAPI 3.0 shim (no external dep)
  if (parsed["swagger"] && String(parsed["swagger"]).startsWith("2.")) {
    return swagger2ToOpenApi3(parsed)
  }
  validate(parsed as unknown as OpenAPISpec)
  return parsed as unknown as OpenAPISpec
}

async function fetchSource(source: string): Promise<string> {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source)
    if (!res.ok) throw new Error(`Failed to fetch spec from ${source}: ${res.status}`)
    return res.text()
  }
  const { readFile } = await import("node:fs/promises")
  try {
    return await readFile(source, "utf-8")
  } catch (err) {
    throw new Error(`Spec file not found: ${source}`)
  }
}

function parseContent(raw: string): unknown {
  const trimmed = raw.trimStart()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.parse(raw) } catch { throw new Error("Invalid JSON in spec") }
  }
  try { return parseYaml(raw) } catch { throw new Error("Invalid YAML in spec") }
}

function validate(spec: OpenAPISpec): void {
  if (!spec.openapi || !spec.openapi.startsWith("3."))
    throw new Error(`Unsupported spec version: ${spec.openapi ?? "missing"}`)
  if (!spec.paths || Object.keys(spec.paths).length === 0)
    throw new Error("Invalid spec: no paths defined")
}

function swagger2ToOpenApi3(s: Record<string, unknown>): OpenAPISpec {
  const basePath = String(s["basePath"] ?? "/")
  const host     = String(s["host"] ?? "localhost")
  return {
    openapi: "3.0.0",
    info:    ((s["info"] as OpenAPISpec["info"]) ?? { title: "API", version: "1.0" }),
    servers: [{ url: `https://${host}${basePath}` }],
    paths:   ((s["paths"] as OpenAPISpec["paths"]) ?? {}),
  } as unknown as OpenAPISpec
}
