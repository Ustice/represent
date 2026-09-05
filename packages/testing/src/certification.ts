export type CheckOutcome =
  | { readonly status: "pass"; readonly evidence?: unknown }
  | {
      readonly status: "fail" | "skip" | "unsupported" | "gap";
      readonly reason: string;
      readonly evidence?: unknown;
    };
export interface CertificationCase {
  readonly id: string;
  readonly scope: "universal" | "target";
  readonly required: boolean;
  readonly claims: readonly string[];
  readonly run: () => CheckOutcome | PromiseLike<CheckOutcome>;
}
export interface CertificationDeclaration {
  readonly adapter: { readonly name: string; readonly revision: string };
  readonly profile: { readonly name: string; readonly revision: string };
  readonly target: { readonly name: string; readonly version: string };
  readonly runtime: { readonly name: string; readonly version: string };
  readonly suiteRevision: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly claims: readonly {
    readonly name: string;
    readonly kind: "capability" | "guarantee";
  }[];
  readonly domains: readonly string[];
}
export async function certify(options: {
  declaration: CertificationDeclaration;
  cases: readonly CertificationCase[];
}) {
  const declaration = structuredClone(options.declaration);
  const cases = options.cases.map(({ id, scope, required, claims, run }) => ({
    id,
    scope,
    required,
    claims: [...claims],
    run,
  }));
  if (new Set(cases.map((subject) => subject.id)).size !== cases.length)
    throw new Error("Certification case IDs must be unique");
  const claims = new Set(declaration.claims.map((claim) => claim.name));
  if (claims.size !== declaration.claims.length)
    throw new Error("Certification claim names must be unique");
  const results = [];
  for (const { run, ...subject } of cases) {
    try {
      const result = await run();
      if (result.status !== "pass" && !result.reason.trim())
        throw new Error("A nonpassing check needs a reason");
      results.push({ ...result, ...subject });
    } catch (error) {
      results.push({
        ...subject,
        status: "harness-error" as const,
        reason: error instanceof Error ? error.message : "Check could not run",
        error,
      });
    }
  }
  const gaps = [...claims]
    .filter((claim) => !cases.some((subject) => subject.claims.includes(claim)))
    .map((claim) => `No checks cover declared claim: ${claim}`);
  if (!claims.size) gaps.push("No capabilities or guarantees were declared");
  if (!declaration.domains.length)
    gaps.push("No fixture or generated-input domain was declared");
  const passed =
    claims.size > 0 &&
    gaps.length === 0 &&
    results.every(
      (result) =>
        result.status === "pass" ||
        (!result.required &&
          !result.claims.some((claim) => claims.has(claim)) &&
          result.status !== "fail" &&
          result.status !== "harness-error"),
    );
  return {
    status: passed ? "passed" : "failed",
    declaration,
    results,
    gaps,
  } as const;
}
