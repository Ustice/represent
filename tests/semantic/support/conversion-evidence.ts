export interface NamedDomain<Value> {
  readonly name: string;
  readonly includes: (value: Value) => boolean;
}

export interface NamedEquality<Value> {
  readonly name: string;
  readonly equivalent: (left: Value, right: Value) => boolean;
}

export type Recovery<Value> =
  | { readonly accepted: true; readonly value: Value }
  | { readonly accepted: false };

export interface DirectionalLosslessnessClaim<Source, Target> {
  readonly direction: string;
  readonly sourceDomain: NamedDomain<Source>;
  readonly sourceEquality: NamedEquality<Source>;
  readonly forward: (source: Source) => Target;
  readonly reverse: (target: Target) => Recovery<Source>;
}

export interface CollisionClaim<Source, Target> {
  readonly direction: string;
  readonly sourceDomain: NamedDomain<Source>;
  readonly sourceEquality: NamedEquality<Source>;
  readonly targetEquality: NamedEquality<Target>;
  readonly forward: (source: Source) => Target;
}

export interface LosslessnessDiagnostic<Source, Target> {
  readonly clause: "REP-CONV-001";
  readonly direction: string;
  readonly sourceDomain: string;
  readonly sourceEquality: string;
  readonly reason:
    | "sample-outside-declared-domain"
    | "reverse-witness-rejected-forward-result"
    | "recovered-value-outside-declared-domain"
    | "source-round-trip-failed";
  readonly sourceValue: Source;
  readonly targetValue?: Target;
  readonly recoveredValue?: Source;
}

export type DirectionalLosslessnessEvidence<Source, Target> =
  | {
      readonly status: "supported";
      readonly checkedSources: number;
      readonly supportedInferences: readonly ["source-round-trip"];
    }
  | {
      readonly status: "not-established";
      readonly diagnostic: LosslessnessDiagnostic<Source, Target>;
      readonly supportedInferences: readonly [];
    };

export interface CollisionWitness<Source, Target> {
  readonly sourceValues: readonly [Source, Source];
  readonly targetValues: readonly [Target, Target];
  readonly sourceEquality: string;
  readonly targetEquality: string;
}

export type CollisionEvidence<Source, Target> =
  | {
      readonly status: "demonstrated";
      readonly witness: CollisionWitness<Source, Target>;
      readonly recoveryBoundary: readonly [
        "single-valued",
        "extensional",
        "target-congruent",
      ];
      readonly supportedInferences: readonly [
        "target-observation-cannot-distinguish-source-pair",
      ];
    }
  | {
      readonly status: "not-demonstrated";
      readonly diagnostic: {
        readonly clause: "REP-CONV-003";
        readonly direction: string;
        readonly sourceDomain: string;
        readonly sourceEquality: string;
        readonly targetEquality: string;
        readonly reason:
          | "source-outside-declared-domain"
          | "source-values-equivalent"
          | "target-values-distinguishable";
        readonly sourceValues: readonly [Source, Source];
        readonly targetValues?: readonly [Target, Target];
      };
      readonly supportedInferences: readonly [];
    };

export interface RecoveryBoundaryInput<Source, Target, Context> {
  readonly sourceEquality: NamedEquality<Source>;
  readonly targetEquality: NamedEquality<Target>;
  readonly recover: (target: Target, context: Context) => Source;
  readonly probes: readonly {
    readonly targetValue: Target;
    readonly contexts: readonly [Context, Context];
  }[];
}

export interface RecoveryBoundaryAssessment {
  readonly singleValued: boolean;
  readonly extensional: boolean;
  readonly targetCongruent: boolean;
  readonly withinCollisionBoundary: boolean;
}

