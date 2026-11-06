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
    env: {
      NODE_ENV: "test",
      BOOTSTRAP_MODEL_PROVIDER: "deterministic",
      BOOTSTRAP_ENABLE_TEST_PROVIDER: "true",
      BOOTSTRAP_MODEL_API_KEY: "",
      BOOTSTRAP_MODEL_ID: "",
      BOOTSTRAP_MODEL_BASE_URL: "",
    },
  },
});
