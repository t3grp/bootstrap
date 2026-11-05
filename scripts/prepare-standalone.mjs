import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "apps/web/.next/standalone");
await mkdir(path.join(output, "apps/web/.next"), { recursive: true });
await cp(
  path.join(root, "apps/web/.next/static"),
  path.join(output, "apps/web/.next/static"),
  { recursive: true },
);
await cp(
  path.join(root, "packages/db/migrations"),
  path.join(output, "packages/db/migrations"),
  { recursive: true },
);
for (const notice of [
  "LICENSE",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "licenses",
]) {
  await cp(path.join(root, notice), path.join(output, notice), {
    recursive: true,
  });
}
console.log(
  "Standalone application prepared with static assets, migrations, and license notices.",
);
