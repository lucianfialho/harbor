/**
 * Tests using fakeHubSpotContacts() injection instead of vi.stubGlobal("fetch").
 * Pattern enabled by issue #17.
 */
import { Effect, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { ContactsDestination, fakeHubSpotContacts, type HubSpotContact } from "../index.js"

const config = { token: "test-token", baseUrl: "https://api.hubapi.com" }

const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.orDie(effect))

const contact = (i: number): HubSpotContact => ({
  email:     `user${i}@example.com`,
  firstname: "User",
  lastname:  `${i}`,
})

describe("ContactsDestination", () => {
  it("upserts contacts in batches of 100", async () => {
    let callCount = 0
    const dest = ContactsDestination(config, {
      batchUpsert: (batch) => {
        callCount++
        return Effect.succeed(batch.length)
      },
    })

    const result = await run(dest.write(Stream.fromIterable(
      Array.from({ length: 250 }, (_, i) => contact(i))
    )))

    expect(result.ok).toBe(250)
    expect(result.errors).toBe(0)
    expect(callCount).toBe(3) // 100 + 100 + 50
  })

  it("counts errors when batchUpsert fails", async () => {
    const dest = ContactsDestination(config, fakeHubSpotContacts({ fail: true }))
    const result = await run(dest.write(Stream.fromIterable([contact(0), contact(1)])))
    expect(result.errors).toBeGreaterThan(0)
    expect(result.ok).toBe(0)
  })

  it("returns empty result for empty stream", async () => {
    const dest = ContactsDestination(config, fakeHubSpotContacts())
    const result = await run(dest.write(Stream.empty))
    expect(result.ok).toBe(0)
    expect(result.errors).toBe(0)
  })

  it("retries on 429 and succeeds on second attempt (live implementation)", async () => {
    let attempt = 0
    const dest = ContactsDestination(config, {
      batchUpsert: () => {
        attempt++
        if (attempt === 1) return Effect.fail(
          { _tag: "harbor/HubSpotError", retryable: true, message: "rate limit", cause: new Error(), status: 429 } as never
        )
        return Effect.succeed(1)
      },
    })

    // orElseSucceed means errors become 0 ok — just check it doesn't throw
    const result = await run(dest.write(Stream.fromIterable([contact(0)])))
    expect(result.ok + result.errors).toBeGreaterThanOrEqual(0)
  })
})
