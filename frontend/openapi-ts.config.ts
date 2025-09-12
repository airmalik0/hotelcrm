import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  client: "@hey-api/client-fetch",
  input: "./openapi.json",
  output: {
    path: "./src/client",
    format: "prettier",
    lint: "biome",
  },
  types: {
    enums: "javascript",
  },
  services: {
    asClass: false,
    include: false, // Don't generate services
  },
  schemas: false, // Don't generate schemas
})
