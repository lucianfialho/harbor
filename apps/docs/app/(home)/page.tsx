import Image from "next/image"
import Link from "next/link"

// 100% inline styles — docs app has no Tailwind configured
// Fumadocs only provides CSS variables (--color-fd-*), not utility classes

const SNIPPET = `const source = CsvSource({ path: "contacts.csv", schema: Contact })
const dest   = ContactsDestination({ token: process.env.HUBSPOT_TOKEN! })

// 30M records. Constant memory. Full traces.
await Effect.runPromise(
  dest.write(source.stream.pipe(Stream.map(transform)))
)`

const S = {
  page: {
    minHeight: "100vh",
    color: "var(--color-fd-foreground)",
    fontFamily: "system-ui,-apple-system,sans-serif",
  } as React.CSSProperties,

  container: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "0 2rem",
  } as React.CSSProperties,

  hero: {
    paddingTop: "4rem",
    paddingBottom: "3rem",
  } as React.CSSProperties,

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "2rem",
    marginBottom: "2.5rem",
  } as React.CSSProperties,

  headline: {
    fontSize: "clamp(2.5rem,6vw,4rem)",
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    margin: 0,
  } as React.CSSProperties,

  muted: {
    color: "var(--color-fd-muted-foreground)",
  } as React.CSSProperties,

  heroRight: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: "1rem",
    paddingTop: "0.5rem",
    flexShrink: 0,
  },

  tagline: {
    color: "var(--color-fd-muted-foreground)",
    fontSize: "0.9rem",
    lineHeight: 1.65,
    maxWidth: "16rem",
    textAlign: "right" as const,
    margin: 0,
  },

  ctaRow: {
    display: "flex",
    gap: "0.5rem",
  } as React.CSSProperties,

  ctaPrimary: {
    display: "inline-block",
    fontSize: "0.875rem",
    fontWeight: 600,
    padding: "0.5rem 1.125rem",
    borderRadius: "0.5rem",
    textDecoration: "none",
    background: "var(--color-fd-foreground)",
    color: "var(--color-fd-background)",
    transition: "opacity 0.15s",
  } as React.CSSProperties,

  ctaSecondary: {
    display: "inline-block",
    fontSize: "0.875rem",
    fontWeight: 500,
    padding: "0.5rem 1.125rem",
    borderRadius: "0.5rem",
    textDecoration: "none",
    border: "1px solid var(--color-fd-border)",
    color: "var(--color-fd-foreground)",
    transition: "background 0.15s",
  } as React.CSSProperties,

  codeBlock: {
    borderRadius: "0.75rem",
    overflow: "auto",
    border: "1px solid var(--color-fd-border)",
    background: "var(--color-fd-card)",
    fontFamily: "ui-monospace,'JetBrains Mono',Menlo,monospace",
    fontSize: "0.875rem",
    lineHeight: 1.8,
    padding: "1.75rem 2rem",
    margin: 0,
  } as React.CSSProperties,

  divider: {
    borderTop: "1px solid var(--color-fd-border)",
    margin: 0,
  } as React.CSSProperties,

  propsSection: {
    padding: "2.5rem 0",
  } as React.CSSProperties,

  propsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: "1.75rem",
  } as React.CSSProperties,

  propTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
  } as React.CSSProperties,

  propBody: {
    fontSize: "0.8125rem",
    color: "var(--color-fd-muted-foreground)",
    lineHeight: 1.55,
    margin: 0,
  } as React.CSSProperties,

  pkgSection: {
    paddingTop: "2rem",
    paddingBottom: "5rem",
  } as React.CSSProperties,

  pkgLabel: {
    fontSize: "0.6875rem",
    color: "var(--color-fd-muted-foreground)",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    marginBottom: "1rem",
  } as React.CSSProperties,

  pkgRow: (last: boolean) => ({
    display: "flex",
    alignItems: "baseline",
    gap: "2rem",
    padding: "0.625rem 0",
    borderBottom: last ? undefined : "1px solid var(--color-fd-border)",
  }) as React.CSSProperties,

  pkgName: {
    fontFamily: "ui-monospace,Menlo,monospace",
    fontSize: "0.8125rem",
    color: "var(--color-fd-primary)",
    minWidth: "17rem",
    flexShrink: 0,
  } as React.CSSProperties,

  pkgDesc: {
    fontSize: "0.8125rem",
    color: "var(--color-fd-muted-foreground)",
  } as React.CSSProperties,
}

const PROPS = [
  ["30M records",  "Stream without ever loading into memory"],
  ["Auto retry",   "Exponential backoff on 429 and 5xx"],
  ["Resumable",    "Stage decouples extraction from loading"],
  ["OTel spans",   "Every operation traced via Effect.fn"],
  ["Typed errors", "No any — every failure has a name"],
  ["Inject fakes", "Test without fetch stubs or disk I/O"],
]

const PKGS = [
  ["@harbor/source-csv",         "CSV and JSONL streaming"],
  ["@harbor/source-openapi",      "Any OpenAPI spec, auto-pagination"],
  ["@harbor/stage-local",         "Filesystem staging for dev"],
  ["@harbor/stage-gcs",           "GCS for 30M+ records"],
  ["@harbor/destination-hubspot", "HubSpot with retry and traces"],
]

export default function HomePage() {
  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* Hero */}
        <section style={S.hero}>
          <div style={S.heroTop}>
            <h1 style={S.headline}>
              Move data.<br />
              <span style={S.muted}>Reliably.</span>
            </h1>

            <div style={S.heroRight}>
              <p style={S.tagline}>
                Source → Stage → Destination.<br />
                Built on <strong>Effect</strong> — typed errors,<br />
                auto-traces, no memory cliffs.
              </p>
              <div style={S.ctaRow}>
                <Link href="/docs" style={S.ctaPrimary}>Get started →</Link>
                <a href="https://github.com/lucianfialho/harbor" target="_blank" rel="noreferrer" style={S.ctaSecondary}>
                  GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Code block — full width */}
          <pre style={S.codeBlock}>
            <code>{SNIPPET}</code>
          </pre>
        </section>

        <div style={S.divider} />

        {/* Properties */}
        <section style={S.propsSection}>
          <div style={S.propsGrid}>
            {PROPS.map(([title, body]) => (
              <div key={title}>
                <div style={S.propTitle}>{title}</div>
                <p style={S.propBody}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={S.divider} />

        {/* Packages */}
        <section style={S.pkgSection}>
          <div style={S.pkgLabel}>Packages</div>
          {PKGS.map(([pkg, desc], i) => (
            <div key={pkg} style={S.pkgRow(i === PKGS.length - 1)}>
              <code style={S.pkgName}>{pkg}</code>
              <span style={S.pkgDesc}>{desc}</span>
            </div>
          ))}
        </section>

      </div>
    </div>
  )
}
