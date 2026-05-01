import Link from "next/link"

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center px-4 py-24">
      <h1 className="text-4xl font-bold">Harbor</h1>
      <p className="text-xl text-fd-muted-foreground max-w-lg">
        Type-safe data pipeline framework — Source → Stage → Destination,
        powered by Effect
      </p>
      <div className="flex gap-4">
        <Link
          href="/docs"
          className="bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 rounded-md px-5 py-2.5 font-medium transition-colors"
        >
          Read the docs
        </Link>
        <a
          href="https://github.com/lucianfialho/harbor"
          target="_blank"
          rel="noreferrer"
          className="border border-fd-border hover:bg-fd-accent rounded-md px-5 py-2.5 font-medium transition-colors"
        >
          GitHub
        </a>
      </div>
    </main>
  )
}
