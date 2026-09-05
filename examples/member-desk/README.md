# Member desk

A small member-directory application consuming `@represent/core` through a real
workspace dependency. Start from the repository root with `pnpm dev`.

Edit a member and save to update the public profile and API export. The API
panel accepts JSON changes and downloads the serialized member. Roster CSV
previews and downloads all saved members, including private email and status.
Connections
displays the graph derived from the application's conversions. Changes persist
in this browser; Reset sample restores the synthetic directory.

The [model](src/model.ts) owns Zod validation and four representations: a
member with a `Date`, an API record with an ISO string, and a public profile
omitting email and membership status, plus a roster row with readable column
names and a UTC calendar date. The API codec declares encoding and decoding
together; each direction remains a conversion that can be composed or graphed.
Represent owns execution, composition,
diagnostics, and graph metadata. The
[app tests](../../tests/app/member-desk.test.ts) exercise these conversions
through the imported package.

The [CSV export](src/roster.ts) belongs to this consumer. It quotes every field,
escapes embedded quotes, and uses CRLF record separators. Formula-like text
(including leading whitespace and full-width markers) gets an apostrophe
prefix following [OWASP's CSV guidance](https://owasp.org/www-community/attacks/CSV_Injection).
That changes exported text and is not a guarantee across spreadsheet programs
or subsequent saves. The preview table shows the original row values; View
exported text shows the file contents. Join times are deliberately omitted, so
CSV has no reverse conversion. JSON remains the full record exchange format.

There is no backend, authentication, or server-side privacy boundary. The public
profile is a local preview; private data remains in the same browser
application.
