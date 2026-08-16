import {
  objectiveAuthorityInputSchema,
  revocationNativeStateSchema,
  type AuthorityComment,
  type AuthorityTransitionDraft,
  type AuthorityTransitionPayload,
  type AuthorityTransitionRecord,
  type CommandCreatedEvent,
  type GitHubObjectId,
  type GitHubWorkflowRun,
  type NativePullRequestObservation,
  type ObjectiveAuthorityInput,
  type ObjectiveRevision,
  type RevocationNativeState,
  type SecuredPullRequest,
  type TransitionAuditEnvelope,
} from "./objective-authority-schema.js";

export type {
  ApprovalTransitionPayload,
  AuthorityComment,
  AuthorityTransitionDraft,
  AuthorityTransitionPayload,
  AuthorityTransitionRecord,
  CommandCreatedEvent,
  GitHubObjectId,
  GitHubWorkflowRun,
  NativePullRequestObservation,
  ObjectiveAuthorityConfig,
  ObjectiveAuthorityInput,
  ObjectiveRevision,
  ObjectiveSnapshot,
  RevocationEffectiveTransitionPayload,
  RevocationNativeState,
  RevocationRequestedTransitionPayload,
  ScopeRevisionMarker,
  SecuredPullRequest,
  TransitionAuditEnvelope,
  UntrustedObjectiveMetadata,
} from "./objective-authority-schema.js";

export const JASON_GITHUB_USER_ID = "35118";
export const REPEATED_COMMAND_SELECTION_RULE =
  "first-recorded-transition-wins" as const;

export type ObjectiveAuthorityState =
  | "proposed"
  | "approved"
  | "revocation-requested"
  | "revoked"
  | "recovery"
  | "closed"
  | "blocked"
  | "superseded";

export type AuthorityCommand = "/approve" | "/revoke";

export interface NativeRevocationAction {
  readonly kind: "secure-native-head";
  readonly repositoryId: GitHubObjectId;
  readonly pullRequestId: GitHubObjectId & {
    readonly number: number;
  };
  readonly expectedHeadSha: string;
  readonly expectedObservationEventId: string;
  readonly expectedCheckRunId: GitHubObjectId | null;
  readonly expectedCheckIntegrationId: string | null;
  readonly expectedAutoMergeRequestId: GitHubObjectId | null;
  readonly makeObjectiveAuthorityNonSuccessful: boolean;
  readonly cancelAutoMerge: boolean;
}

export interface ObjectiveStatusProjection {
  readonly marker: "<!-- represent-objective-authority -->";
  readonly stateLabel: `automation-${ObjectiveAuthorityState}`;
  readonly activationStatus: "default-off";
  readonly nextEligibleStep: "objective-intake-validation" | null;
  readonly body: string;
}

interface ObjectiveAuthorityResultBase {
  readonly activationStatus: "default-off";
  readonly effectsExecutable: false;
  readonly transitionsToAppend: readonly AuthorityTransitionDraft[];
  readonly nativeActions: readonly NativeRevocationAction[];
  readonly projection: ObjectiveStatusProjection;
  readonly diagnostics: readonly string[];
}

type InertObjectiveAuthorityResult = ObjectiveAuthorityResultBase & {
  readonly state: Exclude<ObjectiveAuthorityState, "approved">;
  readonly schedulingPermitted: false;
  readonly nextEligibleStep: null;
  readonly approvedRevision?: never;
  readonly approvalCommentId?: never;
};

type ApprovedObjectiveAuthorityResult = ObjectiveAuthorityResultBase & {
  readonly state: "approved";
  readonly schedulingPermitted: true;
  readonly nextEligibleStep: "objective-intake-validation";
  readonly approvedRevision: ObjectiveRevision;
  readonly approvalCommentId: GitHubObjectId;
};

export type ObjectiveAuthorityResult =
  InertObjectiveAuthorityResult | ApprovedObjectiveAuthorityResult;

export type GitHubStateAdmission =
  | "trusted-current-state"
  | "credentials-unavailable"
  | "permissions-under-scoped";

export type ObjectiveAuthorityAdmissionResult =
  | {
      readonly status: "evaluated";
      readonly effectsExecutable: false;
      readonly result: ObjectiveAuthorityResult;
      readonly diagnostics: readonly string[];
    }
  | {
      readonly status: "recovery";
      readonly effectsExecutable: false;
      readonly diagnostics: readonly string[];
    };

interface ValidCommand {
  readonly command: AuthorityCommand;
  readonly event: CommandCreatedEvent;
}

const statusMarker = "<!-- represent-objective-authority -->" as const;

const sameId = (left: GitHubObjectId, right: GitHubObjectId) =>
  left.nodeId === right.nodeId && left.restId === right.restId;

