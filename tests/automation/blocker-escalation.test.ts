import { describe, expect, it } from "vitest";

import {
  evaluateBlockerEscalation,
  type BlockerEscalationInput,
  type BlockerTransitionRecord,
  type EscalationSignal,
} from "../../tooling/agent-automation/blocker-escalation.js";

/*
Test case: fail-closed blocker escalation
Classification: engineering-workflow validation
Owning authority: REP-AUTO-002, REP-AUTO-016, REP-AUTO-019, REP-AUTO-020, REP-AUTO-022, REP-AUTO-023; issue #15 acceptance criteria
Observable/invariant: classified signals produce a deterministic stop/continue result, append-only transition plan, sanitized public record, and fixed notification payload
Oracle/equality: exact public result fields and convergence after replay
Regression caught: implementation failures mislabeled as design blockers, raw sensitive text crossing the boundary, forged authority links, duplicate transitions, lossy IDs, or credential findings without rotation guidance
Execution boundary: pure escalation capability consumed by future GitHub and notification adapters
Static/runtime distinction: TypeScript cannot prove external identity validity, evidence completeness, replay convergence, or sanitized runtime output
Cases: ordinary failure, public design blocker, sensitive review, credential exposure, incomplete evidence, replay, duplicate/conflicting transitions, IDs above 2^53
Discrimination: MISCLASSIFY_FAILURE, LEAK_SENSITIVE, FORGED_AUTHORITY, DUPLICATE_TRANSITION, LOSSY_ID, and OMIT_ROTATION controlled variants must fail these assertions
Expected diagnostics: fixed state-level guidance without untrusted finding content
Semantic coverage: classification, stop, public-record, sensitive-marker, notification, rotation, transition, replay, and recovery edges

Discrimination obligation matrix:
- MISCLASSIFY_FAILURE -> ordinary failure test observes continue/no effects
- LEAK_SENSITIVE -> sensitive tests recursively reject the attacker sentinel
- FORGED_AUTHORITY -> invalid authority link observes recovery
- DUPLICATE_TRANSITION -> duplicate record observes recovery
- LOSSY_ID -> numeric/non-canonical identity observes recovery
- OMIT_ROTATION -> credential exposure observes mandatory rotation/revocation flag and diagnostic
*/

const repositoryId = {
  nodeId: "R_repo",
  restId: "900719925474099312345",
} as const;
const workItemId = {
  nodeId: "I_blocked_work",
  restId: "900719925474099312346",
  number: 15,
} as const;

const publicSignal = () =>
  ({
    kind: "design-blocker",
    code: "inexpressible-invariant",
    evidence: {
      minimalExample: "The required invariant has no neutral representation.",
      authorityLinks: [
        "https://github.com/Ustice/represent/issues/15",
        "REP-AUTO-016",
      ],
      alternatives: ["Revise the invariant", "Defer the capability"],
      affectedGuarantees: ["REP-AUTO-016"],
      smallestDecisionRequired:
        "Choose whether the invariant or scope changes.",
    },
  }) as const satisfies EscalationSignal;

const baseInput = (overrides: Partial<BlockerEscalationInput> = {}) =>
  ({
    config: {
      repositoryId,
      automationActorId: "306379269",
      publicRepositoryUrl: "https://github.com/Ustice/represent",
      allowedAuthorityLinkPrefixes: [
        "https://github.com/Ustice/represent/",
        "REP-AUTO-",
      ],
    },
    workItemId,
    workItemRevision: {
      eventId: "event-work-item-revision-15",
      deliveryId: "delivery-work-item-revision-15",
      occurredAt: "2026-07-18T14:55:00.000Z",
    },
    source: {
      eventId: "event-blocker-15",
      deliveryId: "delivery-blocker-15",
      workflowRun: { restId: "900719925474099312360", attempt: 1 },
      observedAt: "2026-07-18T15:00:00.000Z",
    },
    signal: publicSignal(),
    existingTransitions: [],
    ...overrides,
  }) as const satisfies BlockerEscalationInput;

