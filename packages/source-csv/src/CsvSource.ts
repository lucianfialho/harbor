import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { createReadStream } from "node:fs"
import { parse } from "csv-parse"
import { CsvError } from "./errors.js"
import { countNonEmptyLines, safePath } from "./utils.js"


async function* parseCsv(path: string): AsyncGenerator<unknown> {
  const stream = createReadStream(safePath(path))
  const parser = stream.pipe(parse({ columns: true, bom: true, skip_empty_lines: true, trim: true }))
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
      try {
        return decode(row)
      } catch {
        // Skip rows that fail schema validation.
        // Known limitation: Effect defects are also swallowed here.
        // A future version can use Schema.isSchemaError() when module deduplication is stable.
        return null
      }
    }),
    Stream.filter((v): v is A => v !== null)
  )

  // countNonEmptyLines skips blank lines, then subtract 1 for header
  const count = Effect.tryPromise({
    try:   () => countNonEmptyLines(options.path).then((n) => Math.max(0, n - 1)),
    catch: (cause) => new CsvError({ cause, path: options.path }),
  })

  return { stream, schema: options.schema, count }
}
