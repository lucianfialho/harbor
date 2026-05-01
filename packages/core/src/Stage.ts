import type { Effect, Stream } from "effect"

/** A single entry written/read from a Stage */
export interface StageEntry {
  readonly line: string
}

/**
 * A Stage is an intermediate persistent store between Source and Destination.
 * Used to decouple extraction from loading — essential for 30M+ records.
 * Implementations: LocalStage, GcsStage
 */
export interface Stage<E = never, R = never> {
  /** Write a stream of JSONL lines to a key */
  readonly write: (
    key: string,
    lines: Stream.Stream<string, E, R>
  ) => Effect.Effect<{ total: number }, E, R>

  /** Read a key back as a stream of JSONL lines */
  readonly read: (
    key: string
  ) => Effect.Effect<Stream.Stream<string, E, R>, E, R>

  /** Check if a key exists */
  readonly exists: (key: string) => Effect.Effect<boolean, E, R>
}