export const evaluateDirectionalLosslessness = <Source, Target>(
  claim: DirectionalLosslessnessClaim<Source, Target>,
  sources: readonly Source[],
): DirectionalLosslessnessEvidence<Source, Target> => {
  for (const sourceValue of sources) {
    const diagnosticContext = {
      clause: "REP-CONV-001",
      direction: claim.direction,
      sourceDomain: claim.sourceDomain.name,
      sourceEquality: claim.sourceEquality.name,
      sourceValue,
    } as const;

    if (!claim.sourceDomain.includes(sourceValue)) {
      return {
        status: "not-established",
        diagnostic: {
          ...diagnosticContext,
          reason: "sample-outside-declared-domain",
        },
        supportedInferences: [],
      };
    }

    const targetValue = claim.forward(sourceValue);
    const recovery = claim.reverse(targetValue);

    if (!recovery.accepted) {
      return {
        status: "not-established",
        diagnostic: {
          ...diagnosticContext,
          reason: "reverse-witness-rejected-forward-result",
          targetValue,
        },
        supportedInferences: [],
      };
    }

    if (!claim.sourceDomain.includes(recovery.value)) {
      return {
        status: "not-established",
        diagnostic: {
          ...diagnosticContext,
          reason: "recovered-value-outside-declared-domain",
          targetValue,
          recoveredValue: recovery.value,
        },
        supportedInferences: [],
      };
    }

    if (!claim.sourceEquality.equivalent(recovery.value, sourceValue)) {
      return {
        status: "not-established",
        diagnostic: {
          ...diagnosticContext,
          reason: "source-round-trip-failed",
          targetValue,
          recoveredValue: recovery.value,
        },
        supportedInferences: [],
      };
    }
  }

  return {
    status: "supported",
    checkedSources: sources.length,
    supportedInferences: ["source-round-trip"],
  };
};

export const evaluateCollision = <Source, Target>(
  claim: CollisionClaim<Source, Target>,
  sourceValues: readonly [Source, Source],
): CollisionEvidence<Source, Target> => {
  const diagnosticContext = {
    clause: "REP-CONV-003",
    direction: claim.direction,
    sourceDomain: claim.sourceDomain.name,
    sourceEquality: claim.sourceEquality.name,
    targetEquality: claim.targetEquality.name,
    sourceValues,
  } as const;

  if (sourceValues.some((source) => !claim.sourceDomain.includes(source))) {
    return {
      status: "not-demonstrated",
      diagnostic: {
        ...diagnosticContext,
        reason: "source-outside-declared-domain",
      },
      supportedInferences: [],
    };
  }

  const targetValues = [
    claim.forward(sourceValues[0]),
    claim.forward(sourceValues[1]),
  ] as const;

  if (claim.sourceEquality.equivalent(...sourceValues)) {
    return {
      status: "not-demonstrated",
      diagnostic: {
        ...diagnosticContext,
        reason: "source-values-equivalent",
        targetValues,
      },
      supportedInferences: [],
    };
  }

  if (!claim.targetEquality.equivalent(...targetValues)) {
    return {
      status: "not-demonstrated",
      diagnostic: {
        ...diagnosticContext,
        reason: "target-values-distinguishable",
        targetValues,
      },
      supportedInferences: [],
    };
  }

  return {
    status: "demonstrated",
    witness: {
      sourceValues,
      targetValues,
      sourceEquality: claim.sourceEquality.name,
      targetEquality: claim.targetEquality.name,
    },
    recoveryBoundary: ["single-valued", "extensional", "target-congruent"],
    supportedInferences: ["target-observation-cannot-distinguish-source-pair"],
  };
};

export const assessRecoveryBoundary = <Source, Target, Context>({
  sourceEquality,
  targetEquality,
  recover,
  probes,
}: RecoveryBoundaryInput<
  Source,
  Target,
  Context
>): RecoveryBoundaryAssessment => {
  const observations = probes.flatMap(({ targetValue, contexts }) =>
    contexts.map((context) => ({
      targetValue,
      recoveredValue: recover(targetValue, context),
    })),
  );
  const singleValued = probes.every(({ targetValue, contexts }) =>
    contexts.every((context) =>
      sourceEquality.equivalent(
        recover(targetValue, context),
        recover(targetValue, context),
      ),
    ),
  );
  const extensional = probes.every(({ targetValue, contexts }) =>
    sourceEquality.equivalent(
      recover(targetValue, contexts[0]),
      recover(targetValue, contexts[1]),
    ),
  );
  const targetCongruent = observations.every((left, leftIndex) =>
    observations
      .slice(leftIndex + 1)
      .every(
        (right) =>
          !targetEquality.equivalent(left.targetValue, right.targetValue) ||
          sourceEquality.equivalent(left.recoveredValue, right.recoveredValue),
      ),
  );
  return {
    singleValued,
    extensional,
    targetCongruent,
    withinCollisionBoundary: singleValued && extensional && targetCongruent,
  };
};
