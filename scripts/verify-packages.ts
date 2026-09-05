import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = fileURLToPath(new URL("../", import.meta.url));
const release = join(root, "dist/release");
rmSync(release, { recursive: true, force: true });
mkdirSync(release, { recursive: true });
execFileSync("pnpm", ["build:packages"], { cwd: root, stdio: "inherit" });
const output = execFileSync(
  "pnpm",
  [
    "--filter",
    "./packages/*",
    "-r",
    "pack",
    "--pack-destination",
    release,
    "--json",
  ],
  { cwd: root, encoding: "utf8" },
);
const packed: unknown = JSON.parse(output);
const artifacts = z
  .array(
    z.object({
      name: z.string(),
      version: z.string(),
      filename: z.string(),
    }),
  )
  .min(1)
  .parse(packed);
const consumer = mkdtempSync(join(tmpdir(), "represent-installed-"));
const fixture = join(root, "tests/packaged");
for (const entry of readdirSync(fixture, { withFileTypes: true }))
  if (entry.isFile())
    copyFileSync(join(fixture, entry.name), join(consumer, entry.name));
const original: unknown = JSON.parse(
  readFileSync(join(consumer, "package.json"), "utf8"),
);
const manifest = z
  .object({
    dependencies: z.record(z.string(), z.string()),
  })
  .passthrough()
  .parse(original);
writeFileSync(
  join(consumer, "package.json"),
  JSON.stringify(
    {
      ...manifest,
      dependencies: {
        ...manifest.dependencies,
        ...Object.fromEntries(
          artifacts.map((artifact) => [
            artifact.name,
            `file:${artifact.filename}`,
          ]),
        ),
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(`Checking installed archives in ${consumer}`);
function run(command: string, args: string[]) {
  execFileSync(command, args, { cwd: consumer, stdio: "inherit" });
}
run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
run(process.execPath, [
  "node_modules/typescript/bin/tsc",
  "--project",
  "tsconfig.json",
]);
run(process.execPath, ["compiled/consumer.js"]);
run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
const evidence = {
  checkedAt: new Date().toISOString(),
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  worktreeChanged:
    execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
    }).trim().length > 0,
  node: process.versions.node,
  consumer,
  checks: [
    "strict TypeScript declarations",
    "Node ESM consumer",
    "Fastify HTTP injection",
    "Vite browser build and explorer CSS",
  ],
  artifacts: artifacts.map(({ name, version, filename }) => ({
    name,
    version,
    file: filename.slice(release.length + 1),
    sha256: createHash("sha256").update(readFileSync(filename)).digest("hex"),
  })),
};
writeFileSync(
  join(release, "verification.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  `Verified ${artifacts.length} package archives. Evidence: ${join(release, "verification.json")}`,
);
