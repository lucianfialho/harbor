import { Schema } from "effect"

export class SourceError extends Schema.TaggedErrorClass<SourceError>()(
  "harbor/SourceError",
  { cause: Schema.Defect, message: Schema.String }
) {}

export class DestinationError extends Schema.TaggedErrorClass<DestinationError>()(
  "harbor/DestinationError",
  { cause: Schema.Defect, message: Schema.String, retryable: Schema.Boolean }
) {}

export class StageError extends Schema.TaggedErrorClass<StageError>()(
  "harbor/StageError",
  { cause: Schema.Defect, key: Schema.String }
) {}

export class TransformError extends Schema.TaggedErrorClass<TransformError>()(
  "harbor/TransformError",
  { cause: Schema.Defect, recordId: Schema.String }
) {}
