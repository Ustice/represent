import type { z } from "zod";

type JsonValue = z.core.util.JSONType;
export type JsonChange = { readonly path: readonly (string | number)[] } & (
  | { readonly kind: "added"; readonly after: JsonValue }
  | { readonly kind: "removed"; readonly before: JsonValue }
  | {
      readonly kind: "changed";
      readonly before: JsonValue;
      readonly after: JsonValue;
    }
);

// Compare parsed JSON values. Object property order is not part of equality.
export function jsonChanges(before: JsonValue, after: JsonValue) {
  const changes: JsonChange[] = [];
  function visit(
    left: JsonValue | undefined,
    right: JsonValue | undefined,
    path: (string | number)[],
  ) {
    if (left === right) return;
    if (left === undefined) {
      if (right !== undefined)
        changes.push({ path, kind: "added", after: right });
      return;
    }
    if (right === undefined) {
      changes.push({ path, kind: "removed", before: left });
      return;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
      for (let index = 0; index < Math.max(left.length, right.length); index++)
        visit(left[index], right[index], [...path, index]);
      return;
    }
    if (
      typeof left === "object" &&
      left !== null &&
      !Array.isArray(left) &&
      typeof right === "object" &&
      right !== null &&
      !Array.isArray(right)
    ) {
      const keys = [
        ...new Set([...Object.keys(left), ...Object.keys(right)]),
      ].sort();
      for (const key of keys)
        visit(
          Object.hasOwn(left, key) ? left[key] : undefined,
          Object.hasOwn(right, key) ? right[key] : undefined,
          [...path, key],
        );
      return;
    }
    changes.push({ path, kind: "changed", before: left, after: right });
  }
  visit(before, after, []);
  return changes;
}
