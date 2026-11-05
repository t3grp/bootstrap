import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  ),
  transpilePackages: ["@bootstrap/core", "@bootstrap/db"],
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingExcludes: {
    "/*": [
      "./.env*",
      "../../.env*",
      "../../.bootstrap/**/*",
      "../../.data/**/*",
      "../../tests/**/*",
      "../../test-results/**/*",
      "../../playwright-report/**/*",
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
