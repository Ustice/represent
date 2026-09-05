import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  toJsonSchema,
  SchemaExportError,
} from "../../packages/json-schema/src/index.js";
import {
  certify,
  type CertificationDeclaration,
} from "../../packages/testing/src/index.js";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  breakSchema,
  certificationPacket,
  jsonSchemaCases,
  schemaDefects,
} from "../../examples/sensor-bench/src/certification-profile.js";

const declaration: CertificationDeclaration = {
  adapter: {
    name: "Deliberately broken exporter",
    revision: "controlled-defect",
  },
  profile: { name: "Native JSON acceptance test fixture", revision: "1" },
  target: { name: "JSON Schema 2020-12 / Ajv", version: "8.20.0" },
  runtime: { name: "Node.js", version: process.versions.node },
  suiteRevision: "test-fixture-1",
  configuration: { strict: true, ownProperties: true, seed: 162 },
  claims: [
    { name: "native-json-acceptance", kind: "capability" },
    { name: "unsupported-rejection", kind: "capability" },
  ],
  domains: ["Generated JSON packets and discriminating sentinels"],
};
describe("native JSON adapter certification profile", () => {
  it("identifies the actual implementation/runtime scope through the CLI and reports each detected defect and excluded capability", () => {
    const output = execFileSync("pnpm", ["--silent", "sensor", "certify"], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const report: unknown = JSON.parse(output);
    expect(report).toMatchObject({
      status: "passed",
      declaration: {
        target: { name: "JSON Schema 2020-12 / Ajv", version: "8.20.0" },
        runtime: { version: process.versions.node },
        configuration: {
          fastCheckVersion: "4.9.0",
          zodVersion: "4.4.3",
          seed: 162,
        },
      },
    });
    expect(report).toHaveProperty(
      "declaration.adapter.revision",
      expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    );
    const { results } = z
      .object({
        results: z.array(
          z.object({
            id: z.string(),
            status: z.string(),
            evidence: z.unknown().optional(),
          }),
        ),
      })
      .parse(report);
    for (const defect of schemaDefects)
      expect(results.find((result) => result.id === defect)).toMatchObject({
        status: "pass",
        evidence: {
          defect,
          witness: {
            parserAccepted: defect !== "FALSE_GUARANTEE",
            contractAccepted: defect === "FALSE_GUARANTEE",
          },
        },
      });
    expect(
      results
        .filter((result) => result.status === "skip")
        .map((result) => result.id),
    ).toEqual(["WRONG_EMPTY", "REVERSE_COMPOSITION", "OMIT_IMPACT_EDGE"]);
  });
  it.each(schemaDefects)(
    "fails certification when the exporter actually contains %s",
    async (defect) => {
      const report = await certify({
        declaration: {
          ...declaration,
          adapter: { ...declaration.adapter, revision: defect },
        },
        cases: jsonSchemaCases((value) => {
          const schema = toJsonSchema(value);
          return value === certificationPacket
            ? breakSchema(schema, defect)
            : schema;
        }, 162),
      });
      expect(report.status).toBe("failed");
      expect(
        report.results.find((result) => result.id === "acceptance"),
      ).toMatchObject({ status: "fail" });
    },
  );
  it("fails a permissive unsupported fallback and distinguishes an exporter crash", async () => {
    const report = await certify({
      declaration,
      cases: jsonSchemaCases((value) => {
        try {
          return toJsonSchema(value);
        } catch (error) {
          if (!(error instanceof SchemaExportError)) throw error;
          return breakSchema(
            toJsonSchema(certificationPacket),
            "FALSE_GUARANTEE",
          );
        }
      }, 162),
    });
    expect(report.status).toBe("failed");
    expect(
      report.results.find((result) => result.id === "reject-date"),
    ).toMatchObject({
      status: "fail",
      reason: "Exporter silently accepted date",
    });
    const error = new Error("Exporter crashed");
    const crashed = await certify({
      declaration,
      cases: jsonSchemaCases(() => {
        throw error;
      }, 162),
    });
    expect(crashed.status).toBe("failed");
    expect(
      crashed.results.find((result) => result.id === "acceptance"),
    ).toMatchObject({ status: "harness-error", error });
  });
});
