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

function keyDir(dir: string, key: string): string {
  return join(dir, key)
}

function recordsPath(dir: string, key: string): string {
  return join(keyDir(dir, key), "records.jsonl")
}

function manifestPath(dir: string, key: string): string {
  return join(keyDir(dir, key), "_manifest.json")
}

async function readManifest(dir: string, key: string): Promise<Manifest | null> {
  try {
    const raw = await readFile(manifestPath(dir, key), "utf-8")
    return JSON.parse(raw) as Manifest
  } catch {
    return null
  }
}

async function* streamLines(path: string): AsyncGenerator<string> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  for await (const line of rl) {
    const t = line.trim()
    if (t.length > 0) yield t
  }
}

export function LocalStage(options: { dir: string }): Stage<StageError> {
  const { dir } = options

  const write = (key: string, lines: Stream.Stream<string, StageError>): Effect.Effect<{ total: number }, StageError> =>
    Effect.tryPromise({
      try: async () => {
        const kdir = keyDir(dir, key)
        await mkdir(kdir, { recursive: true })

        const rpath = recordsPath(dir, key)
        const existing = await readManifest(dir, key)
        let total = existing?.total ?? 0

        const collected = await Effect.runPromise(
          Stream.runCollect(lines).pipe(
            Effect.mapError((e) => { throw e })
          )
        )

        for (const line of collected) {
          await appendFile(rpath, line + "\n", "utf-8")
          total++
        }

        const manifest: Manifest = { key, total, updatedAt: new Date().toISOString() }
        await writeFile(manifestPath(dir, key), JSON.stringify(manifest, null, 2), "utf-8")
        return { total }
      },
      catch: (cause) => new StageError({ cause, key }),
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
        const stream: Stream.Stream<string, StageError> = Stream.fromAsyncIterable(
          streamLines(rpath),
          (cause) => new StageError({ cause, key })
        )
        return stream
      },
      catch: (cause) => new StageError({ cause, key }),
    })

  const exists = (key: string): Effect.Effect<boolean, StageError> =>
    Effect.tryPromise({
      try:   async () => { await stat(recordsPath(dir, key)); return true },
      catch: () => false as unknown as StageError,
    }).pipe(
      Effect.orElseSucceed(() => false)
    )

  return { write, read, exists }
}
