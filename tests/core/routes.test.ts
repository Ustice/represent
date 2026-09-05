import { describe, expect, it } from "vitest";
import {
  compose,
  conversion,
  findRoutes,
  fewestSteps,
  numberValue,
  selectRoute,
  tracePath,
} from "../../packages/represent/src/index.js";

function fixture() {
  const from = numberValue("Source");
  const middle = numberValue("Intermediate");
  const to = numberValue("Target");
  const calls: string[] = [];
  const direct = conversion({
    name: "Direct",
    from,
    to,
    map(value) {
      calls.push("direct");
      return value + 10;
    },
  });
  const first = conversion({
    name: "First",
    from,
    to: middle,
    map(value) {
      calls.push("first");
      return value + 1;
    },
  });
  const second = conversion({
    name: "Second",
    from: middle,
    to,
    map(value) {
      calls.push("second");
      return value * 2;
    },
  });
  const cycle = conversion({
    name: "Cycle",
    from: middle,
    to: from,
    map: (value) => value,
  });
  return { from, to, direct, first, second, cycle, calls };
}

describe("bounded conversion route discovery", () => {
  it("discovers deterministic simple paths without execution and refuses to silently choose between different results", () => {
    const f = fixture();
    const registry = [f.second, f.cycle, f.direct, f.first];
    const search = findRoutes(registry, f);
    expect(search.complete).toBe(true);
    expect(search.routes).toEqual([[f.direct], [f.first, f.second]]);
    expect(findRoutes([...registry].reverse(), f).routes).toEqual(
      search.routes,
    );
    expect(f.calls).toEqual([]);
    expect(selectRoute(search).status).toBe("ambiguous");
    const selected = selectRoute(search, fewestSteps);
    if (selected.status !== "selected")
      throw new Error("Expected shortest route");
    expect(selected.route).toEqual([f.direct]);
    expect(
      tracePath(selected.route, 3, { snapshot: (value) => value }),
    ).toMatchObject({ status: "completed", output: 13 });
    expect(f.calls).toEqual(["direct"]);
  });

  it("preserves a tie between equal-length paths and explains policy exclusions", () => {
    const f = fixture();
    const other = conversion({
      name: "Other direct",
      from: f.from,
      to: f.to,
      map: (value) => value - 10,
    });
    const search = findRoutes([f.direct, other], f);
    expect(selectRoute(search, fewestSteps)).toMatchObject({
      status: "ambiguous",
      score: 1,
    });
    expect(
      selectRoute(search, {
        name: "Use Other",
        score: (route) => (route.includes(other) ? 0 : null),
      }),
    ).toMatchObject({
      status: "selected",
      route: [other],
      candidates: [{ score: null }, { score: 0 }],
    });
    expect(
      selectRoute(search, { name: "Exclude all", score: () => null }),
    ).toMatchObject({ status: "none", reason: "excluded-by-policy" });
  });

  it.each([
    ["steps", { maxSteps: 1 }],
    ["routes", { maxRoutes: 1 }],
    ["states", { maxStates: 1 }],
  ] as const)(
    "does not mistake a %s-limited search for a unique route",
    (reason, limits) => {
      const f = fixture();
      const search = findRoutes([f.direct, f.first, f.second], {
        ...f,
        limits,
      });
      expect(search.routes).toEqual([[f.direct]]);
      expect(search.complete).toBe(false);
      expect(search.stoppedBy).toContain(reason);
      expect(selectRoute(search, fewestSteps).status).toBe("incomplete");
    },
  );

  it("reports complete absence and does not label an exactly filled route limit as truncated", () => {
    const f = fixture();
    expect(selectRoute(findRoutes([f.first], f))).toMatchObject({
      status: "none",
      reason: "no-route",
    });
    const search = findRoutes([f.direct], {
      ...f,
      limits: { maxRoutes: 1, maxSteps: 1, maxStates: 1 },
    });
    expect(search.complete).toBe(true);
    expect(selectRoute(search).status).toBe("selected");
  });

  it("does not turn an internal dependency into an implicitly executable route", () => {
    const f = fixture();
    const composed = compose(f.first, f.second);
    expect(findRoutes([composed], f).routes).toEqual([[composed]]);
    expect(
      findRoutes([composed], { from: f.first.to, to: f.to }).routes,
    ).toEqual([]);
  });

  it("rejects conflicting identities, invalid budgets, and policies with meaningless scores", () => {
    const f = fixture();
    expect(() =>
      findRoutes([f.direct], { from: numberValue("Source"), to: f.to }),
    ).toThrow("Duplicate representation name");
    expect(() => findRoutes([f.direct, f.direct], f)).toThrow(
      "Duplicate conversion name",
    );
    expect(() => findRoutes([], { from: f.from, to: f.from })).toThrow(
      "explicit path for round trips",
    );
    for (const maxSteps of [0, -1, 1.5, Infinity])
      expect(() => findRoutes([], { ...f, limits: { maxSteps } })).toThrow(
        "positive safe integer",
      );
    const search = findRoutes([f.direct], f);
    for (const score of [NaN, Infinity, -Infinity])
      expect(() =>
        selectRoute(search, { name: "Invalid", score: () => score }),
      ).toThrow("finite score or null");
  });
});
