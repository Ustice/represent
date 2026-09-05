import type { AcceptanceSample, Representation } from "@represent/core";

export function checkContract(options: {
  representation: Representation<unknown>;
  accepts: (input: unknown) => boolean;
  samples: readonly AcceptanceSample[];
  copy: (input: unknown) => unknown;
}) {
  let accepted = 0;
  let rejected = 0;
  const mismatches: Array<{
    index: number;
    label: string;
    input: unknown;
    parserAccepted: boolean;
    contractAccepted: boolean;
  }> = [];
  for (const [index, sample] of options.samples.entries()) {
    const input = options.copy(sample.value);
    const parserInput = options.copy(input);
    let parserAccepted = true;
    try {
      options.representation.parse(parserInput);
    } catch {
      parserAccepted = false;
    }
    const contractAccepted = options.accepts(options.copy(input));
    if (parserAccepted) accepted++;
    else rejected++;
    if (parserAccepted !== contractAccepted)
      mismatches.push({
        index,
        label: sample.label,
        input,
        parserAccepted,
        contractAccepted,
      });
  }
  const evidence = {
    tested: accepted + rejected,
    accepted,
    rejected,
    mismatches,
  };
  if (mismatches.length)
    return {
      status: "fail",
      reason: "Parser and target contract disagree",
      evidence,
    } as const;
  if (!accepted || !rejected)
    return {
      status: "gap",
      reason:
        "Acceptance agreement needs both accepted and rejected source samples",
      evidence,
    } as const;
  return { status: "pass", evidence } as const;
}
