import { source } from "@/lib/source"

export const revalidate = false

export async function GET() {
  const pages = source.getPages()

  const content = await Promise.all(
    pages.map(async (page) => {
      const text = await page.data.getText?.("processed").catch(() => "")
      return [
        `# ${page.data.title}`,
        `URL: /docs/${page.slugs.join("/")}`,
        "",
        text ?? "",
      ].join("\n")
    })
  )

  return new Response(content.join("\n\n---\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