const sameRevision = (left: ObjectiveRevision, right: ObjectiveRevision) =>
  left.title === right.title &&
  left.body === right.body &&
  left.marker.eventId === right.marker.eventId &&
  left.marker.deliveryId === right.marker.deliveryId &&
  left.marker.occurredAt === right.marker.occurredAt;

const isValidSecuredPullRequest = (
  input: ObjectiveAuthorityInput,
  pullRequest: SecuredPullRequest,
) =>
  sameId(pullRequest.repositoryId, input.config.repositoryId) &&
  pullRequest.checkIntegrationId ===
    input.config.objectiveAuthorityCheck.integrationId;

const compareDecimalIds = (left: string, right: string) =>
  left.length === right.length
    ? left === right
      ? 0
      : left < right
        ? -1
        : 1
    : left.length - right.length;

const compareCommands = (left: ValidCommand, right: ValidCommand) => {
  const timestampOrder = left.event.comment.createdAt.localeCompare(
    right.event.comment.createdAt,
  );

  return timestampOrder === 0
    ? compareDecimalIds(
        left.event.comment.id.restId,
        right.event.comment.id.restId,
      )
    : timestampOrder;
};

const approvalLogicalKey = (event: CommandCreatedEvent) =>
  `approval:${event.issueId.nodeId}:${event.comment.id.nodeId}`;

const revocationRequestLogicalKey = (event: CommandCreatedEvent) =>
  `revocation-requested:${event.issueId.nodeId}:${event.comment.id.nodeId}`;

const revocationEffectiveLogicalKey = (requestLogicalKey: string) =>
  `revocation-effective:${requestLogicalKey}`;

const auditEnvelope = (
  input: ObjectiveAuthorityInput,
  outcome: TransitionAuditEnvelope["outcome"],
  nextEligibleStep: TransitionAuditEnvelope["nextEligibleStep"],
) =>
  ({
    workflowRun: input.evaluation.workflowRun,
    machineActorId: input.config.automationActorId,
    observedAt: input.evaluation.observedAt,
    outcome,
    nextState: outcome,
    activationStatus: "default-off",
    scopeLinks: [...input.config.scopeLinks],
    nextEligibleStep,
  }) as const satisfies TransitionAuditEnvelope;

const approvalDraft = (
  input: ObjectiveAuthorityInput,
  event: CommandCreatedEvent,
) =>
  ({
    logicalKey: approvalLogicalKey(event),
    payload: {
      kind: "approval-recorded",
      audit: auditEnvelope(input, "approved", "objective-intake-validation"),
      sourceDeliveryId: event.deliveryId,
      sourceEventId: event.eventId,
      sourceCommentId: event.comment.id,
      repositoryId: event.repositoryId,
      issueId: event.issueId,
      approvedRevision: event.capturedRevision,
      approvingUserId: event.comment.author.id,
      approvalTimestamp: event.comment.createdAt,
    },
  }) as const satisfies AuthorityTransitionDraft;

const revocationRequestDraft = (
  input: ObjectiveAuthorityInput,
  event: CommandCreatedEvent,
) =>
  ({
    logicalKey: revocationRequestLogicalKey(event),
    payload: {
      kind: "revocation-requested",
      audit: auditEnvelope(input, "revocation-requested", null),
      sourceDeliveryId: event.deliveryId,
      sourceEventId: event.eventId,
      sourceCommentId: event.comment.id,
      repositoryId: event.repositoryId,
      issueId: event.issueId,
      revokingUserId: event.comment.author.id,
      requestedAt: event.comment.createdAt,
    },
  }) as const satisfies AuthorityTransitionDraft;

const sameStringArray = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const sameWorkflowRun = (left: GitHubWorkflowRun, right: GitHubWorkflowRun) =>
  left.restId === right.restId && left.attempt === right.attempt;

const sameAuditEnvelope = (
  left: TransitionAuditEnvelope,
  right: TransitionAuditEnvelope,
) =>
  sameWorkflowRun(left.workflowRun, right.workflowRun) &&
  left.machineActorId === right.machineActorId &&
  left.observedAt === right.observedAt &&
  left.outcome === right.outcome &&
  left.nextState === right.nextState &&
  left.activationStatus === right.activationStatus &&
  sameStringArray(left.scopeLinks, right.scopeLinks) &&
  left.nextEligibleStep === right.nextEligibleStep;

const sameAuditMeaning = (
  left: TransitionAuditEnvelope,
  right: TransitionAuditEnvelope,
) =>
  left.machineActorId === right.machineActorId &&
  left.outcome === right.outcome &&
  left.nextState === right.nextState &&
  left.activationStatus === right.activationStatus &&
  sameStringArray(left.scopeLinks, right.scopeLinks) &&
  left.nextEligibleStep === right.nextEligibleStep;

