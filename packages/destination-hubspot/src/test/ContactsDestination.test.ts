import { Effect, Layer, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { ContactsDestination, type HubSpotContact } from "../index.js"
import { HubSpotContacts } from "../HubSpotContacts.js"

const config = { token: "test-token", baseUrl: "https://api.hubapi.com" }

const run = <A, E, R>(effect: Effect.Effect<A, E, R>, layer: Layer.Layer<R>) =>
  Effect.runPromise(Effect.provide(Effect.orDie(effect), layer))

const contact = (i: number): HubSpotContact => ({
  email: `user${i}@example.com`, firstname: "User", lastname: `${i}`,
})

describe("ContactsDestination", () => {
  it("upserts 250 contacts in batches of 100", async () => {
    let callCount = 0
    const countingLayer = Layer.succeed(HubSpotContacts, {
      batchUpsert: (batch) => {
        callCount++
        return Effect.succeed(batch.length)
      },
    })

    const dest   = ContactsDestination(config)
    const result = await run(
      dest.write(Stream.fromIterable(Array.from({ length: 250 }, (_, i) => contact(i)))),
      countingLayer
    )
    expect(result.ok).toBe(250)
    expect(result.errors).toBe(0)
    expect(callCount).toBe(3)  // 100 + 100 + 50
  })

  it("counts errors when batchUpsert fails via HubSpotContacts.fake", async () => {
    const dest   = ContactsDestination(config)
    const result = await run(
      dest.write(Stream.fromIterable([contact(0), contact(1)])),
      HubSpotContacts.fake({ fail: true })
    )
    expect(result.errors).toBeGreaterThan(0)
    expect(result.ok).toBe(0)
  })

  it("returns empty result for empty stream", async () => {
    const dest   = ContactsDestination(config)
    const result = await run(dest.write(Stream.empty), HubSpotContacts.fake())
    expect(result.ok).toBe(0)
  })
})
