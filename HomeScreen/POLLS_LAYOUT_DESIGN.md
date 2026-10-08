# Poll widgets: product, architecture, and adaptive layout plan

Status: core implementation added October 7, 2026. The original proposal below
is retained as a design reference; shipped scope is recorded in
[the implementation guide](../server/pairing-web/POLLS.md).
All 100 footprint/profile combinations have passed browser bounds checks.
The tables remain family mappings; QR inclusion also depends on content fit. This proposal
uses the existing [widget design guide](WIDGET_DESIGN_GUIDE.md),
[layout contract](../server/pairing-web/DASHBOARD_LAYOUT.md), and measured card system.

## Intended experience

An owner saves a reusable poll, starts a voting round, and adds it to the dashboard.
Several rounds can appear together as independently positioned and styled cards.
Participants scan that round's QR, enter their name, choose one answer or enter
their own, and receive a clear confirmation. They see a dedicated poll page.
The TV displays fresh aggregate results and a clear closing time.

Recommended initial defaults:

- One choice per ballot. Poll modes: preset choices, preset choices with an Other
  text field, or entirely written answers.
- Name required; names and individual ballots visible only to the owner.
- One accepted ballot per browser per round. Explain this protection honestly in
  owner settings; offer optional one-use invitation codes for stricter participation.
- Results visible live on TV; on phones, show results after voting by default.
  Also support results hidden until close, with identical enforcement in the API.
- Optional end time, interpreted in the selected reference TV's timezone.
- Closed rounds retain their final results until the owner removes the widget.
- Restarting creates a new round, a fresh link, and an empty ballot set.
- Use the account's current shared-dashboard behavior: paired TVs show the same
  round and counts. Select a reference TV for timezone and link lifecycle; do not
  introduce separate per-TV dashboard designs as a side effect of this feature.

## Findings in the current repository

| Existing foundation | Implication for polls |
| --- | --- |
| `DashboardCard` measures the inner box and wraps `AdaptiveDashboardCard` in `TVCard` | Reuse measurement, surface, focus, and whole-card selection |
| `CardHeader`, `CardSection`, `CardTextBlock`, `CardDetailsHint`, and `CardProgress` are shared React Native components | Compose poll UI from these; add only poll-specific chart/QR primitives |
| Six fixed card IDs also identify grid items, styles, and details | Introduce instance IDs; adding a single `poll` ID cannot support multiple polls |
| `validGrid` caps layouts at six items; `gridFromCards` assumes two rows | Update instance validation and bounded row packing before adding widgets |
| All account TVs share appearance; revisions, drafts, and designs already exist | Preserve that model and its conflict detection |
| Companion uses Vite, TypeScript templates, and DOM controllers; it has no React dependency | Add narrowly scoped React roots for poll management/voting; retain the existing site shell |
| Summary refresh is five minutes; appearance refresh is 45 seconds | Give polls their own fresh, batched API and lifecycle-aware refresh |
| Firestore rules deny all client reads/writes | Keep all poll access in Cloud Functions; no broadly readable poll collection |
| `authenticatedIdentity` distinguishes Google owners from revocable TV sessions | Reuse for owner/TV endpoints; keep guest credentials entirely separate |
| `useTVClock` already shares a device timer and refreshes on resume | Reuse for visible status/countdown; server time enforces voting eligibility |
| QR rendering dependency already exists on TV | Reuse `react-native-qrcode-svg`; never share pairing credentials in a vote link |

## Separate templates, rounds, and widget instances

These objects have different lifecycles and must not be conflated:

| Object | Responsibility | Reuse/edit behavior |
| --- | --- | --- |
| Poll template | Question, optional description, answer mode/options, defaults, default presentation | Saved, duplicated, edited, and reused without changing existing rounds |
| Poll round | Immutable question/options snapshot, deadline, reference TV, access policy, votes/results | One voting event; archived independently of its template |
| Widget instance | Stable ID, kind, round reference, placement, visibility, display settings, style | Each displayed poll has independent geometry and appearance |

Suggested private storage under the owner, so recursive account deletion includes it:

