import { describe, expect, it } from "vitest";

import {
  evaluateDecisionWatcher,
  type ActionableGitHubState,
  type DecisionWatcherInput,
  type GitHubWatchResponse,
  type StoredValidator,
  type WatchEndpoint,
} from "../../tooling/agent-automation/decision-watcher.js";

/*
Test case: read-only local decision watcher
Classification: engineering-workflow validation
Owning authority: REP-AUTO-007, REP-AUTO-016 through REP-AUTO-021, REP-AUTO-023; issue #15 acceptance criteria
Observable/invariant: bounded serialized GitHub observations update context-bound validators and produce only fixed, deduplicated, read-only notification plans
Oracle/equality: exact planned reads, notifications, timers, validator state, and invariant false authority/effect flags
Regression caught: wake acting without reread, notification on 304, validator reuse across contexts, pagination escape, unbounded retry, mutation-capable launch, raw prose leakage, or stale notification replay
Execution boundary: pure watcher protocol consumed by future read-only HTTP and Codex-launch adapters
Static/runtime distinction: TypeScript cannot prove response ordering, pagination provenance, conditional behavior, rate headers, runtime payload sanitation, or restart convergence
Cases: startup/wake, 304, actionable and cleared snapshots, pagination, invalid validator, 403/429 headers and exponential fallback, exhaustion, unavailable GitHub, sensitive extra fields, IDs above 2^53
Discrimination: DIRECT_WAKE, NOTIFY_304, CROSS_CONTEXT_ETAG, PAGINATION_ESCAPE, UNBOUNDED_RETRY, MUTATING_LAUNCH, LEAK_PROSE, and REPLAY_NOTIFY controlled variants must fail these assertions
Expected diagnostics: fixed watcher-state guidance without issue, review, or sensitive prose
Semantic coverage: conditional-read, validator, reconciliation, pagination, backoff, outage, action-change, notification, sandbox, and suppression edges

Discrimination obligation matrix:
- DIRECT_WAKE -> wake test observes only a fresh read plan
- NOTIFY_304 -> 304 test observes no notification
- CROSS_CONTEXT_ETAG -> request plan ignores validator from another auth context
- PAGINATION_ESCAPE -> hostile next URL stops the watcher
- UNBOUNDED_RETRY -> retry exhaustion stops without another request
- MUTATING_LAUNCH -> actionable test observes read-only/no-connectors/no-tools launch contract
- LEAK_PROSE -> extra raw fields do not survive the output projection
- REPLAY_NOTIFY -> repeated exact action fingerprint emits no notification
*/

const repositoryId = "900719925474099312345";
const apiPrefix = "https://api.github.com/repos/Ustice/represent";

const issueEndpoint: WatchEndpoint = {
  url: `${apiPrefix}/issues?labels=ready-for-human`,
  mediaType: "application/vnd.github+json",
  apiVersion: "2022-11-28",
  authenticationContextId: "read-only-app-installation-1",
};

const reviewEndpoint: WatchEndpoint = {
  url: `${apiPrefix}/pulls?state=open`,
  mediaType: "application/vnd.github+json",
  apiVersion: "2022-11-28",
  authenticationContextId: "read-only-app-installation-1",
};

const actionable = (
  overrides: Partial<ActionableGitHubState> = {},
): ActionableGitHubState => ({
  sourceRootEndpoint: issueEndpoint,
  sourcePageEndpoint: issueEndpoint,
  eventRestId: "900719925474099312370",
  objectRevision: {
    kind: "github-rest-object",
    restId: "900719925474099312371",
    updatedAt: "2026-07-18T14:59:00.000Z",
  },
  payload: {
    repositoryId,
    workItemId: "900719925474099312346",
    workItemNumber: 15,
    classification: "sensitive-review-required",
    githubUrl: "https://github.com/Ustice/represent/issues/15",
  },
  ...overrides,
});

const validators = (): readonly StoredValidator[] => [
  {
    endpoint: issueEndpoint,
    etag: '"issue-etag"',
  },
  {
    endpoint: reviewEndpoint,
    lastModified: "Fri, 18 Jul 2026 12:00:00 GMT",
  },
];

const notModified = (endpoint: WatchEndpoint): GitHubWatchResponse => ({
  kind: "not-modified",
  endpoint,
  status: 304,
  validator: {
    etag: `"${endpoint === issueEndpoint ? "issue" : "review"}-etag"`,
  },
});

const emptyPage = (endpoint: WatchEndpoint): GitHubWatchResponse => ({
  kind: "page",
  endpoint,
  status: 200,
  validator: {
    etag: `"${endpoint === issueEndpoint ? "issue" : "review"}-new"`,
  },
  nextUrl: null,
  actionable: [],
});

