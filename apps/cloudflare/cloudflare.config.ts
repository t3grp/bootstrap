import { bindings, defineConfig, defineContainer, exports } from "cf/config";

const workerName = process.env.BOOTSTRAP_WORKER_NAME || "bootstrap";
const liveProvider =
  process.env.BOOTSTRAP_MODEL_PROVIDER === "openai-compatible";
const application = defineContainer({
  name: `${workerName}-app`,
  image: { dockerfile: "../../Dockerfile", buildContext: "../.." },
  instanceType: "basic",
  maxInstances: 1,
  ssh: { enabled: false },
});

export default defineConfig({
  worker: {
    name: workerName,
    entrypoint: "./index.ts",
    compatibilityDate: "2026-11-06",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: false,
    exports: {
      BootstrapContainer: exports.durableObject({
        storage: "sqlite",
        container: application,
      }),
      ContainerProxy: exports.worker(),
    },
    env: {
      BOOTSTRAP: bindings.durableObject({
        worker: workerName,
        exportName: "BootstrapContainer",
      }),
      FILES: bindings.r2({
        name: process.env.BOOTSTRAP_R2_BUCKET || "bootstrap-private-files",
      }),
      DATABASE_URL: bindings.secret(),
      BETTER_AUTH_URL: bindings.secret(),
      BETTER_AUTH_SECRET: bindings.secret(),
      BOOTSTRAP_SETUP_TOKEN: bindings.secret(),
      ...(liveProvider
        ? {
            BOOTSTRAP_MODEL_PROVIDER: bindings.text("openai-compatible"),
            BOOTSTRAP_MODEL_BASE_URL: bindings.text(
              process.env.BOOTSTRAP_MODEL_BASE_URL || "",
            ),
            BOOTSTRAP_MODEL_ID: bindings.text(
              process.env.BOOTSTRAP_MODEL_ID || "",
            ),
            BOOTSTRAP_MODEL_API_KEY: bindings.secret(),
          }
        : {}),
    },
  },
  containers: [application],
});
