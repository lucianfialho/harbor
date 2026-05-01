import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { CsvError } from "./errors.js"
import { CsvFiles } from "./CsvFiles.js"

export function CsvSource<A>(options: {
  path:   string
  schema: Schema.Schema<A>
}): Source<A, CsvError, typeof CsvFiles> {
  const decode = Schema.decodeUnknownSync(options.schema as Schema.Decoder<A>)

  // Use Effect.gen (not CsvFiles.pipe) — yield* CsvFiles works in Effect.gen
  const stream: Stream.Stream<A, CsvError, typeof CsvFiles> = Stream.unwrap(
    Effect.gen(function*() {
      const fs = yield* CsvFiles
      return fs.rows(options.path).pipe(
        Stream.map((row) => { try { return decode(row) } catch { return null } }),
        Stream.filter((v): v is A => v !== null)
      )
    })
  )

  const count: Effect.Effect<number, CsvError, typeof CsvFiles> =
    Effect.gen(function*() {
      const fs = yield* CsvFiles
      return yield* fs.count(options.path)
    })

  return { stream, schema: options.schema, count }
}
