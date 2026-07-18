import * as z from "zod";
import { isDeepStrictEqual } from "node:util";

import {
  blockerClassificationSchema,
  canonicalDecimalIdSchema,
  githubObjectIdSchema,
  nonBlankStringSchema,
  repositoryUrlSchema,
  revisionMarkerSchema,
  sameGitHubObject,
  sensitiveClassificationSchema,
  timestampSchema,
  workflowRunSchema,
  type DeepReadonly,
  type NotificationPayload,
} from "./github-evidence.js";

export type {
  BlockerClassification,
  NotificationPayload,
  SensitiveClassification,
} from "./github-evidence.js";

const idWithNumberSchema = githubObjectIdSchema.extend({
  number: z.number().int().positive().safe(),
});
const nonEmptyStringsSchema = z.array(nonBlankStringSchema).min(1);
const publicEvidenceShape = {
  minimalExample: nonBlankStringSchema,
  authorityLinks: nonEmptyStringsSchema,
  alternatives: nonEmptyStringsSchema,
  affectedGuarantees: nonEmptyStringsSchema,
  smallestDecisionRequired: nonBlankStringSchema,
} as const;
const publicEvidenceSchema = z.object(publicEvidenceShape);
const ordinarySignalSchema = z.object({
  kind: z.literal("ordinary-implementation-failure"),
  code: z.literal("implementation-failure"),
});
const designBlockerSignalSchema = z.object({
  kind: z.literal("design-blocker"),
  code: blockerClassificationSchema,
  evidence: publicEvidenceSchema,
});
const sensitiveBlockerSignalSchema = z.object({
  kind: z.literal("sensitive-blocker"),
  code: sensitiveClassificationSchema,
});
const blockerSignalSchema = z.discriminatedUnion("kind", [
  designBlockerSignalSchema,
  sensitiveBlockerSignalSchema,
]);
const signalSchema = z.discriminatedUnion("kind", [
  ordinarySignalSchema,
  designBlockerSignalSchema,
  sensitiveBlockerSignalSchema,
]);
const publicRecordSchema = z.discriminatedUnion("disclosure", [
  z.object({
    disclosure: z.literal("reviewed-public-evidence"),
    marker: z.literal("<!-- represent-design-blocker -->"),
    title: z.literal("Automation stopped for a design decision"),
    classification: blockerClassificationSchema,
    ...publicEvidenceShape,
  }),
  z.object({
    disclosure: z.literal("fixed-sensitive-marker"),
    marker: z.literal("<!-- represent-sensitive-blocker -->"),
    title: z.literal("Private human review required"),
    classification: sensitiveClassificationSchema,
  }),
]);
const transitionPayloadSchema = z.object({
  kind: z.literal("blocker-escalated"),
  repositoryId: githubObjectIdSchema,
  workItemId: idWithNumberSchema,
  workItemRevision: revisionMarkerSchema,
  sourceEventId: nonBlankStringSchema,
  sourceDeliveryId: nonBlankStringSchema,
  workflowRun: workflowRunSchema,
  automationActorId: canonicalDecimalIdSchema,
  observedAt: timestampSchema,
  classification: z.union([
    blockerClassificationSchema,
    sensitiveClassificationSchema,
  ]),
  stateLabel: z.literal("ready-for-human"),
  activationStatus: z.literal("default-off"),
  publicRecord: publicRecordSchema,
  rotationOrRevocationRequired: z.boolean(),
});
const transitionRecordSchema = z.object({
  id: githubObjectIdSchema,
  logicalKey: nonBlankStringSchema,
  payload: transitionPayloadSchema,
});
const inputWithoutTransitionsSchema = z.object({
  config: z.object({
    repositoryId: githubObjectIdSchema,
    automationActorId: canonicalDecimalIdSchema,
    publicRepositoryUrl: repositoryUrlSchema,
    allowedAuthorityLinkPrefixes: nonEmptyStringsSchema,
  }),
  workItemId: idWithNumberSchema,
  workItemRevision: revisionMarkerSchema,
  source: z.object({
    eventId: nonBlankStringSchema,
    deliveryId: nonBlankStringSchema,
    workflowRun: workflowRunSchema,
    observedAt: timestampSchema,
  }),
  signal: signalSchema,
});
const transitionsSchema = z.array(transitionRecordSchema);
const blockerInputSchema = inputWithoutTransitionsSchema.extend({
  signal: blockerSignalSchema,
  existingTransitions: transitionsSchema,
});

export type PublicBlockerEvidence = DeepReadonly<
  z.infer<typeof publicEvidenceSchema>
>;
export type EscalationSignal = DeepReadonly<z.infer<typeof signalSchema>>;
export type PublicBlockerRecord = DeepReadonly<
  z.infer<typeof publicRecordSchema>
>;
export type BlockerTransitionPayload = DeepReadonly<
  z.infer<typeof transitionPayloadSchema>
>;
export type BlockerTransitionRecord = DeepReadonly<
  z.infer<typeof transitionRecordSchema>
>;
export type BlockerTransitionDraft = Pick<
  BlockerTransitionRecord,
  "logicalKey" | "payload"
>;
export type BlockerEscalationConfig = DeepReadonly<
  z.infer<typeof inputWithoutTransitionsSchema>["config"]
>;
export type BlockerEscalationInput = DeepReadonly<
  z.infer<typeof inputWithoutTransitionsSchema> & {
    existingTransitions: z.infer<typeof transitionsSchema>;
  }
>;
type BlockerSignal = DeepReadonly<z.infer<typeof blockerSignalSchema>>;

