import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(resolve(import.meta.dirname, "../..", path), "utf8");

/*
Test case: repository continuity contract
Classification: workflow validation
Owning authority: issue #4 candidate exit criteria and Phase -2 success criteria
Observable/invariant: reviewed public governance artifacts remain discoverable and the phase displays remain synchronized
Oracle/equality: required artifact inventory plus exact current-phase text equality
Regression caught: deleted format, missing CI gate, stale README phase, or lost continuity navigation
Execution boundary: checked-out repository artifacts consumed by a continuation agent
Static/runtime distinction: TypeScript cannot prove repository files exist or agree
Cases: phase authority/summary, required formats, CI runtime/gate, README navigation
Discrimination: delete a required artifact or change one phase display and this test must fail
Expected diagnostics: the missing path, required fragment, or mismatched phase values
Semantic coverage: Phase -2 continuity and workflow evidence only; no product semantics

Source inspection is justified by REP-TEST-006 because these reviewed repository
documents and workflow files are themselves the public engineering-system output.
*/
describe("Phase -2 repository continuity", () => {
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

  it("keeps every required continuity format discoverable", () => {
    const requiredPaths = [
      ".github/ISSUE_TEMPLATE/design-blocker.yml",
      ".github/ISSUE_TEMPLATE/design.yml",
      ".github/ISSUE_TEMPLATE/implementation.yml",
      ".github/ISSUE_TEMPLATE/objective.yml",
      ".github/ISSUE_TEMPLATE/semantic-test.yml",
      ".github/PULL_REQUEST_TEMPLATE.md",
      "docs/decisions/template.md",
      "docs/handoff.md",
      "docs/phase-minus-2-exit-checklist.md",
      "docs/specifications/template.md",
      "prompts/continuity-drill.md",
    ];

    requiredPaths
      .map(read)
      .map((contents) => expect(contents.length).toBeGreaterThan(0));
  });

  it("pins CI to the declared runtime and complete gate", () => {
    const workflow = read(".github/workflows/ci.yml");

    expect(read(".nvmrc").trim()).toBe("22");
    expect(workflow).toContain("pnpm/action-setup@v4");
    expect(workflow).toContain("version: 11.13.0");
    expect(workflow).toContain("node-version-file: .nvmrc");
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("pnpm check");
  });

  it("links the primary continuity sources from the repository entrypoint", () => {
    const readme = read("README.md");
    const requiredLinks = [
      "docs/phase-minus-2-exit-checklist.md",
      "docs/decisions/README.md",
      "docs/specifications/README.md",
      "research/open-questions.md",
      "prompts/continuity-drill.md",
      "docs/ci.md",
    ];

    requiredLinks.map((link) => expect(readme).toContain(link));
  });
});
