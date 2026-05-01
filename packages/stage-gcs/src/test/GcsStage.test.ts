import { Effect, Stream } from "effect"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { GcsStage } from "../GcsStage.js"

const run = <A, E>(e: Effect.Effect<A, E>) => Effect.runPromise(Effect.orDie(e))

// Mock @google-cloud/storage
const fileStore = new Map<string, string>()

const mockFile = (path: string) => ({
  exists:        vi.fn(async () => [fileStore.has(path)]),
  download:      vi.fn(async () => [Buffer.from(fileStore.get(path) ?? "")]),
  save:          vi.fn(async (content: string) => { fileStore.set(path, content) }),
  createReadStream: vi.fn(() => {
    const { Readable } = require("node:stream")
    return Readable.from([fileStore.get(path) ?? ""])
  }),
})

vi.mock("@google-cloud/storage", () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockImplementation((path: string) => mockFile(path)),
    }),
  })),
}))

describe("GcsStage", () => {
  beforeEach(() => { fileStore.clear() })

  it("write stores lines in GCS and returns total", async () => {
    const stage = GcsStage({ bucket: "test-bucket" })
    const { total } = await run(stage.write("contacts", Stream.fromIterable(["a", "b", "c"])))
    expect(total).toBe(3)
    expect(fileStore.has("contacts/records.jsonl")).toBe(true)
    expect(fileStore.has("contacts/_manifest.json")).toBe(true)
  })

  it("exists returns false for missing key, true after write", async () => {
    const stage = GcsStage({ bucket: "test-bucket" })
    expect(await run(stage.exists("missing"))).toBe(false)
    await run(stage.write("k", Stream.fromIterable(["line"])))
    expect(await run(stage.exists("k"))).toBe(true)
  })

  it("manifest contains correct total and timestamp", async () => {
    const stage = GcsStage({ bucket: "test-bucket" })
    await run(stage.write("m", Stream.fromIterable(["x", "y"])))
    const manifest = JSON.parse(fileStore.get("m/_manifest.json") ?? "{}")
    expect(manifest.total).toBe(2)
    expect(manifest.key).toBe("m")
    expect(typeof manifest.updatedAt).toBe("string")
  })

  it("read on missing key returns StageError", async () => {
    const stage = GcsStage({ bucket: "test-bucket" })
    const exit = await Effect.runPromiseExit(stage.read("missing"))
    expect(exit._tag).toBe("Failure")
  })

  it("prefix is applied to file paths", async () => {
    const stage = GcsStage({ bucket: "test-bucket", prefix: "migrations/2026" })
    await run(stage.write("contacts", Stream.fromIterable(["line"])))
    expect(fileStore.has("migrations/2026/contacts/records.jsonl")).toBe(true)
  })
})