const record = (
  input: BlockerEscalationInput,
  overrides: Partial<BlockerTransitionRecord> = {},
) => {
  const draft = evaluateBlockerEscalation(input).transitionsToAppend[0];

  if (!draft) {
    throw new Error("fixture expected a transition draft");
  }

  return {
    id: { nodeId: "T_blocker", restId: "900719925474099312361" },
    logicalKey: draft.logicalKey,
    payload: draft.payload,
    ...overrides,
  } as const satisfies BlockerTransitionRecord;
};

const serialized = (value: unknown) => JSON.stringify(value);

describe("blocker escalation", () => {
  it("does not classify an ordinary implementation failure as a design blocker", () => {
    const output = evaluateBlockerEscalation(
      baseInput({
        signal: {
          kind: "ordinary-implementation-failure",
          code: "implementation-failure",
        },
      }),
    );

    expect(output).toEqual({
      state: "continue",
      dependentWorkPermitted: true,
      activationStatus: "default-off",
      effectsExecutable: false,
      transitionsToAppend: [],
      notification: null,
      rotationOrRevocationRequired: false,
      diagnostics: ["ordinary implementation failure is not a design blocker"],
    });
  });

  it("ignores unrelated malformed transition history for an ordinary failure", () => {
    const output = evaluateBlockerEscalation(
      baseInput({
        signal: {
          kind: "ordinary-implementation-failure",
          code: "implementation-failure",
        },
        existingTransitions: [{} as BlockerTransitionRecord],
      }),
    );

    expect(output.state).toBe("continue");
    expect(output.dependentWorkPermitted).toBe(true);
  });

  it("stops dependent work and plans one reviewed public blocker record", () => {
    const output = evaluateBlockerEscalation(baseInput());

    expect(output).toMatchObject({
      state: "blocked",
      dependentWorkPermitted: false,
      activationStatus: "default-off",
      effectsExecutable: false,
      rotationOrRevocationRequired: false,
      diagnostics: ["dependent work stopped for human decision"],
      notification: {
        repositoryId: repositoryId.restId,
        workItemId: workItemId.restId,
        workItemNumber: workItemId.number,
        classification: "inexpressible-invariant",
        githubUrl: "https://github.com/Ustice/represent/issues/15",
      },
    });
    expect(output.transitionsToAppend).toHaveLength(1);
    expect(output.transitionsToAppend[0]?.payload).toMatchObject({
      classification: "inexpressible-invariant",
      stateLabel: "ready-for-human",
      activationStatus: "default-off",
      publicRecord: {
        disclosure: "reviewed-public-evidence",
        marker: "<!-- represent-design-blocker -->",
        authorityLinks: [
          "https://github.com/Ustice/represent/issues/15",
          "REP-AUTO-016",
        ],
        affectedGuarantees: ["REP-AUTO-016"],
      },
    });
  });

  it.each([
    ["sensitive-review-required" as const, false],
    ["suspected-credential-exposure" as const, true],
  ])(
    "emits only fixed output for %s",
    (classification, rotationOrRevocationRequired) => {
      const attackerSentinel = "SECRET attacker-controlled exploit text";
      const signal = {
        kind: "sensitive-blocker",
        code: classification,
        rawFinding: attackerSentinel,
      } as EscalationSignal;
      const output = evaluateBlockerEscalation(
        baseInput({
          signal,
        }),
      );

      expect(output).toMatchObject({
        state: "blocked",
        dependentWorkPermitted: false,
        rotationOrRevocationRequired,
        notification: { classification },
        transitionsToAppend: [
          {
            payload: {
              classification,
              publicRecord: {
                disclosure: "fixed-sensitive-marker",
                marker: "<!-- represent-sensitive-blocker -->",
                title: "Private human review required",
                classification,
              },
            },
          },
        ],
      });
      expect(serialized(output)).not.toContain(attackerSentinel);

      if (classification === "suspected-credential-exposure") {
        expect(output.diagnostics).toContain(
          "private review required; rotate or revoke suspected credentials",
        );
      }
    },
  );

  it("converges after the transition is durably recorded", () => {
    const input = baseInput();
    const first = evaluateBlockerEscalation(input);
    const replayed = evaluateBlockerEscalation({
      ...input,
      existingTransitions: [record(input)],
    });

    expect(first.transitionsToAppend).toHaveLength(1);
    expect(replayed).toMatchObject({
      state: "blocked",
      dependentWorkPermitted: false,
      transitionsToAppend: [],
    });
    expect(first.notification).not.toBeNull();
    expect(replayed.notification).toBeNull();
  });

  it("fails closed for incomplete or forged public evidence", () => {
    const signal = publicSignal();
    if (signal.kind !== "design-blocker") {
      throw new Error("fixture must be a design blocker");
    }

    const output = evaluateBlockerEscalation(
      baseInput({
        signal: {
          ...signal,
          evidence: {
            ...signal.evidence,
            authorityLinks: ["https://attacker.example/authority"],
          },
        },
      }),
    );

    expect(output).toMatchObject({
      state: "recovery",
      dependentWorkPermitted: false,
      notification: null,
      transitionsToAppend: [],
    });
  });

  it("fails closed for duplicate or conflicting transition records", () => {
    const input = baseInput();
    const existing = record(input);

    expect(
      evaluateBlockerEscalation({
        ...input,
        existingTransitions: [existing, existing],
      }),
    ).toMatchObject({ state: "recovery", dependentWorkPermitted: false });

    expect(
      evaluateBlockerEscalation({
        ...input,
        existingTransitions: [
          {
            ...existing,
            payload: {
              ...existing.payload,
              classification: "target-semantics-leak",
            },
          },
        ],
      }),
    ).toMatchObject({ state: "recovery", dependentWorkPermitted: false });
  });

  it("binds the transition to the exact work-item revision and validates durable record IDs", () => {
    const input = baseInput();
    const existing = record(input);

    expect(existing.logicalKey).toContain("event-work-item-revision-15");
    expect(existing.payload.workItemRevision).toEqual(input.workItemRevision);
    expect(
      evaluateBlockerEscalation({
        ...input,
        existingTransitions: [
          {
            ...existing,
            id: { nodeId: "", restId: "not-an-id" },
          },
        ],
      }),
    ).toMatchObject({
      state: "recovery",
      dependentWorkPermitted: false,
      transitionsToAppend: [],
      notification: null,
    });
  });

  it.each([
    ["kind", { kind: "attacker-controlled-kind" }],
    ["state", { stateLabel: "attacker-controlled-state" }],
    ["activation", { activationStatus: "active" }],
    ["public record", {}],
  ])(
    "fails closed when durable transition %s is corrupted",
    (_name, change) => {
      const input = baseInput();
      const existing = record(input);
      const semanticChange =
        _name === "public record"
          ? {
              publicRecord: {
                ...existing.payload.publicRecord,
                disclosure: "attacker-controlled-disclosure",
              },
            }
          : change;
      const corrupted = {
        ...existing,
        payload: {
          ...existing.payload,
          ...semanticChange,
        },
      } as unknown as BlockerTransitionRecord;
      const output = evaluateBlockerEscalation({
        ...input,
        existingTransitions: [corrupted],
      });

      expect(output).toMatchObject({
        state: "recovery",
        dependentWorkPermitted: false,
        transitionsToAppend: [],
        notification: null,
      });
    },
  );

  it("preserves decimal IDs above 2^53 and rejects non-canonical identities", () => {
    expect(
      evaluateBlockerEscalation(baseInput()).notification?.repositoryId,
    ).toBe("900719925474099312345");

    expect(
      evaluateBlockerEscalation(
        baseInput({
          config: {
            ...baseInput().config,
            repositoryId: { ...repositoryId, restId: "09" },
          },
        }),
      ),
    ).toMatchObject({ state: "recovery", dependentWorkPermitted: false });
  });

  it("rejects arbitrary runtime classification text before any outward plan", () => {
    const attackerSentinel = "SECRET raw classification prose";
    const output = evaluateBlockerEscalation(
      baseInput({
        signal: {
          kind: "sensitive-blocker",
          code: attackerSentinel,
        } as unknown as EscalationSignal,
      }),
    );

    expect(output).toMatchObject({
      state: "recovery",
      transitionsToAppend: [],
      notification: null,
    });
    expect(serialized(output)).not.toContain(attackerSentinel);
  });
});
