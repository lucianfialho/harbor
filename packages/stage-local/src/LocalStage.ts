import type { Stage } from "@harbor/core"
import { Effect, Stream } from "effect"
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { join } from "node:path"
import { StageError } from "./errors.js"

interface Manifest {
  key:       string
  total:     number
  updatedAt: string
}

const keyDir      = (dir: string, key: string) => join(dir, key)
const recordsPath = (dir: string, key: string) => join(keyDir(dir, key), "records.jsonl")
const manifestPath = (dir: string, key: string) => join(keyDir(dir, key), "_manifest.json")

async function readManifest(dir: string, key: string): Promise<Manifest | null> {
  try {
    const raw = await readFile(manifestPath(dir, key), "utf-8")
    return JSON.parse(raw) as Manifest
  } catch (e) {
    // ENOENT → no manifest yet (return null); JSON parse error → also return null
    // (corrupt manifest resets total; partial writes detected via line count)
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null
    return null
  }
}

async function* streamLines(path: string): AsyncGenerator<string> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  try {
    for await (const line of rl) {
      const t = line.trim()
      if (t.length > 0) yield t
    }
  } finally {
    rl.close()   // always close — prevents file descriptor leak on early disposal
  }
}

export function LocalStage(options: { dir: string }): Stage<StageError> {
  const { dir } = options

  /**
   * Writes a stream of JSONL lines to {dir}/{key}/records.jsonl in append mode.
   * All lines are batched into a single appendFile call to avoid O(N) syscalls.
   * Writes _manifest.json with updated total and timestamp on completion.
   */
  const write = (key: string, lines: Stream.Stream<string, StageError>): Effect.Effect<{ total: number }, StageError> =>
    Effect.gen(function*() {
      const kdir  = keyDir(dir, key)
      const rpath = recordsPath(dir, key)

      yield* Effect.tryPromise({
        try:   () => mkdir(kdir, { recursive: true }),
        catch: (cause) => new StageError({ cause, key }),
      })

      const existing = yield* Effect.tryPromise({
        try:   () => readManifest(dir, key),
        catch: (cause) => new StageError({ cause, key }),
      })
      const prevTotal = existing?.total ?? 0

      // Collect all lines — then single appendFile (avoids O(N) syscalls)
      const collected = yield* Stream.runCollect(lines)

      if (collected.length > 0) {
        const content = collected.join("\n") + "\n"
        yield* Effect.tryPromise({
          try:   () => appendFile(rpath, content, "utf-8"),
          catch: (cause) => new StageError({ cause, key }),
        })
      }

      const total = prevTotal + collected.length
      const manifest: Manifest = { key, total, updatedAt: new Date().toISOString() }
      yield* Effect.tryPromise({
        try:   () => writeFile(manifestPath(dir, key), JSON.stringify(manifest, null, 2), "utf-8"),
        catch: (cause) => new StageError({ cause, key }),
      })

      return { total }
    })

  const read = (key: string): Effect.Effect<Stream.Stream<string, StageError>, StageError> =>
    Effect.tryPromise({
      try: async () => {
        const rpath = recordsPath(dir, key)
        try {
          await stat(rpath)
        } catch {
          throw new Error(`Stage key not found: ${key}`)
        }
        return Stream.fromAsyncIterable(
          streamLines(rpath),
          (cause) => new StageError({ cause, key })
        ) as Stream.Stream<string, StageError>
      },
      catch: (cause) => new StageError({ cause, key }),
    })

  const exists = (key: string): Effect.Effect<boolean, StageError> =>
    Effect.tryPromise({
      try:   async () => { await stat(recordsPath(dir, key)); return true },
      catch: (cause) => new StageError({ cause, key }),
    }).pipe(
      Effect.orElseSucceed(() => false)
    )

  return { write, read, exists }
}
