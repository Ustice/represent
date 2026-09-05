import {
  booleanValue,
  dateValue,
  list,
  nullable,
  numberValue,
  optional,
  record,
  recordCodec,
  representation,
  text,
  type AcceptanceSample,
  type Representation,
} from "@represent/core";
import { toArbitrary } from "@represent/fast-check";
import { SchemaExportError, type JsonSchema } from "@represent/json-schema";
import { checkContract, type CertificationCase } from "@represent/testing";
import { Ajv2020 } from "ajv/dist/2020.js";
import * as fc from "fast-check";
import { z } from "zod";

const temperature = nullable(
  numberValue("Certification temperature", { min: -40, max: 125 }),
);
export const certificationPacket = record("Certification packet", {
  sender: text("Certification sender", { nonempty: true }),
  recipient: text("Certification recipient"),
  temperature,
  enabled: booleanValue("Certification enabled"),
  samples: list(
    numberValue("Certification count", { min: 0, max: 10, integer: true }),
  ),
  note: optional(nullable(text("Certification note", { nonempty: true }))),
});
// Empty recipient distinguishes swapped text fields; required null distinguishes
// null from missing. These witnesses must detect defects regardless of the seed.
const sentinel = {
  sender: "Aster",
  recipient: "",
  temperature: null,
  enabled: false,
  samples: [2, 7],
};
const explicit: AcceptanceSample[] = [
  { label: "Asymmetric fields and required null", value: sentinel },
  { label: "Optional null", value: { ...sentinel, note: null } },
  { label: "Empty sender", value: { ...sentinel, sender: "" } },
  {
    label: "Out-of-range temperature",
    value: { ...sentinel, temperature: 126 },
  },
  { label: "Fractional count", value: { ...sentinel, samples: [1.5] } },
  { label: "Wrong boolean kind", value: { ...sentinel, enabled: 0 } },
  { label: "Empty optional note", value: { ...sentinel, note: "" } },
  { label: "Extra field", value: { ...sentinel, extra: true } },
  { label: "Null root", value: null },
];
explicit.push(
  ...Object.keys(sentinel).map((key) => ({
    label: `Missing required ${key}`,
    value: Object.fromEntries(
      Object.entries(sentinel).filter(([name]) => name !== key),
    ),
  })),
  {
    label: "Below temperature range",
    value: { ...sentinel, temperature: -41 },
  },
  { label: "Negative count", value: { ...sentinel, samples: [-1] } },
  { label: "Count above range", value: { ...sentinel, samples: [11] } },
  { label: "Null count", value: { ...sentinel, samples: [null] } },
  { label: "Wrong list kind", value: { ...sentinel, samples: null } },
  { label: "Wrong text kind", value: { ...sentinel, sender: 1 } },
);
const rootShape = z.object({
  type: z.literal("object"),
  properties: z.record(z.string(), z.object({ $ref: z.string() })),
  required: z.array(z.string()),
  additionalProperties: z.literal(false),
});
export const schemaDefects = [
  "DROP_FIELD",
  "ERASE_FIELD_CONSTRAINT",
  "SWAP_FIELDS",
  "COLLAPSE_NULLISH",
  "FALSE_GUARANTEE",
] as const;
export function breakSchema(
  schema: JsonSchema,
  defect: (typeof schemaDefects)[number],
): JsonSchema {
  const root = rootShape.parse(schema.$defs[certificationPacket.name]);
  if (defect === "FALSE_GUARANTEE")
    return {
      ...schema,
      $defs: { ...schema.$defs, [certificationPacket.name]: true },
    };
  if (defect === "ERASE_FIELD_CONSTRAINT")
    return {
      ...schema,
      $defs: {
        ...schema.$defs,
        [certificationPacket.name]: {
          ...root,
          properties: { ...root.properties, sender: true },
        },
      },
    };
  if (defect === "DROP_FIELD")
    return {
      ...schema,
      $defs: {
        ...schema.$defs,
        [certificationPacket.name]: {
          ...root,
          properties: Object.fromEntries(
            Object.entries(root.properties).filter(([key]) => key !== "sender"),
          ),
          required: root.required.filter((key) => key !== "sender"),
        },
      },
    };
  if (defect === "SWAP_FIELDS") {
    const { sender, recipient } = root.properties;
    if (!sender || !recipient)
      throw new Error(
        "Certification packet needs sender and recipient bindings",
      );
    return {
      ...schema,
      $defs: {
        ...schema.$defs,
        [certificationPacket.name]: {
          ...root,
          properties: {
            ...root.properties,
            sender: recipient,
            recipient: sender,
          },
        },
      },
    };
  }
  return {
    ...schema,
    $defs: {
      ...schema.$defs,
      [certificationPacket.name]: {
        ...root,
        required: root.required.filter((key) => key !== "temperature"),
      },
      [temperature.name]: { type: "number", minimum: -40, maximum: 125 },
    },
  };
}
export const ajvOptions = Object.freeze({
  strict: true,
  ownProperties: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});