const sameSecuredPullRequest = (
  left: SecuredPullRequest,
  right: SecuredPullRequest,
) =>
  sameId(left.repositoryId, right.repositoryId) &&
  sameId(left.pullRequestId, right.pullRequestId) &&
  left.pullRequestId.number === right.pullRequestId.number &&
  left.headSha === right.headSha &&
  left.observationEventId === right.observationEventId &&
  sameId(left.checkRunId, right.checkRunId) &&
  left.checkIntegrationId === right.checkIntegrationId;

const sameSecuredPullRequestAuthority = (
  left: SecuredPullRequest,
  right: SecuredPullRequest,
) =>
  sameId(left.repositoryId, right.repositoryId) &&
  sameId(left.pullRequestId, right.pullRequestId) &&
  left.pullRequestId.number === right.pullRequestId.number &&
  left.headSha === right.headSha &&
  left.checkIntegrationId === right.checkIntegrationId;

const sameSecuredPullRequests = (
  left: readonly SecuredPullRequest[],
  right: readonly SecuredPullRequest[],
) =>
  left.length === right.length &&
  left.every((value, index) => {
    const candidate = right[index];

    return candidate ? sameSecuredPullRequest(value, candidate) : false;
  });

const sameSecuredPullRequestAuthorities = (
  left: readonly SecuredPullRequest[],
  right: readonly SecuredPullRequest[],
) =>
  left.length === right.length &&
  left.every((value, index) => {
    const candidate = right[index];

    return candidate
      ? sameSecuredPullRequestAuthority(value, candidate)
      : false;
  });

const sameTransitionPayload = (
  left: AuthorityTransitionPayload,
  right: AuthorityTransitionPayload,
) => {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "approval-recorded":
      return (
        right.kind === "approval-recorded" &&
        sameAuditEnvelope(left.audit, right.audit) &&
        left.sourceDeliveryId === right.sourceDeliveryId &&
        left.sourceEventId === right.sourceEventId &&
        sameId(left.sourceCommentId, right.sourceCommentId) &&
        sameId(left.repositoryId, right.repositoryId) &&
        sameId(left.issueId, right.issueId) &&
        left.issueId.number === right.issueId.number &&
        sameRevision(left.approvedRevision, right.approvedRevision) &&
        left.approvingUserId === right.approvingUserId &&
        left.approvalTimestamp === right.approvalTimestamp
      );
    case "revocation-requested":
      return (
        right.kind === "revocation-requested" &&
        sameAuditEnvelope(left.audit, right.audit) &&
        left.sourceDeliveryId === right.sourceDeliveryId &&
        left.sourceEventId === right.sourceEventId &&
        sameId(left.sourceCommentId, right.sourceCommentId) &&
        sameId(left.repositoryId, right.repositoryId) &&
        sameId(left.issueId, right.issueId) &&
        left.issueId.number === right.issueId.number &&
        left.revokingUserId === right.revokingUserId &&
        left.requestedAt === right.requestedAt
      );
    case "revocation-effective":
      return (
        right.kind === "revocation-effective" &&
        sameAuditEnvelope(left.audit, right.audit) &&
        left.requestLogicalKey === right.requestLogicalKey &&
        sameSecuredPullRequests(
          left.securedPullRequests,
          right.securedPullRequests,
        )
      );
  }
};

const transitionPayloadMatches = (
  record: AuthorityTransitionRecord,
  draft: AuthorityTransitionDraft,
) => {
  if (
    record.logicalKey !== draft.logicalKey ||
    record.payload.kind !== draft.payload.kind ||
    !sameAuditMeaning(record.payload.audit, draft.payload.audit)
  ) {
    return false;
  }

  switch (record.payload.kind) {
    case "approval-recorded":
      return (
        draft.payload.kind === "approval-recorded" &&
        record.payload.sourceDeliveryId === draft.payload.sourceDeliveryId &&
        record.payload.sourceEventId === draft.payload.sourceEventId &&
        sameId(record.payload.sourceCommentId, draft.payload.sourceCommentId) &&
        sameId(record.payload.repositoryId, draft.payload.repositoryId) &&
        sameId(record.payload.issueId, draft.payload.issueId) &&
        record.payload.issueId.number === draft.payload.issueId.number &&
        sameRevision(
          record.payload.approvedRevision,
          draft.payload.approvedRevision,
        ) &&
        record.payload.approvingUserId === draft.payload.approvingUserId &&
        record.payload.approvalTimestamp === draft.payload.approvalTimestamp
      );
    case "revocation-requested":
      return (
        draft.payload.kind === "revocation-requested" &&
        record.payload.sourceDeliveryId === draft.payload.sourceDeliveryId &&
        record.payload.sourceEventId === draft.payload.sourceEventId &&
        sameId(record.payload.sourceCommentId, draft.payload.sourceCommentId) &&
        sameId(record.payload.repositoryId, draft.payload.repositoryId) &&
        sameId(record.payload.issueId, draft.payload.issueId) &&
        record.payload.issueId.number === draft.payload.issueId.number &&
        record.payload.revokingUserId === draft.payload.revokingUserId &&
        record.payload.requestedAt === draft.payload.requestedAt
      );
    case "revocation-effective":
      return (
        draft.payload.kind === "revocation-effective" &&
        record.payload.requestLogicalKey === draft.payload.requestLogicalKey &&
        sameSecuredPullRequestAuthorities(
          record.payload.securedPullRequests,
          draft.payload.securedPullRequests,
        )
      );
  }
};

