# Contract checks and scoped certification

These runner-neutral functions work inside an existing test or development tool.
They do not own its CLI, workers, scheduling, or assertion library. The
[Sensor Bench profile](../../examples/sensor-bench/src/certification-profile.ts)
exercises the JSON Schema adapter against Ajv and deliberate artifact defects.

`checkContract({ representation, accepts, samples, copy })` compares parser
acceptance with a target's boolean validator on labeled inputs. Each side gets
an independent caller-defined copy. It returns `pass`, `fail`, or `gap`, with
counts and actual mismatching inputs. A passing check needs both accepted and
rejected source samples. One-sided or empty evidence is a gap, even if every
comparison agrees. It checks acceptance only, not normalized-value equality or
universal compatibility. Parser throws count as rejections; target-validator and
copy errors propagate to the harness boundary.

`certify({ declaration, cases })` executes named cases and returns a scoped
report:

```ts
const report = await certify({
  declaration: {
    adapter: { name: "Example adapter", revision: "0.1.0" },
    profile: { name: "Request acceptance", revision: "1" },
    target: { name: "Target validator", version: "1.0.0" },
    runtime: { name: "Node.js", version: process.versions.node },
    suiteRevision: "1",
    configuration: { coercion: false },
    claims: [{ name: "request-acceptance", kind: "capability" }],
    domains: ["Labeled valid and invalid request fixtures"],
  },
  cases: [
    {
      id: "request-acceptance",
      scope: "target",
      required: true,
      claims: ["request-acceptance"],
      run: () =>
        checkContract({ representation: request, accepts, samples, copy }),
    },
  ],
});
```

A case returns `pass`, or `fail`, `skip`, `unsupported`, or `gap` with a reason.
Thrown/rejected checks become `harness-error` results, retaining their actual
errors; independent later cases still run. Use returned outcomes for semantic
failures. Cases can be synchronous or asynchronous. IDs must be unique, as must
declared claim names. Invalid configuration or uncloneable declarations throw
before checks start. Declarations must be data suitable for `structuredClone`;
the report captures its own declaration and case metadata.

The report fails for any semantic failure or harness error, a required nonpass,
or a nonpass covering a declared claim. Optional unclaimed capabilities may be
skipped or unsupported with reasons. Every declared claim must have a covering
case; empty claims, missing domains, and uncovered claims produce gaps and fail.
Returned outcomes cannot overwrite a case's declared identity or obligations.
Target-specific configuration remains opaque to the orchestrator. The profile
owns its claims, input domains, oracles, and discrimination fixtures; the runner
cannot establish their adequacy on its own.

A passing result applies only to the declaration and exercised domain. It is not
a certification of every adapter feature or runtime version. Preserve the
report's scope and any seeds/counterexamples when publishing evidence. These
functions support the existing
[certification contract](../../docs/specifications/testing-and-certification.md),
including required discrimination checks and explicit unsupported/gap/error
outcomes; ordinary project tests do not need this metadata.
