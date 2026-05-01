import type { Schema } from "effect"

/** Result of a pipeline run */
export interface ImportResult {
  readonly ok:      number
  readonly errors:  number
  readonly skipped: number
}

/** Log entry for a single record */
export interface LogEntry {
  readonly id:     string
  readonly status: "ok" | "error" | "skipped"
  readonly error?: string
}
