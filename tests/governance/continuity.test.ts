import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(resolve(import.meta.dirname, "../..", path), "utf8");

// CI provisions the declared tools before running the repository checks.
// The workflow file itself is the observable output.
describe("CI contract", () => {
  it("pins CI to the declared runtime and complete gate", () => {
    const workflow = read(".github/workflows/ci.yml");
    const orderedSteps = [
      "actions/setup-node@v5",
      "npm install --global corepack@0.35.0",
      "corepack enable",
      "pnpm install --frozen-lockfile",
      "pnpm check",
    ].map((step) => workflow.indexOf(step));

    expect(read(".nvmrc").trim()).toBe("26");
    expect(workflow).toContain("package-manager-cache: false");
    expect(workflow).toContain("node-version-file: .nvmrc");
    expect(orderedSteps).not.toContain(-1);
    expect(orderedSteps).toEqual(
      [...orderedSteps].sort((left, right) => left - right),
    );
  });
});
