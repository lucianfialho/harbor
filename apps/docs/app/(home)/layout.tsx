import type { ReactNode } from "react"
import { HomeLayout } from "fumadocs-ui/layouts/home"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{ title: "Harbor" }}
      links={[{ text: "Documentation", url: "/docs" }]}
    >
      {children}
    </HomeLayout>
  )
}
