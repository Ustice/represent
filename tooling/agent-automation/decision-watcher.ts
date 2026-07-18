import * as z from "zod";

import {
  canonicalDecimalIdSchema,
  gitObjectRevisionSchema,
  nonBlankStringSchema,
  notificationPayloadSchema,
  repositoryUrlSchema,
  timestampSchema,
  type DeepReadonly,
  type NotificationPayload,
} from "./github-evidence.js";

export interface PlannedGitHubRead {
  readonly method: "GET";
  readonly endpoint: WatchEndpoint;
  readonly conditional: HttpValidator | null;
  readonly credentialCapability: "github-read-only";
  readonly serialized: true;
}

export interface PlannedNotificationLaunch {
  readonly payload: NotificationPayload;
  readonly sandbox: "read-only";
  readonly repositoryMutationCredentials: false;
  readonly externalConnectors: false;
  readonly toolCapableWorkPermitted: false;
  readonly requiresFreshJasonInstruction: true;
}

export interface DecisionWatcherResult {
  readonly state:
    "unchanged" | "actionable" | "backoff" | "reconcile" | "stopped";
  readonly activationStatus: "default-off";
  readonly effectsExecutable: false;
  readonly authorityStateChanged: false;
  readonly reads: readonly PlannedGitHubRead[];
  readonly notifications: readonly PlannedNotificationLaunch[];
  readonly validators: readonly StoredValidator[];
  readonly notifiedState: readonly ActionableGitHubState[];
  readonly nextPollAt: string | null;
  readonly retryAt: string | null;
  readonly retryAttempt: number;
  readonly diagnostics: readonly string[];
}

const endpointSchema = z.object({
  url: z.url(),
  mediaType: nonBlankStringSchema,
  apiVersion: nonBlankStringSchema,
  authenticationContextId: nonBlankStringSchema,
});
const validatorSchema = z
  .object({
    etag: nonBlankStringSchema.optional(),
    lastModified: nonBlankStringSchema.optional(),
  })
  .refine((validator) => validator.etag || validator.lastModified);
const storedValidatorObjectSchema = z
  .object({ endpoint: endpointSchema })
  .and(validatorSchema);
const observedActionSchema = z.object({
  eventRestId: canonicalDecimalIdSchema,
  objectRevision: gitObjectRevisionSchema,
  payload: notificationPayloadSchema,
});
const persistedActionSchema = z.object({
  sourceRootEndpoint: endpointSchema,
  sourcePageEndpoint: endpointSchema,
  eventRestId: canonicalDecimalIdSchema,
  objectRevision: gitObjectRevisionSchema,
  payload: notificationPayloadSchema,
});
const responseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("not-modified"),
    endpoint: endpointSchema,
    status: z.literal(304),
    validator: validatorSchema,
  }),
  z.object({
    kind: z.literal("page"),
    endpoint: endpointSchema,
    status: z.literal(200),
    validator: validatorSchema,
    nextUrl: z.url().nullable(),
    actionable: z.array(observedActionSchema),
  }),
  z.object({
    kind: z.literal("invalid-validator"),
    endpoint: endpointSchema,
    status: z.literal(412),
  }),
  z.object({
    kind: z.literal("rate-limited"),
    endpoint: endpointSchema,
    status: z.union([z.literal(403), z.literal(429)]),
    retryAfterSeconds: z.number().nonnegative().finite().optional(),
    rateLimitResetAt: timestampSchema.optional(),
  }),
  z.object({
    kind: z.literal("unavailable"),
    endpoint: endpointSchema,
    status: z.number().int(),
  }),
]);
const configSchema = z.object({
  repositoryId: canonicalDecimalIdSchema,
  publicRepositoryUrl: repositoryUrlSchema,
  allowedGitHubApiUrlPrefix: z.url(),
  endpoints: z.array(endpointSchema).min(1),
  activePollIntervalMs: z.number().positive().finite(),
  idlePollIntervalMs: z.number().positive().finite(),
  baseRetryDelayMs: z.number().positive().finite(),
  maxRetryAttempts: z.number().int().positive().safe(),
  maxReconciliationPages: z.number().int().positive().safe(),
});
const inputSchema = z.object({
  config: configSchema,
  trigger: z.enum(["startup", "wake", "active-poll", "idle-poll"]),
  now: timestampSchema,
  responses: z.array(responseSchema),
  validators: z.array(storedValidatorObjectSchema),
  previouslyNotified: z.array(persistedActionSchema),
  retryAttempt: z.number().int().nonnegative().safe(),
});

