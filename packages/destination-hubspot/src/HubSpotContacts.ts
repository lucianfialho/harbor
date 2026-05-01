/**
 * HubSpotContacts — injectable HTTP capability for HubSpot batch upsert.
 * Pattern: optional parameter injection (same as CsvFilesImpl in source-csv).
 *
 * Production:  HubSpotContactsLive(config) — uses real fetch
 * Tests:       fakeHubSpotContacts({ ok: N }) or fakeHubSpotContacts({ fail: true })
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
  return {
    batchUpsert: (batch) =>
      Effect.tryPromise({
        try: async () => {
          const inputs = batch.map((c) => ({
            id:         c.email,
            idProperty: "email",
            properties: c as Record<string, unknown>,
          }))

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
      ),
  }
}

export function fakeHubSpotContacts(opts: { ok?: number; fail?: boolean } = {}): HubSpotContactsImpl {
  return {
    batchUpsert: (batch) =>
      opts.fail
        ? Effect.fail(new HubSpotError({ cause: new Error("Fake failure"), message: "Fake failure", retryable: false }))
        : Effect.succeed(opts.ok ?? batch.length),
  }
}
