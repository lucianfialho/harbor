/**
 * GcsStage — Google Cloud Storage staging for 30M+ records.
 * gs://{bucket}/{prefix}/{key}/records.jsonl  + _manifest.json
 */
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

  const write = (key: string, lines: Stream.Stream<string, StageError>): Effect.Effect<{ total: number }, StageError> =>
    Effect.gen(function*() {
      // Append mode: read existing manifest total
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
    })

  const read = (key: string): Effect.Effect<Stream.Stream<string, StageError>, StageError> =>
    Effect.tryPromise({
      try: async () => {
        const file = bkt.file(rPath(config, key))
        const [exists] = await file.exists()
        if (!exists) throw new Error(`GCS key not found: ${key}`)
        async function* lines() {
          const rl = createInterface({ input: file.createReadStream() as NodeJS.ReadableStream, crlfDelay: Infinity })
          try { for await (const l of rl) { if (l.trim()) yield l.trim() } } finally { rl.close() }
        }
        return Stream.fromAsyncIterable(lines(), (cause) => new StageError({ cause, key })) as Stream.Stream<string, StageError>
      },
      catch: (cause) => new StageError({ cause, key }),
    })

  const exists = (key: string): Effect.Effect<boolean, StageError> =>
    Effect.tryPromise({
      try:   async () => { const [e] = await bkt.file(rPath(config, key)).exists(); return e },
      catch: (cause) => new StageError({ cause, key }),
    }).pipe(Effect.orElseSucceed(() => false))

  return { write, read, exists }
}
