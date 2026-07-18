import type {
  GitHubObjectId,
  GitHubWorkflowRun,
} from "./objective-authority.js";

export type BlockerClassification =
  | "design-authority-conflict"
  | "inexpressible-invariant"
  | "target-semantics-leak"
  | "untestable-law"
  | "weakened-guarantee"
  | "unsafe-consumer-cast"
  | "diagnostic-type-harm"
  | "undefined-path-consistency";

export type SensitiveClassification =
  "sensitive-review-required" | "suspected-credential-exposure";

export type EscalationSignal =
  | {
      readonly kind: "ordinary-implementation-failure";
      readonly code: "implementation-failure";
    }
  | {
      readonly kind: "design-blocker";
      readonly code: BlockerClassification;
      readonly evidence: PublicBlockerEvidence;
    }
  | {
      readonly kind: "sensitive-blocker";
      readonly code: SensitiveClassification;
    };

export interface PublicBlockerEvidence {
  readonly minimalExample: string;
  readonly authorityLinks: readonly string[];
  readonly alternatives: readonly string[];
  readonly affectedGuarantees: readonly string[];
  readonly smallestDecisionRequired: string;
}

export interface BlockerEscalationConfig {
  readonly repositoryId: GitHubObjectId;
  readonly automationActorId: string;
  readonly publicRepositoryUrl: string;
  readonly allowedAuthorityLinkPrefixes: readonly string[];
}

export interface BlockerEscalationInput {
  readonly config: BlockerEscalationConfig;
  readonly workItemId: GitHubObjectId & { readonly number: number };
  readonly workItemRevision: {
    readonly eventId: string;
    readonly deliveryId: string;
    readonly occurredAt: string;
  };
  readonly source: {
    readonly eventId: string;
    readonly deliveryId: string;
    readonly workflowRun: GitHubWorkflowRun;
    readonly observedAt: string;
  };
  readonly signal: EscalationSignal;
  readonly existingTransitions: readonly BlockerTransitionRecord[];
}

export interface BlockerTransitionPayload {
  readonly kind: "blocker-escalated";
  readonly repositoryId: GitHubObjectId;
  readonly workItemId: GitHubObjectId & { readonly number: number };
  readonly workItemRevision: {
    readonly eventId: string;
    readonly deliveryId: string;
    readonly occurredAt: string;
  };
  readonly sourceEventId: string;
  readonly sourceDeliveryId: string;
  readonly workflowRun: GitHubWorkflowRun;
  readonly automationActorId: string;
  readonly observedAt: string;
  readonly classification: BlockerClassification | SensitiveClassification;
  readonly stateLabel: "ready-for-human";
  readonly activationStatus: "default-off";
  readonly publicRecord: PublicBlockerRecord;
  readonly rotationOrRevocationRequired: boolean;
}

export interface BlockerTransitionRecord {
  readonly id: GitHubObjectId;
  readonly logicalKey: string;
  readonly payload: BlockerTransitionPayload;
}

export interface BlockerTransitionDraft {
  readonly logicalKey: string;
  readonly payload: BlockerTransitionPayload;
}

export type PublicBlockerRecord =
  | {
      readonly disclosure: "reviewed-public-evidence";
      readonly marker: "<!-- represent-design-blocker -->";
      readonly title: "Automation stopped for a design decision";
      readonly classification: BlockerClassification;
      readonly minimalExample: string;
      readonly authorityLinks: readonly string[];
      readonly alternatives: readonly string[];
      readonly affectedGuarantees: readonly string[];
      readonly smallestDecisionRequired: string;
    }
  | {
      readonly disclosure: "fixed-sensitive-marker";
      readonly marker: "<!-- represent-sensitive-blocker -->";
      readonly title: "Private human review required";
      readonly classification: SensitiveClassification;
    };

export interface NotificationPayload {
  readonly repositoryId: string;
  readonly workItemId: string;
  readonly workItemNumber: number;
  readonly classification: BlockerClassification | SensitiveClassification;
  readonly githubUrl: string;
}

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