export interface BlockerEscalationResult {
  readonly state: "continue" | "blocked" | "recovery";
  readonly dependentWorkPermitted: boolean;
  readonly activationStatus: "default-off";
  readonly effectsExecutable: false;
  readonly transitionsToAppend: readonly BlockerTransitionDraft[];
  readonly notification: NotificationPayload | null;
  readonly rotationOrRevocationRequired: boolean;
  readonly diagnostics: readonly string[];
}

const outcome = (
  state: BlockerEscalationResult["state"],
  overrides: Partial<BlockerEscalationResult> = {},
) =>
  ({
    state,
    dependentWorkPermitted: false,
    activationStatus: "default-off",
    effectsExecutable: false,
    transitionsToAppend: [],
    notification: null,
    rotationOrRevocationRequired: false,
    diagnostics: [],
    ...overrides,
  }) as const;

const recovery = (diagnostic: string) =>
  outcome("recovery", { diagnostics: [diagnostic] });

const authorityLinksAllowed = (
  evidence: PublicBlockerEvidence,
  prefixes: readonly string[],
) =>
  evidence.authorityLinks.every((link) =>
    prefixes.some((prefix) => link.startsWith(prefix)),
  );

const publicRecordFor = (signal: BlockerSignal) =>
  signal.kind === "design-blocker"
    ? ({
        disclosure: "reviewed-public-evidence",
        marker: "<!-- represent-design-blocker -->",
        title: "Automation stopped for a design decision",
        classification: signal.code,
        ...signal.evidence,
      } as const)
    : ({
        disclosure: "fixed-sensitive-marker",
        marker: "<!-- represent-sensitive-blocker -->",
        title: "Private human review required",
        classification: signal.code,
      } as const);

const logicalKey = (payload: BlockerTransitionPayload) =>
  `blocker:${payload.workItemId.nodeId}:${payload.workItemRevision.eventId}:${payload.sourceEventId}:${payload.classification}`;

const transitionIsConsistent = (
  record: BlockerTransitionRecord,
  input: BlockerEscalationInput,
) => {
  const { payload } = record;
  const publicClassificationMatches =
    payload.publicRecord.classification === payload.classification;
  const rotationMatches =
    payload.rotationOrRevocationRequired ===
    (payload.classification === "suspected-credential-exposure");
  const evidenceAllowed =
    payload.publicRecord.disclosure === "fixed-sensitive-marker" ||
    authorityLinksAllowed(
      payload.publicRecord,
      input.config.allowedAuthorityLinkPrefixes,
    );

  return (
    record.logicalKey === logicalKey(payload) &&
    sameGitHubObject(payload.repositoryId, input.config.repositoryId) &&
    sameGitHubObject(payload.workItemId, input.workItemId) &&
    payload.workItemId.number === input.workItemId.number &&
    publicClassificationMatches &&
    rotationMatches &&
    evidenceAllowed
  );
};

export const evaluateBlockerEscalation = (
  untrustedInput: BlockerEscalationInput,
): BlockerEscalationResult => {
  const parsed = inputWithoutTransitionsSchema.safeParse(untrustedInput);
  if (!parsed.success) {
    return recovery("blocker evidence contains invalid fixed fields");
  }

  if (parsed.data.signal.kind === "ordinary-implementation-failure") {
    return outcome("continue", {
      dependentWorkPermitted: true,
      diagnostics: ["ordinary implementation failure is not a design blocker"],
    });
  }

  const blocker = blockerInputSchema.safeParse(untrustedInput);
  if (!blocker.success) {
    return recovery("blocker evidence contains invalid fixed fields");
  }
  const input = blocker.data;

  if (
    input.signal.kind === "design-blocker" &&
    !authorityLinksAllowed(
      input.signal.evidence,
      input.config.allowedAuthorityLinkPrefixes,
    )
  ) {
    return recovery("public blocker evidence is outside authority");
  }

  if (
    !input.existingTransitions.every((record) =>
      transitionIsConsistent(record, input),
    )
  ) {
    return recovery("existing blocker transition is invalid or inconsistent");
  }

  const rotationOrRevocationRequired =
    input.signal.code === "suspected-credential-exposure";
  const payload = {
    kind: "blocker-escalated",
    repositoryId: input.config.repositoryId,
    workItemId: input.workItemId,
    workItemRevision: input.workItemRevision,
    sourceEventId: input.source.eventId,
    sourceDeliveryId: input.source.deliveryId,
    workflowRun: input.source.workflowRun,
    automationActorId: input.config.automationActorId,
    observedAt: input.source.observedAt,
    classification: input.signal.code,
    stateLabel: "ready-for-human",
    activationStatus: "default-off",
    publicRecord: publicRecordFor(input.signal),
    rotationOrRevocationRequired,
  } as const;
  const key = logicalKey(payload);
  const matching = input.existingTransitions.filter(
    (record) => record.logicalKey === key,
  );

  if (matching.length > 1) {
    return recovery(
      "duplicate blocker transition records require reconciliation",
    );
  }
  const existing = matching[0];
  if (existing && !isDeepStrictEqual(existing.payload, payload)) {
    return recovery(
      "blocker transition conflicts with current immutable evidence",
    );
  }

  return outcome("blocked", {
    transitionsToAppend: existing ? [] : [{ logicalKey: key, payload }],
    notification: existing
      ? null
      : ({
          repositoryId: input.config.repositoryId.restId,
          workItemId: input.workItemId.restId,
          workItemNumber: input.workItemId.number,
          classification: input.signal.code,
          githubUrl: `${input.config.publicRepositoryUrl}/issues/${input.workItemId.number}`,
        } as const),
    rotationOrRevocationRequired,
    diagnostics: [
      rotationOrRevocationRequired
        ? "private review required; rotate or revoke suspected credentials"
        : "dependent work stopped for human decision",
    ],
  });
};