```text
users/{uid}/pollTemplates/{templateId}
users/{uid}/pollRounds/{roundId}
users/{uid}/pollRounds/{roundId}/ballots/{voterKey}
users/{uid}/pollRounds/{roundId}/invitations/{invitationHash}
users/{uid}/pollRounds/{roundId}/answers/{answerId}
users/{uid}/appearance/settings
```

Poll templates carry `version`, `revision`, `question`, `description`,
`answerMode`, options with stable IDs, default duration, result visibility,
participation policy, and optional default poll appearance. Never store votes,
links, names, or absolute closing dates in reusable templates.

Rounds carry `templateId`, `templateRevision`, their question/options snapshot,
`referenceDeviceId`, `timeZone`, nullable `endsAtMs`, `state`, `createdAtMs`,
`revision`, `accessGeneration`, totals, and result revision. The server assigns
IDs and timestamps. Ballots carry the display name, answer reference, server
receipt time, and request ID. Raw browser secrets and invitation codes are never
stored with ballots. Written answers are plain text, separately bounded records.

Keep round aggregates bounded: option counts and a small top-answer preview can
be returned to TVs; paginate the full owner answer list. Do not grow a single
round document with every name or submitted answer.

## Multiple widgets and safe compatibility

Separate `WidgetKind` from `WidgetInstanceId`. A widget descriptor is a
discriminated union: existing kinds retain their well-known IDs; polls get IDs
such as `poll_<uuid>` plus a `roundId`. Registry metadata owns labels, icons,
content renderer, detail renderer, and configuration capabilities. React keys,
selection state, measurement keys, and styles use instance IDs. Component
dispatch uses kind. Two identical questions must still be distinct instances.

Introduce an additive, versioned `appearance.widgetLayout` containing the
instance list, row preferences or versioned grid, and per-instance style map.
Retain the existing `cards`, `grid`, and `cardStyles` as the built-in-only legacy
projection. New clients prefer the supported widget layout; older clients show
their existing cards. Do not put poll IDs into the legacy six-card contract.

On every publish, the server validates the authoritative widget layout and
computes its legacy projection. If omitted by an old TV save, preserve the stored
widget layout. Old-client layout changes must not erase poll instances; reject
incompatible arrangement changes with an update/companion message, while still
allowing unrelated palette/background/ambient changes. Existing drafts, named
designs, and revision history must retain the new fields. A legacy saved design
loaded into a new editor preserves current polls unless the owner explicitly
chooses to replace/remove them. TV reset/preset behavior must make removal explicit.

Start with bounded limits: 24 configured instances, up to 12 visible in free
layout (the 12×6 canvas holds at most twelve 3×2 footprints), and up to eight
visible in automatic rows. These are proposed limits, to validate on the target
TV; never let row generation create subminimum-width cards. Use at most four
minimum-width cards per row, calculate available row height, and reject rather
than silently squeeze an arrangement that cannot preserve the supported minimum.

The studio's Add widget flow offers existing widgets and saved polls. Adding a
poll finds free space using the shared geometry; a full canvas asks the owner to
make room. A preset preserves custom poll widgets and offers explicit arrangement
replacement. Saving a dashboard design stores round references, not copied
ballots. An archived/deleted round renders a clear placeholder with Replace poll
in the editor; loading an old design never restarts voting.

## Companion owner experience

Add owner route `/polls` and an Add poll entry in Dashboard Studio.

The primary page has three simple areas: Active rounds, Saved polls, and History.
Keep advanced controls in progressive disclosure rather than placing every
setting in the main form. On a phone, use a single-column editor:

1. Question and optional short description.
2. Answer mode and reorderable choices with stable IDs; an Other choice reveals
   a text field only when selected. Written-only mode has no empty choice list.
3. Participation protection, result visibility, and closing time.
4. Live card preview, style presets, and optional detailed appearance controls.
5. Save poll, followed by Start round and Add to dashboard.

Save poll never publishes a voting round. Start round creates a usable round
with a reviewable QR/link; Add to dashboard edits the dashboard draft, and the
existing Save to TV action publishes placement. A failed placement publish must
not lose the saved template or round. Show Not displayed until the round has a
published widget. Allow removing an unused round separately.

