/**
 * CsvFiles / JsonLinesFiles — Context.Service para capacidades de arquivo.
 *
 * Padrão do amigo (Ports & Adapters com Effect):
 *
 *   // Produção — lê o filesystem real
 *   program.pipe(Effect.provide(CsvFiles.layer))
 *
 *   // Teste — dados em memória, sem disco
 *   program.pipe(Effect.provide(CsvFiles.fake([{ email: "a@b.com" }])))
 */
import { Context, Effect, Layer, Stream } from "effect"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { parse } from "csv-parse"
import { CsvError } from "./errors.js"
import { countNonEmptyLines, safePath } from "./utils.js"

// ── CsvFiles ──────────────────────────────────────────────────────────────────

export interface CsvFilesShape {
  rows:  (path: string) => Stream.Stream<unknown, CsvError>
  count: (path: string) => Effect.Effect<number, CsvError>
}

const _CsvFiles = Context.Service<CsvFilesShape>("harbor/CsvFiles")

export const CsvFiles = Object.assign(_CsvFiles, {
  /** Production layer — Node.js filesystem */
  layer: Layer.succeed(_CsvFiles, {
    rows: (path) => {
      async function* parseCsv() {
        const stream = createReadStream(safePath(path))
        const parser = stream.pipe(parse({ columns: true, bom: true, skip_empty_lines: true, trim: true }))
        stream.on("error", (err) => parser.destroy(err))
        for await (const row of parser) yield row
      }
      return Stream.fromAsyncIterable(parseCsv(), (cause) => new CsvError({ cause, path }))
    },
    count: (path) => Effect.tryPromise({
      try:   () => countNonEmptyLines(path).then((n) => Math.max(0, n - 1)),
      catch: (cause) => new CsvError({ cause, path }),
    }),
  } as CsvFilesShape),

  /** Test helper — inject static rows, no disk */
  fake: (rows: ReadonlyArray<unknown>, total?: number): Layer.Layer<typeof _CsvFiles> =>
    Layer.succeed(_CsvFiles, {
      rows:  () => Stream.fromIterable(rows),
      count: () => Effect.succeed(total ?? rows.length),
    } as CsvFilesShape),
})

// ── JsonLinesFiles ────────────────────────────────────────────────────────────

export interface JsonLinesFilesShape {
  lines: (path: string) => Stream.Stream<string, CsvError>
  count: (path: string) => Effect.Effect<number, CsvError>
}

const _JsonLinesFiles = Context.Service<JsonLinesFilesShape>("harbor/JsonLinesFiles")

export const JsonLinesFiles = Object.assign(_JsonLinesFiles, {
  layer: Layer.succeed(_JsonLinesFiles, {
    lines: (path) => {
      async function* readLines() {
        const rl = createInterface({ input: createReadStream(safePath(path)), crlfDelay: Infinity })
        try { for await (const l of rl) { if (l.trim()) yield l.trim() } }
        finally { rl.close() }
      }
      return Stream.fromAsyncIterable(readLines(), (cause) => new CsvError({ cause, path }))
    },
    count: (path) => Effect.tryPromise({
      try:   () => countNonEmptyLines(path),
      catch: (cause) => new CsvError({ cause, path }),
    }),
  } as JsonLinesFilesShape),

  fake: (lines: ReadonlyArray<string>, total?: number): Layer.Layer<typeof _JsonLinesFiles> =>
    Layer.succeed(_JsonLinesFiles, {
      lines: () => Stream.fromIterable(lines),
      count: () => Effect.succeed(total ?? lines.length),
    } as JsonLinesFilesShape),
})
