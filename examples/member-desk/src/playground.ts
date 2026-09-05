import { tracePath, type ConversionRunner } from "@represent/core";
import { z } from "zod";
import { eventExchange } from "./events/model.js";
import { dateTime } from "./fields.js";
import { memberExchange, toPublic } from "./model.js";
import { jsonChanges } from "./json-diff.js";

interface Experiment {
  readonly label: string;
  readonly description: string;
  readonly path: readonly ConversionRunner[];
  readonly sample: unknown;
  readonly comparison: {
    readonly name: string;
    readonly equivalent: (left: unknown, right: unknown) => boolean;
  } | null;
}
const instant = (value: string | undefined) =>
  value === undefined ? undefined : Date.parse(value);
export const experiments = {
  event: {
    label: "Event API round trip",
    description:
      "Decode an Event, then encode it back. Observe title normalization and timestamp spelling alongside domain validation.",
    path: [eventExchange.decode, eventExchange.encode],
    sample: {
      id: "event-1",
      title: "  Weekend gathering  ",
      startsAt: "2026-09-12T10:00+02:00",
      endsAt: "2026-09-12T12:00+02:00",
    },
    comparison: {
      name: "Same identifiers, normalized title, and time instants",
      equivalent(left: unknown, right: unknown) {
        const a = eventExchange.encode.to.parse(left);
        const b = eventExchange.encode.to.parse(right);
        return (
          a.id === b.id &&
          a.title.trim() === b.title.trim() &&
          instant(a.startsAt) === instant(b.startsAt) &&
          instant(a.endsAt) === instant(b.endsAt) &&
          instant(a.rsvpBy) === instant(b.rsvpBy)
        );
      },
    },
  },
  timestamp: {
    label: "Timestamp round trip",
    description:
      "Use the shared date codec directly. Equal instants can have different timezone offsets or precision in their wire spelling.",
    path: [dateTime.decode, dateTime.encode],
    sample: "2026-09-12T10:00+02:00",
    comparison: {
      name: "Same time instant",
      equivalent(left: unknown, right: unknown) {
        return (
          instant(dateTime.encode.to.parse(left)) ===
          instant(dateTime.encode.to.parse(right))
        );
      },
    },
  },
  profile: {
    label: "Member API to public profile",
    description:
      "Decode the member, encode its API value, and publish a public profile. Email and membership status disappear at the final step. This path has no declared reverse.",
    path: [memberExchange.decode, memberExchange.encode, toPublic],
    sample: {
      id: "member-1",
      name: "Maya Chen",
      email: "maya@example.test",
      role: "Organizer",
      status: "Active",
      joinedAt: "2026-08-12T14:30:00.000Z",
    },
    comparison: null,
  },
} satisfies Record<string, Experiment>;
export type ExperimentKind = keyof typeof experiments;

export function runExperiment(kind: ExperimentKind, source: string) {
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch {
    return {
      status: "invalid-json",
      message: "Enter a complete JSON value.",
    } as const;
  }
  const experiment = experiments[kind];
  const result = tracePath(experiment.path, input, {
    snapshot: (value: unknown): unknown => structuredClone(value),
  });
  if (result.status === "failed") return result;
  const changes = jsonChanges(
    z.json().parse(input),
    z.json().parse(result.value),
  );
  const comparison = experiment.comparison && {
    name: experiment.comparison.name,
    equivalent: experiment.comparison.equivalent(input, result.value),
  };
  return { ...result, changes, comparison };
}
