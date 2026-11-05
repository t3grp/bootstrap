import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
      "@bootstrap/core": fileURLToPath(
        new URL("./packages/core/src/types.ts", import.meta.url),
      ),
      "@bootstrap/db": fileURLToPath(
        new URL("./packages/db/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/domain/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: { NODE_ENV: "test" },
  },
});
