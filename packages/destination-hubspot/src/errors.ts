import { Schema } from "effect"

export class HubSpotError extends Schema.TaggedErrorClass<HubSpotError>()(
  "harbor/HubSpotError",
  {
    cause:     Schema.Defect,
    message:   Schema.String,
    status:    Schema.optional(Schema.Number),
    retryable: Schema.Boolean,
  }
) {}
