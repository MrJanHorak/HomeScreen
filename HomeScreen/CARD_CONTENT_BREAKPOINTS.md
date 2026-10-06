# Dashboard card content and sizing

This document describes implemented behavior. For the reusable size contract,
all 50 reference dimensions, and future-widget design process, see the
[widget design guide](WIDGET_DESIGN_GUIDE.md). The implemented
[weather layout design](WEATHER_LAYOUT_DESIGN.md) maps visual layout families
across every footprint. The implemented [Schedule design](SCHEDULE_LAYOUT_DESIGN.md)
maps grouped agenda families and device-clock behavior across those sizes.

Automatic rows and the free canvas both render `AdaptiveDashboardCard` inside a
measured content box. Padding and the actual configured border width are excluded
by native layout, rather than by subtracting a guessed border. A 4K Android TV may
report a 960×540 dp viewport; screen resolution alone does not define a breakpoint.

The grid allows **50 footprints per card**: widths 3–12 columns and heights 2–6
rows. All six cards are checked at all 50 footprints, at compact and full TV
dimensions (600 rendered combinations). Card data and title lengths still decide
the exact entry count; a grid label such as 3×3 never hard-codes that count.

## Shared list fitting

The pure planner in `src/components/dashboard/shared/cardContentLayout.ts` estimates word wrapping,
then refines its budget with measured headline and row heights. It evaluates
one, two, and three columns for Tasks, with comfortable
two-line titles and separate metadata, or compact one-line entries with inline
metadata. Additional columns require at least **185 normalized dp per cell**.
Meals and Media use single-column previews with two-line, 14 dp titles, separate
11 dp metadata and 10 dp row gaps. Their layouts prioritize legibility and artwork
over queue density. Live measurements still prevent rows from overflowing.

Meals allow up to two following entries below 220 dp content height, three from
220–299 dp and four from 300 dp. These are caps: fewer entries appear when long
titles need more space. Extra width makes names more complete instead of adding
columns of abbreviated dinners. Media allows up to three queue previews, each
with a 45×64 dp poster; the available height usually permits one or two in narrow
cards. Every card still opens its full detail view with the remote.

The scale is 1 on compact native TVs and 1.4 on full layouts. Divide the measured
content width/height by that scale when reading the following thresholds.

| Content height | Main title | Title line limit | Header / gap |
| --- | --- | --- | --- |
| Below 110 dp | 16 dp | 1 | 18 / 4 dp |
| 110–129 dp | 19 dp | 2 | 18 / 4 dp |
| 130–199 dp | 19 dp | 2 | 24 / 6 dp |
| 200–219 dp | 22 dp | 2 | 24 / 6 dp |
| 220 dp and above | 22 dp | 3 | 24 / 6 dp |

The line limit is a cap; unused headline lines never reserve empty space. List
fonts for Tasks remain 11–12 normalized dp with a 15 dp
line height. Meals and Media use an 18 dp row line height and 14 dp metadata line
height. The details hint appears only in leftover space,
after entries are fitted. If the hint cannot fit, a header count identifies hidden
entries. Every card still opens its full detail view with the remote.

## Information priorities

| Card | Essential information in short cards | Extra width or height adds |
| --- | --- | --- |
| Meals | Tonight/next dinner, date, servings/cook; a readable following dinner when space allows | A few more dated dinners as height increases; width preserves longer names rather than packing in columns |
| Activity | All four daily metrics: steps, distance, move minutes, calories; step goal and progress | Percentage ring, seven-day total and daily average, then the chart and additional weekly metrics |
| Schedule | Current/next event's title and time, today count or future date; upcoming event becomes primary if today is empty | Separate More today / Coming up groups, capped at four following entries; larger primary text, end time and calendar name |
| Tasks | Pending count and multiple task names; due dates when provided | More tasks, wider/full titles and separate due-date metadata; completed tasks are excluded |
| Weather | Larger temperature, condition, location and condition icon | Feels-like/high-low, a capped hourly strip, a separate daily strip, then wind/humidity when their budgets fit; wide short cards put forecasts beside current weather |
| Media | Featured program, provider/episode, actual supplied progress | Larger featured artwork and a few queue previews with large posters and separate provider labels |

Empty/unavailable states remain truthful. Missing data is never filled with
invented values. A null activity-minute value is a dash; a real zero stays zero.
Estimated resting calories retain the `est. kcal` label. Playback position zero
is valid; a progress bar requires an actual position and a positive duration.

