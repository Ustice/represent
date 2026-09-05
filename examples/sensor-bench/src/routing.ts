import {
  findRoutes,
  fewestSteps,
  selectRoute,
  tracePath,
  uniqueRoute,
  type ConversionRoute,
  type RoutePolicy,
} from "@represent/core";
import { temperature, unroundedTemperature } from "./model.js";

const policies = {
  unique: uniqueRoute,
  fewest: fewestSteps,
  reported: {
    name: "Use reported precision",
    score: (route: ConversionRoute) =>
      route.every((step) => step === temperature.decode) ? route.length : null,
  },
  unrounded: {
    name: "Use unrounded conversion",
    score: (route: ConversionRoute) =>
      route.every((step) => step === unroundedTemperature.decode)
        ? route.length
        : null,
  },
} satisfies Record<string, RoutePolicy>;

export function temperatureRoute(input: unknown, policyName = "unique") {
  const policy = Object.entries(policies).find(
    ([name]) => name === policyName,
  )?.[1];
  if (!policy)
    throw new Error(
      "Choose route policy: unique, fewest, reported, or unrounded",
    );
  const search = findRoutes(
    [
      temperature.encode,
      temperature.decode,
      unroundedTemperature.encode,
      unroundedTemperature.decode,
    ],
    { from: temperature.decode.from, to: temperature.decode.to },
  );
  const selection = selectRoute(search, policy);
  const preferred =
    selection.status === "selected"
      ? [selection.route]
      : selection.status === "ambiguous"
        ? selection.routes
        : [];
  const routes = selection.candidates.map(({ route, score }) => ({
    steps: route.map((step) => ({
      name: step.name,
      from: step.from.name,
      to: step.to.name,
    })),
    score,
    preferred: preferred.includes(route),
  }));
  const report = {
    from: search.from.name,
    to: search.to.name,
    complete: search.complete,
    stoppedBy: search.stoppedBy,
    policy: selection.policy,
    status: selection.status,
    routes,
    scope:
      "Registered simple paths. Policy selects behavior; neither path count nor step count proves equivalent results or losslessness.",
  };
  if (selection.status !== "selected") return report;
  const trace = tracePath(selection.route, input, {
    snapshot: (value: unknown): unknown => structuredClone(value),
  });
  if (trace.status === "failed") {
    const failed = trace.steps.find((step) => step.status === "failed");
    if (failed?.status === "failed") throw failed.error;
  }
  return { ...report, trace };
}
