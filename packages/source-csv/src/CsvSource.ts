import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { parse } from "csv-parse"
import { CsvError } from "./errors.js"

async function countLines(path: string): Promise<number> {
  let count = 0
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  for await (const _ of rl) count++
  return Math.max(0, count - 1) // subtract header row
}

async function* parseCsv(path: string): AsyncGenerator<unknown> {
  const stream = createReadStream(path)
  const parser = stream.pipe(parse({ columns: true, bom: true, skip_empty_lines: true, trim: true }))

  // Surface stream errors (e.g. ENOENT) through the async iterator
  stream.on("error", (err) => parser.destroy(err))

  for await (const row of parser) yield row
}

export function CsvSource<A>(options: {
  path:   string
  schema: Schema.Schema<A>
}): Source<A, CsvError> {
  const decode = Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)

  const stream: Stream.Stream<A, CsvError> = Stream.fromAsyncIterable(
    parseCsv(options.path),
    (cause) => new CsvError({ cause, path: options.path })
  ).pipe(
    Stream.map((row) => {
      try { return decode(row) } catch { return null }
    }),
    Stream.filter((v): v is A => v !== null)
  )

  const count = Effect.tryPromise({
    try:   () => countLines(options.path),
    catch: (cause) => new CsvError({ cause, path: options.path }),
  })

  return { stream, schema: options.schema, count }
}