const baseInput = (
  overrides: Partial<DecisionWatcherInput> = {},
): DecisionWatcherInput => ({
  config: {
    repositoryId,
    publicRepositoryUrl: "https://github.com/Ustice/represent",
    allowedGitHubApiUrlPrefix: apiPrefix,
    endpoints: [issueEndpoint, reviewEndpoint],
    activePollIntervalMs: 30_000,
    idlePollIntervalMs: 300_000,
    baseRetryDelayMs: 1_000,
    maxRetryAttempts: 3,
    maxReconciliationPages: 10,
  },
  trigger: "startup",
  now: "2026-07-18T15:00:00.000Z",
  responses: [],
  validators: validators(),
  previouslyNotified: [],
  retryAttempt: 0,
  ...overrides,
});

const serialized = (value: unknown): string => JSON.stringify(value);

describe("decision watcher", () => {
  it.each(["startup" as const, "wake" as const])(
    "%s plans exactly one serialized read-only request before acting",
    (trigger) => {
      const output = evaluateDecisionWatcher(baseInput({ trigger }));

      expect(output).toMatchObject({
        state: "reconcile",
        activationStatus: "default-off",
        effectsExecutable: false,
        authorityStateChanged: false,
        notifications: [],
      });
      expect(output.reads).toEqual([
        {
          method: "GET",
          endpoint: issueEndpoint,
          conditional: { etag: '"issue-etag"' },
          credentialCapability: "github-read-only",
          serialized: true,
        },
      ]);
    },
  );

  it("plans the next configured root only after the prior response", () => {
    const output = evaluateDecisionWatcher(
      baseInput({ responses: [notModified(issueEndpoint)] }),
    );

    expect(output).toMatchObject({
      state: "reconcile",
      notifications: [],
      reads: [
        {
          endpoint: reviewEndpoint,
          conditional: {
            lastModified: "Fri, 18 Jul 2026 12:00:00 GMT",
          },
          serialized: true,
        },
      ],
    });
  });

  it("does not reuse validators across authentication contexts", () => {
    const otherContext = {
      ...validators()[0]!,
      endpoint: {
        ...issueEndpoint,
        authenticationContextId: "different-installation",
      },
    };
    const output = evaluateDecisionWatcher(
      baseInput({ validators: [otherContext] }),
    );

    expect(output.reads[0]?.conditional).toBeNull();
  });

  it("suppresses Codex when every conditional response is unchanged", () => {
    const output = evaluateDecisionWatcher(
      baseInput({
        trigger: "idle-poll",
        responses: [notModified(issueEndpoint), notModified(reviewEndpoint)],
        previouslyNotified: [actionable()],
      }),
    );

    expect(output).toMatchObject({
      state: "unchanged",
      authorityStateChanged: false,
      notifications: [],
      notifiedState: [actionable()],
      nextPollAt: "2026-07-18T15:00:30.000Z",
      retryAttempt: 0,
      diagnostics: ["GitHub state is unchanged; Codex notification suppressed"],
    });

    const refreshed = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            actionable: [actionable()],
          } as GitHubWatchResponse,
          emptyPage(reviewEndpoint),
        ],
        previouslyNotified: output.notifiedState,
      }),
    );
    expect(refreshed.notifications).toEqual([]);
  });

  it("emits a fixed, notification-only launch for verified actionable state", () => {
    const attackerSentinel = "SECRET attacker-controlled issue prose";
    const taintedAction = {
      ...actionable(),
      rawIssueBody: attackerSentinel,
    } as ActionableGitHubState;
    const output = evaluateDecisionWatcher(
      baseInput({
        trigger: "active-poll",
        responses: [
          {
            ...emptyPage(issueEndpoint),
            actionable: [taintedAction],
          } as GitHubWatchResponse,
          emptyPage(reviewEndpoint),
        ],
      }),
    );

    expect(output).toMatchObject({
      state: "actionable",
      authorityStateChanged: false,
      nextPollAt: "2026-07-18T15:00:30.000Z",
      notifications: [
        {
          payload: actionable().payload,
          sandbox: "read-only",
          repositoryMutationCredentials: false,
          externalConnectors: false,
          toolCapableWorkPermitted: false,
          requiresFreshJasonInstruction: true,
        },
      ],
    });
    expect(serialized(output)).not.toContain(attackerSentinel);
  });

  it("rejects arbitrary runtime classification text before notification", () => {
    const attackerSentinel = "SECRET raw attacker prose";
    const invalid = {
      ...actionable(),
      payload: {
        ...actionable().payload,
        classification: attackerSentinel,
      },
    } as unknown as ActionableGitHubState;
    const output = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            actionable: [invalid],
          } as GitHubWatchResponse,
          emptyPage(reviewEndpoint),
        ],
      }),
    );

    expect(output).toMatchObject({
      state: "stopped",
      notifications: [],
      authorityStateChanged: false,
    });
    expect(serialized(output)).not.toContain(attackerSentinel);
  });

  it("rejects credential-shaped content in canonical event and revision identifiers", () => {
    const attackerSentinel = "ghp_SECRETcredential123";
    const invalid = {
      ...actionable(),
      eventRestId: attackerSentinel,
      objectRevision: {
        kind: "git-head",
        sha: attackerSentinel,
      },
    } as unknown as ActionableGitHubState;
    const output = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            actionable: [invalid],
          } as GitHubWatchResponse,
          emptyPage(reviewEndpoint),
        ],
      }),
    );

    expect(output).toMatchObject({ state: "stopped", notifications: [] });
    expect(serialized(output)).not.toContain(attackerSentinel);
  });

  it("rejects parseable but noncanonical revision timestamps", () => {
    const noncanonicalTimestamp = "July 18, 2026";
    const invalid = actionable({
      objectRevision: {
        kind: "github-rest-object",
        restId: "900719925474099312371",
        updatedAt: noncanonicalTimestamp,
      },
    });
    const output = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            actionable: [invalid],
          } as GitHubWatchResponse,
          emptyPage(reviewEndpoint),
        ],
      }),
    );

    expect(output).toMatchObject({ state: "stopped", notifications: [] });
    expect(serialized(output)).not.toContain(noncanonicalTimestamp);
  });

  it("does not notify the same actionable revision twice and clears dismissed state", () => {
    const unchanged = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            actionable: [actionable()],
          } as GitHubWatchResponse,
          emptyPage(reviewEndpoint),
        ],
        previouslyNotified: [actionable()],
      }),
    );
    const cleared = evaluateDecisionWatcher(
      baseInput({
        responses: [emptyPage(issueEndpoint), emptyPage(reviewEndpoint)],
        previouslyNotified: [actionable()],
      }),
    );

    expect(unchanged.notifications).toEqual([]);
    expect(unchanged.notifiedState).toEqual([actionable()]);
    expect(cleared.notifications).toEqual([]);
    expect(cleared.notifiedState).toEqual([]);
  });

  it("accepts only an ordered, repository-bounded pagination chain", () => {
    const nextEndpoint = {
      ...issueEndpoint,
      url: `${apiPrefix}/issues?labels=ready-for-human&page=2`,
    };
    const valid = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            nextUrl: nextEndpoint.url,
          } as GitHubWatchResponse,
          emptyPage(nextEndpoint),
          emptyPage(reviewEndpoint),
        ],
      }),
    );
    const nextPagePlan = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            nextUrl: nextEndpoint.url,
          } as GitHubWatchResponse,
        ],
      }),
    );
    const escaped = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            nextUrl: "https://attacker.example/steal",
          } as GitHubWatchResponse,
          emptyPage(reviewEndpoint),
        ],
      }),
    );

    expect(nextPagePlan).toMatchObject({
      state: "reconcile",
      notifications: [],
      reads: [{ endpoint: nextEndpoint, serialized: true }],
    });
    expect(valid.state).toBe("unchanged");
    expect(escaped).toMatchObject({
      state: "stopped",
      notifications: [],
      authorityStateChanged: false,
    });
  });

  it("preserves page-level deduplication when a later pagination page is unchanged", () => {
    const pageTwo = {
      ...issueEndpoint,
      url: `${apiPrefix}/issues?labels=ready-for-human&page=2`,
    };
    const priorPageTwoAction = actionable({
      sourcePageEndpoint: pageTwo,
    });
    const unchanged = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            nextUrl: pageTwo.url,
          } as GitHubWatchResponse,
          notModified(pageTwo),
          notModified(reviewEndpoint),
        ],
        previouslyNotified: [priorPageTwoAction],
      }),
    );
    const laterFullPage = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            ...emptyPage(issueEndpoint),
            nextUrl: pageTwo.url,
          } as GitHubWatchResponse,
          {
            ...emptyPage(pageTwo),
            actionable: [actionable()],
          } as GitHubWatchResponse,
          notModified(reviewEndpoint),
        ],
        previouslyNotified: unchanged.notifiedState,
      }),
    );

    expect(unchanged.notifiedState).toEqual([priorPageTwoAction]);
    expect(unchanged.notifications).toEqual([]);
    expect(laterFullPage.notifications).toEqual([]);
  });

  it("discards an invalid validator and requires an unconditional full reconciliation", () => {
    const output = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            kind: "invalid-validator",
            endpoint: issueEndpoint,
            status: 412,
          },
        ],
      }),
    );

    expect(output).toMatchObject({
      state: "reconcile",
      notifications: [],
      retryAttempt: 0,
    });
    expect(output.reads.every((read) => read.conditional === null)).toBe(true);
    expect(
      output.validators.some(
        (validator) => validator.endpoint.url === issueEndpoint.url,
      ),
    ).toBe(false);
  });

  it.each([
    ["Retry-After", { retryAfterSeconds: 12 }, "2026-07-18T15:00:12.000Z"],
    [
      "rate reset",
      { rateLimitResetAt: "2026-07-18T15:02:00.000Z" },
      "2026-07-18T15:02:00.000Z",
    ],
    ["exponential fallback", {}, "2026-07-18T15:00:02.000Z"],
  ])("honors %s during bounded backoff", (_name, headers, expectedRetryAt) => {
    const output = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            kind: "rate-limited",
            endpoint: issueEndpoint,
            status: 429,
            ...headers,
          },
        ],
        retryAttempt: 1,
      }),
    );

    expect(output).toMatchObject({
      state: "backoff",
      reads: [],
      notifications: [],
      retryAt: expectedRetryAt,
      retryAttempt: 2,
      authorityStateChanged: false,
    });
  });

  it("stops after bounded retry exhaustion without changing authority", () => {
    const output = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            kind: "rate-limited",
            endpoint: issueEndpoint,
            status: 403,
          },
        ],
        retryAttempt: 3,
      }),
    );

    expect(output).toMatchObject({
      state: "stopped",
      reads: [],
      notifications: [],
      authorityStateChanged: false,
      nextPollAt: null,
    });
  });

  it("fails closed when exponential retry delay exceeds the date range", () => {
    const output = evaluateDecisionWatcher(
      baseInput({
        config: {
          ...baseInput().config,
          baseRetryDelayMs: Number.MAX_VALUE,
        },
        responses: [
          {
            kind: "rate-limited",
            endpoint: issueEndpoint,
            status: 429,
          },
        ],
        retryAttempt: 1,
      }),
    );

    expect(output).toMatchObject({
      state: "stopped",
      retryAt: null,
      diagnostics: ["GitHub rate-limit response has no usable retry time"],
    });
  });

  it("rejects a rate-limit response outside the serialized endpoint chain", () => {
    const output = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            kind: "rate-limited",
            endpoint: {
              ...issueEndpoint,
              url: "https://attacker.example/rate",
            },
            status: 429,
          },
        ],
      }),
    );

    expect(output).toMatchObject({
      state: "stopped",
      retryAt: null,
      notifications: [],
      diagnostics: [
        "GitHub responses do not follow the configured serialized pagination chain",
      ],
    });
  });

  it("fails closed when the next poll time exceeds the date range", () => {
    const input = baseInput();
    const output = evaluateDecisionWatcher({
      ...input,
      config: {
        ...input.config,
        activePollIntervalMs: Number.MAX_VALUE,
        idlePollIntervalMs: Number.MAX_VALUE,
      },
      responses: [emptyPage(issueEndpoint), emptyPage(reviewEndpoint)],
    });

    expect(output).toMatchObject({
      state: "stopped",
      nextPollAt: null,
      notifications: [],
      diagnostics: ["GitHub poll interval has no usable next poll time"],
    });
  });

  it("retries watcher outage with bounded backoff before stopping", () => {
    const first = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            kind: "unavailable",
            endpoint: issueEndpoint,
            status: 503,
          },
        ],
      }),
    );
    const exhausted = evaluateDecisionWatcher(
      baseInput({
        responses: [
          {
            kind: "unavailable",
            endpoint: issueEndpoint,
            status: 503,
          },
        ],
        previouslyNotified: [actionable()],
        retryAttempt: 3,
      }),
    );

    expect(first).toMatchObject({
      state: "backoff",
      authorityStateChanged: false,
      effectsExecutable: false,
      notifications: [],
      retryAt: "2026-07-18T15:00:01.000Z",
      retryAttempt: 1,
      diagnostics: [
        "GitHub watcher outage delayed notification with bounded backoff",
      ],
    });
    expect(exhausted).toMatchObject({
      state: "stopped",
      authorityStateChanged: false,
      notifications: [],
      notifiedState: [actionable()],
      diagnostics: [
        "bounded GitHub outage retry budget exhausted; authority remains unchanged",
      ],
    });
  });
});
