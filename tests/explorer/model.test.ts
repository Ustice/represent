import { describe, expect, it } from "vitest";
import {
  graph,
  conversion,
  operation,
  representation,
} from "../../packages/represent/src/index.js";
import { createExplorer } from "../../packages/explorer/src/index.js";
import { explorerModel } from "../../packages/explorer/src/model.js";

const input = representation({
  name: "Input",
  parse: (value: unknown) => String(value),
});
const output = representation({
  name: "Output",
  parse: (value: unknown) => String(value),
});

describe("explorer consumer", () => {
  it("shows output flow away from a conversion while retaining its output-contract requirement", () => {
    const encode = conversion({
      name: "Format",
      from: input,
      to: output,
      map: (value) => value,
    });
    const report = operation({
      name: "Report",
      input,
      output,
      reads: [output],
      calls: [encode],
      perform: (value) => value,
    });
    const model = explorerModel(graph([], { operations: [report] }));
    expect(
      model.relationships.map(({ from, to, label }) => [
        from.kind,
        from.name,
        label,
        to.kind,
        to.name,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["representation", "Input", "input", "conversion", "Format"],
        ["conversion", "Format", "output", "representation", "Output"],
        ["operation", "Report", "reads", "representation", "Output"],
        ["operation", "Report", "calls", "conversion", "Format"],
      ]),
    );
    expect(model.links).toContainEqual({
      dependency: { kind: "representation", name: "Output" },
      dependent: { kind: "conversion", name: "Format" },
      reason: { kind: "output" },
    });
  });
  it("escapes definition and field content at the rendered HTML boundary", () => {
    const name = '"><img src=x onerror=alert(1)>';
    const source = representation({ name, parse: (value: unknown) => value });
    const encode = conversion({
      name: "Show",
      from: source,
      to: source,
      map: (value) => value,
    });
    const viewer = createExplorer(graph([encode]), {
      initial: { kind: "representation", name },
    });
    const html = viewer.render();
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
  it("accepts isolated and empty models and snapshots a caller's graph", () => {
    const model = {
      nodes: [{ name: "Alone" }],
      edges: [],
      dependencies: [],
      operations: [],
      references: [],
    };
    const viewer = createExplorer(model);
    const before = viewer.render();
    model.nodes[0] = { name: "Replaced" };
    expect(viewer.render()).toBe(before);
    expect(before).toContain("No relationships are declared");
    expect(createExplorer(graph([])).render()).toContain("no definitions yet");
    expect(() =>
      createExplorer(graph([]), {
        initial: { kind: "operation", name: "Missing" },
      }),
    ).toThrow("Unknown initial selection");
  });
});
