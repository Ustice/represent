import * as z from "zod";

import {
  canonicalDecimalIdSchema,
  githubObjectIdSchema,
  nonBlankStringSchema,
  revisionMarkerSchema,
  timestampSchema,
  workflowRunSchema,
  type DeepReadonly,
} from "./github-evidence.js";

const issueIdSchema = githubObjectIdSchema.extend({
  number: z.number().int().positive().safe(),
});

const objectiveRevisionSchema = z.object({
  title: z.string(),
  body: z.string(),
  marker: revisionMarkerSchema,
});

const authorityCommentSchema = z.object({
  id: githubObjectIdSchema,
  author: z.object({
    id: canonicalDecimalIdSchema,
    type: nonBlankStringSchema,
  }),
  body: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  deleted: z.boolean(),
});

const commandCreatedEventSchema = z.object({
  deliveryId: nonBlankStringSchema,
  eventId: nonBlankStringSchema,
  action: z.enum(["created", "edited", "deleted"]),
  repositoryId: githubObjectIdSchema,
  issueId: issueIdSchema,
  issueState: z.enum(["OPEN", "CLOSED"]),
  issueDisposition: z.enum(["active", "blocked", "superseded"]),
  capturedRevision: objectiveRevisionSchema,
  comment: authorityCommentSchema,
});

const transitionAuditEnvelopeSchema = z.object({
  workflowRun: workflowRunSchema,
  machineActorId: canonicalDecimalIdSchema,
  observedAt: timestampSchema,
  outcome: z.enum(["approved", "revocation-requested", "revoked"]),
  nextState: z.enum(["approved", "revocation-requested", "revoked"]),
  activationStatus: z.literal("default-off"),
  scopeLinks: z.array(nonBlankStringSchema),
  nextEligibleStep: z.literal("objective-intake-validation").nullable(),
});

const securedPullRequestSchema = z.object({
  repositoryId: githubObjectIdSchema,
  pullRequestId: issueIdSchema,
  headSha: nonBlankStringSchema,
  observationEventId: nonBlankStringSchema,
  checkRunId: githubObjectIdSchema,
  checkIntegrationId: canonicalDecimalIdSchema,
});

const approvalTransitionPayloadSchema = z.object({
  kind: z.literal("approval-recorded"),
  audit: transitionAuditEnvelopeSchema,
  sourceDeliveryId: nonBlankStringSchema,
  sourceEventId: nonBlankStringSchema,
  sourceCommentId: githubObjectIdSchema,
  repositoryId: githubObjectIdSchema,
  issueId: issueIdSchema,
  approvedRevision: objectiveRevisionSchema,
  approvingUserId: canonicalDecimalIdSchema,
  approvalTimestamp: timestampSchema,
});

const revocationRequestedTransitionPayloadSchema = z.object({
  kind: z.literal("revocation-requested"),
  audit: transitionAuditEnvelopeSchema,
  sourceDeliveryId: nonBlankStringSchema,
  sourceEventId: nonBlankStringSchema,
  sourceCommentId: githubObjectIdSchema,
  repositoryId: githubObjectIdSchema,
  issueId: issueIdSchema,
  revokingUserId: canonicalDecimalIdSchema,
  requestedAt: timestampSchema,
});

const revocationEffectiveTransitionPayloadSchema = z.object({
  kind: z.literal("revocation-effective"),
  audit: transitionAuditEnvelopeSchema,
  requestLogicalKey: nonBlankStringSchema,
  securedPullRequests: z.array(securedPullRequestSchema),
});

const authorityTransitionPayloadSchema = z.discriminatedUnion("kind", [
  approvalTransitionPayloadSchema,
  revocationRequestedTransitionPayloadSchema,
  revocationEffectiveTransitionPayloadSchema,
]);

const authorityTransitionRecordSchema = z.object({
  id: githubObjectIdSchema,
  automationActorId: canonicalDecimalIdSchema,
  logicalKey: nonBlankStringSchema,
  payload: authorityTransitionPayloadSchema,
});

const nativePullRequestObservationSchema = z.object({
  repositoryId: githubObjectIdSchema,
  pullRequestId: issueIdSchema,
  headSha: nonBlankStringSchema,
  observation: z.object({
    eventId: nonBlankStringSchema,
    workflowRun: workflowRunSchema,
    observedAt: timestampSchema,
  }),
  objectiveAuthorityCheck: z.object({
    context: z.string(),
    checkRunId: githubObjectIdSchema.nullable(),
    integrationId: canonicalDecimalIdSchema.nullable(),
    headSha: z.string(),
    conclusion: z.enum(["success", "non-successful", "pending", "missing"]),
  }),
  autoMerge: z.object({
    state: z.enum(["enabled", "disabled", "not-configured", "unknown"]),
    requestId: githubObjectIdSchema.nullable(),
  }),
});

