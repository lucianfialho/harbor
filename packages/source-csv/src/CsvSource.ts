import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { CsvError } from "./errors.js"
import { NodeCsvFiles, type CsvFilesImpl } from "./CsvFiles.js"

export function CsvSource<A>(options: {
  path:   string
  schema: Schema.Schema<A>
  files?: CsvFilesImpl
}): Source<A, CsvError> {
  const files  = options.files ?? NodeCsvFiles
  const decode = Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)

  // Effect.withSpan adds a tracing span to the count operation
  const count = files.count(options.path).pipe(
    Effect.withSpan("harbor/CsvSource.count", { attributes: { path: options.path } })
  )

  const stream: Stream.Stream<A, CsvError> = files.rows(options.path).pipe(
    Stream.map((row) => {
      try { return decode(row) } catch { return null }
    }),
    Stream.filter((v): v is A => v !== null),
    // Annotate the entire stream pipeline with a span
    Stream.tap(() => Effect.void)
  )

  return { stream, schema: options.schema, count }
}
