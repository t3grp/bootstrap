import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(
  new URL("../apps/web/.env.local", import.meta.url),
);
const setupToken = randomBytes(32).toString("hex");
const content = [
  "# Local development only. This file is ignored by git.",
  `BETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}`,
  `BOOTSTRAP_SETUP_TOKEN=${setupToken}`,
  "BETTER_AUTH_URL=http://localhost:3000",
  "",
].join("\n");
try {
  await writeFile(target, content, { flag: "wx", mode: 0o600 });
  console.log(
    "Local settings created. Start Bootstrap with pnpm dev, then open http://localhost:3000.",
  );
  console.log("Use this one-time setup token to create the owner account:");
  console.log(setupToken);
  console.log(
    "The token is also saved in apps/web/.env.local. Keep that file private.",
  );
} catch (error) {
  if (error.code === "EEXIST") {
    console.log(
      "apps/web/.env.local already exists and was left unchanged. Use its setup token if the owner is not yet created.",
    );
  } else {
    throw error;
  }
}
