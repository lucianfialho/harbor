import { Effect, Layer, Stream } from "effect"
import { ContactsDestination, HubSpotContacts } from "@harbor/destination-hubspot"

const EMAIL   = process.env["EMAIL"]   ?? "lucian@metricasboss.com.br"
const NAME    = process.env["NAME"]    ?? "Lucian Fialho"
const COMPANY = process.env["COMPANY"] ?? "Métricas Boss"

const [firstname = "", ...rest] = NAME.split(" ")
const lastname = rest.join(" ")

const contact = { email: EMAIL, firstname, lastname, company: COMPANY }

console.log("\n📋 Contato a migrar:")
console.log(JSON.stringify(contact, null, 2))

const token  = process.env["HUBSPOT_TOKEN"]
const config = { token: token ?? "", baseUrl: "https://api.hubapi.com" }

const dest  = ContactsDestination(config)
const layer = token
  ? HubSpotContacts.live(config)
  : HubSpotContacts.fake({
      ok: undefined,   // verbose fake — mostra o que enviaria
    })

// Verbose fake que loga o payload
const verboseFakeLayer = Layer.succeed(HubSpotContacts, {
  batchUpsert: (batch) => {
    console.log("\n📤 Payload que seria enviado ao HubSpot:")
    console.log(JSON.stringify({
      url: `${config.baseUrl}/crm/v3/objects/contacts/batch/upsert`,
      method: "POST",
      body: { inputs: batch.map((c) => ({ id: c.email, idProperty: "email", properties: c })) },
    }, null, 2))
    return Effect.succeed(batch.length)
  },
})

const activeLayer = token ? layer : verboseFakeLayer
const mode = token ? `🚀 LIVE → HubSpot (${config.baseUrl})` : `🔍 DRY-RUN (sem chamada HTTP)`

console.log(`\nModo: ${mode}`)

Effect.runPromise(
  dest.write(Stream.make(contact)).pipe(
    Effect.provide(activeLayer),
    Effect.orDie
  )
).then(({ ok, errors }) => {
  console.log(`\n✅ Resultado: ${ok} ok, ${errors} erros`)
  if (!token) console.log("\n💡 Para migrar de verdade: HUBSPOT_TOKEN=pat-xxx bun run examples/simulate-one.ts")
}).catch(console.error)
