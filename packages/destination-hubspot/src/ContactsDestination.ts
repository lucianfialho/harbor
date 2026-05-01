/**
 * HubSpot Contacts destination — batch upsert by email, 100 per request.
 *
 * Uses Stream.grouped(100) from effect-smol:
 *   src/Stream.ts line 7686 — grouped returns NonEmptyReadonlyArray<A>
 *
 * HTTP via fetch + Effect.tryPromise for simplicity (no Context dependency).
 * Schedule.exponential + jittered for 429 retry.
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

const retrySchedule = Schedule.exponential("200 millis").pipe(
  Schedule.either(Schedule.spaced("10 seconds")),
  Schedule.jittered
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
          "Authorization":  `Bearer ${config.token}`,
          "Content-Type":   "application/json",
          "Accept":         "application/json",
        },
        body: JSON.stringify({ inputs }),
      })

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") ?? "10", 10)
        throw Object.assign(new Error("Rate limited"), { status: 429, retryAfter })
      }

      if (!res.ok) {
        const text = await res.text()
        throw Object.assign(new Error(`HubSpot ${res.status}: ${text}`), { status: res.status })
      }

      const data = (await res.json()) as { results?: unknown[] }
      return data.results?.length ?? batch.length
    },
    catch: (cause) => new HubSpotError({
      cause,
      message:   (cause as Error).message ?? "Unknown error",
      status:    (cause as { status?: number }).status,
      retryable: [429, 500, 502, 503, 504].includes((cause as { status?: number }).status ?? 0),
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
