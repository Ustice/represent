import type {
  BlockerClassification,
  NotificationPayload,
  SensitiveClassification,
} from "./blocker-escalation.js";

export interface WatchEndpoint {
  readonly url: string;
  readonly mediaType: string;
  readonly apiVersion: string;
  readonly authenticationContextId: string;
}

export interface HttpValidator {
  readonly etag?: string;
  readonly lastModified?: string;
}

export interface StoredValidator extends HttpValidator {
  readonly key: string;
  readonly endpoint: WatchEndpoint;
}

export interface ActionableGitHubState {
  readonly sourceRootEndpointKey: string;
  readonly sourcePageEndpointKey: string;
  readonly eventRestId: string;
  readonly objectRevision:
    | {
        readonly kind: "github-rest-object";
        readonly restId: string;
        readonly updatedAt: string;
      }
    | {
        readonly kind: "git-head";
        readonly sha: string;
      };
  readonly payload: NotificationPayload;
}

export type GitHubWatchResponse =
  | {
      readonly kind: "not-modified";
      readonly endpoint: WatchEndpoint;
      readonly status: 304;
      readonly validator: HttpValidator;
    }
  | {
      readonly kind: "page";
      readonly endpoint: WatchEndpoint;
      readonly status: 200;
      readonly validator: HttpValidator;
      readonly nextUrl: string | null;
      readonly actionable: readonly Omit<
        ActionableGitHubState,
        "sourceEndpointKey"
      >[];
    }
  | {
      readonly kind: "invalid-validator";
      readonly endpoint: WatchEndpoint;
      readonly status: 412;
    }
  | {
      readonly kind: "rate-limited";
      readonly endpoint: WatchEndpoint;
      readonly status: 403 | 429;
      readonly retryAfterSeconds?: number;
      readonly rateLimitResetAt?: string;
    }
  | {
      readonly kind: "unavailable";
      readonly endpoint: WatchEndpoint;
      readonly status: number;
    };

export interface DecisionWatcherConfig {
  readonly repositoryId: string;
  readonly publicRepositoryUrl: string;
  readonly allowedGitHubApiUrlPrefix: string;
  readonly endpoints: readonly WatchEndpoint[];
  readonly activePollIntervalMs: number;
  readonly idlePollIntervalMs: number;
  readonly baseRetryDelayMs: number;
  readonly maxRetryAttempts: number;
  readonly maxReconciliationPages: number;
}

export interface DecisionWatcherInput {
  readonly config: DecisionWatcherConfig;
  readonly trigger: "startup" | "wake" | "active-poll" | "idle-poll";
  readonly now: string;
  readonly responses: readonly GitHubWatchResponse[];
  readonly validators: readonly StoredValidator[];
  readonly previouslyNotified: readonly ActionableGitHubState[];
  readonly retryAttempt: number;
}

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

const isNotificationClassification = (
  value: unknown,
): value is NotificationPayload["classification"] =>
  typeof value === "string" &&
  (blockerClassifications.has(value as BlockerClassification) ||
    sensitiveClassifications.has(value as SensitiveClassification));

const isTimestamp = (value: string): boolean =>
  value.length > 0 && Number.isFinite(Date.parse(value));

const isCanonicalTimestamp = (value: string): boolean =>
  isTimestamp(value) && new Date(value).toISOString() === value;

const validatorKey = (endpoint: WatchEndpoint): string =>
  JSON.stringify([
    endpoint.url,
    endpoint.mediaType,
    endpoint.apiVersion,
    endpoint.authenticationContextId,
  ]);

const endpointFromKey = (key: string): WatchEndpoint | null => {
  try {
    const value: unknown = JSON.parse(key);
    if (
      !Array.isArray(value) ||
      value.length !== 4 ||
      !value.every((part) => typeof part === "string")
    ) {
      return null;
    }

    const [url, mediaType, apiVersion, authenticationContextId] = value;
    return url && mediaType && apiVersion && authenticationContextId
      ? { url, mediaType, apiVersion, authenticationContextId }
      : null;
  } catch {
    return null;
  }
};

