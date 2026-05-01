import type { Source } from "@harbor/core"
import { Schema, Stream } from "effect"
import { CsvError } from "./errors.js"
import { NodeCsvFiles, type CsvFilesImpl } from "./CsvFiles.js"

export function CsvSource<A>(options: {
  path:   string
  schema: Schema.Schema<A>
  /** Injectable file capability — defaults to Node.js filesystem */
  files?: CsvFilesImpl
}): Source<A, CsvError> {
  const files  = options.files ?? NodeCsvFiles
  const decode = Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)

  const stream: Stream.Stream<A, CsvError> = files.rows(options.path).pipe(
    Stream.map((row) => {
      try { return decode(row) } catch { return null }
    }),
    Stream.filter((v): v is A => v !== null)
  )

  return { stream, schema: options.schema, count: files.count(options.path) }
}
