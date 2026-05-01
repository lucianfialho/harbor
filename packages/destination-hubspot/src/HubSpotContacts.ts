/**
 * HubSpotContacts — injectable HTTP capability for HubSpot batch upsert.
 * Uses Effect.fn("harbor/HubSpotContacts.batchUpsert") for automatic tracing spans.
 */
import { Effect, Schedule } from "effect"
import { HubSpotError } from "./errors.js"
import type { HubSpotContact, HubSpotConfig } from "./ContactsDestination.js"

export interface HubSpotContactsImpl {
  readonly batchUpsert: (
    batch: ReadonlyArray<HubSpotContact>
  ) => Effect.Effect<number, HubSpotError>
}

const retrySchedule = Schedule.exponential("200 millis").pipe(
  Schedule.both(Schedule.recurs(8)),
  Schedule.jittered
)

export function HubSpotContactsLive(config: HubSpotConfig): HubSpotContactsImpl {
  // Effect.fn adds a tracing span — visible as "harbor/HubSpotContacts.batchUpsert" in OTel traces
  const batchUpsert = Effect.fn("harbor/HubSpotContacts.batchUpsert")(
    function*(batch: ReadonlyArray<HubSpotContact>) {
      const inputs = batch.map((c) => ({
        id:         c.email,
        idProperty: "email",
        properties: c as Record<string, unknown>,
      }))

      const result = yield* Effect.tryPromise({
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

          if (res.status === 429)
            throw Object.assign(new Error("Rate limited"), { status: 429 })
          if (!res.ok) {
            const text = await res.text()
            throw Object.assign(new Error(`HubSpot ${res.status}: ${text}`), { status: res.status })
          }

          const data = (await res.json()) as { results?: unknown[]; errors?: unknown[] }
          const batchErrors = data.errors?.length ?? 0
          return Math.max(0, (data.results?.length ?? batch.length) - batchErrors)
        },
        catch: (cause) => new HubSpotError({
          cause,
          message:   (cause as Error).message ?? "Unknown error",
          status:    (cause as { status?: number }).status,
          retryable: cause instanceof TypeError ||
            [429, 500, 502, 503, 504].includes((cause as { status?: number }).status ?? 0),
        }),
      }).pipe(
        Effect.retry({ schedule: retrySchedule, while: (e) => e.retryable })
      )

      return result
    }
  )

  return { batchUpsert }
}

export function fakeHubSpotContacts(opts: { ok?: number; fail?: boolean } = {}): HubSpotContactsImpl {
  return {
    batchUpsert: opts.fail
      ? Effect.fn("harbor/HubSpotContacts.batchUpsert.fake")(function*(_batch) {
          return yield* Effect.fail(new HubSpotError({ cause: new Error("Fake failure"), message: "Fake failure", retryable: false }))
        })
      : Effect.fn("harbor/HubSpotContacts.batchUpsert.fake")(function*(batch) {
          return yield* Effect.succeed(opts.ok ?? batch.length)
        }),
  }
}
