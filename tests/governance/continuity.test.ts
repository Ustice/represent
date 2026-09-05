import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(resolve(import.meta.dirname, "../..", path), "utf8");

// Engineering contract: docs/development-phases.md and docs/ci.md.
// The README must report the current phase, and CI must provision the declared
// tools before running the same gate contributors use. These repository outputs
// are inspected under REP-TEST-006; document inventories are not a contract.
describe("Repository phase and CI contract", () => {
  it("keeps the authoritative phase and README summary synchronized", () => {
    const phaseDocument = read("docs/development-phases.md");
    const readme = read("README.md");
    const authoritativePhase = phaseDocument.match(
      /The project is currently in (Phase -?\d+)\./,
    )?.[1];
    const readmePhase = readme.match(
      /The project is currently in\s+\[(Phase -?\d+):/,
    )?.[1];

    expect(authoritativePhase).toBeDefined();
    expect(readmePhase).toBe(authoritativePhase);
  });

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
