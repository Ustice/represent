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
dependency. Connections traces the shared date codec across members, events, and
RSVPs, following the optional deadline wrapper. It also displays operation
inputs, outputs, declared reads, and the member/event reference fields. Those
reference declarations perform the same lookups used by signup and export;
missing-member policy and signup deadlines stay in Fieldwork.

The [RSVP model](src/rsvps/model.ts) connects a member to an event, with one
signup per pair. All directory members can RSVP. Signups close at the explicit
deadline, or at event start when no deadline is set; the exact cutoff instant is
closed. Cancellation remains available after closing. Attendee names resolve
from saved member records, so editing a name updates the list. Operations use
the saved event, not an unsaved form draft.

Attendees includes a contact preview and a downloadable event roster. The
[export operation](src/rsvps/export.ts) joins saved event details, RSVPs, and
current member records. Renaming a member, changing an email, or rescheduling an
event updates the next export without rewriting RSVPs. Unsaved drafts do not
appear. Each CSV row contains event/member IDs, event title, start/end times,
name, private email, role, and signup time. Times use full UTC ISO timestamps.
An event with no attendees exports column headings only. Missing members,
ambiguous references, and duplicate signups block export rather than silently
losing or duplicating rows; a missing-member RSVP can still be cancelled.

Import RSVPs accepts one member email per line for the selected saved event.
Matching ignores case and surrounding whitespace; blank lines are ignored while
preview results retain original line numbers. Invalid/unknown/ambiguous emails,
existing signups, repeated members in the list, and closed signups are rejected
individually. Ready rows can still be imported. Editing the text invalidates its
preview; import drafts survive navigation within the page, but not reloads.

The [import model](src/rsvps/import.ts) wraps the existing signup operation with
email lookup and uses Represent's `runBatch`. Accepted rows extend an in-memory
context so subsequent rows see them; preview writes nothing. Import reruns the
list against current members, saved RSVPs, the page's saved schedule, and a
fresh clock. If the accepted row/member selection changed, it shows a refreshed
preview and writes nothing until reviewed again. It saves ready rows in one
local-storage write, leaves rejected rows out, and does not automatically create
members. Storage failures do not report success. A repeat import detects the
already-saved signups.

RSVPs persist separately in local storage. Resetting member/event samples keeps
their existing IDs and does not cancel RSVPs; Cancel removes an individual
signup. The persistence seam rereads and validates saved RSVPs before each
change and writes only after the operation succeeds. It does not provide
cross-tab transactions or a server-side concurrency guarantee.

The [CSV writer](src/csv.ts), shared by both rosters, belongs to this consumer.
It quotes every field, escapes embedded quotes, and uses CRLF record separators.
Formula-like text (including leading whitespace and full-width markers) gets an
apostrophe prefix following
[OWASP's CSV guidance](https://owasp.org/www-community/attacks/CSV_Injection).
That changes exported text and is not a guarantee across spreadsheet programs or
subsequent saves. The preview table shows the original row values; View exported
text shows the file contents. The directory roster deliberately omits join
times; the attendee roster is a projection of three records. Neither CSV has a
reverse conversion. JSON remains the full record exchange format.

There is no backend, authentication, or server-side privacy boundary. The public
profile is a local preview; private data remains in the same browser
application.
