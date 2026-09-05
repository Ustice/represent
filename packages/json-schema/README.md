# JSON Schema adapter

Part of the experimental `0.1.0-rc.0` candidate. See
[installation and tested scope](https://github.com/Ustice/represent/blob/main/docs/release-candidate.md).

`toJsonSchema(representation)` derives a JSON Schema 2020-12 document from the
core's declared structure. The adapter owns all JSON Schema semantics; the core
has no JSON Schema or Ajv dependency.

```ts
import { record, text, optional } from "@represent/core";
import { toJsonSchema } from "@represent/json-schema";
import { Ajv2020 } from "ajv/dist/2020.js";

const request = record("Request", {
  id: text("ID", { nonempty: true }),
  note: optional(text("Note")),
});
const schema = toJsonSchema(request);
const validate = new Ajv2020({ strict: true, ownProperties: true }).compile(
  schema,
);
validate({ id: "example" }); // true
validate({ id: "" }); // false
```

Supported: text, nonempty text, finite numbers with inclusive bounds and integer
constraints, booleans, lists, nullable values, strict records, optional record
fields, shared children, and recursive record/list declarations. Optional means
a JSON property may be absent; it does not make null valid. Fields and
definitions are emitted in stable name order. Schema references escape JSON
Pointer and URI-fragment names.

`SchemaExportError.issues` identifies unsupported structure by field path,
representation name, and reason. Dates, opaque parsers without a provider,
custom record refinements, root-level optional values, and cycles consisting
only of optional wrappers cannot be exported. Nullable-only and mixed
nullable/optional wrapper cycles are also refused. The property name `__proto__`
also produces an `unsupported-field` issue: Ajv ignores it in `properties`, so
this experimental adapter refuses a contract its demonstrated consumer cannot
validate faithfully. JSON Schema itself permits that name. No permissive
fallback schema is returned. Shared unsupported children report their first
encountered path. Export never executes a parser.

The contract covers **JSON values**. It does not reproduce JavaScript undefined,
prototypes, getters, parser normalization, defaults, or effects. Structural
metadata is trusted and must describe its parser honestly. A valid target record
can still fail a conversion or operation's domain rules. No general adapter
certification or conversion-success guarantee is implied.

Fieldwork's Connections → Contract lab validates pasted JSON with Ajv using the
actual signup operation's generated input contract. It does not execute signups.
The adapter tests compare Ajv and the real request parser over meaningful JSON
cases. See
[JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-core)
and [Ajv's draft support](https://ajv.js.org/json-schema.html).

## Existing schema libraries

Opaque leaves can opt into a target-specific provider:

```ts
import { zodJsonSchema } from "@represent/zod";
const schema = toJsonSchema(request, { providers: [zodJsonSchema] });
```

A `JsonSchemaProvider` has a name and `contract(representation)` method. It
returns `undefined` for representations it does not own, or
`{ schema, presence }` for an owned leaf. Presence is `required` or `optional`
and describes whether its parser accepts a missing property. Providers are
trusted to match their parser's JSON acceptance. They cannot override native
core structure or refinements. Failures and competing claims produce
path-specific export issues.

This initial provider seam accepts leaf validation keywords only. References,
identifiers, nested schemas, and unknown keywords are rejected so embedding
cannot silently change their scope. See the Zod bridge's narrower supported
profile. Fieldwork's Contract lab also exports the Event API and compares JSON
acceptance with its actual decoder's normalization and domain validation.