export const revocationNativeStateSchema = z.object({
  handler: z.enum(["available", "unavailable"]),
  pullRequests: z.array(nativePullRequestObservationSchema),
});

export const objectiveAuthorityInputSchema = z.object({
  config: z.object({
    repositoryId: githubObjectIdSchema,
    objectiveIssueId: issueIdSchema,
    authorityUserId: canonicalDecimalIdSchema,
    automationActorId: canonicalDecimalIdSchema,
    objectiveAuthorityCheck: z.object({
      context: z.literal("objective-authority"),
      integrationId: canonicalDecimalIdSchema,
    }),
    scopeLinks: z.array(nonBlankStringSchema),
  }),
  current: z.object({
    repository: githubObjectIdSchema.extend({ isFork: z.boolean() }),
    issue: issueIdSchema.extend({
      state: z.enum(["OPEN", "CLOSED"]),
      disposition: z.enum(["active", "blocked", "superseded"]),
      revision: objectiveRevisionSchema,
    }),
  }),
  commandEvents: z.array(commandCreatedEventSchema),
  currentComments: z.array(authorityCommentSchema),
  transitions: z.array(authorityTransitionRecordSchema),
  // Native observations are conditionally relevant only after a persisted
  // revocation request. The reducer parses them at that decision seam.
  revocationNativeState: z.custom<RevocationNativeState>().optional(),
  evaluation: z.object({
    workflowRun: workflowRunSchema,
    observedAt: timestampSchema,
  }),
  untrustedMetadata: z
    .object({
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional(),
      milestone: z.string().nullable().optional(),
      reactions: z.array(z.string()).optional(),
      displayLogin: z.string().optional(),
    })
    .optional(),
});

export type GitHubObjectId = DeepReadonly<z.infer<typeof githubObjectIdSchema>>;
export type GitHubWorkflowRun = DeepReadonly<z.infer<typeof workflowRunSchema>>;
export type ScopeRevisionMarker = DeepReadonly<
  z.infer<typeof revisionMarkerSchema>
>;
export type ObjectiveRevision = DeepReadonly<
  z.infer<typeof objectiveRevisionSchema>
>;
export type AuthorityComment = DeepReadonly<
  z.infer<typeof authorityCommentSchema>
>;
export type CommandCreatedEvent = DeepReadonly<
  z.infer<typeof commandCreatedEventSchema>
>;
export type TransitionAuditEnvelope = DeepReadonly<
  z.infer<typeof transitionAuditEnvelopeSchema>
>;
export type ApprovalTransitionPayload = DeepReadonly<
  z.infer<typeof approvalTransitionPayloadSchema>
>;
export type RevocationRequestedTransitionPayload = DeepReadonly<
  z.infer<typeof revocationRequestedTransitionPayloadSchema>
>;
export type RevocationEffectiveTransitionPayload = DeepReadonly<
  z.infer<typeof revocationEffectiveTransitionPayloadSchema>
>;
export type AuthorityTransitionPayload = DeepReadonly<
  z.infer<typeof authorityTransitionPayloadSchema>
>;
export type AuthorityTransitionRecord = DeepReadonly<
  z.infer<typeof authorityTransitionRecordSchema>
>;
export type AuthorityTransitionDraft = Pick<
  AuthorityTransitionRecord,
  "logicalKey" | "payload"
>;
export type NativePullRequestObservation = DeepReadonly<
  z.infer<typeof nativePullRequestObservationSchema>
>;
export type RevocationNativeState = DeepReadonly<
  z.infer<typeof revocationNativeStateSchema>
>;
export type SecuredPullRequest = DeepReadonly<
  z.infer<typeof securedPullRequestSchema>
>;
export type ObjectiveAuthorityConfig = DeepReadonly<
  z.infer<typeof objectiveAuthorityInputSchema>["config"]
>;
export type ObjectiveSnapshot = DeepReadonly<
  z.infer<typeof objectiveAuthorityInputSchema>["current"]
>;
export type UntrustedObjectiveMetadata = DeepReadonly<
  NonNullable<
    z.infer<typeof objectiveAuthorityInputSchema>["untrustedMetadata"]
  >
>;
export type ObjectiveAuthorityInput = DeepReadonly<
  z.infer<typeof objectiveAuthorityInputSchema>
>;