const canonicalDecimalId = /^(0|[1-9]\d*)$/;
const blockerClassifications = new Set<BlockerClassification>([
  "design-authority-conflict",
  "inexpressible-invariant",
  "target-semantics-leak",
  "untestable-law",
  "weakened-guarantee",
  "unsafe-consumer-cast",
  "diagnostic-type-harm",
  "undefined-path-consistency",
]);
const sensitiveClassifications = new Set<SensitiveClassification>([
  "sensitive-review-required",
  "suspected-credential-exposure",
]);

const isValidObjectId = (id: GitHubObjectId): boolean =>
  id.nodeId.length > 0 && canonicalDecimalId.test(id.restId);

const isValidWorkflowRun = (run: GitHubWorkflowRun): boolean =>
  canonicalDecimalId.test(run.restId) &&
  Number.isSafeInteger(run.attempt) &&
  run.attempt > 0;

const isValidTimestamp = (value: string): boolean =>
  value.length > 0 && Number.isFinite(Date.parse(value));

const isNonBlank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isRepositoryUrl = (value: string): boolean =>
  /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);

const allNonBlank = (values: unknown): values is readonly string[] =>
  Array.isArray(values) && values.length > 0 && values.every(isNonBlank);

const isAllowedAuthorityLink = (
  link: string,
  prefixes: readonly string[],
): boolean => prefixes.some((prefix) => link.startsWith(prefix));

const isValidEvidence = (
  evidence: unknown,
  allowedAuthorityLinkPrefixes: readonly string[],
): evidence is PublicBlockerEvidence => {
  if (!evidence || typeof evidence !== "object") {
    return false;
  }

  const candidate = evidence as Partial<PublicBlockerEvidence>;
  return (
    isNonBlank(candidate.minimalExample) &&
    allNonBlank(candidate.authorityLinks) &&
    candidate.authorityLinks.every((link) =>
      isAllowedAuthorityLink(link, allowedAuthorityLinkPrefixes),
    ) &&
    allNonBlank(candidate.alternatives) &&
    allNonBlank(candidate.affectedGuarantees) &&
    isNonBlank(candidate.smallestDecisionRequired)
  );
};

const isValidSignal = (signal: EscalationSignal): boolean => {
  if (signal.kind === "ordinary-implementation-failure") {
    return signal.code === "implementation-failure";
  }

  if (signal.kind === "design-blocker") {
    return blockerClassifications.has(signal.code);
  }

  return (
    signal.kind === "sensitive-blocker" &&
    sensitiveClassifications.has(signal.code)
  );
};

const logicalKey = (input: BlockerEscalationInput): string =>
  `blocker:${input.workItemId.nodeId}:${input.workItemRevision.eventId}:${input.source.eventId}:${input.signal.code}`;

const publicRecord = (
  signal: Exclude<
    EscalationSignal,
    { readonly kind: "ordinary-implementation-failure" }
  >,
): PublicBlockerRecord =>
  signal.kind === "sensitive-blocker"
    ? {
        disclosure: "fixed-sensitive-marker",
        marker: "<!-- represent-sensitive-blocker -->",
        title: "Private human review required",
        classification: signal.code,
      }
    : {
        disclosure: "reviewed-public-evidence",
        marker: "<!-- represent-design-blocker -->",
        title: "Automation stopped for a design decision",
        classification: signal.code,
        minimalExample: signal.evidence.minimalExample,
        authorityLinks: [...signal.evidence.authorityLinks],
        alternatives: [...signal.evidence.alternatives],
        affectedGuarantees: [...signal.evidence.affectedGuarantees],
        smallestDecisionRequired: signal.evidence.smallestDecisionRequired,
      };

const sameObjectId = (left: GitHubObjectId, right: GitHubObjectId): boolean =>
  left.nodeId === right.nodeId && left.restId === right.restId;

