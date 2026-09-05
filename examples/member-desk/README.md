# Fieldwork

Fieldwork is a small community workspace consuming `@represent/core` through a
real workspace dependency. Its members and events exercise the library together.
Start from the repository root with `pnpm dev`.

Edit a member and save to update the public profile and API export. The API
panel accepts JSON changes and downloads the serialized member. Roster CSV
previews and downloads all saved members, including private email and status.
Connections explores dependencies derived from the application's definitions.
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

Connections hosts the reusable [Represent explorer](../../packages/explorer/).
Its Relationships view shows an immediate neighborhood with labeled arrows;
Dependencies follows either dependents or requirements with expandable paths.
Select a node or path step to navigate, use Back to retrace selections, and
switch views without losing the selection. Member, shared-date, attendee-export,
and email-signup shortcuts provide starting points. The same instance follows
navigation between Members and Events. JSON inspection remains available.

The [workspace graph](src/workspace-graph.ts) registers the actual composed
public-profile conversion. Date encoding reaches that conversion through the
member encoder. Attendee export declares calls to the event and date encoders;
email signup declares its call to Register RSVP and its own Member read. Thus
email signup reaches Event through the called operation, without copying its
read/reference lists. The graph does not inspect arbitrary function bodies or
infer persistence and runtime effects from these declarations.

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

Member and event editors store their data in the browser. There is no
authentication or server-side privacy boundary for those records. The public
profile is a local preview; private data remains in the same browser
application. The optional read-only event endpoint uses a separate synthetic
fixture.

## A real event endpoint

Run `pnpm server` from the repository root alongside `pnpm dev`. Connections →
Server lab calls `GET /api/events/:id` through Vite's proxy to Fastify on
port 5175. Try `evt_01`, `evt_02`, or a missing identifier. Restart an
already-running Vite process after first adding its proxy configuration.

The async Look up event operation reads `server/events.json`, validates Events,
and returns the Event API representation. The browser decodes that response back
into a domain Event. The server reads the file on each request, so edits to this
synthetic fixture appear immediately. Missing events return 404; a broken
fixture returns a generic server error. This read-only fixture is separate from
local-storage members, events, and RSVPs. The main example continues to work
without the API; only Server lab requires it. Production `vite build` emits the
browser bundle; this API experiment currently uses the development proxy.

## Editable change proposals

Connections → Change preview builds an alternate RSVP request with a text field
whose name, presence, and empty-string rule you can edit. Supply labeled JSON
samples and a migration default, then preview. Editing the draft clears stale
evidence; malformed JSON or an invalid field name shows an error. Use examples
for this field replaces the sample text explicitly.

The current and proposed parsers run independently on copies through
`compareAcceptance`. Each direction reports counterexamples, no counterexamples
in the supplied samples, or unexercised when no sample passes its source parser.
The generated current/proposed JSON Schemas run in Ajv alongside those parser
results. Dependencies are inspected in both graph snapshots.

Migration preview executes an explicit conversion from the current request to
the proposed request, adding the chosen default and validating the result. An
empty default fails a nonempty field at the output stage. A request already
containing the new field fails the old source contract; the migration does not
overwrite it. Samples demonstrate acceptance and migration behavior, not a
universal compatibility guarantee. The draft never changes live operation
implementations, adopts a schema, or writes saved records.