const hasValidator = (validator: HttpValidator): boolean =>
  Boolean(validator.etag || validator.lastModified);

const copyValidator = (validator: HttpValidator): HttpValidator => ({
  ...(validator.etag ? { etag: validator.etag } : {}),
  ...(validator.lastModified ? { lastModified: validator.lastModified } : {}),
});

const findValidator = (
  validators: readonly StoredValidator[],
  endpoint: WatchEndpoint,
): HttpValidator | null => {
  const key = validatorKey(endpoint);
  const matches = validators.filter((validator) => validator.key === key);
  const match = matches.length === 1 ? matches[0] : undefined;

  return match && hasValidator(match) && validatorKey(match.endpoint) === key
    ? copyValidator(match)
    : null;
};

const isAllowedUrl = (url: string, repositoryUrl: string): boolean =>
  url === repositoryUrl || url.startsWith(`${repositoryUrl}/`);

const expectedApiPrefix = (repositoryUrl: string): string | null => {
  const match = repositoryUrl.match(
    /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/,
  );

  return match?.[1] && match[2]
    ? `https://api.github.com/repos/${match[1]}/${match[2]}`
    : null;
};

const validEndpoint = (
  endpoint: WatchEndpoint,
  repositoryUrl: string,
): boolean =>
  isAllowedUrl(endpoint.url, repositoryUrl) &&
  endpoint.mediaType.length > 0 &&
  endpoint.apiVersion.length > 0 &&
  endpoint.authenticationContextId.length > 0;

const validPersistedPageKey = (
  pageKey: string,
  rootKey: string,
  config: DecisionWatcherConfig,
): boolean => {
  const page = endpointFromKey(pageKey);
  const root = endpointFromKey(rootKey);

  return Boolean(
    page &&
    root &&
    validEndpoint(page, config.allowedGitHubApiUrlPrefix) &&
    page.mediaType === root.mediaType &&
    page.apiVersion === root.apiVersion &&
    page.authenticationContextId === root.authenticationContextId,
  );
};

const sameEndpoint = (left: WatchEndpoint, right: WatchEndpoint): boolean =>
  validatorKey(left) === validatorKey(right);

const actionKey = (action: ActionableGitHubState): string =>
  `${action.payload.repositoryId}:${action.payload.workItemId}:${action.payload.classification}`;

const actionFingerprint = (action: ActionableGitHubState): string =>
  `${action.eventRestId}:${JSON.stringify(action.objectRevision)}:${JSON.stringify(action.payload)}`;

const isValidObjectRevision = (
  revision: unknown,
): revision is ActionableGitHubState["objectRevision"] => {
  if (!revision || typeof revision !== "object" || !("kind" in revision)) {
    return false;
  }

  if (revision.kind === "github-rest-object") {
    return (
      "restId" in revision &&
      typeof revision.restId === "string" &&
      canonicalDecimalId.test(revision.restId) &&
      "updatedAt" in revision &&
      typeof revision.updatedAt === "string" &&
      isCanonicalTimestamp(revision.updatedAt)
    );
  }

  return (
    revision.kind === "git-head" &&
    "sha" in revision &&
    typeof revision.sha === "string" &&
    /^[0-9a-f]{40}$/.test(revision.sha)
  );
};

const copyObjectRevision = (
  revision: ActionableGitHubState["objectRevision"],
): ActionableGitHubState["objectRevision"] =>
  revision.kind === "github-rest-object"
    ? {
        kind: "github-rest-object",
        restId: revision.restId,
        updatedAt: revision.updatedAt,
      }
    : { kind: "git-head", sha: revision.sha };

