import { execFileSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const packages = new URL("../packages/", import.meta.url);
for (const entry of readdirSync(packages, { withFileTypes: true })) {
  if (entry.isDirectory())
    rmSync(new URL(`${entry.name}/dist/`, packages), {
      recursive: true,
      force: true,
    });
}
execFileSync("pnpm", ["--filter", "./packages/*", "-r", "build"], {
  cwd: root,
  stdio: "inherit",
});
