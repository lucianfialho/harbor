import type { Source } from "@harbor/core"
import { Effect, Schema, Stream } from "effect"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { CsvError } from "./errors.js"
import { countNonEmptyLines, safePath } from "./utils.js"


async function* readLines(path: string): AsyncGenerator<string> {
  const rl = createInterface({ input: createReadStream(safePath(path)), crlfDelay: Infinity })
  try {
    for await (const line of rl) {
      const t = line.trim()
      if (t.length > 0) yield t
    }
  } finally {
    rl.close()
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
        // Skip lines that fail JSON parsing or schema validation.
        // Known limitation: Effect defects also swallowed here.
        return null
      }
    }),
    Stream.filter((v): v is A => v !== null)
  )

  const count = Effect.tryPromise({
    try:   () => countNonEmptyLines(options.path),
    catch: (cause) => new CsvError({ cause, path: options.path }),
  })

  return { stream, schema: options.schema, count }
}
