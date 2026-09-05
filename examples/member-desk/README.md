# Fieldwork

Fieldwork is a small community workspace consuming `@represent/core` through a
real workspace dependency. Its members and events exercise the library together.
Start from the repository root with `pnpm dev`.

Edit a member and save to update the public profile and API export. The API
panel accepts JSON changes and downloads the serialized member. Roster CSV
previews and downloads all saved members, including private email and status.
Connections displays the graph derived from the application's conversions.
Changes persist in this browser; Reset sample restores the synthetic directory.

The [model](src/model.ts) owns Zod validation and four representations: a member
with a `Date`, an API record with an ISO string, a public profile omitting email
and membership status, and a roster row with readable column names and a UTC
calendar date. The API codec declares encoding and decoding together; each
direction remains a conversion that can be composed or graphed. Represent owns
execution, composition, diagnostics, and graph metadata. The
[app tests](../../tests/app/member-desk.test.ts) exercise these conversions
through the imported package.

Events has its own editor, saved schedule preview, JSON import/download, and
Connections view. End must follow start; an optional RSVP deadline must be on or
before start. Blank deadlines are omitted from JSON, and imports reject `null`.
Times accept ISO offsets and display in UTC. Event edits and member edits
persist separately, and navigation preserves unsaved drafts. Reset events only
restores the synthetic events; Reset sample only restores members.

The [event model](src/events/model.ts) and member model each declare fields once
using `recordCodec`. Both use the [shared date codec](src/fields.ts); event
timing rules stay in the event model. Represent assembles the domain and API
parsers, infers their types, and converts the fields. Zod remains a consumer
dependency. The graph currently exposes whole-record conversions, not the shared
field dependencies inside them.

The [CSV export](src/roster.ts) belongs to this consumer. It quotes every field,
escapes embedded quotes, and uses CRLF record separators. Formula-like text
(including leading whitespace and full-width markers) gets an apostrophe prefix
following
[OWASP's CSV guidance](https://owasp.org/www-community/attacks/CSV_Injection).
That changes exported text and is not a guarantee across spreadsheet programs or
subsequent saves. The preview table shows the original row values; View exported
text shows the file contents. Join times are deliberately omitted, so CSV has no
reverse conversion. JSON remains the full record exchange format.

There is no backend, authentication, or server-side privacy boundary. The public
profile is a local preview; private data remains in the same browser
application.
