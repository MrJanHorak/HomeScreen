# Applying the weather design principles to other widgets

Assessment date: October 6, 2026. Weather is implemented. The other domain changes
below are recommendations, not shipped redesigns. The shared details hint is
already reused by Weather and `CardContent`; other widgets retain their behavior.
See [the design guide](WIDGET_DESIGN_GUIDE.md) for geometry and validation, and
[Weather](WEATHER_LAYOUT_DESIGN.md) for an implementation example.

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
| Schedule | Primary next event, then today's remaining events and future events in one shared list; columns maximize entry count | Separate **Today** and **Coming up**; use a time-aligned agenda for tall cards and primary event beside an agenda in wide cards; cap previews without shrinking event names | Highest next-design priority. Reuse `CardHeader`, `CardSection`, `CardContentRow` and details hint, with a group-aware domain planner |
| Tasks | Pending count plus pending names and optional due dates; compact rows/columns | Keep task names primary; cap preview count on large cards; only group due/undated tasks when supplied dates support it. Avoid a large count that displaces useful task names | Good candidate for a small shared list-preview cap first. Keep checklist rows and a list presentation; photos add little value |
| Meals | Already caps two to four following dinners in a single column with larger text and date/cook/serving metadata | Separate next dinners from tonight's sides/preparation notes; wider layouts could place tonight beside following dinners | Mostly follows the new principles already. Reuse section/row primitives; keep meal grouping in its domain. Only add photos when actual data provides them |
| Media / Play Next | Featured program, supplied progress and large posters; capped queue previews | An explicit **Up next** section; a wide featured-program/queue composition when names and posters remain readable | Already follows the principle strongly. Preserve `WatchPoster`, `CardProgress`, source/status handling and queue cap; share section chrome rather than a forecast tile |
| Activity | Separate compact metrics, ring, wide-weekly and tall-weekly modes; preserves all four daily metrics and weekly total before chart | Clearer Today/Last 7 days separation; enlarge values where there is room, while retaining daily metrics and supplied weekly totals | Already has the right architecture. Existing ring/progress/chart components should remain domain-specific; avoid hiding established metrics merely to reduce density |

The biggest benefit is Schedule's mixed groups. Tasks' information is inherently
textual, so a bounded, legible checklist is more useful than borrowing weather's
visual strip. Meals, Media and Activity need smaller refinements rather than a
replacement layout system.

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

## Keeping later implementations DRY

1. Reuse shell, theme, headers, sections, artwork/progress and details action first.
2. For Schedule/Tasks, extend the existing list planner only when both need the same
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
