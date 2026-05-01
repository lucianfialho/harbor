/**
 * HubSpotContacts — Context.Service para HTTP capability do HubSpot.
 *
 * Produção:  Effect.provide(HubSpotContacts.live(config))
 * Teste:     Effect.provide(HubSpotContacts.fake({ ok: N }))
 */
import { Context, Effect, Layer, Schedule } from "effect"
import { HubSpotError } from "./errors.js"
import type { HubSpotContact, HubSpotConfig } from "./ContactsDestination.js"

export interface HubSpotContactsShape {
  readonly batchUpsert: (
    batch: ReadonlyArray<HubSpotContact>
  ) => Effect.Effect<number, HubSpotError>
}

const _HubSpotContacts = Context.Service<HubSpotContactsShape>("harbor/HubSpotContacts")

const retrySchedule = Schedule.exponential("200 millis").pipe(
  Schedule.both(Schedule.recurs(8)),
  Schedule.jittered
)

export const HubSpotContacts = Object.assign(_HubSpotContacts, {
  /** Production layer — real fetch */
  live: (config: HubSpotConfig): Layer.Layer<typeof _HubSpotContacts> =>
    Layer.succeed(_HubSpotContacts, {
      batchUpsert: Effect.fn("harbor/HubSpotContacts.batchUpsert")(function*(batch) {
        const inputs = batch.map((c) => ({ id: c.email, idProperty: "email", properties: c as Record<string, unknown> }))
        const result = yield* Effect.tryPromise({
          try: async () => {
            const res = await fetch(`${config.baseUrl}/crm/v3/objects/contacts/batch/upsert`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${config.token}`, "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify({ inputs }),
            })
            if (res.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 })
            if (!res.ok) { const t = await res.text(); throw Object.assign(new Error(`HubSpot ${res.status}: ${t}`), { status: res.status }) }
            const data = (await res.json()) as { results?: unknown[]; errors?: unknown[] }
            return Math.max(0, (data.results?.length ?? batch.length) - (data.errors?.length ?? 0))
          },
          catch: (cause) => new HubSpotError({
            cause, message: (cause as Error).message ?? "Unknown",
            status:    (cause as { status?: number }).status,
            retryable: cause instanceof TypeError || [429,500,502,503,504].includes((cause as { status?: number }).status ?? 0),
          }),
        }).pipe(Effect.retry({ schedule: retrySchedule, while: (e) => e.retryable }))
        return result
      }),
    } as HubSpotContactsShape),

  /** Test helper — always succeeds (or fails) */
  fake: (opts: { ok?: number; fail?: boolean } = {}): Layer.Layer<typeof _HubSpotContacts> =>
    Layer.succeed(_HubSpotContacts, {
      batchUpsert: opts.fail
        ? () => Effect.fail(new HubSpotError({ cause: new Error("fake"), message: "Fake failure", retryable: false }))
        : (batch) => Effect.succeed(opts.ok ?? batch.length),
    } as HubSpotContactsShape),
})

// Keep backward-compat exports for external users
export type { HubSpotContactsShape as HubSpotContactsImpl }
export const HubSpotContactsLive = (config: HubSpotConfig) => HubSpotContacts.live(config)
export const fakeHubSpotContacts  = (opts?: { ok?: number; fail?: boolean }) => HubSpotContacts.fake(opts)