const validAction = (
  action: Omit<ActionableGitHubState, "sourceEndpointKey">,
  config: DecisionWatcherConfig,
): boolean =>
  canonicalDecimalId.test(action.eventRestId) &&
  isValidObjectRevision(action.objectRevision) &&
  action.payload.repositoryId === config.repositoryId &&
  canonicalDecimalId.test(action.payload.repositoryId) &&
  canonicalDecimalId.test(action.payload.workItemId) &&
  Number.isSafeInteger(action.payload.workItemNumber) &&
  action.payload.workItemNumber > 0 &&
  isNotificationClassification(action.payload.classification) &&
  (action.payload.githubUrl ===
    `${config.publicRepositoryUrl}/issues/${action.payload.workItemNumber}` ||
    action.payload.githubUrl ===
      `${config.publicRepositoryUrl}/pull/${action.payload.workItemNumber}`);

const addMilliseconds = (timestamp: string, milliseconds: number): string =>
  new Date(Date.parse(timestamp) + milliseconds).toISOString();

const stopped = (
  input: DecisionWatcherInput,
  diagnostic: string,
  notifiedState: readonly ActionableGitHubState[] = [],
): DecisionWatcherResult => ({
  state: "stopped",
  activationStatus: "default-off",
  effectsExecutable: false,
  authorityStateChanged: false,
  reads: [],
  notifications: [],
  validators: input.validators,
  notifiedState,
  nextPollAt: null,
  retryAt: null,
  retryAttempt: input.retryAttempt,
  diagnostics: [diagnostic],
});

const plannedRead = (
  input: DecisionWatcherInput,
  endpoint: WatchEndpoint,
  omitValidator: boolean,
): PlannedGitHubRead => ({
  method: "GET",
  endpoint,
  conditional: omitValidator ? null : findValidator(input.validators, endpoint),
  credentialCapability: "github-read-only",
  serialized: true,
});

interface ResponseProgress {
  readonly error: string | null;
  readonly complete: boolean;
  readonly nextEndpoint: WatchEndpoint | null;
  readonly rootKeys: readonly string[];
}

const responseProgress = (input: DecisionWatcherInput): ResponseProgress => {
  const expectedRoots = [...input.config.endpoints];
  let rootIndex = 0;
  let expected = expectedRoots[rootIndex];
  const rootKeys: string[] = [];

  for (const response of input.responses) {
    if (!expected || !sameEndpoint(response.endpoint, expected)) {
      return {
        error:
          "GitHub responses do not follow the configured serialized pagination chain",
        complete: false,
        nextEndpoint: null,
        rootKeys,
      };
    }

    const root = expectedRoots[rootIndex];
    if (!root) {
      return {
        error: "GitHub pagination has no configured root endpoint",
        complete: false,
        nextEndpoint: null,
        rootKeys,
      };
    }
    rootKeys.push(validatorKey(root));

    if (response.kind === "page" && response.nextUrl) {
      if (
        !isAllowedUrl(response.nextUrl, input.config.allowedGitHubApiUrlPrefix)
      ) {
        return {
          error: "GitHub pagination escaped the configured repository boundary",
          complete: false,
          nextEndpoint: null,
          rootKeys,
        };
      }

      expected = { ...expected, url: response.nextUrl };
      continue;
    }

    rootIndex += 1;
    expected = expectedRoots[rootIndex];
  }

  return {
    error: null,
    complete: !expected,
    nextEndpoint: expected ?? null,
    rootKeys,
  };
};

const updatedValidators = (
  current: readonly StoredValidator[],
  responses: readonly GitHubWatchResponse[],
): readonly StoredValidator[] => {
  const updates = responses.flatMap((response): readonly StoredValidator[] => {
    if (
      (response.kind !== "page" && response.kind !== "not-modified") ||
      !hasValidator(response.validator)
    ) {
      return [];
    }

    return [
      {
        key: validatorKey(response.endpoint),
        endpoint: response.endpoint,
        ...copyValidator(response.validator),
      },
    ];
  });
  const updateKeys = new Set(updates.map((validator) => validator.key));

  return [
    ...current.filter((validator) => !updateKeys.has(validator.key)),
    ...updates,
  ];
};

