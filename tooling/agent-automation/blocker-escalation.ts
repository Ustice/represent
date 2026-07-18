import { isDeepStrictEqual } from "node:util";

import {
  sameGitHubObject,
  type NotificationPayload,
} from "./github-evidence.js";
import {
  blockerInputSchema,
  inputWithoutTransitionsSchema,
  type BlockerEscalationInput,
  type BlockerSignal,
  type BlockerTransitionDraft,
  type BlockerTransitionPayload,
  type BlockerTransitionRecord,
  type PublicBlockerEvidence,
} from "./blocker-escalation-schema.js";

export type {
  BlockerClassification,
  NotificationPayload,
  SensitiveClassification,
} from "./github-evidence.js";
export type {
  BlockerEscalationConfig,
  BlockerEscalationInput,
  BlockerTransitionDraft,
  BlockerTransitionPayload,
  BlockerTransitionRecord,
  EscalationSignal,
  PublicBlockerEvidence,
  PublicBlockerRecord,
} from "./blocker-escalation-schema.js";

const continued = (diagnostic: string) =>
  ({
    state: "continue",
    dependentWorkPermitted: true,
    activationStatus: "default-off",
    effectsExecutable: false,
    transitionsToAppend: [],
    notification: null,
    rotationOrRevocationRequired: false,
    diagnostics: [diagnostic],
  }) as const;

const recovery = (diagnostic: string) =>
  ({
    state: "recovery",
    dependentWorkPermitted: false,
    activationStatus: "default-off",
    effectsExecutable: false,
    transitionsToAppend: [],
    notification: null,
    rotationOrRevocationRequired: false,
    diagnostics: [diagnostic],
  }) as const;

const blocked = (
  transitionsToAppend: readonly BlockerTransitionDraft[],
  notification: NotificationPayload | null,
  rotationOrRevocationRequired: boolean,
  diagnostic: string,
) =>
  ({
    state: "blocked",
    dependentWorkPermitted: false,
    activationStatus: "default-off",
    effectsExecutable: false,
    transitionsToAppend,
    notification,
    rotationOrRevocationRequired,
    diagnostics: [diagnostic],
  }) as const;

export type BlockerEscalationResult =
  | ReturnType<typeof continued>
  | ReturnType<typeof recovery>
  | ReturnType<typeof blocked>;

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
) => {
  const parsed = inputWithoutTransitionsSchema.safeParse(untrustedInput);
  if (!parsed.success) {
    return recovery("blocker evidence contains invalid fixed fields");
  }

  if (parsed.data.signal.kind === "ordinary-implementation-failure") {
    return continued("ordinary implementation failure is not a design blocker");
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

  const notification = existing
    ? null
    : ({
        repositoryId: input.config.repositoryId.restId,
        workItemId: input.workItemId.restId,
        workItemNumber: input.workItemId.number,
        classification: input.signal.code,
        githubUrl: `${input.config.publicRepositoryUrl}/issues/${input.workItemId.number}`,
      } as const);
  return blocked(
    existing ? [] : [{ logicalKey: key, payload }],
    notification,
    rotationOrRevocationRequired,
    rotationOrRevocationRequired
      ? "private review required; rotate or revoke suspected credentials"
      : "dependent work stopped for human decision",
  );
};
