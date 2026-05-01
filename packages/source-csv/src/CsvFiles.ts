/**
 * CsvFiles — injectable file capability interface.
 * Pattern: optional parameter injection (no Effect Context.Service needed).
 *
 * Production:  default (NodeCsvFiles) — reads real filesystem
 * Tests:       pass a fake implementation via options
 *
 * Why not Context.Service: bun workspace resolves effect@3.x in this
 * package's local node_modules, causing version mismatch with the
 * service key created by the root effect@4.x. Plain interface injection
 * avoids the runtime mismatch and achieves the same testability goal.
 */
import { Effect, Stream } from "effect"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { parse } from "csv-parse"
import { CsvError } from "./errors.js"
import { countNonEmptyLines, safePath } from "./utils.js"

// ── CSV files ─────────────────────────────────────────────────────────────────

export interface CsvFilesImpl {
  rows:  (path: string) => Stream.Stream<unknown, CsvError>
  count: (path: string) => Effect.Effect<number, CsvError>
}

export const NodeCsvFiles: CsvFilesImpl = {
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
}

export function fakeCsvFiles(rows: ReadonlyArray<unknown>, total?: number): CsvFilesImpl {
  return {
    rows:  () => Stream.fromIterable(rows),
    count: () => Effect.succeed(total ?? rows.length),
  }
}

// ── JSONL files ───────────────────────────────────────────────────────────────

export interface JsonLinesFilesImpl {
  lines: (path: string) => Stream.Stream<string, CsvError>
  count: (path: string) => Effect.Effect<number, CsvError>
}

export const NodeJsonLinesFiles: JsonLinesFilesImpl = {
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
}

export function fakeJsonLinesFiles(lines: ReadonlyArray<string>, total?: number): JsonLinesFilesImpl {
  return {
    lines: () => Stream.fromIterable(lines),
    count: () => Effect.succeed(total ?? lines.length),
  }
}
