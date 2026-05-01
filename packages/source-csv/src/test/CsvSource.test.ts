/**
 * Tests using fakeCsvFiles() / fakeJsonLinesFiles() injection instead of real filesystem.
 * Pattern enabled by #17: CsvSource/JsonLinesSource accept an optional `files` parameter.
 *
 * Dependency injection via optional parameter works without Effect's Context.Service
 * (which has a version conflict in this workspace's bun setup).
 */
import { Effect, Schema, Stream } from "effect"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CsvSource, JsonLinesSource, fakeCsvFiles, fakeJsonLinesFiles } from "../index.js"

const ContactSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.refine((s): s is string => s.includes("@"))),
  name:  Schema.String,
})

const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.orDie(effect))

// ── CsvSource with fake files ─────────────────────────────────────────────────

describe("CsvSource", () => {
  it("streams all rows from fake CSV rows", async () => {
    const source = CsvSource({
      path:  "ignored.csv",
      schema: ContactSchema,
      files: fakeCsvFiles([
        { email: "alice@example.com", name: "Alice" },
        { email: "bob@example.com",   name: "Bob" },
      ]),
    })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
    expect(records[0]).toEqual({ email: "alice@example.com", name: "Alice" })
  })

  it("skips rows that fail Schema validation", async () => {
    const source = CsvSource({
      path:  "ignored.csv",
      schema: ContactSchema,
      files: fakeCsvFiles([
        { email: "valid@example.com", name: "Valid" },
        { email: "not-an-email",      name: "Bad" },
        { email: "another@example.com", name: "Another" },
      ]),
    })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
    expect(records.map((r) => r.email)).not.toContain("not-an-email")
  })

  it("count comes from fake files", async () => {
    const source = CsvSource({ path: "ignored.csv", schema: ContactSchema, files: fakeCsvFiles([], 42) })
    expect(await run(source.count)).toBe(42)
  })

  it("real filesystem reads fixture file correctly", async () => {
    const path   = join(import.meta.dirname, "fixtures", "valid.csv")
    const source = CsvSource({ path, schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
  })

  it("real filesystem fails with CsvError on missing file", async () => {
    const source = CsvSource({ path: "/nonexistent/file.csv", schema: ContactSchema })
    const exit   = await Effect.runPromiseExit(Stream.runCollect(source.stream))
    expect(exit._tag).toBe("Failure")
  })
})

// ── JsonLinesSource with fake files ──────────────────────────────────────────

describe("JsonLinesSource", () => {
  it("streams records from fake JSONL lines", async () => {
    const source = JsonLinesSource({
      path:  "ignored.jsonl",
      schema: ContactSchema,
      files: fakeJsonLinesFiles([
        '{"email":"alice@example.com","name":"Alice"}',
        '{"email":"bob@example.com","name":"Bob"}',
      ]),
    })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
    expect(records[0]?.email).toBe("alice@example.com")
  })

  it("skips invalid JSON lines silently", async () => {
    const source = JsonLinesSource({
      path:  "ignored.jsonl",
      schema: ContactSchema,
      files: fakeJsonLinesFiles([
        '{"email":"valid@example.com","name":"Valid"}',
        "not json at all",
        '{"email":"another@example.com","name":"Another"}',
      ]),
    })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
  })

  it("count comes from fake files", async () => {
    const source = JsonLinesSource({ path: "ignored.jsonl", schema: ContactSchema, files: fakeJsonLinesFiles([], 99) })
    expect(await run(source.count)).toBe(99)
  })
})
