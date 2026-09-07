import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@beasiswaapp/contracts": path.resolve(import.meta.dirname, "packages/contracts/src"),
      "@": path.resolve(import.meta.dirname, "apps/web/src"),
    },
  },
});