const formatProjection = (
  state: ObjectiveAuthorityState,
  issueNumber: number,
  nextEligibleStep: "objective-intake-validation" | null,
  sourceCommentId?: GitHubObjectId,
) => {
  const source = sourceCommentId
    ? `\nSource comment: ${sourceCommentId.nodeId} (REST ${sourceCommentId.restId})`
    : "";

  return {
    marker: statusMarker,
    stateLabel: `automation-${state}`,
    activationStatus: "default-off",
    nextEligibleStep,
    body: `${statusMarker}\nObjective #${issueNumber}\nAuthority state: ${state}\nActivation: default-off\nNext eligible step: ${nextEligibleStep ?? "none"}${source}`,
  } as const satisfies ObjectiveStatusProjection;
};

const result = (
  input: ObjectiveAuthorityInput,
  state: Exclude<ObjectiveAuthorityState, "approved">,
  options: {
    readonly transitionsToAppend?: readonly AuthorityTransitionDraft[];
    readonly nativeActions?: readonly NativeRevocationAction[];
    readonly diagnostics?: readonly string[];
    readonly sourceCommentId?: GitHubObjectId;
  } = {},
): ObjectiveAuthorityResult => ({
  state,
  activationStatus: "default-off",
  effectsExecutable: false,
  schedulingPermitted: false,
  nextEligibleStep: null,
  transitionsToAppend: options.transitionsToAppend ?? [],
  nativeActions: options.nativeActions ?? [],
  projection: formatProjection(
    state,
    input.current.issue.number,
    null,
    options.sourceCommentId,
  ),
  diagnostics: options.diagnostics ?? [],
});

const approvedResult = (
  input: ObjectiveAuthorityInput,
  approval: Extract<
    AuthorityTransitionPayload,
    { readonly kind: "approval-recorded" }
  >,
): ApprovedObjectiveAuthorityResult => ({
  state: "approved",
  activationStatus: "default-off",
  effectsExecutable: false,
  schedulingPermitted: true,
  nextEligibleStep: "objective-intake-validation",
  approvedRevision: approval.approvedRevision,
  approvalCommentId: approval.sourceCommentId,
  transitionsToAppend: [],
  nativeActions: [],
  projection: formatProjection(
    "approved",
    input.current.issue.number,
    "objective-intake-validation",
    approval.sourceCommentId,
  ),
  diagnostics: [],
});

const hasInvalidTransitionAuthority = (input: ObjectiveAuthorityInput) =>
  input.transitions.some(
    (transition) =>
      transition.payload.audit.machineActorId !==
        transition.automationActorId ||
      (transition.payload.kind === "revocation-effective" &&
        transition.payload.securedPullRequests.some(
          (pullRequest) => !isValidSecuredPullRequest(input, pullRequest),
        )),
  );

const sameComment = (left: AuthorityComment, right: AuthorityComment) =>
  sameId(left.id, right.id) &&
  left.author.id === right.author.id &&
  left.author.type === right.author.type &&
  left.body === right.body &&
  left.createdAt === right.createdAt &&
  left.updatedAt === right.updatedAt &&
  left.deleted === right.deleted;

const sameEventSubject = (
  left: CommandCreatedEvent,
  right: CommandCreatedEvent,
) =>
  left.action === right.action &&
  sameId(left.repositoryId, right.repositoryId) &&
  sameId(left.issueId, right.issueId) &&
  left.issueId.number === right.issueId.number &&
  left.issueState === right.issueState &&
  left.issueDisposition === right.issueDisposition &&
  sameRevision(left.capturedRevision, right.capturedRevision) &&
  sameComment(left.comment, right.comment);

const hasConflictingPair = <T>(
  values: readonly T[],
  sameKey: (left: T, right: T) => boolean,
  sameValue: (left: T, right: T) => boolean,
) =>
  values.some((left, index) =>
    values
      .slice(index + 1)
      .some((right) => sameKey(left, right) && !sameValue(left, right)),
  );

