import type { Stage } from "@harbor/core"
import { StageError } from "./errors.js"
import { Effect, Stream } from "effect"
import { Storage } from "@google-cloud/storage"
import { createInterface } from "node:readline"

export interface GcsStageConfig {
  bucket:     string
  prefix?:    string
  projectId?: string
  keyFile?:   string
}

interface Manifest { key: string; total: number; updatedAt: string }

function rPath(cfg: GcsStageConfig, key: string) {
  return `${cfg.prefix ? `${cfg.prefix}/` : ""}${key}/records.jsonl`
}
function mPath(cfg: GcsStageConfig, key: string) {
  return `${cfg.prefix ? `${cfg.prefix}/` : ""}${key}/_manifest.json`
}

export function GcsStage(config: GcsStageConfig): Stage<StageError> {
  const storage = new Storage({ projectId: config.projectId, keyFilename: config.keyFile })
  const bkt     = storage.bucket(config.bucket)

  const write = Effect.fn("harbor/GcsStage.write")(
    function*(key: string, lines: Stream.Stream<string, StageError>) {
      const prevTotal = yield* Effect.tryPromise({
        try:   async () => { const [b] = await bkt.file(mPath(config, key)).download(); return (JSON.parse(b.toString()) as Manifest).total },
        catch: () => 0 as unknown as StageError,
      }).pipe(Effect.orElseSucceed(() => 0))

      const collected = yield* Stream.runCollect(lines)

      if (collected.length > 0) {
        const existing = yield* Effect.tryPromise({
          try:   async () => { const [b] = await bkt.file(rPath(config, key)).download(); return b.toString() },
          catch: () => "" as unknown as StageError,
        }).pipe(Effect.orElseSucceed(() => ""))

        yield* Effect.tryPromise({
          try:   () => bkt.file(rPath(config, key)).save(existing + collected.join("\n") + "\n", { resumable: false }),
          catch: (cause) => new StageError({ cause, key }),
        })
      }

      const total = prevTotal + collected.length
      yield* Effect.tryPromise({
        try:   () => bkt.file(mPath(config, key)).save(JSON.stringify({ key, total, updatedAt: new Date().toISOString() }, null, 2), { resumable: false }),
        catch: (cause) => new StageError({ cause, key }),
      })
      return { total }
    }
  )

  const read = Effect.fn("harbor/GcsStage.read")(
    function*(key: string) {
      const file = bkt.file(rPath(config, key))
      const fileExists = yield* Effect.tryPromise({
        try:   () => file.exists().then(([e]) => e),
        catch: (cause) => new StageError({ cause, key }),
      })
      if (!fileExists)
        return yield* Effect.fail(new StageError({ cause: new Error(`GCS key not found: ${key}`), key }))

      async function* lines() {
        const rl = createInterface({ input: file.createReadStream() as NodeJS.ReadableStream, crlfDelay: Infinity })
        try { for await (const l of rl) { if (l.trim()) yield l.trim() } } finally { rl.close() }
      }

      return Stream.fromAsyncIterable(lines(), (cause) => new StageError({ cause, key })) as Stream.Stream<string, StageError>
    }
  )

  const exists = Effect.fn("harbor/GcsStage.exists")(
    function*(key: string) {
      return yield* Effect.tryPromise({
        try:   async () => { const [e] = await bkt.file(rPath(config, key)).exists(); return e },
        catch: (cause) => new StageError({ cause, key }),
      }).pipe(Effect.orElseSucceed(() => false))
    }
  )

  return { write, read, exists }
}
