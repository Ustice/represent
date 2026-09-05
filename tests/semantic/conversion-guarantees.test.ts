import { describe, expect, it } from "vitest";

import {
  assessRecoveryBoundary,
  evaluateCollision,
  evaluateDirectionalLosslessness,
  type CollisionClaim,
  type DirectionalLosslessnessClaim,
} from "./support/conversion-evidence.js";

interface NamedUser {
  readonly givenName: string;
  readonly familyName: string;
  readonly fullName: string;
}

interface UserNameParts {
  readonly givenName: string;
  readonly familyName: string;
}

interface IdentifiedUser {
  readonly id: string;
  readonly name: string;
}

interface PrivateUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

interface PublicUser {
  readonly id: string;
  readonly name: string;
}

const namedUserDomain = {
  name: "users with canonical full names",
  includes: (user: NamedUser) =>
    user.fullName === `${user.givenName} ${user.familyName}`,
} as const;

const namedUserEquality = {
  name: "all user name fields",
  equivalent: (left: NamedUser, right: NamedUser) =>
    left.givenName === right.givenName &&
    left.familyName === right.familyName &&
    left.fullName === right.fullName,
} as const;

const nameProjectionClaim = {
  direction: "NamedUser -> UserNameParts",
  sourceDomain: namedUserDomain,
  sourceEquality: namedUserEquality,
  forward: ({ givenName, familyName }: NamedUser): UserNameParts => ({
    givenName,
    familyName,
  }),
  reverse: ({ givenName, familyName }: UserNameParts) => ({
    accepted: true,
    value: {
      givenName,
      familyName,
      fullName: `${givenName} ${familyName}`,
    },
  }),
} as const satisfies DirectionalLosslessnessClaim<NamedUser, UserNameParts>;

