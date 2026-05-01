import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      // Force effect to resolve from the monorepo root to avoid v3/v4 conflicts
      "effect": resolve(__dirname, "../../node_modules/effect"),
    },
    dedupe: ["effect"],
  },
  test: {
    environment: "node",
  },
})
