import type { ReactNode } from "react"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { source } from "@/lib/source"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ title: "Harbor" }}
      links={[{ text: "GitHub", url: "https://github.com/lucianfialho/harbor", external: true }]}
    >
      {children}
    </DocsLayout>
  )
}
