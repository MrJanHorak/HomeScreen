# Schedule layout and device-time behavior

Implemented October 6, 2026. Schedule uses measured content dimensions in automatic
rows and the free canvas. The size contract is in [the widget design guide](WIDGET_DESIGN_GUIDE.md).

## Hierarchy

The primary question is: **What is happening now or next?** The featured event
has a prominent start time and a readable title. Its header shows `Happening now`,
the remaining today's count, or its actual future date. Additional space can show
the end time and calendar name, followed by separate **More today** and **Coming up**
sections. Selecting the whole card still opens the complete schedule.

An empty feed says `No events to show`; it does not infer that the person is free
or that a disconnected calendar has no appointments. One event receives larger
type without filler entries. Missing dates/times are labeled as unavailable.

## Measured layout families

Normalize measured inner width and height by the existing content scale (1 compact,
1.4 full). Conditions below apply in order. A family describes composition, not a
guaranteed number of visible entries; title length and supplied groups affect fitting.

| Family | Normalized condition | Composition |
| --- | --- | --- |
| L — Large | Width ≥550, height ≥300 | Featured event beside grouped agenda; two separate agenda columns when each has room |
| W — Wide | Width ≥550, remaining heights | Featured event beside a bounded agenda |
| E — Essential | Remaining widths, height <110 | One-line featured title and time |
| F — Featured | Remaining widths, height <190 | Featured title and time; useful metadata if space permits |
| T — Tall | Remaining widths, height ≥300 | Featured event above separate agenda sections |
| A — Agenda | Remaining sizes | Featured event above a short agenda |

Side-by-side composition requires following events. A single event uses the full
width in every family. Agenda groups receive separate columns only when the
agenda width is ≥440 dp and both groups exist. These are semantic groups, not
one mixed list flowing alternately between columns.

The primary title starts at 18–20 dp with one or two lines; the time starts at
18–22 dp. Room increases them up to 28/36 dp. Agenda titles remain 14–16 dp with
bounded metadata. Long titles wrap before lower-priority entries are added;
metadata stays on one line. A pure planner and renderer share row/section tokens.
Larger type and optional metadata fall back if they would remove an already
visible event or group. Growing the card therefore preserves the preview prefix.

Following-entry caps are one below 190 dp height, two from 190–299, and four from
300 dp. Actual counts may be lower. A balanced prefix tries one event from each
group before adding a second; it stops when the next entry cannot fit. The
featured event is excluded from following entries. At most five events appear.
The details hint uses spare space and remains optional; the remote action is
always available.

## All 50 reference footprints

These tables map the two reference areas in the guide. They describe measured
geometry with rounded dimensions; runtime uses actual inner measurements.

**Compact** — canvas 900×340, gap 8, padding 12, scale 1:

| Rows / columns | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | E | E | E | E | E | W | W | W | W | W |
| 3 | F | F | F | F | F | W | W | W | W | W |
| 4 | A | A | A | A | A | W | W | W | W | W |
| 5 | A | A | A | A | A | W | W | W | W | W |
| 6 | T | T | T | T | T | L | L | L | L | L |

**Full** — canvas 1800×740, gap 12, padding 20, scale 1.4:

| Rows / columns | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | F | F | F | W | W | W | W | W | W | W |
| 3 | A | A | A | W | W | W | W | W | W | W |
| 4 | T | T | T | L | L | L | L | L | L | L |
| 5 | T | T | T | L | L | L | L | L | L | L |
| 6 | T | T | T | L | L | L | L | L | L | L |

## TV clock and occurrence windows

Calendar supplies optional absolute `startMs`, `endMs`, `allDay` and `timeZone`
alongside existing display labels. The TV uses its own `Date.now()` through one
shared clock subscription, also used by the dashboard header. It checks once per
second and refreshes when the app becomes active after suspension.

- A timed occurrence is `Happening now` from its scheduled start, inclusive,
  until its scheduled end, exclusive. This infers scheduled activity, not attendance.
- Active events lead the preview, followed by today's next timed events, all-day
  reminders, and legacy events with unknown absolute timing. Multiple simultaneous
  events remain eligible; their scheduled start orders ties.
- Ended occurrences leave the dashboard preview immediately at the next clock
  update. Original day arrays remain intact for the details view.
- All-day entries remain until the end of their calendar day. Each overnight or
  multi-day occurrence is clipped to its own day window; one day's copy expiring
  does not remove the following day's copy.
- Day boundaries use the response's timezone, including daylight saving days of
  23 or 25 hours. At midnight, already-fetched upcoming occurrences can become
  today's events without waiting for a network refresh.
- Missing or invalid absolute bounds retain the existing preview and do not
  receive a guessed status. Formatted human-readable times are never parsed to
  infer start/end instants. Duplicate ID/date occurrences are removed from previews.

This depends on an accurate device clock and the latest fetched calendar data.
Calendar edits still follow the normal five-minute TV polling and ten-minute
backend cache. After deploying updated Functions, cached legacy summaries may
retain old behavior until refreshed. Updated TV code and Functions are both
needed for live status; existing clients tolerate the added optional fields.

## Verification

`scheduleCardLayout.test.cjs` checks all 100 reference dimensions, continuous size
growth, event/group retention, partial labels, exact clock boundaries, midnight
promotion, and preservation of source arrays. `cardMatrix.test.cjs` checks actual
React Native Web bounds, title sizes, capped previews, sparse/busy/long calendars,
and remote activation in rows and grid. Browser clock tests exercise start/end
and midnight transitions without a fixture feed refresh. Backend tests cover
absolute overnight windows and daylight saving all-day boundaries.

Completed validation: 26 TV unit tests, 91 backend tests, 13 browser tests
(including the 600 card/profile combinations and additional Schedule scenarios),
TV TypeScript checking, and Android production export. Representative browser
screenshots were visually inspected; the fixture frames use each card's own height.

Native target-TV font, viewing-distance and remote review remains necessary;
browser coverage and Android production export do not establish physical-TV
readability across every device density. No appearance migration is required.