Owner actions: edit/duplicate template, start again, change display style,
close now, extend a still-open deadline, archive, review private ballots, and
export a round. Export is secondary; protect CSV cells beginning with spreadsheet
formula characters. Owner management reads and writes require `identity.owner`;
another account cannot manage this owner's TV or polls.

Freeze question, mode, options, and result visibility when the first ballot is
accepted. A substantive edit creates another round. Cosmetic widget changes do
not affect ballots. Closing and deadline changes use revision preconditions and
transactions; past-deadline rounds cannot be reopened by quietly extending time.
Reusing the template starts a new round. Saving a template while an old round is
open leaves that round's snapshot intact.

## Participant page and access boundaries

Use a standalone `/vote/<opaque-access-token>` route with a dedicated bootstrap
before the existing companion navigation/sign-in redirect code executes. Add an
explicit Hosting rewrite: unknown paths currently default to Pair TV and cannot
be allowed to turn a bad poll link into a pairing flow.

Public shell: poll title, optional description, closing label, name, choices or
answer field, one Vote button, and receipt/results when permitted. No dashboard,
settings, account, pairing, service-connect, or household-data navigation.
An invalid/revoked link shows a self-contained unavailable page. No redirect to
the general site. The owner may see Manage this poll only after a server check
matches their Google identity to this specific round's owner.

Use a cryptographically random link token (at least 128 bits of entropy), store
only its lookup hash and round binding, and scope it to this round and reference
TV. It grants poll participation, never owner/TV authentication. The token is a
shareable capability: someone who receives the URL can participate, subject to
the selected protection. A QR alone does not prove physical presence. Owner
controls may rotate/revoke the link; rotation changes access generation, never
the round's already-accepted voter keys. Archive, deletion, or reference-TV
revocation disables participation immediately.

Keep the token lookup in an explicitly private, bounded index; include its
records in poll/account cleanup. Do not log raw tokens, cookie values, names, or
answers. Use `Referrer-Policy: no-referrer`, no third-party analytics, and
`Cache-Control: private, no-store` on guest/private responses. Resolve TV labels
and settings server-side; never accept an owner UID or TV binding from a ballot.

The private API is the security boundary: manually entering `/dashboard` or
calling another endpoint with a poll cookie grants no access to the scanned TV's
data. Public login/static pages may still exist; a browser cannot be prohibited
from visiting a URL. A participant already signed into another HomeScreen account
still sees only this poll; that identity does not unlock the scanned owner's
management controls or data. Explicitly signing into one's own account elsewhere
continues to authorize one's own data only.

## One ballot per participant

A website can remember a browser; it cannot reliably identify an unregistered
human or permanently tag the physical phone. Default to a first-party random
browser credential, supplied by the server in a signed `Secure`, `HttpOnly`,
`SameSite=Lax`, host-only cookie. With Firebase Hosting, use its supported
`__session` cookie for rewritten Functions requests; namespace/sign the voter
payload so it cannot be interpreted as owner authentication. Add same-origin
`/api/pollParticipant/**` rewrites for this guest API, rather than relying on
cross-origin cookies to the existing Functions URL. Verify Hosting cookie forwarding
in staging before claiming protection works. Check Origin and a CSRF token on
mutations; signing a cookie alone does not authorize an arbitrary vote request.

Derive a per-round voter key with a server HMAC of the browser identity and round
ID. Changing the entered name, refreshing, opening two tabs, rotating the QR,
or retrying a request must not create another accepted ballot. Browser-level
protection means two people sharing one browser need invitation-code mode.
Different browsers, private mode, deleted cookies, or another phone can bypass
the default. Do not present fingerprinting, IP addresses, or names as reliable
identity; IP blocking would also penalize households sharing Wi-Fi.

Optional strict mode issues one-use invitation codes for the owner to distribute
per participant. The transaction consumes the invitation and inserts the ballot;
the same code cannot vote twice from another device. Codes verify one invitation,
not a biological person: the owner controls allocation and avoids giving someone
multiple codes. If verified accounts are needed later, use one ballot per account
with a separate guest identity path; do not loosen `authenticatedIdentity` to
treat guest sign-ins as owners.

