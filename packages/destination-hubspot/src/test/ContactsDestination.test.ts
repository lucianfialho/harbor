import { Effect, Stream } from "effect"
import { describe, expect, it, vi } from "vitest"
import { ContactsDestination, type HubSpotContact } from "../index.js"

const config = { token: "test-token", baseUrl: "https://api.hubapi.com" }

const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.orDie(effect))

const contact = (i: number): HubSpotContact => ({
  email: `user${i}@example.com`,
  firstname: `User`,
  lastname: `${i}`,
})

describe("ContactsDestination", () => {
  it("upserts contacts in batches of 100", async () => {
    let callCount = 0
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      callCount++
      const body = JSON.parse((_init?.body as string) ?? "{}")
      return new Response(
        JSON.stringify({ results: body.inputs.map((_: unknown, i: number) => ({ id: `hs-${i}` })) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const dest = ContactsDestination(config)
    const contacts = Array.from({ length: 250 }, (_, i) => contact(i))
    const result = await run(dest.write(Stream.fromIterable(contacts)))

    expect(result.ok).toBe(250)
    expect(result.errors).toBe(0)
    expect(callCount).toBe(3) // 100 + 100 + 50

    vi.unstubAllGlobals()
  })

  it("counts errors when batch fails (non-retryable 400)", async () => {
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ message: "bad request" }), { status: 400 })
    )

    const dest = ContactsDestination(config)
    const result = await run(dest.write(Stream.fromIterable([contact(0), contact(1)])))

    expect(result.errors).toBeGreaterThan(0)
    expect(result.ok).toBe(0)
    vi.unstubAllGlobals()
  })

  it("retries on 429 and succeeds on second attempt", async () => {
    let attempt = 0
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      attempt++
      if (attempt === 1) {
        return new Response(JSON.stringify({}), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "0" },
        })
      }
      const body = JSON.parse((init?.body as string) ?? "{}")
      return new Response(
        JSON.stringify({ results: body.inputs.map((_: unknown, i: number) => ({ id: `hs-${i}` })) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    })

    const dest = ContactsDestination(config)
    const result = await run(dest.write(Stream.fromIterable([contact(0)])))

    expect(attempt).toBe(2)
    expect(result.ok).toBe(1)
    expect(result.errors).toBe(0)
    vi.unstubAllGlobals()
  }, 10_000)

  it("returns empty result for empty stream", async () => {
    vi.stubGlobal("fetch", vi.fn())
    const dest = ContactsDestination(config)
    const result = await run(dest.write(Stream.empty))
    expect(result.ok).toBe(0)
    expect(result.errors).toBe(0)
    vi.unstubAllGlobals()
  })
})
