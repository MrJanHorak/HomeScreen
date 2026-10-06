# Applying the weather design principles to other widgets

Assessment date: October 6, 2026. Weather, Schedule and Tasks designs and the
Meals/Media/Activity refinements are implemented. The table below records the
resulting behavior and remaining limits. Headers, sections, text blocks, measured
preview fitting and details hints are shared where their behavior matches.
See [the design guide](WIDGET_DESIGN_GUIDE.md) for geometry and validation, and
[Weather](WEATHER_LAYOUT_DESIGN.md) and [Schedule](SCHEDULE_LAYOUT_DESIGN.md)
for implementation examples, plus [Tasks](TASKS_LAYOUT_DESIGN.md) and
[the remaining refinements](PREVIEW_WIDGET_REFINEMENTS.md).

## What transfers

- Design by measured width and height, with a few meaningful layout families.
- Make the primary fact readable first, and cap supporting entries instead of
  filling every available unit of height.
- Keep semantically different groups separate, particularly in multi-column cards.
- Use additional space for readable values, artwork and grouping, before more data.
- Preserve real values, partial data and the whole-card remote detail action.

Weather icons and forecast tiles are weather-specific. A large photograph or
horizontal strip is not automatically appropriate for a text-heavy task or event.

## Existing widgets

| Widget | Existing behavior | Applicable improvement | Reuse approach / priority |
| --- | --- | --- | --- |
| Schedule | Implemented: prominent current/next event, separate **More today** and **Coming up** groups, capped at five total events | TV-clock status and preview expiration use supplied absolute occurrence windows; sparse cards emphasize one event | Reuses `CardHeader`, `CardSection`, `CardTextBlock` and details hint, with one domain planner and agenda renderer |
| Tasks | Implemented: readable checklist, small header count, capped at six entries/two columns | Due metadata and enlargement yield before task names; yearless labels cannot establish urgency, so provider order remains | Domain planner shares header, text block, details hint and date labels; no imagery or speculative urgency groups |
| Meals | Implemented: **Next dinners** / **With dinner** sections, bounded previews, wide primary/preview composition | Future dinners retain priority over optional sides/notes; real dates, servings and cook remain | Shared named-section fitting with Media; actual data is required before adding photos |
| Media / Play Next | Implemented: **Up next** section and wide primary/queue composition | Primary titles enlarge where previews are preserved; large queue posters and supplied progress remain | Shared preview composition, `WatchPoster`, `CardProgress`, source/status handling and section chrome |
| Activity | Implemented: **Today** / **Last 7 days** grouping, larger roomy daily values/ring | All four daily metrics and weekly totals stay before charts; missing/estimated values retain meaning | Shared header/section/details hint plus existing domain ring, metrics and chart components |

The biggest benefit is Schedule's mixed groups. Tasks' information is inherently
textual, so a bounded, legible checklist is more useful than borrowing weather's
visual strip. Meals, Media and Activity receive smaller refinements within their
established renderers rather than a replacement layout system.

## Reuse implemented with Weather

- **`DashboardCard` / `TVCard`:** existing measured shell, focus, theme/custom surface
  and remote detail action are reused unchanged.
- **`CardHeader`:** reused with the selected location as a secondary header label;
  no new weather-specific copy of the shared header.
- **`CardSection`:** reusable themed separator and heading/caption, with a compact
  version for shallow cards. Hourly and daily forecasts use the same component;
  `cardSectionLayout` supplies its geometry to both rendering and domain budgets.
- **`CardDetailsHint`:** shared display-only affordance, now used by both Weather
  and the existing list fitter. Hidden-item counts remain available to list cards
  without becoming the weather card's main density signal.
- **Weather helpers:** shared icon/temperature formatting between dashboard and
  details; token handling preserves night/snow conditions and real zeros.
- **`weatherForecastSizing`:** the forecast renderer and pure planner use the same
  tokens for typography, icons and row budgets. No parallel copies of forecast
  styles/budgets or separate components for each grid footprint.

Weather has one domain planner and one strip renderer used for both forecast kinds.
The planner remains separate from the generic list fitter because its priorities
and sections differ. This is domain separation rather than duplicating list logic.

## Reuse added with Schedule

- **`CardTextBlock`:** the bounded title/metadata pair is shared by Schedule and
  existing `CardContentRow` consumers; their established sizes stay unchanged.
- **`CardSection` / `cardSectionLayout`:** agenda rendering and budgeting reuse the
  same section heading geometry as Weather.
- **`scheduleRowSizing`:** the agenda and pure planner share text/spacing tokens.
  One component handles both today's times and future dates.
- **`useTVClock`:** Schedule and the header share one device-clock timer with
  resume refresh rather than starting a timer per card.
- **`zonedTime`:** Calendar and Fit reuse the existing timezone day-boundary
  calculation; calendar-day comparisons on the TV use the same pure utility.

## Keeping later implementations DRY

Tasks reuses the bounded text block but has its own checklist budget: it has no
featured-event hierarchy or artwork row. Meals and Media share section and
side-composition logic in `CardContent`, with native measurements keyed to the
selected typography. Activity reuses section/header/hint chrome and retains its
domain charts. Tasks and Meals share a date-only label formatter; Meals also uses
the existing shared TV clock to advance its day filter. No per-footprint
components or universal widget framework were added.

Media now fits leading artwork in short cards and places progress in the primary
text column. Activity's miniature weekly bars reuse `ActivityDayBars`, the same
renderer as the full chart, inside the existing total/average height reservation.
The current Sony TV layout has been inspected with both improvements visible.

1. Reuse shell, theme, headers, sections, artwork/progress and details action first.
2. For later cards, extend the existing list planner only when multiple domains need the same
   behavior, such as a configurable preview cap or preserving section boundaries.
   Keep the default behavior stable for existing consumers.
3. Keep event, task, meal, weather and activity priority rules in their own modules.
   Share a budget/measurement helper only once multiple domains have the same need.
4. Keep layout calculations pure and derive rendering sizes from the same tokens.
   Test externally visible content retention and overflow rather than copying the
   planner's formulas into assertions.
5. Continue using the shared 50-size matrix and both profiles. Add one newly
   supported widget to the fixture rather than creating a separate size catalogue.

Avoid a universal `Widget` with many conditionals, 50 footprint-specific components,
or a configurable framework built around hypothetical future cards. A few small
primitives plus domain planners keep the code easier to change.

Future quotes/verses/jokes would likely show one readable item, using extra width
for complete text. Polls could use a question and a capped set of labeled result
bars if data/actions are implemented. These are design considerations; those card
types are not currently supported by the shared grid IDs or backend validation.
