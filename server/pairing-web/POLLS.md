# Household polls

The companion, backend, and TV client implement reusable polls and multiple
independently styled poll widgets. Deploy Functions, Hosting, and the retention
index, then update the TV app, to make these source changes available to users.

## Owner workflow

1. Sign into `/polls` with the Google account linked to the TV.
2. Choose New poll, enter a question and choices, enable Other, or choose
   written-only answers. Save the poll for reuse. The next step opens immediately.
   Editing a saved question affects
   future rounds; existing rounds retain their question/options snapshot.
3. Choose the TV and when voting closes, then Start voting. The saved duration
   is selected by default; At a specific date and time reveals the closing-date
   input. A blank saved duration means
   no deadline. The TV's timezone is detected automatically from authenticated
   dashboard requests, including existing TV clients and cached responses. There
   is no manual timezone field. Before the first TV report, the closing-date field
   explicitly uses the companion device's local timezone. Duration/open-ended
   rounds can start without a timezone report.
4. Choose Add to dashboard on the success panel or any voting round. The dashboard
   opens with that round selected in the visible Add a poll panel. Choose Add poll;
   the existing card layout upgrades automatically without a separate enable step.
   Hide/move cards as needed. Rows support eight visible widgets; free layout
   supports twelve minimum-size widgets and all 50 existing footprints.
5. Edit each widget's color, opacity, borders, accent, and presentation. The draft
   status, undo/redo, and Save to TV controls sit above the workspace. Save to
   TV publishes the draft. Placement uses the existing 45-second appearance
   refresh; open-poll counts refresh every three seconds independently of other
   dashboard services.

Instances can display different rounds or the same round. Geometry/style remains
independent; repeated instances do not duplicate stored ballots. All paired TVs
retain the existing shared-account layout. Removing a widget does not delete
its template or history. Start another round to reuse a poll with fresh results,
link, and participant eligibility.

Owners can privately review ballots, approve/hide write-ins, export CSV, close
now, extend an open deadline, rotate a voting link, archive, and delete completed
rounds. CSV export checks revisions across pages and escapes spreadsheet formulas.
Secondary round actions live under Manage this voting round. Invitation polls
show code creation beside their results. Live owner views refresh every 15 seconds
while visible and idle; manual Refresh polls remains available.

## Participant access and uniqueness

Each QR opens `/vote/<192-bit random token>` and a standalone phone page with no
private-site navigation or sign-in requirement. Participants enter a name and
one vote. Success follows server acknowledgement; retries retain their request
ID. Reloading recognizes an existing browser ballot. Invalid/revoked links show
an unavailable page rather than redirecting to pairing.

The same-origin `/api/pollParticipant/**` Hosting rewrite forwards a signed
Secure/HttpOnly/SameSite=Lax `__session` cookie to Functions. Origin and CSRF checks
protect mutations. QR/cookie credentials never authorize owner endpoints or TV
sessions. Names never appear in TV/guest payloads; Firestore client access remains
denied. Manually entering another route cannot grant access to the scanned TV's
private data. Public login/static pages remain independently reachable.

Default protection records one ballot per browser identity per round, including
concurrent submissions. A new name, tab, retry, or rotated link does not reset
the voter record. Another browser/device, private mode, or cleared cookies can
bypass browser-level protection. Names/IP addresses are not identity proofs.

Invitation mode additionally requires a one-use owner-issued code, atomically
consumed with the ballot. It cannot be reused across devices. Codes are displayed
once and stored only as hashes; give each participant one. This initial UI still
records one ballot per browser in invitation mode; several people sharing one
browser is an extension, rather than a shipped invitation workflow.

Result policies: live for everyone; TV live/phones after voting; or hidden until
close. The API omits hidden counts and answers. Write-ins count immediately but
remain private until approved by default. Hiding their text preserves their
consumed ballots and total. Trimmed Unicode-normalized case-insensitive exact
matches share an answer count; near matches are not silently merged.

## Time, availability, and cleanup

Translate the chosen closing wall time in the automatically reported reference
TV's IANA timezone (or the labelled companion-device fallback) and store absolute
UTC time. Durations are measured from server creation time and require no timezone.
Older companion requests without any timezone can still start duration/open-ended
rounds; a local closing date requires an automatic TV or companion report.
The submitted clock matches the label beside the closing-date input, so a TV
report arriving while the owner edits cannot silently reinterpret the entered time.
Reject skipped/ambiguous DST times. Later TV timezone
changes do not reinterpret an existing deadline. The server enforces eligibility
even while TVs sleep; feed responses calibrate the TV display clock. A deadline
cannot be extended after it closes to quietly reopen an old round.