const validateEvidenceConsistency = (input: ObjectiveAuthorityInput) => {
  const conflictingEvents = hasConflictingPair(
    input.commandEvents,
    (left, right) =>
      left.eventId === right.eventId ||
      left.deliveryId === right.deliveryId ||
      sameId(left.comment.id, right.comment.id),
    sameEventSubject,
  );
  const conflictingComments = hasConflictingPair(
    input.currentComments,
    (left, right) => sameId(left.id, right.id),
    sameComment,
  );
  const conflictingTransitionRecords = hasConflictingPair(
    input.transitions,
    (left, right) => sameId(left.id, right.id),
    (left, right) =>
      left.automationActorId === right.automationActorId &&
      left.logicalKey === right.logicalKey &&
      sameTransitionPayload(left.payload, right.payload),
  );
  const duplicateLogicalTransitions = input.transitions.some((left, index) =>
    input.transitions
      .slice(index + 1)
      .some(
        (right) =>
          !sameId(left.id, right.id) && left.logicalKey === right.logicalKey,
      ),
  );
  const duplicateApprovalRevision = input.transitions.some((left, index) => {
    if (left.payload.kind !== "approval-recorded") {
      return false;
    }

    const approvedRevision = left.payload.approvedRevision;

    return input.transitions
      .slice(index + 1)
      .some(
        (right) =>
          right.payload.kind === "approval-recorded" &&
          !sameId(left.id, right.id) &&
          sameRevision(approvedRevision, right.payload.approvedRevision),
      );
  });

  return conflictingEvents ||
    conflictingComments ||
    conflictingTransitionRecords ||
    duplicateLogicalTransitions ||
    duplicateApprovalRevision
    ? ["GitHub evidence contains conflicting or duplicate authority records"]
    : [];
};

const keepFirstBy = <T>(
  values: readonly T[],
  sameKey: (left: T, right: T) => boolean,
) =>
  values.filter(
    (value, index) =>
      values.findIndex((candidate) => sameKey(value, candidate)) === index,
  );

const normalizeDuplicateEvidence = (input: ObjectiveAuthorityInput) =>
  ({
    ...input,
    commandEvents: keepFirstBy(
      input.commandEvents,
      (left, right) => left.eventId === right.eventId,
    ),
    currentComments: keepFirstBy(input.currentComments, (left, right) =>
      sameId(left.id, right.id),
    ),
    transitions: keepFirstBy(input.transitions, (left, right) =>
      sameId(left.id, right.id),
    ),
  }) satisfies ObjectiveAuthorityInput;

const validCommands = (input: ObjectiveAuthorityInput) => {
  const expected = input.config;

  return input.commandEvents
    .flatMap((event) => {
      const body = event.comment.body;
      const command =
        body === "/approve" || body === "/revoke" ? body : undefined;
      const eligible =
        command !== undefined &&
        event.action === "created" &&
        sameId(event.repositoryId, expected.repositoryId) &&
        sameId(event.issueId, expected.objectiveIssueId) &&
        event.issueId.number === expected.objectiveIssueId.number &&
        event.issueState === "OPEN" &&
        event.issueDisposition === "active" &&
        event.comment.author.id === expected.authorityUserId &&
        event.comment.author.type === "User";

      return eligible ? ([{ command, event }] as const) : [];
    })
    .sort(compareCommands);
};

const currentApprovalEvidenceExists = (
  input: ObjectiveAuthorityInput,
  event: CommandCreatedEvent,
) =>
  input.currentComments.some(
    (comment) =>
      sameId(comment.id, event.comment.id) &&
      comment.author.id === event.comment.author.id &&
      comment.author.type === event.comment.author.type &&
      comment.body === "/approve" &&
      comment.createdAt === event.comment.createdAt &&
      comment.updatedAt === comment.createdAt &&
      !comment.deleted,
  );

const matchingTransitionRecords = (
  input: ObjectiveAuthorityInput,
  drafts: readonly AuthorityTransitionDraft[],
) =>
  input.transitions.filter(
    (transition) =>
      transition.automationActorId === input.config.automationActorId &&
      drafts.some((draft) => transitionPayloadMatches(transition, draft)),
  );

const hasUntrustedTransition = (
  input: ObjectiveAuthorityInput,
  validDrafts: readonly AuthorityTransitionDraft[],
) =>
  input.transitions.some(
    (transition) =>
      transition.automationActorId !== input.config.automationActorId ||
      !validDrafts.some((draft) => transitionPayloadMatches(transition, draft)),
  );

const uniqueByRevision = (
  drafts: readonly AuthorityTransitionDraft[],
): readonly AuthorityTransitionDraft[] =>
  drafts.reduce<AuthorityTransitionDraft[]>((unique, draft) => {
    if (draft.payload.kind !== "approval-recorded") {
      return unique;
    }

    const approvedRevision = draft.payload.approvedRevision;

    return unique.some(
      (candidate) =>
        candidate.payload.kind === "approval-recorded" &&
        sameRevision(candidate.payload.approvedRevision, approvedRevision),
    )
      ? unique
      : [...unique, draft];
  }, []);

