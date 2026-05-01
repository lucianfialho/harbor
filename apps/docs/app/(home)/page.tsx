import Image from "next/image"
import Link from "next/link"

// Impeccable principles applied:
// - Typography: system-ui body, system mono for code, clamp() for fluid hero
// - Layout: asymmetric left/right — code IS the hero, not below buttons
// - Spacing: tight groups, generous separators — rhythm through contrast
// - Brand: left-aligned, technical, no generic card grids

const SNIPPET = `const source = CsvSource({ path: "contacts.csv", schema: Contact })
const dest   = ContactsDestination({ token: process.env.HUBSPOT_TOKEN! })

// 30M records. Constant memory. Full traces.
await Effect.runPromise(
  dest.write(source.stream.pipe(Stream.map(transform)))
)`

export default function HomePage() {
  return (
    <div className="min-h-screen text-fd-foreground" style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* Hero — asymmetric split */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16" style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "3rem", alignItems: "start" }}>

        {/* Left: identity */}
        <div className="flex flex-col gap-6 pt-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={36} height={36} priority />
            <span className="text-fd-muted-foreground text-sm" style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>Harbor</span>
          </div>

          <h1 style={{ fontSize: "clamp(2rem,5vw,3.25rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.03em" }}>
            Move data.<br />
            <span className="text-fd-muted-foreground">Reliably.</span>
          </h1>

          <p className="text-fd-muted-foreground text-base leading-relaxed" style={{ maxWidth: "18rem" }}>
            Source → Stage → Destination. Built on{" "}
            <span className="text-fd-foreground font-medium">Effect</span> — typed errors, auto-traces, no memory cliffs.
          </p>

          <div className="flex gap-3 pt-2">
            <Link href="/docs" className="text-sm font-medium px-4 py-2 rounded-md transition-colors"
              style={{ background: "var(--color-fd-foreground)", color: "var(--color-fd-background)" }}>
              Read the docs →
            </Link>
            <a href="https://github.com/lucianfialho/harbor" target="_blank" rel="noreferrer"
              className="text-sm font-medium px-4 py-2 rounded-md border border-fd-border hover:bg-fd-accent transition-colors">
              GitHub
            </a>
          </div>
        </div>

        {/* Right: code — the real hero */}
        <pre className="rounded-xl border border-fd-border overflow-x-auto"
          style={{ background: "var(--color-fd-card)", fontFamily: "ui-monospace,'JetBrains Mono',Menlo,monospace", padding: "1.5rem", fontSize: "0.825rem", lineHeight: 1.7 }}>
          <code className="text-fd-card-foreground">{SNIPPET}</code>
        </pre>
      </section>

      <div className="mx-auto max-w-6xl px-6"><div className="border-t border-fd-border" /></div>

      {/* Properties — tight 3-col grid, no card borders */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem 3rem" }}>
          {[
            ["30M records",  "Stream without loading into memory"],
            ["Auto retry",   "Exponential backoff on 429 and 5xx"],
            ["Resumable",    "Stage decouples extract from load"],
            ["OTel spans",   "Every operation traced via Effect.fn"],
            ["Typed errors", "No any, no unknown failures"],
            ["Inject fakes", "Test without fetch stubs or disk"],
          ].map(([title, body]) => (
            <div key={title} className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-sm text-fd-muted-foreground leading-snug">{body}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6"><div className="border-t border-fd-border" /></div>

      {/* Packages — table rows, not cards */}
      <section className="mx-auto max-w-6xl px-6 py-12 pb-24">
        <p className="text-xs text-fd-muted-foreground mb-5" style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>Packages</p>
        {[
          ["@harbor/source-csv",         "CSV and JSONL streaming"],
          ["@harbor/source-openapi",      "Any OpenAPI spec, auto-pagination"],
          ["@harbor/stage-local",         "Filesystem staging for dev"],
          ["@harbor/stage-gcs",           "GCS for 30M+ records"],
          ["@harbor/destination-hubspot", "HubSpot with retry and traces"],
        ].map(([pkg, desc], i, arr) => (
          <div key={pkg} className="flex items-baseline gap-6 py-3"
            style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-fd-border)" : undefined }}>
            <code className="text-sm shrink-0" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "var(--color-fd-primary)", minWidth: "19rem" }}>{pkg}</code>
            <span className="text-sm text-fd-muted-foreground">{desc}</span>
          </div>
        ))}
      </section>

    </div>
  )
}