export type WatchEndpoint = DeepReadonly<z.infer<typeof endpointSchema>>;
export type HttpValidator = DeepReadonly<z.infer<typeof validatorSchema>>;
export type StoredValidator = DeepReadonly<
  z.infer<typeof storedValidatorObjectSchema>
>;
export type ActionableGitHubState = DeepReadonly<
  z.infer<typeof persistedActionSchema>
>;
export type GitHubWatchResponse = DeepReadonly<z.infer<typeof responseSchema>>;
export type DecisionWatcherConfig = DeepReadonly<z.infer<typeof configSchema>>;
export type DecisionWatcherInput = DeepReadonly<z.infer<typeof inputSchema>>;

const endpointKey = (endpoint: WatchEndpoint) =>
  JSON.stringify([
    endpoint.url,
    endpoint.mediaType,
    endpoint.apiVersion,
    endpoint.authenticationContextId,
  ]);
const sameEndpoint = (left: WatchEndpoint, right: WatchEndpoint) =>
  endpointKey(left) === endpointKey(right);
const within = (url: string, prefix: string) =>
  url === prefix || url.startsWith(`${prefix}/`);
const expectedApiPrefix = (repositoryUrl: string) =>
  repositoryUrl.replace("https://github.com/", "https://api.github.com/repos/");
const tryAddMilliseconds = (timestamp: string, milliseconds: number) => {
  const value = Date.parse(timestamp) + milliseconds;
  return Number.isFinite(value) && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toISOString()
    : null;
};

const result = (
  input: Pick<DecisionWatcherInput, "retryAttempt">,
  state: DecisionWatcherResult["state"],
  diagnostics: string,
  overrides: Partial<DecisionWatcherResult> = {},
) =>
  ({
    state,
    activationStatus: "default-off",
    effectsExecutable: false,
    authorityStateChanged: false,
    reads: [],
    notifications: [],
    validators: [],
    notifiedState: [],
    nextPollAt: null,
    retryAt: null,
    retryAttempt: input.retryAttempt,
    diagnostics: [diagnostics],
    ...overrides,
  }) as const;

const stopped = (input: DecisionWatcherInput, diagnostic: string) =>
  result(input, "stopped", diagnostic, {
    validators: input.validators,
    notifiedState: input.previouslyNotified,
  });

const validatorFor = (
  validators: readonly StoredValidator[],
  endpoint: WatchEndpoint,
) => {
  const matches = validators.filter((stored) =>
    sameEndpoint(stored.endpoint, endpoint),
  );
  if (matches.length !== 1) {
    return null;
  }
  const { etag, lastModified } = matches[0]!;
  return {
    ...(etag === undefined ? {} : { etag }),
    ...(lastModified === undefined ? {} : { lastModified }),
  } as const;
};

const plannedRead = (
  input: DecisionWatcherInput,
  endpoint: WatchEndpoint,
  unconditional = false,
) =>
  ({
    method: "GET",
    endpoint,
    conditional: unconditional
      ? null
      : validatorFor(input.validators, endpoint),
    credentialCapability: "github-read-only",
    serialized: true,
  }) as const;