export type SchemaExporter = (value: Representation<unknown>) => JsonSchema;
export function jsonSchemaCases(
  exportSchema: SchemaExporter,
  seed: number,
): CertificationCase[] {
  let fixtures: readonly AcceptanceSample[] | undefined;
  function samples() {
    if (fixtures) return fixtures;
    const generated = fc.sample(
      toArbitrary(certificationPacket, {
        limits: { maxStringLength: 8, maxListLength: 3 },
      }),
      { seed, numRuns: 100 },
    );
    fixtures = [
      ...explicit,
      ...generated.map((value, index) => {
        const json: unknown = JSON.parse(JSON.stringify(value));
        return { label: `Generated ${index}`, value: json };
      }),
    ];
    return fixtures;
  }
  const compare = (schema: JsonSchema) => {
    const accepts = new Ajv2020(ajvOptions).compile(schema);
    return checkContract({
      representation: certificationPacket,
      accepts,
      samples: samples(),
      copy: (value) => structuredClone(value),
    });
  };
  const unsupported = [
    { value: dateValue("Unexportable Date"), reason: "date" },
    {
      value: representation({
        name: "Opaque",
        parse: (input: unknown) => input,
      }),
      reason: "opaque",
    },
    { value: optional(text("Optional root")), reason: "optional-root" },
    {
      value: recordCodec({
        name: "Refined",
        from: "Refined pair",
        to: "Pair wire",
        fields: { a: text("A"), b: text("B") },
        validate(value) {
          if (value.a === value.b) throw new Error("Fields must differ");
        },
      }).encode.from,
      reason: "refinement",
    },
    {
      value: record("Prototype key", {
        ["__proto__"]: text("Prototype value"),
      }),
      reason: "unsupported-field",
    },
  ];
  return [
    {
      id: "acceptance",
      scope: "target",
      required: true,
      claims: ["native-json-acceptance"],
      run: () => compare(exportSchema(certificationPacket)),
    },
    ...unsupported.map(({ value, reason }): CertificationCase => ({
      id: `reject-${reason}`,
      scope: "universal",
      required: true,
      claims: ["unsupported-rejection"],
      run() {
        try {
          exportSchema(value);
        } catch (error) {
          if (!(error instanceof SchemaExportError)) throw error;
          return error.issues.some(
            (issue) =>
              issue.reason === reason &&
              issue.representation === value.name &&
              (reason === "unsupported-field"
                ? issue.path.length === 1 && issue.path[0] === "__proto__"
                : issue.path.length === 0),
          )
            ? { status: "pass", evidence: { issues: error.issues } }
            : {
                status: "fail",
                reason: "Unsupported export lacks the expected diagnostic",
                evidence: { issues: error.issues },
              };
        }
        return {
          status: "fail",
          reason: `Exporter silently accepted ${reason}`,
        };
      },
    })),
    ...schemaDefects.map((defect): CertificationCase => ({
      id: defect,
      scope: "universal",
      required: true,
      claims: ["native-json-acceptance"],
      run() {
        const result = compare(
          breakSchema(exportSchema(certificationPacket), defect),
        );
        return result.status === "fail"
          ? {
              status: "pass",
              evidence: { defect, witness: result.evidence.mismatches[0] },
            }
          : {
              status: "fail",
              reason: `Required discrimination check survived: ${defect}`,
              evidence: result.evidence,
            };
      },
    })),
    ...["WRONG_EMPTY", "REVERSE_COMPOSITION", "OMIT_IMPACT_EDGE"].map(
      (id): CertificationCase => ({
        id,
        scope: "universal",
        required: false,
        claims: [],
        run: () => ({
          status: "skip",
          reason:
            "This JSON acceptance profile declares no algebraic identity, conversion composition, or dependency-impact capability",
        }),
      }),
    ),
  ];
}