const nativeObservationIsValid = (
  input: ObjectiveAuthorityInput,
  observation: NativePullRequestObservation,
  notBefore: string,
) => {
  const check = observation.objectiveAuthorityCheck;
  const autoMerge = observation.autoMerge;
  const checkIdentityIsValid =
    check.context === input.config.objectiveAuthorityCheck.context &&
    check.headSha === observation.headSha &&
    (check.conclusion === "missing"
      ? check.checkRunId === null && check.integrationId === null
      : check.checkRunId !== null &&
        check.integrationId ===
          input.config.objectiveAuthorityCheck.integrationId);
  const autoMergeIdentityIsValid =
    autoMerge.state !== "unknown" &&
    (autoMerge.state === "enabled"
      ? autoMerge.requestId !== null
      : autoMerge.requestId === null);

  return (
    sameId(observation.repositoryId, input.config.repositoryId) &&
    sameWorkflowRun(
      observation.observation.workflowRun,
      input.evaluation.workflowRun,
    ) &&
    observation.observation.observedAt === input.evaluation.observedAt &&
    observation.observation.observedAt.localeCompare(notBefore) >= 0 &&
    checkIdentityIsValid &&
    autoMergeIdentityIsValid
  );
};

const nativeObservationsConflict = (
  observations: readonly NativePullRequestObservation[],
) =>
  observations.some((left, index) =>
    observations
      .slice(index + 1)
      .some(
        (right) =>
          sameId(left.pullRequestId, right.pullRequestId) ||
          left.pullRequestId.number === right.pullRequestId.number ||
          left.observation.eventId === right.observation.eventId,
      ),
  );

const validateNativeState = (
  input: ObjectiveAuthorityInput,
  nativeState: RevocationNativeState,
  notBefore: string,
) =>
  nativeState.pullRequests.every((observation) =>
    nativeObservationIsValid(input, observation, notBefore),
  ) && !nativeObservationsConflict(nativeState.pullRequests)
    ? []
    : [
        "native revocation evidence has an invalid, duplicate, or contradictory pull-request observation",
      ];

const secureNativePullRequests = (nativeState: RevocationNativeState) =>
  nativeState.pullRequests.flatMap((pullRequest) => {
    const check = pullRequest.objectiveAuthorityCheck;
    const autoMerge = pullRequest.autoMerge;
    const makeObjectiveAuthorityNonSuccessful =
      check.conclusion !== "non-successful";
    const cancelAutoMerge = autoMerge.state === "enabled";

    return makeObjectiveAuthorityNonSuccessful || cancelAutoMerge
      ? [
          {
            kind: "secure-native-head",
            repositoryId: pullRequest.repositoryId,
            pullRequestId: pullRequest.pullRequestId,
            expectedHeadSha: pullRequest.headSha,
            expectedObservationEventId: pullRequest.observation.eventId,
            expectedCheckRunId: check.checkRunId,
            expectedCheckIntegrationId: check.integrationId,
            expectedAutoMergeRequestId: autoMerge.requestId,
            makeObjectiveAuthorityNonSuccessful,
            cancelAutoMerge,
          } as const satisfies NativeRevocationAction,
        ]
      : [];
  });

const nativePullRequestsAreSecured = (nativeState: RevocationNativeState) =>
  nativeState.pullRequests.every(
    (pullRequest) =>
      pullRequest.objectiveAuthorityCheck.conclusion === "non-successful" &&
      pullRequest.objectiveAuthorityCheck.checkRunId !== null &&
      (pullRequest.autoMerge.state === "disabled" ||
        pullRequest.autoMerge.state === "not-configured"),
  );

const securedPullRequests = (nativeState: RevocationNativeState) =>
  nativeState.pullRequests
    .flatMap((pullRequest) => {
      const checkRunId = pullRequest.objectiveAuthorityCheck.checkRunId;
      const checkIntegrationId =
        pullRequest.objectiveAuthorityCheck.integrationId;

      return checkRunId && checkIntegrationId
        ? [
            {
              repositoryId: pullRequest.repositoryId,
              pullRequestId: pullRequest.pullRequestId,
              headSha: pullRequest.headSha,
              observationEventId: pullRequest.observation.eventId,
              checkRunId,
              checkIntegrationId,
            } as const satisfies SecuredPullRequest,
          ]
        : [];
    })
    .sort((left, right) =>
      compareDecimalIds(left.pullRequestId.restId, right.pullRequestId.restId),
    );

