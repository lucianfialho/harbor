import { Schema } from "effect"

export class CsvError extends Schema.TaggedErrorClass<CsvError>()(
  "harbor/CsvError",
  { cause: Schema.Defect, path: Schema.String }
) {}
