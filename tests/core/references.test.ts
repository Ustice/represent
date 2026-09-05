import { describe, expect, it } from "vitest";
import {
  graph,
  operation,
  recordCodec,
  reference,
  representation,
} from "../../packages/represent/src/index.js";

const text = representation({
  name: "Text",
  parse(input) {
    if (typeof input !== "string") throw new Error("Expected text");
    return input;
  },
});
const source = recordCodec({
  name: "Signup",
  from: "Signup",
  to: "Signup JSON",
  fields: { memberId: text },
}).encode.from;
const target = recordCodec({
  name: "Person",
  from: "Person",
  to: "Person JSON",
  fields: { id: text, label: text },
}).encode.from;
const memberRef = reference({
  name: "Signup member",
  from: source,
  field: "memberId",
  to: target,
  key: "id",
});

describe("explicit references and operation graphs", () => {
  it("resolves the declared key regardless of order, returns missing, and rejects ambiguity", () => {
    const people = [
      { id: "b", label: "Bee" },
      { id: "a", label: "Ay" },
    ];
    expect(memberRef.resolve({ memberId: "a" }, people)).toBe(people[1]);
    expect(memberRef.resolve({ memberId: "absent" }, people)).toBeUndefined();
    expect(() =>
      memberRef.resolve({ memberId: "a" }, [
        ...people,
        { id: "a", label: "Other" },
      ]),
    ).toThrow(/Signup member: ambiguous Person.id for Signup.memberId/);
  });

  it("includes operation-only endpoints, reads, and shared reference bindings without executing work", () => {
    const output = representation({
      name: "Greeting",
      parse: () => {
        throw new Error("Must not parse while graphing");
      },
    });
    const reads = [target];
    const refs = [memberRef];
    const greet = operation({
      name: "Greet",
      input: source,
      output,
      reads,
      references: refs,
      perform: () => {
        throw new Error("Must not perform while graphing");
      },
    });
    reads.length = 0;
    refs.length = 0;
    const result = graph([], { operations: [greet], references: [memberRef] });
    expect(result.nodes).toEqual([
      { name: "Signup" },
      { name: "Person" },
      { name: "Greeting" },
    ]);
    expect(result.references).toEqual([
      {
        name: "Signup member",
        from: "Signup",
        field: "memberId",
        to: "Person",
        key: "id",
      },
    ]);
    expect(result.operations).toEqual([
      {
        name: "Greet",
        input: "Signup",
        output: "Greeting",
        reads: ["Person"],
        references: ["Signup member"],
        calls: [],
      },
    ]);
    expect(result.edges).toEqual([]);
  });

  it("rejects conflicting reference, operation, and representation names", () => {
    const duplicate = reference({
      name: memberRef.name,
      from: source,
      field: "memberId",
      to: target,
      key: "label",
    });
    expect(() => graph([], { references: [memberRef, duplicate] })).toThrow(
      /Duplicate reference name/,
    );
    const lookup = operation({
      name: "Lookup",
      input: source,
      output: source,
      perform: (value) => value,
    });
    expect(() => graph([], { operations: [lookup, lookup] })).toThrow(
      /Duplicate operation name/,
    );
    const otherTarget = representation({ ...target });
    const conflicting = operation({
      name: "Read other",
      input: source,
      output: source,
      reads: [otherTarget],
      perform: (value) => value,
    });
    expect(() =>
      graph([], { references: [memberRef], operations: [conflicting] }),
    ).toThrow(/Duplicate representation name: Person/);
  });
});