const evaluateRevocation = (
  input: ObjectiveAuthorityInput,
  revocations: readonly ValidCommand[],
  approvalDrafts: readonly AuthorityTransitionDraft[],
  revocationDrafts: readonly AuthorityTransitionDraft[],
) => {
  const nativeState = input.revocationNativeState;
  const parsedNativeState = revocationNativeStateSchema.safeParse(nativeState);
  const effectiveDrafts = input.transitions
    .filter((transition) => transition.payload.kind === "revocation-requested")
    .map(
      (transition) =>
        ({
          logicalKey: revocationEffectiveLogicalKey(transition.logicalKey),
          payload: {
            kind: "revocation-effective",
            audit: auditEnvelope(input, "revoked", null),
            requestLogicalKey: transition.logicalKey,
            securedPullRequests: parsedNativeState.success
              ? securedPullRequests(parsedNativeState.data)
              : [],
          },
        }) as const satisfies AuthorityTransitionDraft,
    );

  if (
    hasUntrustedTransition(input, [
      ...approvalDrafts,
      ...revocationDrafts,
      ...effectiveDrafts,
    ])
  ) {
    return result(input, "recovery", {
      diagnostics: [
        "transition evidence is untrusted, duplicated, or inconsistent with its source event",
      ],
    });
  }

  // A persisted transition wins over a later-observed command. Before any
  // transition exists, stable GitHub timestamp/ID order selects the source.
  const matchingRequests = matchingTransitionRecords(input, revocationDrafts);
  const selectedRequest =
    matchingRequests.length === 1
      ? matchingRequests[0]
      : matchingRequests.length === 0
        ? undefined
        : null;

  if (selectedRequest === null) {
    return result(input, "recovery", {
      diagnostics: ["multiple revocation transitions exist for one objective"],
    });
  }

  const selectedEvent = selectedRequest
    ? revocations.find(
        ({ event }) =>
          selectedRequest.logicalKey === revocationRequestLogicalKey(event),
      )?.event
    : revocations[0]?.event;

  if (!selectedEvent) {
    return result(input, "recovery", {
      diagnostics: ["revocation evidence cannot be reconciled"],
    });
  }

  if (!selectedRequest) {
    return result(input, "revocation-requested", {
      transitionsToAppend: [revocationRequestDraft(input, selectedEvent)],
      sourceCommentId: selectedEvent.comment.id,
    });
  }

  if (!nativeState || nativeState.handler === "unavailable") {
    return result(input, "recovery", {
      diagnostics: ["revocation handler or native head state is unavailable"],
      sourceCommentId: selectedEvent.comment.id,
    });
  }

  if (!parsedNativeState.success) {
    return result(input, "recovery", {
      diagnostics: [
        "native revocation evidence has an invalid, duplicate, or contradictory pull-request observation",
      ],
      sourceCommentId: selectedEvent.comment.id,
    });
  }

  const trustedNativeState = parsedNativeState.data;

  const nativeDiagnostics = validateNativeState(
    input,
    trustedNativeState,
    selectedEvent.comment.createdAt,
  );
  if (nativeDiagnostics.length > 0) {
    return result(input, "recovery", {
      diagnostics: nativeDiagnostics,
      sourceCommentId: selectedEvent.comment.id,
    });
  }

  const nativeActions = secureNativePullRequests(trustedNativeState);
  if (!nativePullRequestsAreSecured(trustedNativeState)) {
    return result(input, "revocation-requested", {
      nativeActions,
      sourceCommentId: selectedEvent.comment.id,
    });
  }

  const effectiveDraft = {
    logicalKey: revocationEffectiveLogicalKey(selectedRequest.logicalKey),
    payload: {
      kind: "revocation-effective",
      audit: auditEnvelope(input, "revoked", null),
      requestLogicalKey: selectedRequest.logicalKey,
      securedPullRequests: securedPullRequests(trustedNativeState),
    },
  } as const satisfies AuthorityTransitionDraft;
  const matchingEffective = matchingTransitionRecords(input, [effectiveDraft]);

  if (matchingEffective.length > 1) {
    return result(input, "recovery", {
      diagnostics: ["multiple effective-revocation transitions exist"],
    });
  }

  return matchingEffective.length === 1
    ? result(input, "revoked", {
        sourceCommentId: selectedEvent.comment.id,
      })
    : result(input, "revocation-requested", {
        transitionsToAppend: [effectiveDraft],
        sourceCommentId: selectedEvent.comment.id,
      });
};

