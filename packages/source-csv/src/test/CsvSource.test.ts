/**
 * Padrão Context.Service + Layer — o jeito correto do Effect.
 * Não precisa de parâmetro de injeção: troca a Layer.
 *
 *   Produção:  Effect.provide(CsvFiles.layer)
 *   Teste:     Effect.provide(CsvFiles.fake([...rows]))
 */
import { Effect, Layer, Schema, Stream } from "effect"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CsvSource, JsonLinesSource, CsvFiles, JsonLinesFiles } from "../index.js"

const ContactSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.refine((s): s is string => s.includes("@"))),
  name:  Schema.String,
})

// run com Layer — o padrão Effect correto
const run = <A, E, R>(effect: Effect.Effect<A, E, R>, layer: Layer.Layer<R>) =>
  Effect.runPromise(Effect.provide(Effect.orDie(effect), layer))

// ── CsvSource ─────────────────────────────────────────────────────────────────

describe("CsvSource", () => {
  it("streams rows via CsvFiles.fake layer", async () => {
    const source = CsvSource({ path: "ignored.csv", schema: ContactSchema })
    const records = await run(
      Stream.runCollect(source.stream),
      CsvFiles.fake([{ email: "alice@example.com", name: "Alice" }, { email: "bob@example.com", name: "Bob" }])
    )
    expect(records).toHaveLength(2)
    expect(records[0]).toEqual({ email: "alice@example.com", name: "Alice" })
  })

  it("skips invalid rows via CsvFiles.fake layer", async () => {
    const source  = CsvSource({ path: "ignored.csv", schema: ContactSchema })
    const records = await run(
      Stream.runCollect(source.stream),
      CsvFiles.fake([{ email: "valid@example.com", name: "Valid" }, { email: "not-an-email", name: "Bad" }])
    )
    expect(records).toHaveLength(1)
    expect(records[0]?.email).toBe("valid@example.com")
  })

  it("count from CsvFiles.fake layer", async () => {
    const source = CsvSource({ path: "ignored.csv", schema: ContactSchema })
    const total  = await run(source.count, CsvFiles.fake([], 42))
    expect(total).toBe(42)
  })

  it("CsvFiles.layer reads real fixture file", async () => {
    const path   = join(import.meta.dirname, "fixtures", "valid.csv")
    const source = CsvSource({ path, schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream), CsvFiles.layer)
    expect(records).toHaveLength(2)
  })

  it("fails with CsvError when file does not exist", async () => {
    const source = CsvSource({ path: "/nonexistent/file.csv", schema: ContactSchema })
    const exit   = await Effect.runPromiseExit(
      Effect.provide(Stream.runCollect(source.stream), CsvFiles.layer)
    )
    expect(exit._tag).toBe("Failure")
  })
})

// ── JsonLinesSource ───────────────────────────────────────────────────────────

describe("JsonLinesSource", () => {
  it("streams records via JsonLinesFiles.fake layer", async () => {
    const source  = JsonLinesSource({ path: "ignored.jsonl", schema: ContactSchema })
    const records = await run(
      Stream.runCollect(source.stream),
      JsonLinesFiles.fake(['{"email":"alice@example.com","name":"Alice"}', '{"email":"bob@example.com","name":"Bob"}'])
    )
    expect(records).toHaveLength(2)
  })

  it("skips invalid JSON lines via JsonLinesFiles.fake layer", async () => {
    const source  = JsonLinesSource({ path: "ignored.jsonl", schema: ContactSchema })
    const records = await run(
      Stream.runCollect(source.stream),
      JsonLinesFiles.fake(['{"email":"valid@example.com","name":"Valid"}', "not json", '{"email":"another@example.com","name":"Another"}'])
    )
    expect(records).toHaveLength(2)
  })

  it("count from JsonLinesFiles.fake layer", async () => {
    const source = JsonLinesSource({ path: "ignored.jsonl", schema: ContactSchema })
    const total  = await run(source.count, JsonLinesFiles.fake([], 99))
    expect(total).toBe(99)
  })
})
