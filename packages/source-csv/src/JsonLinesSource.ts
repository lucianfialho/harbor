import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { CsvError } from "./errors.js"
import { JsonLinesFiles } from "./CsvFiles.js"

export function JsonLinesSource<A>(options: {
  path:   string
  schema: Schema.Schema<A>
}): Source<A, CsvError, typeof JsonLinesFiles> {
  const decode = Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)

  const stream: Stream.Stream<A, CsvError, typeof JsonLinesFiles> = Stream.unwrap(
    Effect.gen(function*() {
      const fs = yield* JsonLinesFiles
      return fs.lines(options.path).pipe(
        Stream.map((line) => { try { return decode(JSON.parse(line) as unknown) } catch { return null } }),
        Stream.filter((v): v is A => v !== null)
      )
    })
  )

  const count: Effect.Effect<number, CsvError, typeof JsonLinesFiles> =
    Effect.gen(function*() {
      const fs = yield* JsonLinesFiles
      return yield* fs.count(options.path)
    })

  return { stream, schema: options.schema, count }
}
