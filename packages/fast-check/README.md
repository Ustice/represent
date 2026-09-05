# fast-check adapter

`toArbitrary(representation, options?)` derives a fast-check 4.9.0 arbitrary
from Represent's neutral structure. The resulting values retain the
representation's parsed TypeScript type. Use fast-check's existing sampling,
properties, runners, seeds, and shrinking; Represent does not add a test runner.

```ts
import * as fc from "fast-check";
import { toArbitrary } from "@represent/fast-check";

const input = toArbitrary(sensorInput);
const fixtures = fc.sample(input, { seed: 162, numRuns: 10 });
fc.assert(
  fc.property(input, (value) => consumerInvariant(value)),
  {
    seed: 162,
    numRuns: 100,
  },
);
```

The initial generation profile supports text, finite numbers, safe integers,
booleans, finite Dates, lists, records, optional values, and null. Text uses
fast-check's `binary` Unicode code-point units (excluding lone surrogates), with
up to 24 units by default. Lists contain up to 4 elements. Override these bounds
with `limits: { maxStringLength, maxListLength }`; both must be nonnegative safe
integers. Nonempty text requires a positive text bound. This bounded domain does
not claim to generate every value accepted by the parser.

Number bounds are inclusive. Integer bounds are rounded inward and must be safe
integers; an empty integer interval fails at construction. Unbounded integer
representations generate within JavaScript's safe-integer range. Unbounded
non-integer numbers use the full finite double range, from -Number.MAX_VALUE to
Number.MAX_VALUE. Optional record fields exercise absent keys and explicit
undefined; nullable values also produce null. Unknown presence is kept required
rather than guessed. Lists are dense. Prototype-named string fields remain
ordinary own properties.

An `ArbitraryProvider` supplies `{ name, arbitrary(representation) }`, returning
an arbitrary for a claimed representation or undefined otherwise. Providers can
choose realistic subsets for known fields or supply domains for opaque, refined,
or recursive representations. Multiple claims fail with a path. Unsupported
structures without a provider fail during construction, identifying the
representation and its field/list path.

Every generated result passes through the real parser, including results from
providers. There is no rejection filtering: a provider or handwritten structure
that produces invalid data fails visibly. Parsers really run and may normalize
values; consumers own effects and provider quality. fast-check keeps its normal
shrinking context through the mapping. Preserve the seed and reported
counterexample/path when recording a failed property; finite runs are evidence
for the supplied domain and predicate, not universal proofs.

[Sensor Bench](../../examples/sensor-bench/) derives telemetry fixtures,
supplies explicit device/timestamp generators, and injects a reproducible mock
data source into a real asynchronous inspection operation.

API references:
[arbitraries](https://fast-check.dev/docs/core-blocks/arbitraries/),
[records](https://fast-check.dev/docs/core-blocks/arbitraries/composites/object/),
[numbers](https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/),
and
[strings](https://fast-check.dev/docs/core-blocks/arbitraries/primitives/string/).
