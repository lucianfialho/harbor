import type { Effect } from "effect"
import type { Destination } from "./Destination.js"
import type { ImportResult } from "./ImportResult.js"
import type { Source } from "./Source.js"
import type { Stage } from "./Stage.js"

export interface PipelineConfig<Raw, Mapped, E = never, R = never> {
  readonly source:      Source<Raw, E, R>
  readonly transform:   (raw: Raw) => Effect.Effect<Mapped, E, R>
  readonly destination: Destination<Mapped, E, R>
  /** Optional staging layer — required for > 50k records */
  readonly stage?:      Stage<E, R>
  readonly batchSize?:  number
}

export interface Pipeline<Raw, Mapped, E = never, R = never> {
  readonly config: PipelineConfig<Raw, Mapped, E, R>
  readonly run:    Effect.Effect<ImportResult, E, R>
}
