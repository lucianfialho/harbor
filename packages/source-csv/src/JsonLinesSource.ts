import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { CsvError } from "./errors.js"

async function countLines(path: string): Promise<number> {
  let count = 0
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  for await (const _ of rl) count++
  return count
}

async function* readLines(path: string): AsyncGenerator<string> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  for await (const line of rl) {
    const t = line.trim()
    if (t.length > 0) yield t
  }
}

export function JsonLinesSource<A>(options: {
  path:   string
  schema: Schema.Schema<A>
}): Source<A, CsvError> {
  const decode = Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)

  const stream: Stream.Stream<A, CsvError> = Stream.fromAsyncIterable(
    readLines(options.path),
    (cause) => new CsvError({ cause, path: options.path })
  ).pipe(
    Stream.map((line) => {
      try {
        const raw = JSON.parse(line) as unknown
        return decode(raw)
      } catch {
        return null
      }
    }),
    Stream.filter((v): v is A => v !== null)
  )

  const count = Effect.tryPromise({
    try:   () => countLines(options.path),
    catch: (cause) => new CsvError({ cause, path: options.path }),
  })

  return { stream, schema: options.schema, count }
}
