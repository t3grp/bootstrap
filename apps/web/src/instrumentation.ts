export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.BETTER_AUTH_SECRET
  ) {
    const { startEmbeddedWorker } = await import("./instrumentation-node");
    startEmbeddedWorker();
  }
}
