import type { Source } from "@harbor/core"
import { Schema, Stream } from "effect"
import { CsvError } from "./errors.js"
import { NodeJsonLinesFiles, type JsonLinesFilesImpl } from "./CsvFiles.js"

export function JsonLinesSource<A>(options: {
  path:   string
  schema: Schema.Schema<A>
  /** Injectable file capability — defaults to Node.js filesystem */
  files?: JsonLinesFilesImpl
}): Source<A, CsvError> {
  const files  = options.files ?? NodeJsonLinesFiles
  const decode = Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)

  const stream: Stream.Stream<A, CsvError> = files.lines(options.path).pipe(
    Stream.map((line) => {
      try { return decode(JSON.parse(line) as unknown) } catch { return null }
    }),
    Stream.filter((v): v is A => v !== null)
  )

  return { stream, schema: options.schema, count: files.count(options.path) }
}
