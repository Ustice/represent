import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  compareSchemas,
  graph,
  inspectGraph,
  list,
  nullable,
  numberValue,
  optional,
  presenceOf,
  record,
  representation,
  text,
  type Representation,
} from "../../packages/represent/src/index.js";
import { toJsonSchema } from "../../packages/json-schema/src/index.js";
import { sensorContract } from "../../examples/sensor-bench/src/commands.js";
import { sensorExchange } from "../../examples/sensor-bench/src/model.js";

const ajv = () => new Ajv2020({ strict: true, ownProperties: true });
describe("collection schema contracts", () => {
  it("agrees with the telemetry parser over numbers, booleans, nullable readings, arrays, and required fields", () => {
    const validate = ajv().compile(sensorContract());
    const valid = {
      device: "sensor",
      online: false,
      batteryPercent: 0,
      samples: [{ time: "2026-09-05T10:00Z", temperature: null }],
    };
    const cases = [
      [valid, true],
      [{ ...valid, samples: [] }, true],
      [{ ...valid, online: "false" }, false],
      [{ ...valid, batteryPercent: 0.5 }, false],
      [{ ...valid, batteryPercent: 101 }, false],
      [
        {
          ...valid,
          samples: [{ time: "2026-09-05T10:00Z", temperature: 258 }],
        },
        false,
      ],
      [{ ...valid, samples: [{ time: "2026-09-05T10:00Z" }] }, false],
      [{ ...valid, samples: null }, false],
      [{ ...valid, samples: [null] }, false],
    ] as const;
    for (const [input, accepted] of cases) {
      expect(validate(input)).toBe(accepted);
      if (accepted)
        expect(() => sensorExchange.encode.to.parse(input)).not.toThrow();
      else expect(() => sensorExchange.encode.to.parse(input)).toThrow();
    }
  });
  it("preserves missing-field behavior through nullable wrappers, including provider-owned leaves", () => {
    const value = representation({
      name: "Default text",
      parse(input: unknown) {
        if (input === undefined) return "default";
        if (typeof input !== "string") throw new Error("Expected text");
        return input;
      },
    });
    const request = record("Request", {
      value: nullable(value),
      other: nullable(optional(text("Other"))),
    });
    const schema = toJsonSchema(request, {
      providers: [
        {
          name: "Defaults",
          contract: (subject) =>
            subject === value
              ? { schema: { type: "string" }, presence: "optional" }
              : undefined,
        },
      ],
    });
    expect(ajv().compile(schema)({})).toBe(true);
    expect(request.parse({})).toEqual({ value: "default" });
    expect(ajv().compile(schema)({ value: null, other: null })).toBe(true);
    const model = graph([], { representations: [request] });
    const wrapped = model.nodes.find(
      (node) => node.name === "Other (optional) (nullable)",
    );
    expect(
      wrapped &&
        presenceOf(wrapped, (name) =>
          model.nodes.find((node) => node.name === name),
        ),
    ).toBe("optional");
    const loop: Representation<unknown> = {
      name: "Loop",
      parse: (value) => value,
    };
    Object.assign(loop, { structure: { kind: "nullable", inner: loop } });
    expect(presenceOf(loop)).toBe("unknown");
    expect(() => toJsonSchema(loop)).toThrow("wrapper-cycle");
  });
  it("records element and nullable dependencies and compares changed numeric constraints explicitly", () => {
    const make = (max: number) =>
      graph([], {
        representations: [list(nullable(numberValue("Reading", { max })))],
      });
    const before = make(10),
      after = make(20);
    expect(
      inspectGraph(before)
        .links.map((link) => link.reason.kind)
        .sort(),
    ).toEqual(["list-element", "wrapped-value"]);
    expect(
      compareSchemas(before, after).changes.map(
        (change) => change.representation,
      ),
    ).toEqual(["Reading"]);
    expect(compareSchemas(before, make(10)).changes).toEqual([]);
  });
});