### Schedule modes and time

Schedule uses its own pure domain planner with shared header, text block,
section geometry and details hint. Width ≥550 dp puts the featured event beside
an agenda; narrower cards stack sections from height 190 dp. Following previews
are capped at one below height 190, two below 300 and four thereafter. Titles stay
18–28 dp primary and 14–16 dp in the agenda. Optional type enlargement and metadata
yield before an earlier event or group is lost. Sparse cards emphasize one event.

Absolute occurrence timestamps let the shared TV clock label timed events
`Happening now` during their scheduled interval and exclude ended occurrences
from the preview. All-day entries remain until their calendar day's end, and
full details retain the original day. Missing timestamps produce no guessed
status. See [Schedule design](SCHEDULE_LAYOUT_DESIGN.md) for all 50 mappings,
timezone rules, partial data and rollout requirements.

### Activity modes

These conditions apply in order and keep daily metrics before weekly graphics:

| Mode | Minimum content width / height | Content |
| --- | --- | --- |
| Weekly beside today | 430 / 160 dp, with weekly data | Ring, all daily metrics, goal, adjacent chart |
| Weekly below today | 175 / 250 dp, with weekly data | Ring, all daily metrics, goal, chart below |
| Daily ring | 175 / 112 dp | Percentage ring, all daily metrics, goal; weekly summary when remaining space permits |
| Compact metrics | Remaining supported sizes | Four colored metrics in two columns at width ≥165 dp, goal, progress; weekly summary when remaining space permits |

Weekly distance/calorie/move-minute totals appear at height ≥195 dp beside today,
or ≥290 dp below today. The chart retains room for bars and date labels.
The weekly step total is independent of the chart breakpoint: after budgeting
daily metrics and gaps, 44 dp of available space adds the total, and 62 dp adds
the daily average. The chart modes retain both, so increasing card height never
removes a previously visible weekly total.

### Artwork

Weather uses 40–104 dp condition artwork and a 32–80 dp temperature across six
families. The icon is omitted before a long signed/unit-bearing temperature loses
space. The shortest cards omit optional context; forecasts are capped at four
entries per strip (three at minimum width). See [weather layout design](WEATHER_LAYOUT_DESIGN.md)
for thresholds and data fallbacks. Media's side poster appears at
width ≥180 dp and height ≥100 dp, capped at 120 dp high or 42% of the card height.
Narrow Media cards cap the featured title at 19 dp and allow four lines from
220 dp height, to preserve the name beside larger artwork. Queue posters stay
64 dp high; rows are omitted when they cannot fit, rather than shrinking them.
Provider progress appears from height 70 dp when supplied.

## Verification

- `npm run test:cards` checks all legal dimensions, initial estimates, measured
  height refinement, row budgets, weather growth/fallbacks/formatting, and the
  reported Meals/Activity regressions, Schedule preview retention and clock boundaries.
- The Vite fixture under `test/` renders the actual React Native Web components
  with isolated data/hook fixtures and the production MaterialCommunityIcons
  glyph map/font, without Expo's native font-loading runtime.
  Start it from `HomeScreen` with
  `node ../server/pairing-web/node_modules/vite/bin/vite.js --config test/vite.config.mjs`.
  With Playwright/Chromium available, run `node --test test/cardMatrix.test.cjs`.
  Bundled packages can be supplied through `NODE_PATH`; an installed browser
  through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `CARD_SCREENSHOT_DIR` saves examples.
- The matrix checks the bounds of headlines, rows, activity metrics and charts,
  plus weather and Schedule sections/details-hint bounds, long labels, clock
  transitions, sparse/busy calendars, missing forecasts and
  recovery from populated to empty/unavailable data. It checks real zero
  media progress and upcoming events on otherwise empty days.
- Native verification on the connected Sony BRAVIA confirms the current layout:
  two readable following dinners, the Activity ring with all daily metrics and
  the weekly step total/daily average, and two queue programs with larger posters.
  Browser checks do not replace native font/remote verification
  at every physical device density. New Weather has browser coverage but still
  needs native visual review, as does the new Schedule design. The Android production export and TypeScript
  checks verify the app bundle.

An existing development client receives TV layout changes through Metro;
installed standalone clients need an updated app build. Schedule's live status
also requires updated Functions to supply absolute occurrence windows; old
cached responses retain legacy behavior until refreshed. No appearance-document
migration is required.