describe("accepted conversion guarantees", () => {
  it("REP-CONV-001/004: preserves a derivable fullName despite reducing shape", () => {
    const evidence = evaluateDirectionalLosslessness(nameProjectionClaim, [
      {
        givenName: "Ada",
        familyName: "Lovelace",
        fullName: "Ada Lovelace",
      },
      {
        givenName: "Grace",
        familyName: "Hopper",
        fullName: "Grace Hopper",
      },
    ]);

    expect(evidence).toMatchObject({
      status: "supported",
      checkedSources: 2,
      supportedInferences: ["source-round-trip"],
    });
  });

  it("REP-CONV-002/006: limits recovery to the forward image", () => {
    const canonicalStringClaim = {
      direction: "number -> canonical user string",
      sourceDomain: {
        name: "non-negative integer user identifiers",
        includes: (value: number) => Number.isInteger(value) && value >= 0,
      },
      sourceEquality: {
        name: "numeric equality",
        equivalent: (left: number, right: number) => left === right,
      },
      forward: (value: number) => `user:${value}`,
      reverse: (value: string) => {
        const match = /^user:(\d+)$/.exec(value);

        return match?.[1] === undefined
          ? ({ accepted: false } as const)
          : ({ accepted: true, value: Number(match[1]) } as const);
      },
    } as const satisfies DirectionalLosslessnessClaim<number, string>;

    const evidence = evaluateDirectionalLosslessness(
      canonicalStringClaim,
      [0, 17, 2048],
    );

    expect(canonicalStringClaim.reverse("guest")).toEqual({ accepted: false });
    expect(evidence).toMatchObject({
      status: "supported",
      checkedSources: 3,
      supportedInferences: ["source-round-trip"],
    });
  });

  it("REP-CONV-001/006: preserves finite Dates under epoch-millisecond equality", () => {
    const dateClaim = {
      direction: "Date -> canonical ISO string",
      sourceDomain: {
        name: "finite JavaScript Dates",
        includes: (value: Date) => Number.isFinite(value.getTime()),
      },
      sourceEquality: {
        name: "epoch-millisecond equality",
        equivalent: (left: Date, right: Date) =>
          left.getTime() === right.getTime(),
      },
      forward: (value: Date) => value.toISOString(),
      reverse: (value: string) => ({
        accepted: true,
        value: new Date(value),
      }),
    } as const satisfies DirectionalLosslessnessClaim<Date, string>;

    const evidence = evaluateDirectionalLosslessness(dateClaim, [
      new Date("2026-07-17T00:00:00.000Z"),
      new Date("1999-12-31T23:59:59.123Z"),
    ]);

    expect(evidence).toMatchObject({
      status: "supported",
      supportedInferences: ["source-round-trip"],
    });
  });

  it("REP-CONV-005/007: rejects a fabricated placeholder with actionable diagnostics", () => {
    const placeholderClaim = {
      direction: "IdentifiedUser -> public name",
      sourceDomain: {
        name: "identified users",
        includes: (value: IdentifiedUser) =>
          value.id.length > 0 && value.name.length > 0,
      },
      sourceEquality: {
        name: "identifier and name equality",
        equivalent: (left: IdentifiedUser, right: IdentifiedUser) =>
          left.id === right.id && left.name === right.name,
      },
      forward: ({ name }: IdentifiedUser) => ({ name }),
      reverse: ({ name }: { readonly name: string }) => ({
        accepted: true,
        value: { id: "unknown", name },
      }),
    } as const satisfies DirectionalLosslessnessClaim<
      IdentifiedUser,
      { readonly name: string }
    >;
    const original = { id: "user-42", name: "Lin" } as const;

    const evidence = evaluateDirectionalLosslessness(placeholderClaim, [
      original,
    ]);

    expect(evidence).toMatchObject({
      status: "not-established",
      supportedInferences: [],
      diagnostic: {
        clause: "REP-CONV-001",
        direction: "IdentifiedUser -> public name",
        sourceDomain: "identified users",
        sourceEquality: "identifier and name equality",
        reason: "source-round-trip-failed",
        sourceValue: original,
        targetValue: { name: "Lin" },
        recoveredValue: { id: "unknown", name: "Lin" },
      },
    });
  });

  it("REP-CONV-003/006: demonstrates the opposite-direction Date-string collision", () => {
    const stringToDate = {
      direction: "date string -> Date",
      sourceDomain: {
        name: "parseable date strings",
        includes: (value: string) => Number.isFinite(Date.parse(value)),
      },
      sourceEquality: {
        name: "textual equality",
        equivalent: (left: string, right: string) => left === right,
      },
      targetEquality: {
        name: "epoch-millisecond equality",
        equivalent: (left: Date, right: Date) =>
          left.getTime() === right.getTime(),
      },
      forward: (value: string) => new Date(value),
    } as const satisfies CollisionClaim<string, Date>;
    const spellings = [
      "2026-07-17T00:00:00.000Z",
      "2026-07-16T20:00:00-04:00",
    ] as const;

    const evidence = evaluateCollision(stringToDate, spellings);

    expect(evidence).toMatchObject({
      status: "demonstrated",
      supportedInferences: [
        "target-observation-cannot-distinguish-source-pair",
      ],
      witness: {
        sourceValues: spellings,
        targetEquality: "epoch-millisecond equality",
      },
    });
    expect(
      evidence.status === "demonstrated" && evidence.witness.targetValues,
    ).toSatisfy(
      ([left, right]: readonly [Date, Date]) =>
        left.getTime() === right.getTime(),
    );
  });

  it("REP-CONV-003/004/007: preserves an actionable public-view collision", () => {
    const privateToPublic = {
      direction: "PrivateUser -> PublicUser",
      sourceDomain: {
        name: "private users with stable identity",
        includes: (value: PrivateUser) =>
          value.id.length > 0 && value.email.length > 0,
      },
      sourceEquality: {
        name: "identity, name, and email equality",
        equivalent: (left: PrivateUser, right: PrivateUser) =>
          left.id === right.id &&
          left.name === right.name &&
          left.email === right.email,
      },
      targetEquality: {
        name: "public structural equality",
        equivalent: (left: PublicUser, right: PublicUser) =>
          left.id === right.id && left.name === right.name,
      },
      forward: ({ id, name }: PrivateUser): PublicUser => ({ id, name }),
    } as const satisfies CollisionClaim<PrivateUser, PublicUser>;
    const privateUsers = [
      { id: "user-7", name: "Sam", email: "sam.one@example.test" },
      { id: "user-7", name: "Sam", email: "sam.two@example.test" },
    ] as const;

    const evidence = evaluateCollision(privateToPublic, privateUsers);

    expect(evidence).toMatchObject({
      status: "demonstrated",
      witness: {
        sourceValues: privateUsers,
        targetValues: [
          { id: "user-7", name: "Sam" },
          { id: "user-7", name: "Sam" },
        ],
        sourceEquality: "identity, name, and email equality",
        targetEquality: "public structural equality",
      },
    });
  });

  it("REP-CONV-003: excludes hidden-provenance recovery from the collision boundary", () => {
    const publicEquality = {
      name: "public structural equality",
      equivalent: (left: PublicUser, right: PublicUser) =>
        left.id === right.id && left.name === right.name,
    } as const;
    const privateEquality = {
      name: "identity, name, and email equality",
      equivalent: (left: PrivateUser, right: PrivateUser) =>
        left.id === right.id &&
        left.name === right.name &&
        left.email === right.email,
    } as const;
    const publicView = { id: "user-7", name: "Sam" } as const;
    const originalUsers = [
      { id: "user-7", name: "Sam", email: "sam.one@example.test" },
      { id: "user-7", name: "Sam", email: "sam.two@example.test" },
    ] as const;

    const boundary = assessRecoveryBoundary<
      PrivateUser,
      PublicUser,
      PrivateUser
    >({
      sourceEquality: privateEquality,
      targetEquality: publicEquality,
      recover: (_target, hiddenOriginal: PrivateUser) => hiddenOriginal,
      probes: [{ targetValue: publicView, contexts: originalUsers }],
    });

    expect(boundary).toEqual({
      singleValued: true,
      extensional: false,
      targetCongruent: false,
      withinCollisionBoundary: false,
    });
  });

  it("REP-CONV-003/007: rejects a distinguishable pair with reproducible diagnostics", () => {
    const distinguishable = {
      direction: "number -> decimal string",
      sourceDomain: {
        name: "positive integers",
        includes: (value: number) => Number.isInteger(value) && value > 0,
      },
      sourceEquality: {
        name: "numeric equality",
        equivalent: (left: number, right: number) => left === right,
      },
      targetEquality: {
        name: "textual equality",
        equivalent: (left: string, right: string) => left === right,
      },
      forward: (value: number) => String(value),
    } as const satisfies CollisionClaim<number, string>;

    const evidence = evaluateCollision(distinguishable, [7, 11]);

    expect(evidence).toEqual({
      status: "not-demonstrated",
      diagnostic: {
        clause: "REP-CONV-003",
        direction: "number -> decimal string",
        sourceDomain: "positive integers",
        sourceEquality: "numeric equality",
        targetEquality: "textual equality",
        reason: "target-values-distinguishable",
        sourceValues: [7, 11],
        targetValues: ["7", "11"],
      },
      supportedInferences: [],
    });
  });
});

