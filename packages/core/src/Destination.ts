import type { Effect, Stream } from "effect"
import type { ImportResult } from "./ImportResult.js"

/**
 * A Destination consumes a Stream of records and writes them to an external system.
 * Implementations: HubSpotDestination
 */
export interface Destination<A, E = never, R = never> {
  readonly write: (
    stream: Stream.Stream<A, E, R>
  ) => Effect.Effect<ImportResult, E, R>
}
