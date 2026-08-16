import * as z from "zod";

import {
  blockerClassificationSchema,
  canonicalDecimalIdSchema,
  githubObjectIdSchema,
  nonBlankStringSchema,
  repositoryUrlSchema,
  revisionMarkerSchema,
  sensitiveClassificationSchema,
  timestampSchema,
  workflowRunSchema,
  type DeepReadonly,
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
export const inputWithoutTransitionsSchema = z.object({
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
export const blockerInputSchema = inputWithoutTransitionsSchema.extend({
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
export type BlockerSignal = DeepReadonly<z.infer<typeof blockerSignalSchema>>;
