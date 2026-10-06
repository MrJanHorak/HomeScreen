# Adaptive dashboard widget design guide

This is the reusable design reference for existing cards and future widgets.
The geometry below describes the current implementation. A widget's design
proposal must identify which behavior is implemented and which is still planned.
See [current content breakpoints](CARD_CONTENT_BREAKPOINTS.md) for shipped fitting
behavior and [the weather design](WEATHER_LAYOUT_DESIGN.md) for the first implemented
use of this guide. [Schedule](SCHEDULE_LAYOUT_DESIGN.md) applies it to grouped
agendas and clock-aware previews. See [other widget opportunities](WIDGET_LAYOUT_ASSESSMENT.md)
for the applicability and reuse assessment.

## Size contract

Free layout uses a **12-column by 6-row** canvas. A card may span any integer
width from **3 through 12 columns** and height from **2 through 6 rows**:

`10 widths × 5 heights = 50 distinct grid footprints per card`.

The minimum is 3×2 and the maximum is 12×6. These are independently legal sizes;
the current card position, other visible cards and overlap rules can prevent a
particular resize. A 12×6 card requires the entire editable canvas.
Placement is separate from size: moving a card does not introduce a new footprint.
The header and favorite apps are outside this canvas.

Automatic rows offer `standard` and `wide` width weights (1 and 2), rather than
50 selectable footprints. Actual widths depend on the visible cards and their
weights; actual heights depend on the available area and row allocation. With
two rows, the first row has a 1.2 weight and the second has a 1 weight. All content
renderers receive a measured inner box in both modes. There is no fixed total
number of physical pixel sizes across devices and row configurations.

The authoritative implementation is
[`dashboardLayout.ts`](../server/functions/src/utils/dashboardLayout.ts), shared
by the TV, companion and backend. `validGrid` controls legal dimensions and
`gridRect` controls geometry. Keep these sources authoritative if the grid changes.

## Design in measured content dimensions

For canvas width `A`, canvas height `B`, gap `g`, and footprint `w × h`:

```text
cellWidth  = max(0, (A - 11g) / 12)
cellHeight = max(0, (B - 5g) / 6)
outerWidth  = w * cellWidth  + (w - 1) * g
outerHeight = h * cellHeight + (h - 1) * g
```

`DashboardGrid.tsx` uses gap/padding 8/12 in compact mode and 12/20 otherwise.
`DashboardCard.tsx` measures the inner content after actual padding and border;
use that measurement rather than assuming a constant border. The current content
scale is 1 in compact mode and 1.4 otherwise. Normalize measured inner width and
height by this scale before selecting a design family. Compact mode currently
means a non-web platform with window height below 700, not a low display resolution.

A 4K TV can report a 960×540 logical viewport. A footprint label, physical
resolution or aspect ratio alone cannot decide what content fits. More width
should improve grouping and legibility; more height should add bounded sections.

### Existing reference profiles

`test/matrix.tsx` and `test/cardContentLayout.test.cjs` use these reference areas:

| Profile | Canvas | Gap | Padding | Content scale |
| --- | --- | --- | --- | --- |
| Compact | 900×340 | 8 | 12 | 1 |
| Full | 1800×740 | 12 | 20 | 1.4 |

The fixture subtracts 3 units for border in addition to twice the padding. This
is a fixture assumption, not the runtime measurement contract. Approximate
normalized inner dimensions, rounded to the nearest unit:

| Width in columns | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Compact width | 192 | 268 | 343 | 419 | 495 | 570 | 646 | 722 | 797 | 873 |
| Full width | 284 | 392 | 500 | 608 | 716 | 824 | 931 | 1039 | 1147 | 1255 |

| Height in rows | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- |
| Compact height | 81 | 139 | 197 | 255 | 313 |
| Full height | 140 | 229 | 319 | 408 | 498 |

Combine any width with any height in the same profile to obtain all 50 reference
sizes. For example, 3×2 is approximately 192×81 compact and 284×140 full. This
explains why one footprint may use different content layouts on different TVs.

## Information and layout rules

1. Define one primary question the card answers and the values needed to answer it.
2. Rank supporting content explicitly. Remove lower-priority content before
   shrinking essential text or artwork. Entry counts are ceilings, not targets.
3. Choose a small set of layout families by both inner width and inner height.
   A wide short card and a narrow tall card need different grouping, even when
   their areas are similar. Families are specific to each widget, not six
   compulsory templates for all domains.
4. Separate different kinds of information into labeled sections. Never pour
   unrelated metrics, timelines and forecasts into one alternating column flow.
5. Spend additional width on larger primary values, readable names and aligned
   visual groups. Spend height on a limited number of useful sections. Large
   cards can retain breathing room without becoming full detail pages.
6. Preserve meaning when shortening labels. Icons need accessible descriptions;
   color alone must not carry meaning. Use data-backed images, icons or charts.
7. Keep each card remote-selectable and retain its full details view. A visible
   details hint is optional when space permits; the action must remain available.
8. Treat missing, stale, loading and unavailable data explicitly. Preserve real
   zeros and units. Do not invent missing values or repeat a high as a missing low.
9. Within a profile, growing a card should preserve its primary facts. Supporting
   sections may regroup, but should not disappear merely because columns change.

## Per-widget design document template

Create `<WIDGET>_LAYOUT_DESIGN.md` alongside this guide, with:

- **Status:** proposed/implemented, decision date, sources and outstanding validation.
- **Primary question and hierarchy:** essential, supporting, detail-only information.
- **Families:** normalized width/height conditions, in priority order; typography,
  artwork and section budgets; entry caps and fallback rules.
- **Complete footprint mapping:** 5×10 tables for compact and full reference areas;
  clearly identify projections separately from verified renders.
- **Data behavior:** empty, unavailable, real zero, partial, long/localized text,
  alternate units and dates/times where applicable.
- **Interaction:** whole-card action, remote focus and accessible summary.
- **Verification:** all supported dimensions, breakpoints, row mode and native TV
  review; record which checks actually ran.

Link it from this guide and from `CARD_CONTENT_BREAKPOINTS.md`. When implemented,
update the shipped-breakpoint document so proposals and runtime behavior agree.

## Verification coverage

The existing browser fixture renders six cards across 50 footprints in each of
two profiles: **600 grid card/profile combinations**, plus separate measurement,
row/grid interaction and detail-view fixtures. Existing test files provide a
starting point; they do not validate an unimplemented redesign.

For each new widget layout:

- Render all 50 footprints in each reference profile and check content bounds.
- Check representative automatic rows, actual target-TV inner dimensions, and
  immediately below/at/above each proposed content breakpoint.
- Exercise long text, missing sections, zero values, and populated-to-empty changes.
- Check icons, text contrast, focus and remote selection on the target TV; browser
  geometry checks alone do not establish readability from across the room.

Run the commands documented in [current content verification](CARD_CONTENT_BREAKPOINTS.md#verification)
after implementation. A new card type also needs updates to the shared supported
IDs, appearance validation, editor and detail routing; this guide does not enable
new widget types by itself.
