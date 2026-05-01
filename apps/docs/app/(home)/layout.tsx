import type { ReactNode } from "react"
import Image from "next/image"
import { HomeLayout } from "fumadocs-ui/layouts/home"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{
        title: (
          <span className="flex items-center gap-2">
            <Image src="/logo.png" alt="Harbor" width={28} height={28} />
            Harbor
          </span>
        ),
      }}
      links={[{ text: "Documentation", url: "/docs" }]}
    >
      {children}
    </HomeLayout>
  )
}
