import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { toJsonSchema } from "@represent/json-schema";
import { certify, type CertificationDeclaration } from "@represent/testing";
import { ajvOptions, jsonSchemaCases } from "./certification-profile.js";

async function sourceRevision(entry: string) {
  async function files(
    directory: URL,
    prefix: string,
  ): Promise<Array<{ name: string; contents: Buffer }>> {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (item) => {
        const name = prefix + item.name;
        const url = new URL(
          encodeURIComponent(item.name) + (item.isDirectory() ? "/" : ""),
          directory,
        );
        if (item.isDirectory()) return files(url, name + "/");
        if (!item.isFile() || !/\.[cm]?[jt]sx?$/.test(name)) return [];
        return [{ name, contents: await readFile(url) }];
      }),
    );
    return nested.flat();
  }
  const source = await files(new URL("./", entry), "");
  const hash = createHash("sha256");
  for (const file of source.sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  ))
    hash.update(file.name).update("\0").update(file.contents).update("\0");
  return `sha256:${hash.digest("hex")}`;
}
async function versionOf(name: string) {
  const value: unknown = JSON.parse(
    await readFile(
      new URL(import.meta.resolve(`${name}/package.json`)),
      "utf8",
    ),
  );
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    typeof value.version !== "string"
  )
    throw new Error(`Cannot read version for ${name}`);
  return value.version;
}
export async function certifyContracts(seed = 162) {
  if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647)
    throw new Error("Seed must be a signed 32-bit integer");
  const [
    adapterRevision,
    coreRevision,
    generatorRevision,
    suiteRevision,
    profileRevision,
    ajvVersion,
    fastCheckVersion,
    zodVersion,
  ] = await Promise.all([
    sourceRevision(import.meta.resolve("@represent/json-schema")),
    sourceRevision(import.meta.resolve("@represent/core")),
    sourceRevision(import.meta.resolve("@represent/fast-check")),
    sourceRevision(import.meta.resolve("@represent/testing")),
    sourceRevision(import.meta.url),
    versionOf("ajv"),
    versionOf("fast-check"),
    versionOf("zod"),
  ]);
  const declaration: CertificationDeclaration = {
    adapter: { name: "@represent/json-schema", revision: adapterRevision },
    profile: { name: "Native JSON acceptance", revision: profileRevision },
    target: { name: "JSON Schema 2020-12 / Ajv", version: ajvVersion },
    runtime: { name: "Node.js", version: process.versions.node },
    suiteRevision,
    configuration: {
      ...ajvOptions,
      seed,
      generatedCases: 100,
      maxStringLength: 8,
      maxListLength: 3,
      fastCheckVersion,
      zodVersion,
      coreRevision,
      generatorRevision,
    },
    claims: [
      { name: "native-json-acceptance", kind: "capability" },
      { name: "unsupported-rejection", kind: "capability" },
    ],
    domains: [
      "100 generated native packets serialized to JSON; strings up to 8 Unicode code points, lists up to 3 elements, plus explicit positive/negative sentinels for every required field, scalar bounds, integer/list kinds, optional/null presence, and extra fields",
      "Known unsupported Date, opaque, optional-root, refined-record, and __proto__-field exports",
      "DROP_FIELD, ERASE_FIELD_CONSTRAINT, SWAP_FIELDS, COLLAPSE_NULLISH, and FALSE_GUARANTEE artifact defects; no algebraic identity, conversion-composition, or impact capability claimed",
    ],
  };
  return certify({ declaration, cases: jsonSchemaCases(toJsonSchema, seed) });
}