Voting transaction:

1. Resolve the link hash and access generation; verify the owner exists and the
   reference device is still linked. Read these records and the existing
   `account_security` deletion tombstone inside the transaction, using
   `runUserTransaction`, so revocation/deletion cannot race an accepted ballot
   or recreate data after recursive cleanup.
2. Read the round and server time, derive effective open/closed state, validate
   request limits, answer mode, option membership, and submitted text.
3. Read the deterministic voter ballot; in strict mode also read the invitation.
4. If an identical request ID already succeeded, return the stored receipt. If a
   different ballot already exists, return Already voted without incrementing.
5. Atomically create the ballot, consume an invitation if required, update answer
   and aggregate counts, and advance results revision.

Transaction retries recheck the deadline with current server time. A ballot is
eligible when the server validates it in the successful transaction attempt;
phone click time and request arrival time do not reserve voting eligibility.
Keep counters consistent with accepted ballots, and render success only after
acknowledgement. A timeout displays Check vote status; retry uses the same request
ID. Never optimistically count an unconfirmed ballot or persist offline ballots
for later automatic submission.

Use proposed limits of 160 characters for questions, 500 for descriptions, 12
choices of 80 characters each, names of 60 characters, and written answers of 160
characters, plus a 16 KB request limit. Validate normalized Unicode/code-point
length and UTF-8 byte caps on the server. Render text as text, never HTML.
Use bounded, expiring request-rate records per token/browser and coarse network
abuse signals; network identity is not vote identity. Apply challenge escalation
only for suspicious traffic. Set realistic household/event volume caps and test
burst contention before advertising larger audiences.

## Written answers, results, and privacy

Choice mode aggregates by stable option ID. In mixed mode, a write-in is one
ballot, never both a preset vote and a write-in vote. Trim and Unicode-normalize
written answers, then group exact case-insensitive matches; preserve the first
display spelling. Do not silently merge near matches such as Movie A and Movie B.
Show Other responses as a grouped total plus a bounded answer preview in details.

Enable owner approval of written answers before public display by default.
The ballot still counts immediately in the total; pending answers appear as a
neutral Written responses awaiting review aggregate. Rejection hides the text
and keeps the ballot consumed; clearly label moderated totals. Provide optional
owner invalidation with an audit reason and atomic count adjustment. Invalidated
participants cannot submit another ballot in that round. Never render participant
names on the TV or in guest result responses by default.

TV result bars show option label, count, and percentage with counts authoritative.
Zero ballots means Waiting for the first vote, not a fabricated winner. At close,
mark Winner only for a unique highest count and Tie for shared leaders. Written-only
rounds may show grouped response counts; no arbitrary winner for distinct answers.
Keep original option order while voting to avoid chart/focus jumps; highlight
leaders without continuously reordering. At close, winner emphasis can change
without discarding original option labels. Rounding can make percentages sum to
99 or 101; handle that deliberately and never change stored counts to fix it.

Add Delete round and Delete poll controls with clear history impact. A proposed
default deletes names and individual text/ballots 90 days after archival, retaining
anonymous aggregate history until owner deletion. The owner must see this policy;
implement and verify scheduled cleanup rather than claiming an unimplemented TTL
removes nested collections. Close/revoke links before deleting identifying ballots
so a removed uniqueness record cannot reopen participation.

## Timely updates and closing time

Create a poll-specific authenticated TV endpoint returning every requested,
authorized round in one bounded response. It reads current poll storage and
never passes through the ten-minute external-service summary cache. One shared
`PollsProvider`/store owns requests, errors, and updates; cards do not each start a
timer. Poll data must load independently of Calendar/Tasks/Weather failures.