const retryAt = (
  input: DecisionWatcherInput,
  response:
    Extract<GitHubWatchResponse, { readonly kind: "rate-limited" }> | undefined,
  attempt: number,
): string | null => {
  if (
    response?.retryAfterSeconds !== undefined &&
    Number.isFinite(response.retryAfterSeconds) &&
    response.retryAfterSeconds >= 0
  ) {
    return addMilliseconds(input.now, response.retryAfterSeconds * 1_000);
  }

  if (response?.rateLimitResetAt && isTimestamp(response.rateLimitResetAt)) {
    return new Date(response.rateLimitResetAt).toISOString();
  }

  const delay = input.config.baseRetryDelayMs * 2 ** Math.max(0, attempt - 1);
  return Number.isFinite(delay) ? addMilliseconds(input.now, delay) : null;
};

export const evaluateDecisionWatcher = (
  input: DecisionWatcherInput,
): DecisionWatcherResult => {
  if (
    !canonicalDecimalId.test(input.config.repositoryId) ||
    !isTimestamp(input.now) ||
    expectedApiPrefix(input.config.publicRepositoryUrl) !==
      input.config.allowedGitHubApiUrlPrefix ||
    input.config.endpoints.length === 0 ||
    !input.config.endpoints.every((endpoint) =>
      validEndpoint(endpoint, input.config.allowedGitHubApiUrlPrefix),
    ) ||
    new Set(input.config.endpoints.map(validatorKey)).size !==
      input.config.endpoints.length ||
    !Number.isSafeInteger(input.config.maxRetryAttempts) ||
    input.config.maxRetryAttempts < 1 ||
    !Number.isSafeInteger(input.config.maxReconciliationPages) ||
    input.config.maxReconciliationPages < 1 ||
    input.config.activePollIntervalMs <= 0 ||
    input.config.idlePollIntervalMs <= 0 ||
    input.config.baseRetryDelayMs <= 0 ||
    !Number.isSafeInteger(input.retryAttempt) ||
    input.retryAttempt < 0
  ) {
    return stopped(
      input,
      "watcher configuration or immutable state is invalid",
    );
  }

  const configuredEndpointKeys = new Set(
    input.config.endpoints.map(validatorKey),
  );
  if (
    !input.previouslyNotified.every(
      (action) =>
        configuredEndpointKeys.has(action.sourceRootEndpointKey) &&
        validPersistedPageKey(
          action.sourcePageEndpointKey,
          action.sourceRootEndpointKey,
          input.config,
        ) &&
        validAction(action, input.config),
    )
  ) {
    return stopped(
      input,
      "persisted watcher state contains invalid fixed identifiers",
    );
  }
  const safePrevious = input.previouslyNotified.map(
    (action): ActionableGitHubState => ({
      sourceRootEndpointKey: action.sourceRootEndpointKey,
      sourcePageEndpointKey: action.sourcePageEndpointKey,
      eventRestId: action.eventRestId,
      objectRevision: copyObjectRevision(action.objectRevision),
      payload: {
        repositoryId: action.payload.repositoryId,
        workItemId: action.payload.workItemId,
        workItemNumber: action.payload.workItemNumber,
        classification: action.payload.classification,
        githubUrl: action.payload.githubUrl,
      },
    }),
  );

  if (input.responses.length === 0) {
    const firstEndpoint = input.config.endpoints[0];
    if (!firstEndpoint) {
      return stopped(input, "watcher has no configured root endpoint");
    }

    return {
      state: "reconcile",
      activationStatus: "default-off",
      effectsExecutable: false,
      authorityStateChanged: false,
      reads: [plannedRead(input, firstEndpoint, false)],
      notifications: [],
      validators: input.validators,
      notifiedState: safePrevious,
      nextPollAt: null,
      retryAt: null,
      retryAttempt: input.retryAttempt,
      diagnostics: [
        input.trigger === "wake"
          ? "wake signal requires a fresh GitHub reconciliation"
          : "GitHub reconciliation required",
      ],
    };
  }

  if (input.responses.length > input.config.maxReconciliationPages) {
    return stopped(input, "bounded GitHub reconciliation page limit exceeded");
  }

  const invalidValidator = input.responses.find(
    (response) => response.kind === "invalid-validator",
  );
  if (invalidValidator) {
    const firstEndpoint = input.config.endpoints[0];
    if (!firstEndpoint) {
      return stopped(
        input,
        "watcher has no configured root endpoint",
        safePrevious,
      );
    }

    return {
      state: "reconcile",
      activationStatus: "default-off",
      effectsExecutable: false,
      authorityStateChanged: false,
      reads: [plannedRead(input, firstEndpoint, true)],
      notifications: [],
      validators: input.validators.filter(
        (validator) =>
          validator.key !== validatorKey(invalidValidator.endpoint),
      ),
      notifiedState: safePrevious,
      nextPollAt: null,
      retryAt: null,
      retryAttempt: 0,
      diagnostics: [
        "invalid validator discarded; bounded full reconciliation required",
      ],
    };
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
    const attempt = input.retryAttempt + 1;
    if (attempt > input.config.maxRetryAttempts) {
      return stopped(
        input,
        "bounded GitHub retry budget exhausted",
        safePrevious,
      );
    }

    const retry = retryAt(input, limited, attempt);
    if (!retry) {
      return stopped(
        input,
        "GitHub rate-limit response has no usable retry time",
        safePrevious,
      );
    }

    return {
      state: "backoff",
      activationStatus: "default-off",
      effectsExecutable: false,
      authorityStateChanged: false,
      reads: [],
      notifications: [],
      validators: input.validators,
      notifiedState: safePrevious,
      nextPollAt: null,
      retryAt: retry,
      retryAttempt: attempt,
      diagnostics: ["GitHub read delayed by bounded rate-limit backoff"],
    };
  }

  if (input.responses.some((response) => response.kind === "unavailable")) {
    const attempt = input.retryAttempt + 1;
    if (attempt > input.config.maxRetryAttempts) {
      return stopped(
        input,
        "bounded GitHub outage retry budget exhausted; authority remains unchanged",
        safePrevious,
      );
    }

    const retry = retryAt(input, undefined, attempt);
    if (!retry) {
      return stopped(
        input,
        "GitHub outage has no usable retry time; authority remains unchanged",
        safePrevious,
      );
    }

    return {
      state: "backoff",
      activationStatus: "default-off",
      effectsExecutable: false,
      authorityStateChanged: false,
      reads: [],
      notifications: [],
      validators: input.validators,
      notifiedState: safePrevious,
      nextPollAt: null,
      retryAt: retry,
      retryAttempt: attempt,
      diagnostics: [
        "GitHub watcher outage delayed notification with bounded backoff",
      ],
    };
  }

  const progress = responseProgress(input);
  if (progress.error) {
    return stopped(input, progress.error, safePrevious);
  }
  if (!progress.complete) {
    if (!progress.nextEndpoint) {
      return stopped(
        input,
        "serialized GitHub reconciliation has no next endpoint",
        safePrevious,
      );
    }

    return {
      state: "reconcile",
      activationStatus: "default-off",
      effectsExecutable: false,
      authorityStateChanged: false,
      reads: [plannedRead(input, progress.nextEndpoint, false)],
      notifications: [],
      validators: updatedValidators(input.validators, input.responses),
      notifiedState: safePrevious,
      nextPollAt: null,
      retryAt: null,
      retryAttempt: 0,
      diagnostics: ["serialized GitHub reconciliation requires the next page"],
    };
  }

  const observedActions = input.responses.flatMap((response, index) => {
    if (response.kind !== "page") {
      return [];
    }

    const sourceRootEndpointKey = progress.rootKeys[index];
    return sourceRootEndpointKey
      ? response.actionable.map((action) => ({
          sourceRootEndpointKey,
          sourcePageEndpointKey: validatorKey(response.endpoint),
          action,
        }))
      : [];
  });
  if (
    !observedActions.every(({ action }) => validAction(action, input.config))
  ) {
    return stopped(
      input,
      "GitHub actionable state contains invalid fixed identifiers",
    );
  }

  const refreshedActions = observedActions.map(
    ({
      action,
      sourceRootEndpointKey,
      sourcePageEndpointKey,
    }): ActionableGitHubState => ({
      sourceRootEndpointKey,
      sourcePageEndpointKey,
      eventRestId: action.eventRestId,
      objectRevision: copyObjectRevision(action.objectRevision),
      payload: {
        repositoryId: action.payload.repositoryId,
        workItemId: action.payload.workItemId,
        workItemNumber: action.payload.workItemNumber,
        classification: action.payload.classification,
        githubUrl: action.payload.githubUrl,
      },
    }),
  );
  const refreshedPageKeys = new Set(
    input.responses.flatMap((response, index) =>
      response.kind === "page" && progress.rootKeys[index]
        ? [validatorKey(response.endpoint)]
        : [],
    ),
  );
  const authoritativeRootKeys = new Set(
    input.responses.flatMap((response, index) => {
      const rootKey = progress.rootKeys[index];
      const isFirstRootResponse =
        index === 0 || progress.rootKeys[index - 1] !== rootKey;
      return response.kind === "page" && rootKey && isFirstRootResponse
        ? [rootKey]
        : [];
    }),
  );
  const observedPageKeysByRoot = input.responses.reduce(
    (pagesByRoot, response, index) => {
      const rootKey = progress.rootKeys[index];
      if (!rootKey) {
        return pagesByRoot;
      }

      const pages = pagesByRoot.get(rootKey) ?? new Set<string>();
      pages.add(validatorKey(response.endpoint));
      pagesByRoot.set(rootKey, pages);
      return pagesByRoot;
    },
    new Map<string, Set<string>>(),
  );
  const currentActions = [
    ...safePrevious.filter((action) => {
      if (refreshedPageKeys.has(action.sourcePageEndpointKey)) {
        return false;
      }

      if (!authoritativeRootKeys.has(action.sourceRootEndpointKey)) {
        return true;
      }

      return Boolean(
        observedPageKeysByRoot
          .get(action.sourceRootEndpointKey)
          ?.has(action.sourcePageEndpointKey),
      );
    }),
    ...refreshedActions,
  ];
  const actionKeys = currentActions.map(actionKey);
  if (new Set(actionKeys).size !== actionKeys.length) {
    return stopped(
      input,
      "GitHub actionable state contains duplicate work-item classifications",
      safePrevious,
    );
  }

  const previouslyByKey = new Map(
    safePrevious.map((action) => [actionKey(action), action]),
  );
  const changed = currentActions.filter((action) => {
    const previous = previouslyByKey.get(actionKey(action));
    return (
      !previous || actionFingerprint(previous) !== actionFingerprint(action)
    );
  });
  const notifications = changed.map((action): PlannedNotificationLaunch => ({
    payload: {
      repositoryId: action.payload.repositoryId,
      workItemId: action.payload.workItemId,
      workItemNumber: action.payload.workItemNumber,
      classification: action.payload.classification,
      githubUrl: action.payload.githubUrl,
    },
    sandbox: "read-only",
    repositoryMutationCredentials: false,
    externalConnectors: false,
    toolCapableWorkPermitted: false,
    requiresFreshJasonInstruction: true,
  }));
  const pollInterval =
    currentActions.length > 0
      ? input.config.activePollIntervalMs
      : input.config.idlePollIntervalMs;

  return {
    state: notifications.length > 0 ? "actionable" : "unchanged",
    activationStatus: "default-off",
    effectsExecutable: false,
    authorityStateChanged: false,
    reads: [],
    notifications,
    validators: updatedValidators(input.validators, input.responses),
    notifiedState: currentActions,
    nextPollAt: addMilliseconds(input.now, pollInterval),
    retryAt: null,
    retryAttempt: 0,
    diagnostics: [
      notifications.length > 0
        ? "verified actionable GitHub state produced a fixed notification plan"
        : "GitHub state is unchanged; Codex notification suppressed",
    ],
  };
};