const responseProgress = (input: DecisionWatcherInput) => {
  type Progress = {
    readonly rootIndex: number;
    readonly expected: WatchEndpoint | undefined;
    readonly roots: readonly WatchEndpoint[];
    readonly diagnostic?: string;
  };
  const progress = input.responses.reduce<Progress>(
    (current, response) => {
      if (current.diagnostic) {
        return current;
      }
      const root = input.config.endpoints[current.rootIndex];
      if (
        !root ||
        !current.expected ||
        !sameEndpoint(response.endpoint, current.expected)
      ) {
        return {
          ...current,
          diagnostic:
            "GitHub responses do not follow the configured serialized pagination chain",
        };
      }
      if (
        response.kind === "page" &&
        response.nextUrl &&
        !within(response.nextUrl, input.config.allowedGitHubApiUrlPrefix)
      ) {
        return {
          ...current,
          diagnostic:
            "GitHub pagination escaped the configured repository boundary",
        };
      }

      const roots = [...current.roots, root];
      return response.kind === "page" && response.nextUrl
        ? {
            rootIndex: current.rootIndex,
            expected: { ...root, url: response.nextUrl },
            roots,
          }
        : {
            rootIndex: current.rootIndex + 1,
            expected: input.config.endpoints[current.rootIndex + 1],
            roots,
          };
    },
    { rootIndex: 0, expected: input.config.endpoints[0], roots: [] },
  );

  if (progress.diagnostic) {
    return { kind: "invalid", diagnostic: progress.diagnostic } as const;
  }
  return progress.expected
    ? ({
        kind: "pending",
        nextEndpoint: progress.expected,
        roots: progress.roots,
      } as const)
    : ({ kind: "complete", roots: progress.roots } as const);
};

const updatedValidators = (
  current: readonly StoredValidator[],
  responses: readonly GitHubWatchResponse[],
) => {
  const byEndpoint = new Map(
    current.map((validator) => [endpointKey(validator.endpoint), validator]),
  );
  responses.forEach((response) => {
    if (response.kind === "page" || response.kind === "not-modified") {
      byEndpoint.set(endpointKey(response.endpoint), {
        endpoint: response.endpoint,
        ...response.validator,
      });
    }
  });
  return [...byEndpoint.values()];
};

const retryTime = (
  input: DecisionWatcherInput,
  response: Extract<
    GitHubWatchResponse,
    { readonly kind: "rate-limited" }
  > | null,
  attempt: number,
) => {
  if (response?.retryAfterSeconds !== undefined) {
    return tryAddMilliseconds(input.now, response.retryAfterSeconds * 1_000);
  }
  if (response?.rateLimitResetAt) {
    return new Date(response.rateLimitResetAt).toISOString();
  }
  return tryAddMilliseconds(
    input.now,
    input.config.baseRetryDelayMs * 2 ** Math.max(0, attempt - 1),
  );
};

const backoff = (
  input: DecisionWatcherInput,
  response: Extract<
    GitHubWatchResponse,
    { readonly kind: "rate-limited" }
  > | null,
  reason: "rate-limit" | "outage",
) => {
  const attempt = input.retryAttempt + 1;
  if (attempt > input.config.maxRetryAttempts) {
    return stopped(
      input,
      reason === "rate-limit"
        ? "bounded GitHub retry budget exhausted"
        : "bounded GitHub outage retry budget exhausted; authority remains unchanged",
    );
  }
  const retryAt = retryTime(input, response, attempt);
  if (!retryAt) {
    return stopped(
      input,
      reason === "rate-limit"
        ? "GitHub rate-limit response has no usable retry time"
        : "GitHub outage has no usable retry time; authority remains unchanged",
    );
  }
  const diagnostic =
    reason === "rate-limit"
      ? "GitHub read delayed by bounded rate-limit backoff"
      : "GitHub watcher outage delayed notification with bounded backoff";
  return result(input, "backoff", diagnostic, {
    validators: input.validators,
    notifiedState: input.previouslyNotified,
    retryAt,
    retryAttempt: attempt,
  });
};

const actionKey = (action: ActionableGitHubState) =>
  `${action.payload.repositoryId}:${action.payload.workItemId}:${action.payload.classification}`;
