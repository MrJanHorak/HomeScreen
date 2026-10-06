# Meals, Media and Activity refinements

Implemented October 6, 2026, alongside [Tasks](TASKS_LAYOUT_DESIGN.md).
The existing domain components and full detail views remain the foundation.

## Shared Meals / Media preview composition

Both use `CardContent` and the measured `cardContentLayout` planner. Named sections
are part of a preview line, so heading rendering and its space budget are shared.
The planner reuses `cardSectionLayout`; the actual row measurements remain scoped
to content, width and selected typography.

At normalized width ≥650 and height ≥150 dp, following previews sit beside the
featured content, with 44% of width for the primary and a 16 dp gutter. Other sizes
stack them. No separate component is maintained for each footprint. For the
reference profiles this means compact columns 10–12 / rows 4–6, and full columns
7–12 / rows 3–6; all other footprints stack. Sparse cards have no empty preview
column. Actual measured dimensions govern automatic rows too.

Primary titles can grow to 28 dp on wide cards at height ≥400, or without following
items at width ≥300 / height ≥300. Narrow Media titles remain capped at 19 dp to
preserve names beside posters. A baseline with smaller primary type, shorter
metadata and compact section chrome is preferred whenever additional emphasis
would reduce the visible preview prefix. Queue/dinner rows stay at readable 14 dp
titles, separate 11 dp metadata and 10 dp gaps.

## Meals

The featured dinner retains Tonight/date, servings and cook. **Next dinners**
contains future meals; **With dinner** separates the featured meal's side and
preparation note. Following dinners retain priority over optional notes when the
preview is capped. The cap is two preview rows below height 220, three below 300
and four thereafter, including any shown side/note rows. A section never appears
without visible content. Dates now use readable month/day labels. The shared TV
clock also lets the card advance its day filter at midnight.

## Media

The featured program retains its title, provider/episode, poster and real playback
progress. **Up next** clearly identifies the queue, capped at three entries.
Queue posters remain 45×64 dp; primary artwork keeps its existing 120 dp maximum.
Primary artwork now sits before the text and fits short cards from width 180 dp
when at least 40 dp remains below the header. Short posters normally use 48 dp;
their height is bounded by the featured body and by a minimum 120 dp text column.
The playback bar sits beneath the title/provider text, beside the poster, and
is capped at 220 dp rather than spanning the whole featured card. Text, artwork
and progress share the same measured body and pure height budget.
Missing posters use the existing fallback. A real zero position stays visible;
missing duration produces no invented progress bar. Existing permission, loading,
unavailable and empty-queue states remain distinct.

## Activity

Daily ring and weekly cards identify **Today** in the shared header; **Last 7 days**
uses the same section component as the other cards. Compact metrics keep their
goal badge. All four daily metrics and supplied weekly step totals remain ahead
of added graphics. The established compact/ring/weekly layout thresholds remain.

Daily values enlarge to 18 dp with a 24 dp line height in wide weekly cards at
width ≥700 / height ≥300, or stacked weekly cards at width ≥300 / height ≥400.
The weekly ring can grow to 120 dp there. Without weekly data, roomy ring cards
at width ≥300 / height ≥260 also enlarge daily values. Smaller cards keep their
established sizes and reserve the weekly total/average before spending on a chart.
Missing Move Minutes remains a dash, real zeros stay zero, and estimated resting
calories retain their label.

Ring/compact summaries with enough room for total and average now include a
miniature seven-day chart at width ≥220 dp. It sits beside the text, within the
existing 62 dp summary reservation: 34 dp total chart height and 98–140 dp width.
It adds no extra row and removes no daily metric or weekly total/average.
`ActivityDayBars` renders both miniature and full charts, with the same goal/peak
scaling and accessible day/step labels. Recorded zero days have no colored bar;
only supplied days are drawn. Full weekly chart layout thresholds remain unchanged.

## Verification

The 600-case browser matrix covers all six widgets across both reference profiles.
Additional stress cases cover long queue titles/providers, sparse meal notes,
zero servings, missing/zero Activity values and capped Tasks. Pure tests verify
grouped preview retention as height grows and preserve the previously reported
Meals/Media/Activity cases. All-card remote opening, TypeScript and Android
production export are checked. The connected Sony BRAVIA screenshot confirms
short Media artwork/text-column progress and medium Activity miniature bars in
the user's current layout. Native viewing-distance/remote review at every size
remains separate from this screenshot check.
Completed: 33 TV unit tests, 16 browser tests, TypeScript and Android production
export; representative compact/full screenshots and the current TV dashboard
were visually inspected.
No Functions deployment or appearance migration is needed for these refinements.
