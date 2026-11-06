import { build } from "esbuild";
import { access, mkdir, readFile, symlink } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const repository = process.cwd();
const output = path.join(repository, "apps/web/.next/standalone");
const databaseRequire = createRequire(
  path.join(repository, "packages/db/package.json"),
);
// Next traces these packages into its pnpm store but need not create top-level
// aliases. The separate worker must resolve them without falling back to the checkout.
for (const name of ["pg", "@electric-sql/pglite"]) {
  let directory = path.dirname(databaseRequire.resolve(name));
  while (true) {
    const metadata = await readFile(
      path.join(directory, "package.json"),
      "utf8",
    )
      .then(JSON.parse)
      .catch(() => null);
    if (metadata?.name === name) break;
    const parent = path.dirname(directory);
    if (parent === directory)
      throw new Error(`Cannot locate bundled dependency ${name}`);
    directory = parent;
  }
  const traced = path.join(output, path.relative(repository, directory));
  await access(path.join(traced, "package.json"));
  const alias = path.join(output, "node_modules", name);
  await mkdir(path.dirname(alias), { recursive: true });
  try {
    await symlink(path.relative(path.dirname(alias), traced), alias, "dir");
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
}
await build({
  entryPoints: ["apps/worker/src/index.ts"],
  outfile: "apps/web/.next/standalone/worker.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["pg", "@electric-sql/pglite"],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
console.log("Standalone PostgreSQL agent worker prepared.");
