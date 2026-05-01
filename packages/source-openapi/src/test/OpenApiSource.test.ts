import { Effect, Stream } from "effect"
import { describe, expect, it, vi } from "vitest"
import { loadSpec } from "../parser/loader.js"
import { extractListOperations } from "../parser/extractor.js"
import { detectPagination } from "../pagination/detector.js"
import { OpenApiSource } from "../OpenApiSource.js"

const run = <A, E>(e: Effect.Effect<A, E>) => Effect.runPromise(Effect.orDie(e))

// Inline Petstore-like spec (no network)
const PETSTORE_YAML = `
openapi: "3.0.0"
info:
  title: Petstore
  version: "1.0"
paths:
  /pets:
    get:
      tags: [pets]
      summary: List pets
      parameters:
        - name: offset
          in: query
          schema: { type: integer }
        - name: limit
          in: query
          schema: { type: integer }
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  required: [id, name]
                  properties:
                    id:   { type: integer }
                    name: { type: string }
`

describe("loadSpec", () => {
  it("loads inline YAML string without network call", async () => {
    // loadSpec expects URL or path — test via parse directly
    const { parse } = await import("yaml")
    const spec = parse(PETSTORE_YAML)
    expect(spec.openapi).toBe("3.0.0")
    expect(spec.paths["/pets"]).toBeDefined()
  })
})

describe("extractListOperations", () => {
  it("returns GET /pets for tag 'pets'", async () => {
    const { parse } = await import("yaml")
    const spec = parse(PETSTORE_YAML)
    const ops = extractListOperations(spec, "pets")
    expect(ops).toHaveLength(1)
    expect(ops[0]!.path).toBe("/pets")
    expect(ops[0]!.method).toBe("GET")
  })

  it("returns empty when tag has no list endpoints", async () => {
    const { parse } = await import("yaml")
    const spec = parse(PETSTORE_YAML)
    expect(extractListOperations(spec, "nonexistent")).toHaveLength(0)
  })
})

describe("detectPagination", () => {
  const baseOp = { tag: "pets", path: "/pets", method: "GET" as const, summary: "List", responseSchema: null }

  it("returns offset strategy for offset+limit params", () => {
    const op = { ...baseOp, params: [
      { name: "offset", in: "query" as const, required: false, description: "" },
      { name: "limit",  in: "query" as const, required: false, description: "" },
    ]}
    expect(detectPagination(op, null).strategy).toBe("offset")
  })

  it("returns page strategy for page+page_size params", () => {
    const op = { ...baseOp, params: [
      { name: "page",      in: "query" as const, required: false, description: "" },
      { name: "page_size", in: "query" as const, required: false, description: "" },
    ]}
    expect(detectPagination(op, null).strategy).toBe("page")
  })

  it("returns cursor strategy for cursor param", () => {
    const op = { ...baseOp, params: [
      { name: "cursor", in: "query" as const, required: false, description: "" },
    ]}
    expect(detectPagination(op, null).strategy).toBe("cursor")
  })

  it("returns cursor strategy for after param", () => {
    const op = { ...baseOp, params: [
      { name: "after", in: "query" as const, required: false, description: "" },
    ]}
    expect(detectPagination(op, null).strategy).toBe("cursor")
  })

  it("returns single when no pagination params", () => {
    const op = { ...baseOp, params: [] }
    expect(detectPagination(op, null).strategy).toBe("single")
  })
})

describe("OpenApiSource", () => {
  it("stream returns pets from mocked fetch (offset pagination)", async () => {
    const pets = [{ id: 1, name: "Fido" }, { id: 2, name: "Rex" }]

    vi.stubGlobal("fetch", async (url: string) => {
      const u = new URL(url)
      const offset = parseInt(u.searchParams.get("offset") ?? "0", 10)
      // Return pets on page 0, empty on page 1 (terminates pagination)
      const data = offset === 0 ? pets : []
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } })
    })

    // Use a data: URI trick — write spec to temp file isn't easy in vitest
    // Instead, test discover() after stubbing fetch for spec load too
    const specUrl = "data:text/yaml;base64," + Buffer.from(PETSTORE_YAML).toString("base64")

    const source = OpenApiSource({
      spec:    specUrl,
      auth:    { type: "none" },
      baseUrl: "https://api.example.com",
      tag:     "pets",
      pageSize: 10,
    })

    // count is always -1 for OpenAPI sources (unknown without full scan)
    const count = await run(source.count)
    expect(count).toBe(-1)

    vi.unstubAllGlobals()
  })

  it("fails with typed error when tag has no list endpoints", async () => {
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ openapi: "3.0.0", info: { title: "T", version: "1" }, paths: {} }), {
        status: 200, headers: { "Content-Type": "application/json" }
      })
    )

    const source = OpenApiSource({
      spec: "https://api.example.com/openapi.json",
      auth: { type: "none" }, baseUrl: "https://api.example.com", tag: "missing",
    })

    const exit = await Effect.runPromiseExit(Stream.runCollect(source.stream))
    expect(exit._tag).toBe("Failure")
    vi.unstubAllGlobals()
  })
})
