import { Effect, Schema, Stream } from "effect"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CsvSource, JsonLinesSource } from "../index.js"

const fixtures = (name: string) =>
  join(import.meta.dirname, "fixtures", name)

const ContactSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.refine((s): s is string => s.includes("@"))),
  name:  Schema.String,
})

const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.orDie(effect))

// ── CsvSource ─────────────────────────────────────────────────────────────────

describe("CsvSource", () => {
  it("streams all rows from a valid CSV file", async () => {
    const source = CsvSource({ path: fixtures("valid.csv"), schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
    expect(records[0]).toEqual({ email: "alice@example.com", name: "Alice" })
    expect(records[1]).toEqual({ email: "bob@example.com",   name: "Bob" })
  })

  it("skips rows that fail Schema validation, does not throw", async () => {
    const source = CsvSource({ path: fixtures("partial.csv"), schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream))
    const emails = records.map((r) => r.email)
    expect(emails).toContain("valid@example.com")
    expect(emails).toContain("another@example.com")
    expect(emails).not.toContain("not-an-email")
  })

  it("handles UTF-8 BOM correctly", async () => {
    const source = CsvSource({ path: fixtures("bom.csv"), schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(1)
    expect(records[0]?.email).toBe("carol@example.com")
  })

  it("count returns correct line count without streaming", async () => {
    const source = CsvSource({ path: fixtures("valid.csv"), schema: ContactSchema })
    const total = await run(source.count)
    expect(total).toBe(2)
  })

  it("fails with CsvError when file does not exist", async () => {
    const source = CsvSource({ path: "/nonexistent/file.csv", schema: ContactSchema })
    const exit = await Effect.runPromiseExit(source.count)
    expect(exit._tag).toBe("Failure")
  })
})

// ── JsonLinesSource ───────────────────────────────────────────────────────────

describe("JsonLinesSource", () => {
  it("streams all records from a valid JSONL file", async () => {
    const source = JsonLinesSource({ path: fixtures("valid.jsonl"), schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
    expect(records[0]?.email).toBe("alice@example.com")
  })

  it("skips invalid JSON lines silently", async () => {
    const source = JsonLinesSource({ path: fixtures("partial.jsonl"), schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream))
    expect(records).toHaveLength(2)
    expect(records.map((r) => r.email)).toContain("valid@example.com")
  })

  it("skips lines that fail Schema validation", async () => {
    const source = JsonLinesSource({ path: fixtures("partial.jsonl"), schema: ContactSchema })
    const records = await run(Stream.runCollect(source.stream))
    expect(records.every((r) => r.email.includes("@"))).toBe(true)
  })

  it("count returns number of non-empty lines", async () => {
    const source = JsonLinesSource({ path: fixtures("valid.jsonl"), schema: ContactSchema })
    const total = await run(source.count)
    expect(total).toBe(2)
  })
})

// ── Memory smoke test ─────────────────────────────────────────────────────────

describe("memory", () => {
  it("stays under 256MB RSS on 10k lines", async () => {
    const { writeFileSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const path = join(tmpdir(), "harbor-test-10k.csv")
    const rows = ["email,name", ...Array.from({ length: 10_000 }, (_, i) =>
      `user${i}@example.com,User${i}`
    )].join("\n")
    writeFileSync(path, rows, "utf-8")

    const before = process.memoryUsage().rss
    const source = CsvSource({ path, schema: ContactSchema })
    const count = await run(Stream.runCount(source.stream))
    expect(count).toBe(10_000)

    const delta = process.memoryUsage().rss - before
    expect(delta).toBeLessThan(256 * 1024 * 1024)
  }, 30_000)
})