const sameTransitionMeaning = (
  left: BlockerTransitionPayload,
  right: BlockerTransitionPayload,
): boolean =>
  left.kind === right.kind &&
  sameObjectId(left.repositoryId, right.repositoryId) &&
  sameObjectId(left.workItemId, right.workItemId) &&
  left.workItemId.number === right.workItemId.number &&
  left.workItemRevision.eventId === right.workItemRevision.eventId &&
  left.workItemRevision.deliveryId === right.workItemRevision.deliveryId &&
  left.workItemRevision.occurredAt === right.workItemRevision.occurredAt &&
  left.sourceEventId === right.sourceEventId &&
  left.sourceDeliveryId === right.sourceDeliveryId &&
  left.workflowRun.restId === right.workflowRun.restId &&
  left.workflowRun.attempt === right.workflowRun.attempt &&
  left.automationActorId === right.automationActorId &&
  left.observedAt === right.observedAt &&
  left.classification === right.classification &&
  left.stateLabel === right.stateLabel &&
  left.activationStatus === right.activationStatus &&
  left.rotationOrRevocationRequired === right.rotationOrRevocationRequired &&
  JSON.stringify(left.publicRecord) === JSON.stringify(right.publicRecord);

const recovery = (diagnostic: string): BlockerEscalationResult => ({
  state: "recovery",
  dependentWorkPermitted: false,
  activationStatus: "default-off",
  effectsExecutable: false,
  transitionsToAppend: [],
  notification: null,
  rotationOrRevocationRequired: false,
  diagnostics: [diagnostic],
});

const isValidExistingTransition = (
  transition: BlockerTransitionRecord,
  input: BlockerEscalationInput,
): boolean =>
  isValidObjectId(transition.id) &&
  isNonBlank(transition.logicalKey) &&
  transition.payload.kind === "blocker-escalated" &&
  sameObjectId(transition.payload.repositoryId, input.config.repositoryId) &&
  sameObjectId(transition.payload.workItemId, input.workItemId) &&
  transition.payload.workItemId.number === input.workItemId.number &&
  isValidObjectId(transition.payload.repositoryId) &&
  isValidObjectId(transition.payload.workItemId) &&
  Number.isSafeInteger(transition.payload.workItemId.number) &&
  transition.payload.workItemId.number > 0 &&
  isNonBlank(transition.payload.workItemRevision.eventId) &&
  isNonBlank(transition.payload.workItemRevision.deliveryId) &&
  isValidTimestamp(transition.payload.workItemRevision.occurredAt) &&
  isNonBlank(transition.payload.sourceEventId) &&
  isNonBlank(transition.payload.sourceDeliveryId) &&
  isValidWorkflowRun(transition.payload.workflowRun) &&
  canonicalDecimalId.test(transition.payload.automationActorId) &&
  isValidTimestamp(transition.payload.observedAt) &&
  transition.payload.stateLabel === "ready-for-human" &&
  transition.payload.activationStatus === "default-off" &&
  (blockerClassifications.has(
    transition.payload.classification as BlockerClassification,
  ) ||
    sensitiveClassifications.has(
      transition.payload.classification as SensitiveClassification,
    )) &&
  transition.payload.rotationOrRevocationRequired ===
    (transition.payload.classification === "suspected-credential-exposure") &&
  (transition.payload.publicRecord.disclosure === "fixed-sensitive-marker"
    ? sensitiveClassifications.has(
        transition.payload.classification as SensitiveClassification,
      ) &&
      transition.payload.publicRecord.marker ===
        "<!-- represent-sensitive-blocker -->" &&
      transition.payload.publicRecord.title ===
        "Private human review required" &&
      transition.payload.publicRecord.classification ===
        transition.payload.classification
    : transition.payload.publicRecord.disclosure ===
        "reviewed-public-evidence" &&
      blockerClassifications.has(
        transition.payload.classification as BlockerClassification,
      ) &&
      transition.payload.publicRecord.marker ===
        "<!-- represent-design-blocker -->" &&
      transition.payload.publicRecord.title ===
        "Automation stopped for a design decision" &&
      transition.payload.publicRecord.classification ===
        transition.payload.classification &&
      isValidEvidence(
        transition.payload.publicRecord,
        input.config.allowedAuthorityLinkPrefixes,
      )) &&
  transition.logicalKey ===
    `blocker:${transition.payload.workItemId.nodeId}:${transition.payload.workItemRevision.eventId}:${transition.payload.sourceEventId}:${transition.payload.classification}`;

