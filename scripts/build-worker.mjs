import { build } from "esbuild";

await build({
  entryPoints: ["apps/worker/src/index.ts"],
  outfile: "apps/web/.next/standalone/worker.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
console.log("Standalone D1/SQLite agent worker prepared.");