const actionFingerprint = (action: ActionableGitHubState) =>
  `${action.eventRestId}:${JSON.stringify(action.objectRevision)}:${JSON.stringify(action.payload)}`;
const payloadUrlMatches = (
  payload: NotificationPayload,
  repositoryUrl: string,
) =>
  payload.githubUrl === `${repositoryUrl}/issues/${payload.workItemNumber}` ||
  payload.githubUrl === `${repositoryUrl}/pull/${payload.workItemNumber}`;

const snapshotActions = (
  input: DecisionWatcherInput,
  roots: readonly WatchEndpoint[],
) => {
  const entries = input.responses.map((response, index) => ({
    response,
    root: roots[index]!,
  }));
  const snapshot = entries.reduce(
    (state, { response, root }, index) => {
      const rootKey = endpointKey(root);
      const pageKey = endpointKey(response.endpoint);
      const firstForRoot =
        index === 0 || !sameEndpoint(roots[index - 1]!, root);

      state.observedPages.set(
        rootKey,
        new Set([...(state.observedPages.get(rootKey) ?? []), pageKey]),
      );
      if (response.kind === "page") {
        state.refreshedPages.add(pageKey);
        if (firstForRoot) {
          state.authoritativeRoots.add(rootKey);
        }
        state.refreshedActions.push(
          ...response.actionable.map((action) => ({
            sourceRootEndpoint: root,
            sourcePageEndpoint: response.endpoint,
            ...action,
          })),
        );
      }
      return state;
    },
    {
      observedPages: new Map<string, Set<string>>(),
      refreshedPages: new Set<string>(),
      authoritativeRoots: new Set<string>(),
      refreshedActions: [] as ActionableGitHubState[],
    },
  );

  return [
    ...input.previouslyNotified.filter((action) => {
      const rootKey = endpointKey(action.sourceRootEndpoint);
      const pageKey = endpointKey(action.sourcePageEndpoint);
      return (
        !snapshot.refreshedPages.has(pageKey) &&
        (!snapshot.authoritativeRoots.has(rootKey) ||
          Boolean(snapshot.observedPages.get(rootKey)?.has(pageKey)))
      );
    }),
    ...snapshot.refreshedActions,
  ];
};

