import { Schema } from "effect"

export class StageError extends Schema.TaggedErrorClass<StageError>()(
  "harbor/StageError",
  { cause: Schema.Defect, key: Schema.String }
) {}
