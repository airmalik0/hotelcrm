import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  client: "@hey-api/client-axios", // Using axios client (though services disabled)
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
    include: false, // Don't generate services - using custom axios wrappers
  },
  schemas: false, // Don't generate schemas
})
