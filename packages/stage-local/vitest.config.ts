import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "effect": resolve(__dirname, "../../node_modules/effect"),
    },
    dedupe: ["effect"],
  },
  test: { environment: "node" },
})
