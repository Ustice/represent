# Fastify adapter

Part of the experimental `0.1.0-rc.0` candidate. See
[installation and tested scope](https://github.com/Ustice/represent/blob/main/docs/release-candidate.md).

`operationHandler` turns a Represent operation into an ordinary Fastify handler.
Fastify owns routing, hooks, request parsing, serialization, and error policy.

```ts
import Fastify from "fastify";
import { operationHandler } from "@represent/fastify";

const server = Fastify();
server.get(
  "/api/events/:id",
  operationHandler(lookupEvent, {
    input: (request) => request.params,
    context: () => eventStore,
  }),
);
```

Both synchronous `operation` and `asyncOperation` work. The input selector maps
the request to external `unknown`; the context factory can return a value or a
promise. Context and awaited output types infer from the operation. Use ordinary
Fastify hooks or a wrapper around the handler to set success status codes and
headers. Input selection and context creation happen before operation
validation; `perform` remains gated by validated input. The handler awaits the
result, including output validation, before handing it to Fastify.

An outer operation input failure becomes `InvalidOperationInput`, an HTTP 400
error with code `REPRESENT_INPUT` and the original `OperationError` as its
cause. Execution, output, context, and selector failures remain available to
Fastify's error handler. Fieldwork maps its own missing-event error to 404 and
hides internal failures behind a generic 500 response. It does not expose server
file contents.

The adapter does not install JSON Schema validation or change Fastify defaults.
Represent validates the values it receives after Fastify's parsing and hooks. If
you add schemas or hooks, their coercion, stripping, or other transformations
remain your server's behavior. Choose a wire output representation deliberately:
Fastify still owns JSON serialization. This initial profile is tested against
Fastify 5.12.3; it does not certify arbitrary plugins or server configuration.

Run `pnpm server` for Fieldwork's read-only file-backed API and `pnpm dev` for
the browser. Connections → Server lab sends a real request through Vite's API
proxy, then decodes the response into a domain Event. The server fixture is
separate from browser local storage.

See [Fastify routes](https://fastify.dev/docs/latest/Reference/Routes/) and
[validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).
