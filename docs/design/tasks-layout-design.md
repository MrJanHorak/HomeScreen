# Tasks layout design

Implemented October 6, 2026. See the [widget design guide](widget-design-guide.md)
for the measured size contract and the 50 legal footprints.

## UI and UX decisions

Tasks answers **What needs doing?** Task names are the primary information.
The pending count is a small header badge rather than a large headline that
displaces useful names. A checklist stays appropriate at every size; decorative
photos or a large count would contribute little to this question.

The card shows a bounded prefix in the provider's order. Completed tasks are
excluded and duplicates are identified by task-list ID plus task ID. Two different
lists may legitimately contain the same ID or title. Source arrays remain intact.
The dashboard is a preview: selecting the whole card opens the existing task
details/actions. Checklist symbols are display-only; they add no competing remote
focus targets or accidental completion action.

Due dates are secondary labels on their own line. Valid date-only ISO strings
display as `Oct 7` without shifting timezone. The live feed also supplies yearless
labels such as `Sep 28`; those labels do not establish which year, whether a task
is overdue, or its priority. The card therefore preserves supplied labels and
order, without speculative urgency groups or sorting. Undated tasks need no
repeated `No due date` filler. Full accessible row labels retain supplied due
information when the visual preview omits it.

## Geometry, typography and caps

Normalize measured inner width/height by content scale: 1 compact, 1.4 full.

| Shape | Conditions | Layout |
| --- | --- | --- |
| Short list | Height <110 dp | One-line 14 dp task names; due metadata omitted; maximum two tasks |
| List | Width <550 dp, remaining heights | One vertical checklist with bounded two-line names |
| Wide list | Width ≥550 dp, more than one pending task | Two columns, read down the left then down the right, with a 24 dp gutter |
| Sparse | One pending task | Full-width task, with larger type where space permits |
| Empty | No pending tasks | `All caught up` / `Nothing pending`, with a quiet checklist icon in taller cards |

Entry caps are two below height 110, four from 110–219, and six from 220 dp.
These are ceilings, not guaranteed counts. Task names use 14 dp / 18 dp line height,
growing to 18 dp / 24 dp from height 300 or for one task from height 150. A larger
font is used only if it retains the same prefix. Due metadata likewise yields
before it displaces a task name. No third column is added on large cards.

The pending count remains available even when a busy preview is capped. A details
hint and hidden count appear in leftover space, without displacing entries.
One `tasksCardLayout` planner owns these rules; the renderer shares its row tokens
and the common header, text block, date-label formatter and details hint.

## All 50 reference footprints

`S2` is a short list capped at two; `L4`/`L6` are one-column lists capped at four/six;
`W2`/`W4`/`W6` are two-column lists with the corresponding cap. Empty/single-item
content uses the sparse rules rather than reserving an empty second column.

**Compact** — 900×340 canvas, gap 8, padding 12, scale 1:

| Rows / columns | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | S2 | S2 | S2 | S2 | S2 | W2 | W2 | W2 | W2 | W2 |
| 3 | L4 | L4 | L4 | L4 | L4 | W4 | W4 | W4 | W4 | W4 |
| 4 | L4 | L4 | L4 | L4 | L4 | W4 | W4 | W4 | W4 | W4 |
| 5 | L6 | L6 | L6 | L6 | L6 | W6 | W6 | W6 | W6 | W6 |
| 6 | L6 | L6 | L6 | L6 | L6 | W6 | W6 | W6 | W6 | W6 |

**Full** — 1800×740 canvas, gap 12, padding 20, scale 1.4:

| Rows / columns | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | L4 | L4 | L4 | W4 | W4 | W4 | W4 | W4 | W4 | W4 |
| 3 | L6 | L6 | L6 | W6 | W6 | W6 | W6 | W6 | W6 | W6 |
| 4 | L6 | L6 | L6 | W6 | W6 | W6 | W6 | W6 | W6 | W6 |
| 5 | L6 | L6 | L6 | W6 | W6 | W6 | W6 | W6 | W6 | W6 |
| 6 | L6 | L6 | L6 | W6 | W6 | W6 | W6 | W6 | W6 | W6 |

These are compositions and caps, not literal row counts. Long names and dates
decide what fits. Runtime measurements, not grid labels, select the layout.

## Verification and rollout

Pure tests check all 100 reference boxes, continuous width/height growth, caps,
provider order, list-aware identity, completed tasks and truthful due labels.
The browser matrix checks actual component bounds, empty/sparse/busy/long/partial
data, minimum text sizes, details-hint separation, and remote opening in rows and
grid. Representative screenshots are visually inspected. The full suite also
checks the other five widgets for regressions.

Completed validation: 31 TV unit tests, 15 browser tests including all 600
card/profile combinations and additional stress cases, TV TypeScript checking,
and Android production export. Representative compact/full renders were inspected.

These refinements require updated TV code, with no backend or appearance migration.
TypeScript and Android production export verify bundling; native font, distance
and remote review on the target TV remains necessary.
