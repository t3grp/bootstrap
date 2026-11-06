import { Container, getContainer } from "@cloudflare/containers";
import { FILE_STORAGE_HOST } from "../../packages/core/src/file-storage";
import { handlePrivateFile } from "./storage";
import { DATABASE_HOST } from "../../packages/db/src/transport";
import { handlePrivateDatabase } from "./database";

// Required by the Containers SDK for private outbound binding access.
export { ContainerProxy } from "@cloudflare/containers";

export interface Env {
  BOOTSTRAP: DurableObjectNamespace<BootstrapContainer>;
  FILES: R2Bucket;
  DB: D1Database;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  BOOTSTRAP_SETUP_TOKEN: string;
  BOOTSTRAP_MODEL_PROVIDER?: string;
  BOOTSTRAP_MODEL_BASE_URL?: string;
  BOOTSTRAP_MODEL_ID?: string;
  BOOTSTRAP_MODEL_API_KEY?: string;
}

export class BootstrapContainer extends Container<Env> {
  defaultPort = 3000;
  // Longer than the maximum five-minute assignment deadline; idle instances
  // sleep, while D1 and R2 remain durable outside the container.
  sleepAfter = "10m";
  entrypoint = ["node", "cloudflare-supervisor.mjs"];
  envVars = {
    NODE_ENV: "production",
    HOSTNAME: "0.0.0.0",
    PORT: "3000",
    BOOTSTRAP_DATABASE: "cloudflare-d1",
    BETTER_AUTH_URL: this.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: this.env.BETTER_AUTH_SECRET,
    BOOTSTRAP_SETUP_TOKEN: this.env.BOOTSTRAP_SETUP_TOKEN,
    BOOTSTRAP_AGENT_WORKER: "external",
    BOOTSTRAP_FILE_STORAGE: "cloudflare-r2",
    BOOTSTRAP_MODEL_PROVIDER: this.env.BOOTSTRAP_MODEL_PROVIDER || "",
    BOOTSTRAP_MODEL_BASE_URL: this.env.BOOTSTRAP_MODEL_BASE_URL || "",
    BOOTSTRAP_MODEL_ID: this.env.BOOTSTRAP_MODEL_ID || "",
    BOOTSTRAP_MODEL_API_KEY: this.env.BOOTSTRAP_MODEL_API_KEY || "",
  };
}

BootstrapContainer.outboundByHost = {
  [DATABASE_HOST]: (request, env: Env) =>
    handlePrivateDatabase(request, env.DB),
  [FILE_STORAGE_HOST]: (request, env: Env) =>
    handlePrivateFile(request, env.FILES),
};

export default {
  async fetch(request: Request, env: Env) {
    // One owner instance. No caller-controlled name can provision extra containers.
    const forwarded = new Request(request);
    const origin = new URL(env.BETTER_AUTH_URL);
    forwarded.headers.set("X-Forwarded-Host", origin.host);
    forwarded.headers.set("X-Forwarded-Proto", "https");
    return getContainer(env.BOOTSTRAP, "bootstrap-owner").fetch(forwarded);
  },
} satisfies ExportedHandler<Env>;
