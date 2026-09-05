# Zod bridge

Part of the experimental `0.1.0-rc.0` candidate. See
[installation and tested scope](https://github.com/Ustice/represent/blob/main/docs/release-candidate.md).

Use an existing Zod parser as a Represent representation. Zod retains ownership
of validation and normalization; the core does not depend on Zod.

```ts
import { z } from "zod";
import { record, optional } from "@represent/core";
import { fromZod, zodJsonSchema } from "@represent/zod";
import { toJsonSchema } from "@represent/json-schema";

const request = record("Invitation", {
  email: fromZod("Email", z.email()),
  role: fromZod("Role", z.enum(["Member", "Organizer"])),
  sentAt: optional(fromZod("Timestamp", z.iso.datetime({ offset: true }))),
});
const contract = toJsonSchema(request, { providers: [zodJsonSchema] });
```

`fromZod` supports synchronous Zod parsing. Its representation is opaque in the
neutral graph; the bridge retains the schema privately for its export provider.
The same representation instance must be passed to the provider.

The initial JSON Schema export profile is deliberately narrow and pinned to Zod
4.4.3: plain strings, nonempty string enums, and built-in email and ISO datetime
schemas with their default patterns. Compose records and optional fields using
Represent. Additional checks, coercion, normalization, custom patterns,
refinements, and other Zod types report an export error with the field path.
They remain usable through `fromZod` for parsing.

This restriction prevents misleading artifacts: Zod's native JSON Schema export
omits trimming and custom refinements, while string length uses different
Unicode units from JSON Schema. The bridge ignores metadata overrides and omits
`format`, retaining Zod's actual pattern: its ISO timestamp language allows
minute precision, which differs from RFC 3339 date-time validation.

A wire contract describes JSON acceptance. A codec can still normalize values
and reject them under domain rules. Fieldwork's Event API example shows both:
nonempty wire titles decode through a trimming, nonblank domain parser, and
valid timestamp strings decode into Dates before checking event chronology. The
Contract lab displays contract rejection, domain rejection, and decoded values
separately. No persistence happens in this experiment.
