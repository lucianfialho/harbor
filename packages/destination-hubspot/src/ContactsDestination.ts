/**
 * HubSpot Contacts destination — batch upsert by email, 100 per request.
 *
 * Stream.grouped(100) verified against effect-smol src/Stream.ts:7686.
 * Injectable HubSpotContactsImpl for testability (issue #17).
 */
import type { Destination, ImportResult } from "@harbor/core"
import { Effect, Stream } from "effect"
import { HubSpotError } from "./errors.js"
import { HubSpotContactsLive, type HubSpotContactsImpl } from "./HubSpotContacts.js"

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
  config: HubSpotConfig,
  /** Injectable HTTP capability — defaults to live fetch implementation */
  contacts?: HubSpotContactsImpl
): Destination<HubSpotContact, HubSpotError> {
  const client = contacts ?? HubSpotContactsLive(config)

  const write = (stream: Stream.Stream<HubSpotContact, HubSpotError>) =>
    Effect.gen(function*() {
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
    })

  return { write }
}