export const evaluateBlockerEscalation = (
  input: BlockerEscalationInput,
): BlockerEscalationResult => {
  if (
    !isValidObjectId(input.config.repositoryId) ||
    !isValidObjectId(input.workItemId) ||
    !Number.isSafeInteger(input.workItemId.number) ||
    input.workItemId.number <= 0 ||
    !isNonBlank(input.workItemRevision.eventId) ||
    !isNonBlank(input.workItemRevision.deliveryId) ||
    !isValidTimestamp(input.workItemRevision.occurredAt) ||
    !canonicalDecimalId.test(input.config.automationActorId) ||
    !isRepositoryUrl(input.config.publicRepositoryUrl) ||
    input.config.allowedAuthorityLinkPrefixes.length === 0 ||
    !input.config.allowedAuthorityLinkPrefixes.every(isNonBlank) ||
    !isValidWorkflowRun(input.source.workflowRun) ||
    !isValidTimestamp(input.source.observedAt) ||
    !isNonBlank(input.source.eventId) ||
    !isNonBlank(input.source.deliveryId)
  ) {
    return recovery(
      "blocker evidence contains invalid immutable identity data",
    );
  }

  if (!isValidSignal(input.signal)) {
    return recovery("blocker signal contains an invalid fixed classification");
  }

  if (input.signal.kind === "ordinary-implementation-failure") {
    return {
      state: "continue",
      dependentWorkPermitted: true,
      activationStatus: "default-off",
      effectsExecutable: false,
      transitionsToAppend: [],
      notification: null,
      rotationOrRevocationRequired: false,
      diagnostics: ["ordinary implementation failure is not a design blocker"],
    };
  }

  if (
    input.signal.kind === "design-blocker" &&
    !isValidEvidence(
      input.signal.evidence,
      input.config.allowedAuthorityLinkPrefixes,
    )
  ) {
    return recovery(
      "public blocker evidence is incomplete or outside authority",
    );
  }

  const key = logicalKey(input);
  const record = publicRecord(input.signal);
  const rotationOrRevocationRequired =
    input.signal.code === "suspected-credential-exposure";
  const payload: BlockerTransitionPayload = {
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
    publicRecord: record,
    rotationOrRevocationRequired,
  };
  const matching = input.existingTransitions.filter(
    (transition) => transition.logicalKey === key,
  );

  if (
    input.existingTransitions.some(
      (transition) => !isValidExistingTransition(transition, input),
    )
  ) {
    return recovery("existing blocker transition identity is invalid");
  }

  if (matching.length > 1) {
    return recovery(
      "duplicate blocker transition records require reconciliation",
    );
  }

  const existing = matching[0];
  if (existing && !sameTransitionMeaning(existing.payload, payload)) {
    return recovery(
      "blocker transition conflicts with current immutable evidence",
    );
  }

  return {
    state: "blocked",
    dependentWorkPermitted: false,
    activationStatus: "default-off",
    effectsExecutable: false,
    transitionsToAppend: existing ? [] : [{ logicalKey: key, payload }],
    notification: existing
      ? null
      : {
          repositoryId: input.config.repositoryId.restId,
          workItemId: input.workItemId.restId,
          workItemNumber: input.workItemId.number,
          classification: input.signal.code,
          githubUrl: `${input.config.publicRepositoryUrl}/issues/${input.workItemId.number}`,
        },
    rotationOrRevocationRequired,
    diagnostics: rotationOrRevocationRequired
      ? ["private review required; rotate or revoke suspected credentials"]
      : ["dependent work stopped for human decision"],
  };
};