Counts and written answers are read in a consistent Firestore snapshot. One TV
provider batches requests, pauses in background/ambient, aborts on lifecycle
changes, and backs off on errors. Failed refreshes retain counts with a stale
label. Healthy-network freshness targets roughly 2–5 seconds; cold starts and
network conditions can exceed this. Production latency/burst capacity has not
been established by local tests.

Revoking/unpairing the reference TV disables participant links. Other synced TVs
can retain closed results without a voting QR. Rotation preserves ballot identity.
Account deletion includes poll subcollections and the external token lookup;
the existing deletion tombstone prevents late transaction recreation.

Archiving revokes links immediately. A daily cleanup removes archived private
ballots, written answers, and invitations after 90 days, retaining anonymous
preset counts. `server/firestore.indexes.json` supplies the collection-group index
for `pollRounds.archivedAtMs`. Explicit completed-round deletion removes its
records immediately; saved widgets referencing it display an unavailable state.

Bounds: 100 templates, 100 retained rounds, 1,000 voters per round, 200 distinct
write-ins, 12 choices, and 24 configured widget instances. Collections keep ballots
and text outside aggregate documents. Browser/network limits protect vote attempts.
These limits are guardrails, not tested simultaneous-audience capacity claims.

## Components, sizing, and compatibility

Reuse measured DashboardCard/TVCard, shared headers, the TV clock and detail modal.
The pure poll planner selects summary, standard, wide, tall, or join/results from
normalized inner dimensions. Preserve question/state before decoration. Cap card
previews at four results; details show all permitted results. Wide short cards
put question/results side by side. Small cards open a large detail QR; spacious
cards reserve an opaque white QR with caption and a quiet zone.

An additive `appearance.widgetLayout` separates widget instance IDs from kinds.
Built-ins keep their stable IDs; polls receive `poll_<random ID>` and a round
reference. The server derives built-in-only legacy cards/grid/styles, preserves
new fields when old TVs omit them, and rejects incompatible legacy arrangements.
Drafts, saved designs, and history retain instances. Loading a legacy design
preserves current instances. Native color/background controls stay available;
poll arrangements are edited in the companion and cannot be erased by TV presets.

Scoped React roots implement management, voting, and widget editing without
rewriting the TypeScript companion shell. Shared pure domain types, validation,
result policy, and geometry remain in the Functions deployment tree; clients
never import server crypto or database modules.

## Validation and release

Checks include TypeScript, Functions lint/tests, owner/guest browser flows, all
100 poll size/profile renders, existing companion/card browser regressions,
real Firestore emulator concurrency/access/invitation transactions, and Android
Hermes export. Emulator tests skip in the ordinary suite; run them explicitly
with `FIRESTORE_EMULATOR_HOST` and a demo project too.

Use `npm run typecheck`, `npm test`, Functions lint, and the companion build.
The TV fixture in `HomeScreen/test/vite.config.mjs` renders the production QR
package with the SVG web implementation. Run `test/pollMatrix.test.cjs` alongside
the card matrix. Companion `test:browser` includes `test/polls.test.cjs`. Existing
NODE_PATH/PLAYWRIGHT_CHROMIUM_EXECUTABLE overrides support bundled tooling.

Deploy Functions/Hosting/indexes together using the existing TOKEN_ENCRYPTION_KEY
and canonical PAIRING_URL configuration, then distribute an updated TV binary.
All three HTTP poll triggers explicitly bind TOKEN_ENCRYPTION_KEY; otherwise a
deployed function cannot create/decrypt links or sign browser cookies even when
emulator tests supply a local environment value. The endpoint-manifest regression
test checks these bindings. Starting validates link/encryption configuration before
any writes. The companion retains a start request ID across retries, and server
transactions return the original round instead of creating duplicate rounds.
Staging/physical checks still required: actual Hosting cookie forwarding, Google
sign-in return to `/polls`, native D-pad/return focus, ten-foot readability, and QR
scan distance. No production deployment or physical-TV verification was performed.

Optional proposal extensions outside the initial release: shared-browser invitation
voting, template style defaults, per-option bar-shape controls, automatic abuse
challenges, and individual ballot invalidation. See the retained
[original design proposal](../../HomeScreen/POLLS_LAYOUT_DESIGN.md).
