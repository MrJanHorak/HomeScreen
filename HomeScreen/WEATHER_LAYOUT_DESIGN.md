# Weather card layout design

**Status: implemented in the TV client on October 6, 2026.**
The accepted visual direction uses a dedicated weather planner and renderer.
Layout budgets were refined for actual content dimensions. Browser verification
covers all 50 footprints in both reference profiles, with the production icon/font
assets, partial forecasts, long labels, real zeros and remote detail selection.
Native TV readability remains a separate device check.
See [the widget design guide](WIDGET_DESIGN_GUIDE.md) for geometry and reuse rules.

## Primary question and hierarchy

The card answers: **What is it like outside, and what is coming soon?**

Priority order:

1. Current temperature, condition and location; a prominent condition icon when supplied.
2. Feels-like temperature and actual supplied daily high/low, when space permits.
3. Near-term forecast: upcoming times, temperatures and precipitation probabilities.
4. A few following days: day, condition icon, high and low.
5. Wind and humidity as supporting metrics in larger cards.

Full forecast sequences, all supporting metrics and other weather detail remain
in the remote-selectable detail view. Replace hidden-entry counts such as `+11 more`
with a quiet details affordance when it fits. The whole-card action remains available
at every size, including when no hint fits.

Current temperature should dominate the typography; condition is a separate,
smaller label. Keep the existing card surface/theme, use larger condition icons,
and avoid introducing more photographic backgrounds. Daily forecast icons replace
repeated condition words visually, with equivalent accessible descriptions. Hourly
weather icons may use actual supplied `hourly[].icon`; do not infer a condition
from rain probability. Rain-chance bars are an alternative, labeled once per group,
with percentage text for each time. Include temperature units/degrees consistently.

## Implemented families

Let `W` and `H` be measured inner width and height divided by the current content
scale. Evaluate these conditions in the listed order:

| Family | Condition | Presentation and content limit |
| --- | --- | --- |
| Large (L) | W ≥430 and H ≥300 | Larger current-weather hero; separate hourly and daily strips; up to four entries each; wind/humidity only when remaining height permits |
| Wide short (W) | W ≥430 and H <210 | Current weather left, up to four upcoming hours right; suppress daily forecast when hourly is present and secondary metrics; the shortest version omits feels-like/high-low |
| Essential (E) | H <110 | Temperature, condition, location and condition icon; compact header; omit feels-like/high-low if they cannot fit at readable size |
| Current (C) | H <190 | Current-weather hero plus feels-like; high/low if supplied and space permits; no forecast lists or secondary metrics |
| Tall (T) | H ≥300 | Current-weather hero, hourly strip and daily strip stacked; narrow versions cap each at three entries; no stretching a long list down the card |
| Forecast (F) | Remaining sizes | Current weather plus one forecast strip; two to four hours according to width, or a few daily forecasts when hourly data is absent |

Families govern composition, not a promise to show every optional field. A compact
3×5 has about 255 normalized units of height, so it gets one forecast group. The
second group needs about 310 units with the current typography. Tall/Large start
at 300 but omit a group until its complete budget fits. Wide short remains active
through 209 units so switching below the hero never removes previously visible
hours. Wind/humidity require another 29 available units; a details hint requires
22 units after content. Daily-only forecasts replace missing hourly data when
their full budget fits; otherwise current weather remains.

The primary temperature grows from 32 to 80 normalized dp; the condition icon
from 40 to 104 dp when it fits beside the temperature. At height ≥400, forecast
temperatures, labels and daily condition icons also grow: hourly temperature
17→22 dp and daily artwork 24→32 dp. The same forecast sizing tokens supply both
the render styles and planner budgets, so changing typography updates the budget.

The planner budgets 64 normalized units per forecast entry including its gap,
with a cap of four. At minimum width it shows three entries when supplied;
extra width primarily
enlarges the hero, artwork and spacing. Very wide large cards may eventually
justify more entries after a separate readability review. Do not pad an incomplete
forecast with placeholders or fabricate dates.

## Mapping all 50 footprints

These tables map the implemented selector over the reference geometry. Each
covers all ten widths and five heights. Coordinates do not affect family selection;
actual inner measurements and optional data determine which sections fit.

Legend: E Essential · C Current · F Forecast · T Tall · W Wide short · L Large.

### Compact reference: 900×340 canvas, scale 1

