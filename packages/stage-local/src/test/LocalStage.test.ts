import { Effect, Stream } from "effect"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import { LocalStage } from "../index.js"

const testDir = () => join(tmpdir(), `harbor-stage-test-${Date.now()}`)
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.orDie(effect))

describe("LocalStage", () => {
  it("write and read back 10k records — counts match", async () => {
    const stage = LocalStage({ dir: testDir() })
    const lines = Array.from({ length: 10_000 }, (_, i) => `{"id":${i}}`)
    const stream = Stream.fromIterable(lines)

    const { total } = await run(stage.write("contacts", stream))
    expect(total).toBe(10_000)

    const readStream = await run(stage.read("contacts"))
    const count = await run(Stream.runCount(readStream))
    expect(count).toBe(10_000)
  }, 15_000)

  it("exists returns false for unknown key, true after write", async () => {
    const stage = LocalStage({ dir: testDir() })
    expect(await run(stage.exists("nope"))).toBe(false)

    await run(stage.write("ok", Stream.fromIterable(["line"])))
    expect(await run(stage.exists("ok"))).toBe(true)
  })

  it("write is append-mode — second write adds to existing file", async () => {
    const stage = LocalStage({ dir: testDir() })
    await run(stage.write("k", Stream.fromIterable(["a", "b"])))
    const { total } = await run(stage.write("k", Stream.fromIterable(["c"])))
    expect(total).toBe(3)

    const s = await run(stage.read("k"))
    expect(await run(Stream.runCount(s))).toBe(3)
  })

  it("manifest contains correct total and timestamp", async () => {
    const dir = testDir()
    const stage = LocalStage({ dir })
    await run(stage.write("m", Stream.fromIterable(["x", "y", "z"])))

    const manifest = JSON.parse(
      await readFile(join(dir, "m", "_manifest.json"), "utf-8")
    )
    expect(manifest.total).toBe(3)
    expect(manifest.key).toBe("m")
    expect(typeof manifest.updatedAt).toBe("string")
  })

  it("read on non-existent key returns StageError", async () => {
    const stage = LocalStage({ dir: testDir() })
    const exit = await Effect.runPromiseExit(stage.read("missing"))
    expect(exit._tag).toBe("Failure")
  })

  it("write handles empty stream without creating corrupt manifest", async () => {
    const dir = testDir()
    const stage = LocalStage({ dir })
    const { total } = await run(stage.write("empty", Stream.empty))
    expect(total).toBe(0)

    const manifest = JSON.parse(
      await readFile(join(dir, "empty", "_manifest.json"), "utf-8")
    )
    expect(manifest.total).toBe(0)
  })
})
