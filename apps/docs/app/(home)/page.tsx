import Image from "next/image"
import Link from "next/link"

// Critique fixes:
// 1. Code block cut off — hero needs padding that clears the fixed nav (~60px)
// 2. Removed redundant HARBOR label (nav already shows it)
// 3. Collapsed empty inter-section space
// 4. Code block: more distinct background + subtle border
// 5. Properties: more visual weight via larger text
// 6. Nav title shows logo — hero now just has the main headline

const SNIPPET = `const source = CsvSource({ path: "contacts.csv", schema: Contact })
const dest   = ContactsDestination({ token: process.env.HUBSPOT_TOKEN! })

// 30M records. Constant memory. Full traces.
await Effect.runPromise(
  dest.write(source.stream.pipe(Stream.map(transform)))
)`

export default function HomePage() {
  return (
    <div className="min-h-screen text-fd-foreground" style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* Hero — full width stacked, code below headline */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12">

        {/* Top row: headline left, CTAs right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem", marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "clamp(2.5rem,6vw,4rem)", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.04em", margin: 0 }}>
            Move data.<br />
            <span style={{ color: "var(--color-fd-muted-foreground)" }}>Reliably.</span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1rem", paddingTop: "0.5rem" }}>
            <p className="text-fd-muted-foreground text-sm text-right" style={{ maxWidth: "16rem", lineHeight: 1.6 }}>
              Source → Stage → Destination.<br />
              Typed errors, auto-traces, zero memory cliffs.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link href="/docs" className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{ background: "var(--color-fd-foreground)", color: "var(--color-fd-background)" }}>
                Get started →
              </Link>
              <a href="https://github.com/lucianfialho/harbor" target="_blank" rel="noreferrer"
                className="text-sm font-medium px-4 py-2 rounded-lg border border-fd-border hover:bg-fd-accent transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Code block — full width, prominent */}
        <pre className="rounded-xl overflow-x-auto"
          style={{
            background: "color-mix(in srgb, var(--color-fd-card) 60%, var(--color-fd-background) 40%)",
            border: "1px solid color-mix(in srgb, var(--color-fd-border) 80%, var(--color-fd-primary) 20%)",
            fontFamily: "ui-monospace,'JetBrains Mono',Menlo,monospace",
            padding: "1.75rem 2rem",
            fontSize: "0.875rem",
            lineHeight: 1.8,
          }}>
          <code style={{ color: "var(--color-fd-card-foreground)" }}>{SNIPPET}</code>
        </pre>
      </section>

      {/* Properties — 3 cols, generous padding */}
      <section className="mx-auto max-w-5xl px-6 py-10 border-t border-fd-border">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "2rem" }}>
          {[
            ["30M records",  "Stream without ever loading into memory"],
            ["Auto retry",   "Exponential backoff on 429 and 5xx"],
            ["Resumable",    "Stage decouples extraction from loading"],
            ["OTel spans",   "Every operation traced via Effect.fn"],
            ["Typed errors", "No any — every failure has a name"],
            ["Inject fakes", "Test without fetch stubs or disk I/O"],
          ].map(([title, body]) => (
            <div key={title}>
              <div className="text-sm font-semibold mb-1">{title}</div>
              <div className="text-sm text-fd-muted-foreground" style={{ lineHeight: 1.55 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Packages — compact table */}
      <section className="mx-auto max-w-5xl px-6 pt-8 pb-20 border-t border-fd-border">
        <p className="text-xs text-fd-muted-foreground mb-4" style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>Packages</p>
        {[
          ["@harbor/source-csv",         "CSV and JSONL streaming"],
          ["@harbor/source-openapi",      "Any OpenAPI spec, auto-pagination"],
          ["@harbor/stage-local",         "Filesystem staging for dev"],
          ["@harbor/stage-gcs",           "GCS for 30M+ records"],
          ["@harbor/destination-hubspot", "HubSpot with retry and traces"],
        ].map(([pkg, desc], i, arr) => (
          <div key={pkg} style={{
            display: "flex", alignItems: "baseline", gap: "2rem",
            padding: "0.625rem 0",
            borderBottom: i < arr.length - 1 ? "1px solid var(--color-fd-border)" : undefined,
          }}>
            <code style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: "0.8125rem", color: "var(--color-fd-primary)", minWidth: "18rem", flexShrink: 0 }}>
              {pkg}
            </code>
            <span className="text-sm text-fd-muted-foreground">{desc}</span>
          </div>
        ))}
      </section>

    </div>
  )
}
