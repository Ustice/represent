import * as z from "zod";

export type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

export const BLOCKER_CLASSIFICATIONS = [
  "design-authority-conflict",
  "inexpressible-invariant",
  "target-semantics-leak",
  "untestable-law",
  "weakened-guarantee",
  "unsafe-consumer-cast",
  "diagnostic-type-harm",
  "undefined-path-consistency",
] as const;

export const SENSITIVE_CLASSIFICATIONS = [
  "sensitive-review-required",
  "suspected-credential-exposure",
] as const;

export type BlockerClassification = (typeof BLOCKER_CLASSIFICATIONS)[number];
export type SensitiveClassification =
  (typeof SENSITIVE_CLASSIFICATIONS)[number];

export const nonBlankStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0);
export const canonicalDecimalIdSchema = z.string().regex(/^(0|[1-9]\d*)$/);
export const timestampSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));
export const canonicalTimestampSchema = timestampSchema.refine(
  (value) => new Date(value).toISOString() === value,
);
export const repositoryUrlSchema = z
  .string()
  .regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

export const githubObjectIdSchema = z.object({
  nodeId: nonBlankStringSchema,
  restId: canonicalDecimalIdSchema,
});

export const workflowRunSchema = z.object({
  restId: canonicalDecimalIdSchema,
  attempt: z.number().int().positive().safe(),
});

export const revisionMarkerSchema = z.object({
  eventId: nonBlankStringSchema,
  deliveryId: nonBlankStringSchema,
  occurredAt: timestampSchema,
});

export const blockerClassificationSchema = z.enum(BLOCKER_CLASSIFICATIONS);
export const sensitiveClassificationSchema = z.enum(SENSITIVE_CLASSIFICATIONS);
export const notificationClassificationSchema = z.union([
  blockerClassificationSchema,
  sensitiveClassificationSchema,
]);

export const notificationPayloadSchema = z.object({
  repositoryId: canonicalDecimalIdSchema,
  workItemId: canonicalDecimalIdSchema,
  workItemNumber: z.number().int().positive().safe(),
  classification: notificationClassificationSchema,
  githubUrl: z.url(),
});

export type NotificationPayload = DeepReadonly<
  z.infer<typeof notificationPayloadSchema>
>;

export const gitObjectRevisionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("github-rest-object"),
    restId: canonicalDecimalIdSchema,
    updatedAt: canonicalTimestampSchema,
  }),
  z.object({
    kind: z.literal("git-head"),
    sha: z.string().regex(/^[0-9a-f]{40}$/),
  }),
]);

export type GitObjectRevision = DeepReadonly<
  z.infer<typeof gitObjectRevisionSchema>
>;

export const sameGitHubObject = (
  left: z.infer<typeof githubObjectIdSchema>,
  right: z.infer<typeof githubObjectIdSchema>,
) => left.nodeId === right.nodeId && left.restId === right.restId;
