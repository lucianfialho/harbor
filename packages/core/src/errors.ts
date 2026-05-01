import { Schema } from "effect"

export class SourceError extends Schema.TaggedError<SourceError>()(
  "harbor/SourceError",
  { cause: Schema.Defect, message: Schema.String }
) {}

export class DestinationError extends Schema.TaggedError<DestinationError>()(
  "harbor/DestinationError",
  { cause: Schema.Defect, message: Schema.String, retryable: Schema.Boolean }
) {}

export class StageError extends Schema.TaggedError<StageError>()(
  "harbor/StageError",
  { cause: Schema.Defect, key: Schema.String }
) {}

export class TransformError extends Schema.TaggedError<TransformError>()(
  "harbor/TransformError",
  { cause: Schema.Defect, recordId: Schema.String }
) {}
