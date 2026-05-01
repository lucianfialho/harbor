import { Schema } from "effect"

export class OpenApiError extends Schema.TaggedErrorClass<OpenApiError>()(
  "harbor/OpenApiError",
  { cause: Schema.Defect, message: Schema.String }
) {}