Initial transport: foreground polling every three seconds while open polls are
visible, immediate refresh on resume/open details, slower refresh for only closed
polls, and suspension during background/ambient when polls are not shown. Use one
in-flight request, abort/cleanup on account change, jitter/backoff on failures,
bounded batch sizes, and conditional result revisions. A revision identifies
content changes; effective time-based closure must still be recomputed when a
request or local deadline fires. Guest results refresh only while visible and
permitted by policy. Aim for a healthy-network vote-to-TV update within roughly
2–5 seconds; measure cold starts, TV network latency, and burst contention before
publishing a service promise. Reevaluate streaming only if polling cost/latency
warrants it; the current deny-all Firestore rules prohibit a direct listener.

Persist reference-TV IANA timezone and last-reported time metadata on its device
record using an authenticated TV request. Show the TV name, timezone, last seen,
and translated local closing time in the owner editor. If the timezone is missing,
require an explicit owner selection instead of guessing from the phone. Reject
ambiguous/nonexistent daylight-saving local times or ask for the intended offset.
Store an absolute UTC deadline and its interpretation timezone in the round.
Later TV timezone changes do not reinterpret an existing deadline.

Use the TV's shared clock for local labels and deadline redraw, with a server-time
offset captured from poll requests so a mis-set TV clock cannot materially drift
from the participant eligibility shown. Estimate offset using request midpoint
and round-trip uncertainty, recalibrate on resume, and display an uncertainty/stale
state if needed. The server clock is authoritative for acceptance. TV-local
Closed may appear before final totals arrive; show Final results syncing until
the server confirms them. Polls close even if the TV is off, disconnected, or
inside ambient mode; scheduled cleanup jobs are not needed for deadline enforcement.

Retain last known results on a network failure with Results may be out of date and
last-updated context. Do not imply that cached counts are live. Closing now and
owner edits trigger immediate owner-side refetch; TVs pick them up through the
same poll feed. Link rotation/reference-TV revocation rejects guest requests
immediately regardless of a TV's cached QR.

## Reusable React implementation

Pure shared modules stay in the Functions deployment tree, matching current
layout/appearance utilities; expose client-safe types and validators through
shared exports. Keep server crypto, database, and identity code out of UI imports.

```text
Poll domain: types, input validation, lifecycle, percentages, answer normalization
Poll services: owner API, participant API, TV feed, transactions, link/session auth
TV:
  PollsProvider / usePollRound(roundId)
  PollDashboardCard -> pollCardLayout -> shared measured card primitives
  PollResults -> PollResultRow
  PollStatus / PollDeadline / PollJoinQR
  PollDetailView in the existing TVDetailModal
Companion React roots:
  PollLibrary -> PollTemplateEditor -> reusable question/choice/time/style controls
  PollRoundManager -> private ballot review
  PollParticipantPage -> PollVoteForm -> PollVoteReceipt / PollResults
```

Share domain models, validation, result math, semantic tokens, and design rules
between native and browser clients. Use platform-appropriate renderers; no need
to force DOM elements into React Native or rewrite the existing companion studio.
If browser result presentation differs, reuse data selectors rather than duplicate
count logic. Controlled inputs have one source of truth; use a reducer for owner
drafts and explicit status states for vote submission. Persisted server snapshots,
editable drafts, local display settings, and vote receipts remain distinct.

Mount and unmount React roots through existing feature lifecycle hooks; cancel
requests and clear private state on sign-out, account/route changes, and revoked
sessions. Effects perform subscriptions/network work with cleanup, not result
derivation. Use stable instance/option IDs, immutable updates, and keyed memoized
result rows only where changing totals justify them. One results subscription
per round avoids duplicated work if multiple widgets reference the same round.
Use the shared clock only in time-aware descendants; count updates do not cause
every unrelated dashboard card to rerender.

## Ten-foot information hierarchy and layout families

Primary question: What are we deciding, how is voting going, and how do I join?

Essential: question, meaningful state, vote count. When results are allowed and
space permits, show named options with counts and proportional bars. Joining is
always available through card selection. Closing time, leader, bounded chart,
and embedded QR follow in that order subject to the chosen display variant.
Phone name/answer fields and owner controls never appear inside the TV card.

Reuse the 50 legal footprints without creating 50 JSX templates. A pure
`pollCardLayout` planner consumes normalized measured inner width/height,
question/answer text, state, QR module count, and display preferences. It returns
family, budgets, title limit, row cap, QR reservation, and details-hint visibility.
Measure actual text to refine estimates, following the existing domain planners.

