import type { ReactNode } from "react"
import Image from "next/image"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { source } from "@/lib/source"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2">
            <Image src="/logo.png" alt="Harbor" width={24} height={24} />
            Harbor
          </span>
        ),
      }}
      links={[{ text: "GitHub", url: "https://github.com/lucianfialho/harbor", external: true }]}
    >
      {children}
    </DocsLayout>
  )
}
