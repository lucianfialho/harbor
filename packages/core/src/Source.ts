import type { Effect, Schema, Stream } from "effect"

/**
 * A Source produces a Stream of raw records from an external system.
 * Implementations: PaginatedApiSource, CsvSource, JsonLinesSource
 */
export interface Source<A, E = never, R = never> {
  /** Lazy stream of records — pull-based, no memory accumulation */
  readonly stream: Stream.Stream<A, E, R>
  /** Schema used to validate records at ingress */
  readonly schema: Schema.Schema<A>
  /** Estimated total record count (-1 if unknown) */
  readonly count: Effect.Effect<number, E, R>
}