Proposed families, evaluated in this priority order (dimensions are normalized dp):

| Code | Conditions | Composition and caps |
| --- | --- | --- |
| S | height < 120 | Summary: one/two-line question as budget allows, compact count/state; no inline QR/chart |
| W | width >= 650 and height < 260 | Wide: question/status beside up to three result rows; no automatic inline QR in short cards |
| Q | width >= 500 and height >= 260 | Join/results: question/status above chart beside a white QR panel; up to four options; details holds all answers |
| T | width < 500 and height >= 250 | Tall: question, closing/count row, up to four stacked result rows; optional QR only after independent fit/scan checks |
| C | remaining supported dimensions | Standard: question/status and up to two result rows if actual budgets permit; details for QR/full results |

Caps are maxima, not guaranteed row counts. Each layout preserves the question
and state before adding result rows. Hidden options are indicated by More in
details when space permits; do not aggregate hidden choices into a fake chart
option. Larger dimensions should preserve previously readable facts; measurement
may choose fewer rows for exceptionally long labels. Closed/hidden-results,
unavailable, write-in, and zero-vote states reuse families with different semantic
content rather than growing a parallel layout system.

Use at least 18 dp primary question type and 14 dp result labels in the initial
proposal, scaled by 1/1.4 according to the existing profile. Increase primary text
toward 24–32 dp in roomy cards without dropping useful rows. Essential type does
not shrink to fit; lower-priority content yields. Small questions can be truncated
visually with a full accessible label and complete text in details. Set closing
labels to absolute TV-local time; avoid second-by-second urgency except near close.

QR: plain dark modules on an opaque white surface with a four-module quiet zone.
Never tint QR modules by palette, apply card opacity to them, place photos beneath
them, or add a logo that reduces scanning reliability. Use a short canonical
HTTPS link to keep module density low. Initial inline reservation is 160–220
normalized dp including the quiet zone, subject to physical scan testing. Include
it only when question/results retain their minimum budgets. Detail QR can be
substantially larger. Closed/revoked rounds replace the voting call to action
with final status; a permitted results-only link can remain explicitly labeled.
An optional short join code must expire, be rate limited, and not expose pairing
codes; implement it only with a separate public join route and access lookup.

Whole-card selection opens PollDetailView with full question, all options,
larger QR, deadline, vote count, and readable live/final results. Opening one poll
never opens another round. Focus is stable during result updates; Back restores
focus to the same instance. Reduced motion removes bar transitions; otherwise use
short, restrained width animations without pulsing QR or repeatedly sorting rows.

### Complete reference footprint projections

Apply the guide's existing compact/full dimensions; these tables select a family
before actual content fitting. Each covers all 50 footprints. Q's QR is conditional
on successful independent fitting/scanning; T has no guaranteed embedded QR.

Compact (canvas 900×340, gap 8, padding 12, scale 1):

| Height / Width | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | S | S | S | S | S | S | S | S | S | S |
| 3 | C | C | C | C | C | C | C | W | W | W |
| 4 | C | C | C | C | C | C | C | W | W | W |
| 5 | T | T | T | T | T | C | C | W | W | W |
| 6 | T | T | T | T | T | Q | Q | Q | Q | Q |

Full (canvas 1800×740, gap 12, padding 20, scale 1.4):

| Height / Width | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | C | C | C | C | W | W | W | W | W | W |
| 3 | C | C | C | C | W | W | W | W | W | W |
| 4 | T | T | Q | Q | Q | Q | Q | Q | Q | Q |
| 5 | T | T | Q | Q | Q | Q | Q | Q | Q | Q |
| 6 | T | T | Q | Q | Q | Q | Q | Q | Q | Q |

For short row-mode cards, route through the same measured planner; never infer
family from standard/wide labels. The smallest compact 3×2 card is roughly
192×81 normalized dp, which cannot contain an adequate QR plus the essential
question/status. Its remote detail action satisfies joining without creating an
unscannable decoration. Verify any proposed inline QR on the actual target TV
from expected phone positions; rendered pixel bounds do not prove scan distance.