const evaluateParsedObjectiveAuthority = (
  input: ObjectiveAuthorityInput,
): ObjectiveAuthorityResult => {
  if (hasInvalidTransitionAuthority(input)) {
    return result(input, "recovery", {
      diagnostics: [
        "authority evidence contains malformed or non-canonical GitHub data",
      ],
    });
  }

  const consistencyDiagnostics = validateEvidenceConsistency(input);
  if (consistencyDiagnostics.length > 0) {
    return result(input, "recovery", {
      diagnostics: consistencyDiagnostics,
    });
  }

  const normalizedInput = normalizeDuplicateEvidence(input);
  if (
    normalizedInput.commandEvents.length !== input.commandEvents.length ||
    normalizedInput.currentComments.length !== input.currentComments.length ||
    normalizedInput.transitions.length !== input.transitions.length
  ) {
    return evaluateParsedObjectiveAuthority(normalizedInput);
  }

  if (
    !sameId(input.current.repository, input.config.repositoryId) ||
    !sameId(input.current.issue, input.config.objectiveIssueId) ||
    input.current.issue.number !== input.config.objectiveIssueId.number ||
    input.current.repository.isFork
  ) {
    return result(input, "recovery", {
      diagnostics: ["current objective identity does not match configuration"],
    });
  }

  if (input.current.issue.state === "CLOSED") {
    return result(input, "closed");
  }

  if (input.current.issue.disposition === "blocked") {
    return result(input, "blocked");
  }

  if (input.current.issue.disposition === "superseded") {
    return result(input, "superseded");
  }

  const commands = validCommands(input);
  const approvals = commands.filter(
    (candidate) =>
      candidate.command === "/approve" &&
      currentApprovalEvidenceExists(input, candidate.event),
  );
  const revocations = commands.filter(
    (candidate) => candidate.command === "/revoke",
  );
  const approvalDrafts = approvals.map(({ event }) =>
    approvalDraft(input, event),
  );
  const revocationDrafts = revocations.map(({ event }) =>
    revocationRequestDraft(input, event),
  );
  if (revocations.length > 0) {
    return evaluateRevocation(
      input,
      revocations,
      approvalDrafts,
      revocationDrafts,
    );
  }

  if (hasUntrustedTransition(input, approvalDrafts)) {
    return result(input, "recovery", {
      diagnostics: [
        "transition evidence is untrusted, duplicated, or inconsistent with its source event",
      ],
    });
  }

  const currentRevisionApprovals = approvalDrafts.filter(
    (draft) =>
      draft.payload.kind === "approval-recorded" &&
      sameRevision(
        draft.payload.approvedRevision,
        input.current.issue.revision,
      ),
  );
  // The same first-recorded-wins rule applies to repeated approvals for an
  // unchanged scope revision.
  const currentRecords = matchingTransitionRecords(
    input,
    currentRevisionApprovals,
  );

  if (currentRecords.length > 1) {
    return result(input, "recovery", {
      diagnostics: [
        "multiple approval transitions exist for one issue revision",
      ],
    });
  }

  if (currentRecords.length === 1) {
    const record = currentRecords[0];
    if (!record || record.payload.kind !== "approval-recorded") {
      return result(input, "recovery", {
        diagnostics: ["approval transition cannot be reconciled"],
      });
    }

    return approvedResult(input, record.payload);
  }

  const currentDraft = uniqueByRevision(currentRevisionApprovals)[0];
  if (currentDraft?.payload.kind === "approval-recorded") {
    return result(input, "proposed", {
      transitionsToAppend: [currentDraft],
      diagnostics: [
        "approval is valid but scheduling waits for its GitHub transition record",
      ],
      sourceCommentId: currentDraft.payload.sourceCommentId,
    });
  }

  const priorApprovalExists = input.transitions.some(
    (transition) => transition.payload.kind === "approval-recorded",
  );

  return result(input, "proposed", {
    diagnostics: priorApprovalExists
      ? ["objective title or body changed; a fresh exact /approve is required"]
      : [],
  });
};

const recoveryContextSchema = objectiveAuthorityInputSchema.pick({
  current: true,
});

export const evaluateObjectiveAuthority = (
  untrustedInput: unknown,
): ObjectiveAuthorityResult => {
  const parsed = objectiveAuthorityInputSchema.safeParse(untrustedInput);
  if (parsed.success) {
    return evaluateParsedObjectiveAuthority(parsed.data);
  }

  const context = recoveryContextSchema.safeParse(untrustedInput);
  const issueNumber = context.success ? context.data.current.issue.number : 0;

  return {
    state: "recovery",
    activationStatus: "default-off",
    effectsExecutable: false,
    schedulingPermitted: false,
    nextEligibleStep: null,
    transitionsToAppend: [],
    nativeActions: [],
    projection: formatProjection("recovery", issueNumber, null),
    diagnostics: [
      "authority evidence contains malformed or non-canonical GitHub data",
    ],
  };
};

export const admitObjectiveAuthorityEvaluation = (
  admission: GitHubStateAdmission,
  reconstructedInput: unknown,
): ObjectiveAuthorityAdmissionResult => {
  if (admission !== "trusted-current-state") {
    return {
      status: "recovery",
      effectsExecutable: false,
      diagnostics: [
        admission === "credentials-unavailable"
          ? "trusted GitHub state is unavailable"
          : "GitHub permissions cannot reconstruct trusted current state",
      ],
    };
  }

  return {
    status: "evaluated",
    effectsExecutable: false,
    result: evaluateObjectiveAuthority(reconstructedInput),
    diagnostics: [],
  };
};
