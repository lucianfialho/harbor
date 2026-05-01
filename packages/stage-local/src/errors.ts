// Re-export StageError from @harbor/core to avoid duplicate _tag "harbor/StageError"
// which would break Effect.catchTag in downstream consumers.
export { StageError } from "@harbor/core"