## Individual styling

Reuse existing surface color, opacity, border width/radius, theme inheritance,
focus ring, and foreground contrast calculation. Store styles by widget instance,
so Dinner poll and Movie poll can look different. Add bounded poll tokens for
bar/accent color, bar shape, result density, and presentation variant
(Automatic / Results first / Join first). Presets: theme glass, solid dark,
warm light, and bold accent; all remain independently editable.

Automatic respects measured fit. Results first prioritizes visible options;
Join first prioritizes an inline QR only in sizes where it is viable. Both preserve
the question/state and detail action. Bar colors supplement text, never replace
labels. Derive safe primary/secondary ink and accent per surface; translucent
surfaces over photographs need a sufficient scrim for reliable actual contrast.
The QR panel is always opaque and independent of card surface transparency.
Template style defaults copy into a new instance; later template edits do not
override custom widget styles. Provide Reset this poll style and Apply template
style, rather than a reset that affects every poll.

## Implementation sequence and completion checks

1. Shared widget-instance contract, legacy preservation/projection, validators,
   registry/detail routing, studio drafts/designs/history, bounded row packing.
2. Poll domain and backend: templates, rounds, role checks, link/session lookup,
   deterministic ballots, deadlines, atomic counts, moderation, revocation/cleanup.
3. Standalone participant route and owner React poll manager; save/reuse/edit flows,
   optional invitation mode, result visibility, conflict and retry handling.
4. TV provider/feed, adaptive poll renderer, result/QR/status components, detail
   view, clock synchronization, independent styling, multiple poll placement.
5. Integration validation and visual/native review; update documented shipped
   contracts only after implementation and verification.

Backend checks must cover two simultaneous votes from one browser/code, retry
after acknowledgement loss, cross-owner/TV access, invalid options/text, private
names, hidden-result payloads, close/vote and revoke/vote races, exact deadline,
clock skew, DST, link rotation, template edits after votes, zero/ties, moderation,
account deletion, cleanup, and realistic bursts across several rounds. Firestore
emulator integration must verify actual transactions, beyond mocked helpers.

Client checks must cover all 100 footprint/profile combinations with long
questions/options, 0/1/many votes, hidden results, ties, closed/stale/error states,
pending written answers, and multiple independent instances. Assert bounds,
hint overlap, primary facts, typography floors, QR quiet-zone reservation, and
immediately below/at/above every breakpoint. Exercise automatic rows and measured
border/padding changes. Verify owner and guest pages on small phones, keyboard,
screen reader, reload, two tabs, blocked cookies, and interrupted submissions.

Run existing typechecks/tests/builds for TV, companion, and Functions and their
browser fixtures. Native TV review must check actual ten-foot legibility, QR scan
success, D-pad navigation, return focus, photo backgrounds, resume, and deadline
changes without a feed refresh. Load-test batched polling and vote transactions;
record observed freshness and cost at the supported audience size.

Deploy backward-compatible Functions and Hosting, then the updated TV app. A
Hosting-only release cannot deliver protected transactions or near-live TV results.
Display an update notice for linked TVs that have not reported widget-layout
capability. Until they update, preserve the usable built-in dashboard projection.

Outstanding release checks: physical QR scan distances, Hosting cookie forwarding,
production burst capacity/update latency, and native TV readability. The
implementation guide records initial-release scope separately from optional
extensions described in this original proposal.

## Primary references

- [React: sharing state between components](https://react.dev/learn/sharing-state-between-components)
  informs controlled shared state and one owner for each state source.
- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
  describes per-origin storage and private-mode limitations.
- [MDN: using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
  describes cookie lifetime, clearing, and Secure/HttpOnly/SameSite attributes.
- [Firebase: manage Hosting cache behavior](https://firebase.google.com/docs/hosting/manage-cache)
  documents forwarding the special `__session` cookie to rewritten services.
- [Firestore: transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
  and [transaction contention](https://firebase.google.com/docs/firestore/transaction-data-contention)
  inform atomic vote uniqueness/count updates and burst testing.
- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
  is the required versioned reference for subsequent TV implementation.
