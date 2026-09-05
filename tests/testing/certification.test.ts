import { describe, expect, it } from "vitest";
import {
  certify,
  type CertificationCase,
  type CertificationDeclaration,
} from "../../packages/testing/src/index.js";

const declaration: CertificationDeclaration = {
  adapter: { name: "Example adapter", revision: "fixture-1" },
  profile: { name: "Acceptance", revision: "1" },
  target: { name: "Boolean validator", version: "1" },
  runtime: { name: "Node", version: process.versions.node },
  suiteRevision: "1",
  configuration: { coercion: false },
  claims: [{ name: "acceptance", kind: "capability" }],
  domains: ["Accepted and rejected sentinel values"],
};
const baseline: CertificationCase = {
  id: "acceptance",
  scope: "target",
  required: true,
  claims: ["acceptance"],
  run: () => ({ status: "pass" }),
};
describe("scoped certification", () => {
  it("preserves the declaration and keeps optional unclaimed omissions visible without invalidating tested claims", async () => {
    const result = await certify({
      declaration,
      cases: [
        baseline,
        {
          id: "future",
          scope: "target",
          required: false,
          claims: ["future"],
          run: () => ({
            status: "unsupported",
            reason: "Not declared by this profile",
          }),
        },
      ],
    });
    expect(result.status).toBe("passed");
    expect(result.declaration).toEqual(declaration);
    expect(result.declaration).not.toBe(declaration);
    expect(result.results[1]).toMatchObject({
      status: "unsupported",
      reason: "Not declared by this profile",
    });
  });
  it.each(["fail", "skip", "unsupported", "gap"] as const)(
    "does not pass a required %s or an unsupported declared claim",
    async (status) => {
      const failed: CertificationCase = {
        ...baseline,
        run: () => ({ status, reason: "Obligation not met" }),
      };
      expect((await certify({ declaration, cases: [failed] })).status).toBe(
        "failed",
      );
      expect(
        (
          await certify({
            declaration,
            cases: [{ ...failed, required: false }],
          })
        ).status,
      ).toBe("failed");
    },
  );
  it("does not certify empty declarations, uncovered claims, or missing input domains", async () => {
    expect(await certify({ declaration, cases: [] })).toMatchObject({
      status: "failed",
      gaps: ["No checks cover declared claim: acceptance"],
    });
    expect(
      (
        await certify({
          declaration: { ...declaration, claims: [] },
          cases: [baseline],
        })
      ).status,
    ).toBe("failed");
    expect(
      (
        await certify({
          declaration: { ...declaration, domains: [] },
          cases: [baseline],
        })
      ).status,
    ).toBe("failed");
  });
  it("distinguishes a crashing check from a semantic failure and continues independent checks", async () => {
    const error = new Error("Cannot compile artifact");
    const result = await certify({
      declaration,
      cases: [
        { ...baseline, id: "crashed", run: () => Promise.reject(error) },
        baseline,
      ],
    });
    expect(result.status).toBe("failed");
    expect(result.results[0]).toMatchObject({ status: "harness-error", error });
    expect(result.results[1]?.status).toBe("pass");
  });
  it("rejects duplicate case identities and does not accept unexplained skips", async () => {
    await expect(
      certify({ declaration, cases: [baseline, baseline] }),
    ).rejects.toThrow("IDs must be unique");
    expect(
      (
        await certify({
          declaration,
          cases: [{ ...baseline, run: () => ({ status: "skip", reason: "" }) }],
        })
      ).results[0]?.status,
    ).toBe("harness-error");
  });
  it("does not let returned metadata weaken an obligation or replace its identity", async () => {
    const result = await certify({
      declaration,
      cases: [
        {
          ...baseline,
          run: () => ({
            status: "skip",
            reason: "Not implemented",
            id: "different",
            required: false,
            claims: [],
          }),
        },
      ],
    });
    expect(result.status).toBe("failed");
    expect(result.results[0]).toMatchObject({
      id: "acceptance",
      required: true,
      claims: ["acceptance"],
      status: "skip",
    });
    const misleading = {
      ...baseline,
      status: "pass",
      run: () => ({ status: "fail", reason: "Broken" }) as const,
    };
    expect((await certify({ declaration, cases: [misleading] })).status).toBe(
      "failed",
    );
  });
});
