import { source } from "@/lib/source"

export const revalidate = false

export function GET() {
  const pages = source.getPages()

  const index = [
    "# Harbor Documentation",
    "Type-safe data pipeline framework — Source → Stage → Destination, powered by Effect",
    "",
    "## Pages",
    "",
    ...pages.map((p) => `- [${p.data.title}](/docs/${p.slugs.join("/")}): ${p.data.description ?? ""}`),
    "",
    "## Full content",
    "GET /llms-full.txt",
  ].join("\n")

  return new Response(index, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