interface MutationObligation {
  readonly id: string;
  readonly violatedClause: string;
  readonly fixture: string;
  readonly killingTest: string;
  readonly observedFailure: string;
  readonly killed: () => boolean;
}

const mutationObligations = [
  {
    id: "FIELD_COUNT_AS_LOSS",
    violatedClause: "REP-CONV-004",
    fixture: "derivable fullName",
    killingTest: "preserves a derivable fullName despite reducing shape",
    observedFailure: "mutant rejects a supported round trip based on shape",
    killed: () => {
      const source = {
        givenName: "Ada",
        familyName: "Lovelace",
        fullName: "Ada Lovelace",
      };
      const evidence = evaluateDirectionalLosslessness(nameProjectionClaim, [
        source,
      ]);
      const mutantAccepts =
        Object.keys(nameProjectionClaim.forward(source)).length >=
        Object.keys(source).length;

      return evidence.status === "supported" && !mutantAccepts;
    },
  },
  {
    id: "OFF_IMAGE_RECOVERY_REQUIREMENT",
    violatedClause: "REP-CONV-002",
    fixture: "canonical user string plus off-image guest",
    killingTest: "limits recovery to the forward image",
    observedFailure: "mutant rejects a claim because guest is not recoverable",
    killed: () => {
      const claim = {
        direction: "number -> canonical user string",
        sourceDomain: {
          name: "non-negative integer user identifiers",
          includes: (value: number) => Number.isInteger(value) && value >= 0,
        },
        sourceEquality: {
          name: "numeric equality",
          equivalent: (left: number, right: number) => left === right,
        },
        forward: (value: number) => `user:${value}`,
        reverse: (value: string) =>
          value.startsWith("user:")
            ? ({ accepted: true, value: Number(value.slice(5)) } as const)
            : ({ accepted: false } as const),
      } as const satisfies DirectionalLosslessnessClaim<number, string>;
      const evidence = evaluateDirectionalLosslessness(claim, [17]);
      const mutantAccepts =
        evidence.status === "supported" && claim.reverse("guest").accepted;

      return evidence.status === "supported" && !mutantAccepts;
    },
  },
  {
    id: "WRONG_DATE_EQUALITY",
    violatedClause: "REP-CONV-001",
    fixture: "finite Date reconstructed from canonical ISO",
    killingTest: "preserves finite Dates under epoch-millisecond equality",
    observedFailure: "object identity rejects epoch-equivalent Dates",
    killed: () => {
      const source = new Date("2026-07-17T00:00:00.000Z");
      const recovered = new Date(source.toISOString());

      return (
        source.getTime() === recovered.getTime() &&
        !Object.is(source, recovered)
      );
    },
  },
  {
    id: "INFER_OPPOSITE_DIRECTION",
    violatedClause: "REP-CONV-006",
    fixture: "two textual date spellings for one instant",
    killingTest: "demonstrates the opposite-direction Date-string collision",
    observedFailure:
      "mutant reports lossless where a collision is demonstrated",
    killed: () => {
      const claim = {
        direction: "date string -> Date",
        sourceDomain: {
          name: "parseable date strings",
          includes: (value: string) => Number.isFinite(Date.parse(value)),
        },
        sourceEquality: {
          name: "textual equality",
          equivalent: (left: string, right: string) => left === right,
        },
        targetEquality: {
          name: "epoch-millisecond equality",
          equivalent: (left: Date, right: Date) =>
            left.getTime() === right.getTime(),
        },
        forward: (value: string) => new Date(value),
      } as const satisfies CollisionClaim<string, Date>;
      const evidence = evaluateCollision(claim, [
        "2026-07-17T00:00:00.000Z",
        "2026-07-16T20:00:00-04:00",
      ]);
      const mutantReportsOppositeLossless = true;

      return (
        evidence.status === "demonstrated" && mutantReportsOppositeLossless
      );
    },
  },
  {
    id: "HIDDEN_PROVENANCE_RECOVERY",
    violatedClause: "REP-CONV-003",
    fixture: "one public view with two hidden original users",
    killingTest:
      "excludes hidden-provenance recovery from the collision boundary",
    observedFailure: "mutant accepts recovery that varies with hidden context",
    killed: () => {
      const publicEquality = {
        name: "public structural equality",
        equivalent: (left: PublicUser, right: PublicUser) =>
          left.id === right.id && left.name === right.name,
      };
      const privateEquality = {
        name: "private structural equality",
        equivalent: (left: PrivateUser, right: PrivateUser) =>
          left.id === right.id &&
          left.name === right.name &&
          left.email === right.email,
      };
      const target = { id: "user-7", name: "Sam" };
      const contexts: readonly [PrivateUser, PrivateUser] = [
        { ...target, email: "one@example.test" },
        { ...target, email: "two@example.test" },
      ];
      const boundary = assessRecoveryBoundary({
        sourceEquality: privateEquality,
        targetEquality: publicEquality,
        recover: (_target, context: PrivateUser) => context,
        probes: [{ targetValue: target, contexts }],
      });
      const mutantAcceptsContextualRecovery = contexts.every(
        (context) => context.id === target.id && context.name === target.name,
      );

      return (
        !boundary.withinCollisionBoundary && mutantAcceptsContextualRecovery
      );
    },
  },
  {
    id: "FALSE_GUARANTEE",
    violatedClause: "REP-CONV-001 and REP-CONV-005",
    fixture: "dropped identifier fabricated as unknown",
    killingTest: "rejects a fabricated placeholder with actionable diagnostics",
    observedFailure: "shape-only mutant accepts a failed source round trip",
    killed: () => {
      const claim = {
        direction: "IdentifiedUser -> public name",
        sourceDomain: {
          name: "identified users",
          includes: (value: IdentifiedUser) => value.id.length > 0,
        },
        sourceEquality: {
          name: "identifier and name equality",
          equivalent: (left: IdentifiedUser, right: IdentifiedUser) =>
            left.id === right.id && left.name === right.name,
        },
        forward: ({ name }: IdentifiedUser) => ({ name }),
        reverse: ({ name }: { readonly name: string }) => ({
          accepted: true,
          value: { id: "unknown", name },
        }),
      } as const satisfies DirectionalLosslessnessClaim<
        IdentifiedUser,
        { readonly name: string }
      >;
      const source = { id: "user-42", name: "Lin" };
      const evidence = evaluateDirectionalLosslessness(claim, [source]);
      const recovered = claim.reverse(claim.forward(source));
      const mutantAcceptsSourceShape =
        recovered.accepted &&
        "id" in recovered.value &&
        "name" in recovered.value;

      return evidence.status === "not-established" && mutantAcceptsSourceShape;
    },
  },
] as const satisfies readonly MutationObligation[];

describe("conversion-guarantee discrimination", () => {
  it.each(mutationObligations)(
    "$id violates $violatedClause and is killed by $killingTest",
    ({ killed }) => {
      expect(killed()).toBe(true);
    },
  );
});