| Height / width | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 rows (~81) | E | E | E | E | W | W | W | W | W | W |
| 3 rows (~139) | C | C | C | C | W | W | W | W | W | W |
| 4 rows (~197) | F | F | F | F | W | W | W | W | W | W |
| 5 rows (~255) | F | F | F | F | F | F | F | F | F | F |
| 6 rows (~313) | T | T | T | T | L | L | L | L | L | L |

### Full reference: 1800×740 canvas, scale 1.4

| Height / width | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 rows (~140) | C | C | W | W | W | W | W | W | W | W |
| 3 rows (~229) | F | F | F | F | F | F | F | F | F | F |
| 4 rows (~319) | T | T | L | L | L | L | L | L | L | L |
| 5 rows (~408) | T | T | L | L | L | L | L | L | L | L |
| 6 rows (~498) | T | T | L | L | L | L | L | L | L | L |

### How unpictured sizes behave

- **3×2 compact:** only about 192×81 normalized units; smaller than the initial
  illustrative Compact design. Reserve room for current weather before optional
  feels-like or high/low. Use the available height rather than shrinking a full card.
- **4×2 through 6×2 compact:** extra width enlarges/repositions the current hero;
  height still prevents adding a forecast underneath it.
- **7×2 through 12×4 compact:** use that width for a forecast beside current weather;
  the two-row version needs a particularly shallow forecast group.
- **3×4 through 6×4, and 3×5 through 12×5 compact:** one forecast section, with a larger hero and more
  spacing as width increases. Do not add another section solely to fill space.
- **3×6 through 6×6 compact:** two stacked forecast groups, capped to fit; narrow
  versions have fewer entries. Wider tall versions can keep four per strip.
- **7×6 through 12×6 compact:** Large composition; keep hourly/daily groups separate.
  At this height, wind/humidity may still need to stay in details.
- **3×4 full versus compact:** approximately 284×319 versus 192×197 normalized units;
  Tall in full, Forecast in compact. A hard-coded `3×4` design would miss this difference.
- **Automatic rows:** apply the same family selector to actual inner measurements;
  do not translate standard/wide into a fixed grid span.

## Fallbacks and data behavior

- If hourly data is absent, use available daily data as the first forecast section.
  If daily data is absent, retain hourly data. With neither, keep the current-weather
  layout and breathing room rather than inventing a forecast or unrelated graphics.
- Missing metrics are omitted; real 0° temperatures, 0% probabilities and calm wind
  remain valid. Missing high/low do not inherit the current temperature or each other.
- A small feels-like difference need not consume a separate row; a large supplied
  difference is valuable, but still must fit without displacing current temperature.
- Condition text, long location names, 12/24-hour formats and temperature units can
  alter measurements. Wrap or shorten supporting labels before removing primary facts.
- Loading/unavailable weather has a concise explicit status; never show a sunny
  fallback icon as though an unavailable condition were known.
- Preserve the nearest forecast times when capped; later times remain in details.
  Keep visible weather facts as a card grows, allowing groups to change position.

## Implementation and verification

The implementation uses `weather/weatherCardLayout.ts`, `WeatherDashboardCard.tsx`
and `WeatherForecastStrip.tsx`. It reuses the measured shell, card theme, remote
focus, data sources and detail route. Shared `CardSection` owns headings/dividers;
shared `CardDetailsHint` is also used by the existing list cards. Weather icon
selection and temperature/probability formatting live in the existing helpers.
No grid schema change is needed.

`test/weatherCardLayout.test.cjs` verifies all 100 reference dimensions, zeros and
missing values, night/storm/snow icons, daily-only fallback, and forecast retention
as width and height grow through layout boundaries. `test/cardMatrix.test.cjs`
checks rendered bounds and non-overlapping details hints across all footprints,
long city/condition/time/day labels, partial and missing weather, zero probability,
daily-only fallback and remote selection. The fixture uses the production glyph
map/font instead of substitute dots. Run `npm run test:cards`, `npm run typecheck`
and the browser command documented in `CARD_CONTENT_BREAKPOINTS.md`.

Verification on October 6, 2026: 20 unit tests, 10 browser tests (including the
600 card/profile grid combinations), TypeScript and Android Hermes export passed.
The final shared-section extraction was rechecked with the card unit tests,
TypeScript, four weather browser tests and the Android export. Documentation
tables were checked against the implemented selector for all 100 profile sizes.

Review the target TV from normal viewing distance before calling native readability
verified. Development clients can receive this JS change through Metro; standalone
clients need an updated app build. Backend deployment is not required.
