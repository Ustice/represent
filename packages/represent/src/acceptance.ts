import type { Representation } from "./conversions.js";

export interface AcceptanceSample {
  readonly label: string;
  readonly value: unknown;
}

/** Compare parser acceptance on supplied samples, with independent caller-defined copies. */
export function compareAcceptance(options: {
  before: Representation<unknown>;
  after: Representation<unknown>;
  samples: readonly AcceptanceSample[];
  copy: (value: unknown) => unknown;
}) {
  const { before, after, copy } = options;
  function probe(subject: Representation<unknown>, input: unknown) {
    const candidate = copy(input);
    let value: unknown;
    try {
      value = subject.parse(candidate);
    } catch (error) {
      return { status: "rejected", error } as const;
    }
    return { status: "accepted", value: copy(value) } as const;
  }
  const samples = options.samples.map(({ label, value }, index) => {
    const input = copy(value);
    return {
      index,
      label,
      input,
      before: probe(before, input),
      after: probe(after, input),
    };
  });
  function direction(source: "before" | "after", target: "before" | "after") {
    const exercised = samples.filter(
      (sample) => sample[source].status === "accepted",
    );
    const witnesses = exercised
      .filter((sample) => sample[target].status === "rejected")
      .map((sample) => sample.index);
    return {
      status: witnesses.length
        ? "counterexamples"
        : exercised.length
          ? "no-counterexamples"
          : "unexercised",
      tested: exercised.length,
      witnesses,
    } as const;
  }
  return {
    before: before.name,
    after: after.name,
    scope: "supplied-samples",
    samples,
    beforeToAfter: direction("before", "after"),
    afterToBefore: direction("after", "before"),
  } as const;
}
