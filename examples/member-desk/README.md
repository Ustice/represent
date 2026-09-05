# Member desk

A small member-directory application consuming `@represent/core` through a real
workspace dependency. Start from the repository root with `pnpm dev`.

Edit a member and save to update the public profile and API export. The API
panel accepts JSON changes and downloads the serialized member. Connections
displays the graph derived from the application's conversions. Changes persist
in this browser; Reset sample restores the synthetic directory.

The [model](src/model.ts) owns Zod validation and three representations: a
member with a `Date`, an API record with an ISO string, and a public profile
omitting email and membership status. Represent owns execution, composition,
diagnostics, and graph metadata. The
[app tests](../../tests/app/member-desk.test.ts) exercise these conversions
through the imported package.

There is no backend, authentication, or server-side privacy boundary. The public
profile is a local preview; private data remains in the same browser
application.
