/**
 * HubSpot Contacts destination — batch upsert by email, 100 per request.
 *
 * Stream.grouped(100) verified against effect-smol src/Stream.ts:7686.
 * Retry capped at 8 attempts (~10s max cumulative) to avoid infinite hangs.
 * Network errors (TypeError) treated as retryable — same as 5xx.
 */
import type { Destination, ImportResult } from "@harbor/core"
import { Effect, Schedule, Stream } from "effect"
import { HubSpotError } from "./errors.js"

export interface HubSpotContact {
  readonly email:      string
  readonly firstname?: string
  readonly lastname?:  string
  readonly phone?:     string
  readonly company?:   string
  readonly [key: string]: unknown
}

export interface HubSpotConfig {
  readonly token:   string
  readonly baseUrl: string
}

const BATCH_SIZE = 100

// Capped exponential backoff — max 8 retries (~10s cumulative) to prevent infinite hang
// Schedule.both: both schedules must agree to continue (exponential AND recurs cap)
const retrySchedule = Schedule.both(
  Schedule.exponential("200 millis").pipe(
    Schedule.either(Schedule.spaced("10 seconds")),
    Schedule.jittered
  ),
  Schedule.recurs(8)
)

function batchUpsert(
  config: HubSpotConfig,
  batch: ReadonlyArray<HubSpotContact>
): Effect.Effect<number, HubSpotError> {
  const inputs = batch.map((c) => ({
    id:         c.email,
    idProperty: "email",
    properties: c as Record<string, unknown>,
  }))

  return Effect.tryPromise({
    try: async () => {
      const res = await fetch(`${config.baseUrl}/crm/v3/objects/contacts/batch/upsert`, {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${config.token}`,
          "Content-Type":  "application/json",
          "Accept":        "application/json",
        },
        body: JSON.stringify({ inputs }),
      })

      if (res.status === 429) {
        // Honor Retry-After if present, otherwise let Schedule handle timing
        throw Object.assign(new Error("Rate limited"), { status: 429 })
      }

      if (!res.ok) {
        const text = await res.text()
        throw Object.assign(new Error(`HubSpot ${res.status}: ${text}`), { status: res.status })
      }

      const data = (await res.json()) as { results?: unknown[]; errors?: unknown[] }

      // HubSpot returns HTTP 200 even for partial failures.
      // data.errors contains per-record failures within the batch.
      const batchErrors = data.errors?.length ?? 0
      const batchOk     = (data.results?.length ?? batch.length) - batchErrors
      return Math.max(0, batchOk)
    },
    catch: (cause) => new HubSpotError({
      cause,
      message:   (cause as Error).message ?? "Unknown error",
      status:    (cause as { status?: number }).status,
      // Network errors (TypeError: failed to fetch) AND 429/5xx are retryable
      retryable:
        cause instanceof TypeError ||
        [429, 500, 502, 503, 504].includes((cause as { status?: number }).status ?? 0),
    }),
  }).pipe(
    Effect.retry({
      schedule: retrySchedule,
      while:    (e) => e.retryable,
    })
  )
}

export function ContactsDestination(
  config: HubSpotConfig
): Destination<HubSpotContact, HubSpotError> {
  const write = (stream: Stream.Stream<HubSpotContact, HubSpotError>) =>
    Effect.gen(function*() {
      let ok = 0, errors = 0

      yield* stream.pipe(
        Stream.grouped(BATCH_SIZE),
        Stream.mapEffect((batch: ReadonlyArray<HubSpotContact>) =>
          batchUpsert(config, batch).pipe(
            Effect.tap((count) => Effect.sync(() => { ok += count })),
            Effect.tapError(() => Effect.sync(() => { errors += batch.length })),
            Effect.orElseSucceed(() => 0)
          )
        ),
        Stream.runDrain
      )

      return { ok, errors, skipped: 0 } satisfies ImportResult
    })

  return { write }
}
