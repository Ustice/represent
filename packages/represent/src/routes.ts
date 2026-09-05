import { graph } from "./graph.js";
import { inspectGraph } from "./graph-index.js";
import type { Representation } from "./conversions.js";
import type { ConversionRunner } from "./trace.js";

export type ConversionRoute = readonly ConversionRunner[];
export interface RouteLimits {
  readonly maxSteps: number;
  readonly maxRoutes: number;
  readonly maxStates: number;
}
export interface RouteSearch {
  readonly from: Representation<unknown>;
  readonly to: Representation<unknown>;
  readonly routes: readonly ConversionRoute[];
  readonly complete: boolean;
  readonly stoppedBy: readonly ("steps" | "routes" | "states")[];
  readonly limits: RouteLimits;
}

/** Discover simple paths among explicitly registered conversions without running them. */
export function findRoutes(
  conversions: readonly ConversionRunner[],
  options: {
    from: Representation<unknown>;
    to: Representation<unknown>;
    limits?: Partial<RouteLimits>;
  },
): RouteSearch {
  const { from, to } = options;
  if (from === to)
    throw new Error(
      "Route discovery connects distinct representations; use an explicit path for round trips",
    );
  const limits = {
    maxSteps: 8,
    maxRoutes: 32,
    maxStates: 2048,
    ...options.limits,
  };
  for (const [key, value] of Object.entries(limits))
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`${key} must be a positive safe integer`);
  const registry = [...conversions];
  inspectGraph(graph(registry, { representations: [from, to] }));
  const outgoing = new Map<Representation<unknown>, ConversionRunner[]>();
  const incoming = new Map<
    Representation<unknown>,
    Representation<unknown>[]
  >();
  for (const edge of registry) {
    const next = outgoing.get(edge.from) ?? [];
    next.push(edge);
    outgoing.set(edge.from, next);
    const previous = incoming.get(edge.to) ?? [];
    previous.push(edge.from);
    incoming.set(edge.to, previous);
  }
  for (const edges of outgoing.values())
    edges.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const reachesTarget = new Set<Representation<unknown>>([to]);
  for (const current of reachesTarget)
    for (const previous of incoming.get(current) ?? [])
      reachesTarget.add(previous);
  const routes: ConversionRoute[] = [];
  const stoppedBy = new Set<"steps" | "routes" | "states">();
  const finish = (): RouteSearch =>
    Object.freeze({
      from,
      to,
      routes: Object.freeze(routes),
      complete: stoppedBy.size === 0,
      stoppedBy: Object.freeze([...stoppedBy].sort()),
      limits: Object.freeze(limits),
    });
  if (!reachesTarget.has(from)) return finish();
  const states: Array<{
    at: Representation<unknown>;
    path: ConversionRoute;
    seen: Set<Representation<unknown>>;
  }> = [{ at: from, path: [], seen: new Set([from]) }];
  for (const state of states) {
    for (const edge of outgoing.get(state.at) ?? []) {
      if (state.seen.has(edge.to) || !reachesTarget.has(edge.to)) continue;
      if (state.path.length >= limits.maxSteps) {
        stoppedBy.add("steps");
        continue;
      }
      const path = Object.freeze([...state.path, edge]);
      if (edge.to === to) {
        if (routes.length === limits.maxRoutes) {
          stoppedBy.add("routes");
          return finish();
        }
        routes.push(path);
      } else if (states.length === limits.maxStates) {
        stoppedBy.add("states");
      } else {
        states.push({
          at: edge.to,
          path,
          seen: new Set([...state.seen, edge.to]),
        });
      }
    }
  }
  return finish();
}

export interface RoutePolicy {
  readonly name: string;
  /** Lower finite scores are preferred. Null excludes a route. */
  readonly score: (route: ConversionRoute) => number | null;
}
export const fewestSteps: RoutePolicy = Object.freeze({
  name: "Fewest conversion steps",
  score: (route: ConversionRoute) => route.length,
});
const uniqueRoute: RoutePolicy = { name: "Unique route", score: () => 0 };

export function selectRoute(
  search: RouteSearch,
  policy: RoutePolicy = uniqueRoute,
) {
  const candidates = search.routes.map((route) => {
    const score = policy.score(route);
    if (score !== null && !Number.isFinite(score))
      throw new Error(
        `Policy ${policy.name} must return a finite score or null`,
      );
    return { route, score };
  });
  const context = { policy: policy.name, candidates };
  if (!search.complete) return { ...context, status: "incomplete" } as const;
  const eligible = candidates.flatMap((candidate) =>
    candidate.score === null
      ? []
      : [{ route: candidate.route, score: candidate.score }],
  );
  if (!eligible.length)
    return {
      ...context,
      status: "none",
      reason: search.routes.length ? "excluded-by-policy" : "no-route",
    } as const;
  const best = Math.min(...eligible.map((candidate) => candidate.score));
  const winners = eligible.filter((candidate) => candidate.score === best);
  const first = winners[0];
  if (winners.length === 1 && first)
    return {
      ...context,
      status: "selected",
      route: first.route,
      score: first.score,
    } as const;
  return {
    ...context,
    status: "ambiguous",
    routes: winners.map((candidate) => candidate.route),
    score: best,
  } as const;
}
