import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  client: false, // Don't generate client
  input: "./openapi.json",
  output: {
    path: "./src/client",
    format: "prettier",
    lint: "biome",
  },
  types: {
    enums: "javascript",
  },
  services: false, // Don't generate services
  schemas: false, // Don't generate schemas
})
