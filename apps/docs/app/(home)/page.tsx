import Image from "next/image"
import Link from "next/link"

const code = `import { Effect, Stream } from "effect"
import { CsvSource }           from "@harbor/source-csv"
import { ContactsDestination } from "@harbor/destination-hubspot"

const dest = ContactsDestination({ token: process.env.HUBSPOT_TOKEN! })

// Streams 30M records — constant memory
await Effect.runPromise(
  dest.write(
    CsvSource({ path: "contacts.csv", schema: ContactSchema }).stream
      .pipe(Stream.map(transform))
  )
)`

const packages = [
  { name: "@harbor/source-csv",          desc: "CSV and JSONL streaming — no memory accumulation" },
  { name: "@harbor/source-openapi",       desc: "Any OpenAPI spec → Source, auto-pagination" },
  { name: "@harbor/stage-local",          desc: "Local filesystem staging for dev" },
  { name: "@harbor/stage-gcs",            desc: "Google Cloud Storage for 30M+ records" },
  { name: "@harbor/destination-hubspot",  desc: "HubSpot batch upsert with retry + tracing" },
]

const why = [
  { icon: "◇", label: "30M records",    detail: "Stream without loading into memory" },
  { icon: "↻", label: "Auto retry",     detail: "Exponential backoff on 429 / 5xx" },
  { icon: "◎", label: "Resumable",      detail: "Stage layer decouples extract from load" },
  { icon: "⟁", label: "Observable",    detail: "OTel spans via Effect.fn — zero config" },
  { icon: "✦", label: "Type-safe",     detail: "Typed errors, typed records, no any" },
  { icon: "⊙", label: "Testable",      detail: "Inject fakes — no fetch stubs, no disk" },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-fd-background text-fd-foreground">

      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-4 pt-28 pb-20 text-center">
        <Image src="/logo.png" alt="Harbor" width={80} height={80} priority />
        <h1 className="text-5xl font-bold tracking-tight">Harbor</h1>
        <p className="max-w-xl text-xl text-fd-muted-foreground">
          Type-safe data pipeline framework.{" "}
          <span className="text-fd-foreground font-medium">Source → Stage → Destination</span>, powered by Effect.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href="/docs"
            className="rounded-md bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground hover:bg-fd-primary/90 transition-colors"
          >
            Get started
          </Link>
          <a
            href="https://github.com/lucianfialho/harbor"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-fd-border px-5 py-2.5 font-medium hover:bg-fd-accent transition-colors"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Code */}
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <pre className="rounded-xl border border-fd-border bg-fd-card p-6 text-sm overflow-x-auto">
          <code className="text-fd-card-foreground">{code}</code>
        </pre>
      </section>

      {/* Why Harbor */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <h2 className="mb-8 text-center text-2xl font-semibold">Why Harbor</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {why.map((w) => (
            <div key={w.label} className="rounded-lg border border-fd-border bg-fd-card p-4">
              <div className="mb-1 text-xl">{w.icon}</div>
              <div className="font-semibold">{w.label}</div>
              <div className="mt-1 text-sm text-fd-muted-foreground">{w.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="mx-auto max-w-4xl px-4 pb-28">
        <h2 className="mb-8 text-center text-2xl font-semibold">Packages</h2>
        <div className="flex flex-col gap-2">
          {packages.map((p) => (
            <div key={p.name} className="flex items-center gap-4 rounded-lg border border-fd-border bg-fd-card px-5 py-3">
              <code className="text-sm font-mono text-fd-primary shrink-0">{p.name}</code>
              <span className="text-sm text-fd-muted-foreground">{p.desc}</span>
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}