export const evaluateDecisionWatcher = (
  untrustedInput: DecisionWatcherInput,
): DecisionWatcherResult => {
  const parsed = inputSchema.safeParse(untrustedInput);
  if (!parsed.success) {
    return result({ retryAttempt: 0 }, "stopped", "watcher input is invalid");
  }
  const input = parsed.data;
  const configuredEndpoints = new Set(input.config.endpoints.map(endpointKey));
  const configurationIsValid =
    expectedApiPrefix(input.config.publicRepositoryUrl) ===
      input.config.allowedGitHubApiUrlPrefix &&
    configuredEndpoints.size === input.config.endpoints.length &&
    input.config.endpoints.every((endpoint) =>
      within(endpoint.url, input.config.allowedGitHubApiUrlPrefix),
    ) &&
    input.validators.every((validator) =>
      within(validator.endpoint.url, input.config.allowedGitHubApiUrlPrefix),
    ) &&
    input.previouslyNotified.every(
      (action) =>
        configuredEndpoints.has(endpointKey(action.sourceRootEndpoint)) &&
        within(
          action.sourcePageEndpoint.url,
          input.config.allowedGitHubApiUrlPrefix,
        ) &&
        action.sourcePageEndpoint.mediaType ===
          action.sourceRootEndpoint.mediaType &&
        action.sourcePageEndpoint.apiVersion ===
          action.sourceRootEndpoint.apiVersion &&
        action.sourcePageEndpoint.authenticationContextId ===
          action.sourceRootEndpoint.authenticationContextId &&
        action.payload.repositoryId === input.config.repositoryId &&
        payloadUrlMatches(action.payload, input.config.publicRepositoryUrl),
    );
  if (!configurationIsValid) {
    return result(
      input,
      "stopped",
      "watcher configuration or persisted state is invalid",
    );
  }

  const firstEndpoint = input.config.endpoints[0]!;
  if (input.responses.length === 0) {
    return result(
      input,
      "reconcile",
      input.trigger === "wake"
        ? "wake signal requires a fresh GitHub reconciliation"
        : "GitHub reconciliation required",
      {
        reads: [plannedRead(input, firstEndpoint)],
        validators: input.validators,
        notifiedState: input.previouslyNotified,
      },
    );
  }
  if (input.responses.length > input.config.maxReconciliationPages) {
    return stopped(input, "bounded GitHub reconciliation page limit exceeded");
  }

  const progress = responseProgress(input);
  if (progress.kind === "invalid") {
    return stopped(input, progress.diagnostic);
  }

  const invalidValidator = input.responses.find(
    (response) => response.kind === "invalid-validator",
  );
  if (invalidValidator) {
    return result(
      input,
      "reconcile",
      "invalid validator discarded; bounded full reconciliation required",
      {
        reads: [plannedRead(input, firstEndpoint, true)],
        validators: input.validators.filter(
          (validator) =>
            !sameEndpoint(validator.endpoint, invalidValidator.endpoint),
        ),
        notifiedState: input.previouslyNotified,
        retryAttempt: 0,
      },
    );
  }

  const limited = input.responses.find(
    (
      response,
    ): response is Extract<
      GitHubWatchResponse,
      { readonly kind: "rate-limited" }
    > => response.kind === "rate-limited",
  );
  if (limited) {
    return backoff(input, limited, "rate-limit");
  }
  if (input.responses.some((response) => response.kind === "unavailable")) {
    return backoff(input, null, "outage");
  }

  if (progress.kind === "pending") {
    return result(
      input,
      "reconcile",
      "serialized GitHub reconciliation requires the next page",
      {
        reads: [plannedRead(input, progress.nextEndpoint)],
        validators: updatedValidators(input.validators, input.responses),
        notifiedState: input.previouslyNotified,
        retryAttempt: 0,
      },
    );
  }

  const currentActions = snapshotActions(input, progress.roots);
  const actionKeys = currentActions.map(actionKey);
  if (new Set(actionKeys).size !== actionKeys.length) {
    return stopped(
      input,
      "GitHub actionable state contains duplicate work-item classifications",
    );
  }
  if (
    !currentActions.every(
      (action) =>
        action.payload.repositoryId === input.config.repositoryId &&
        payloadUrlMatches(action.payload, input.config.publicRepositoryUrl),
    )
  ) {
    return stopped(
      input,
      "GitHub actionable state is outside repository scope",
    );
  }

  const previous = new Map(
    input.previouslyNotified.map((action) => [actionKey(action), action]),
  );
  const notifications = currentActions
    .filter((action) => {
      const earlier = previous.get(actionKey(action));
      return (
        !earlier || actionFingerprint(earlier) !== actionFingerprint(action)
      );
    })
    .map(
      (action) =>
        ({
          payload: action.payload,
          sandbox: "read-only",
          repositoryMutationCredentials: false,
          externalConnectors: false,
          toolCapableWorkPermitted: false,
          requiresFreshJasonInstruction: true,
        }) as const,
    );
  const pollInterval = currentActions.length
    ? input.config.activePollIntervalMs
    : input.config.idlePollIntervalMs;
  const nextPollAt = tryAddMilliseconds(input.now, pollInterval);
  if (!nextPollAt) {
    return stopped(input, "GitHub poll interval has no usable next poll time");
  }

  return result(
    input,
    notifications.length ? "actionable" : "unchanged",
    notifications.length
      ? "verified actionable GitHub state produced a fixed notification plan"
      : "GitHub state is unchanged; Codex notification suppressed",
    {
      notifications,
      validators: updatedValidators(input.validators, input.responses),
      notifiedState: currentActions,
      nextPollAt,
      retryAttempt: 0,
    },
  );
};
