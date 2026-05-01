import type { Destination, ImportResult } from "@harbor/core"
import { Effect, Stream } from "effect"
import { HubSpotError } from "./errors.js"
import { HubSpotContacts } from "./HubSpotContacts.js"

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

export function ContactsDestination(
  config: HubSpotConfig
): Destination<HubSpotContact, HubSpotError, typeof HubSpotContacts> {
  const write = Effect.fn("harbor/ContactsDestination.write")(
    function*(stream: Stream.Stream<HubSpotContact, HubSpotError, typeof HubSpotContacts>) {
      const client = yield* HubSpotContacts  // yield* works in Effect.gen
      let ok = 0, errors = 0

      yield* stream.pipe(
        Stream.grouped(BATCH_SIZE),
        Stream.mapEffect((batch: ReadonlyArray<HubSpotContact>) =>
          client.batchUpsert(batch).pipe(
            Effect.tap((count) => Effect.sync(() => { ok += count })),
            Effect.tapError(() => Effect.sync(() => { errors += batch.length })),
            Effect.orElseSucceed(() => 0)
          )
        ),
        Stream.runDrain
      )

      return { ok, errors, skipped: 0 } satisfies ImportResult
    }
  )

  return { write }
}
