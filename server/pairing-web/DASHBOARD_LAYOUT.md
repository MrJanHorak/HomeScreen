# Dashboard layout contract

## Available now

Dashboard Studio at `/dashboard` offers automatic rows or a free layout canvas
for weather, schedule, activity, media, meals, and tasks. The linked account
owner signs in with Google; appearance needs no additional Google OAuth scope.
All TVs paired to that account share the configuration. The header and favorite
apps are outside the editable area. Polls and additional widget types are future
work; see [the roadmap](COMPANION_ROADMAP.md).

Free layout supports pointer/touch movement and corner resizing, numeric position
and size controls, and keyboard arrow movement. Changes remain in the current
page until **Save to TV**; the TV refreshes appearance every 45 seconds. There is
no persistent draft, undo history, design library, or separate publish-history
document yet. Reloading or **Discard changes** replaces the current draft.

The studio also offers per-card surface color/opacity and authenticated viewing
of the saved TV background/gallery. Selecting a saved Google background previews
it behind the canvas. Selecting new Google photos still starts from the TV picker.
Photo zoom ranges from 100% to 150% and applies after the image covers the screen.
The default 105% crops a little from each edge to hide embedded photo borders.
Zoom changes the display framing; the saved photo and enlarged gallery view remain
the original image. It does not affect ambient slideshow framing.

## Stored appearance

The existing `users/{uid}/appearance/settings` document remains the source of
truth. Its `appearance` retains palette, accent, background, ambient preferences,
and the complete six-item `cards` list with legacy order, visibility, and
standard/wide widths. It additionally accepts `grid: null` for automatic rows or:

```json
{
  "version": 1,
  "columns": 12,
  "rows": 6,
  "items": [
    { "id": "weather", "x": 0, "y": 0, "width": 6, "height": 3 },
    { "id": "schedule", "x": 6, "y": 0, "width": 6, "height": 3 },
    { "id": "todo", "x": 0, "y": 3, "width": 12, "height": 3 }
  ]
}
```

For this example, weather/schedule/todo must be visible in `cards`; the remaining
three cards must be hidden. A grid requires `appearance.layout: "custom"`.
Coordinates are zero-based integers in storage; the editor displays one-based
column and row numbers. Validation requires:

- Version 1, exactly 12 columns and 6 rows, at most six items.
- Exactly one item for every visible card; no unknown or duplicate IDs.
- At least one visible card.
- Integer coordinates/dimensions; minimum width 3 and height 2.
- Nonnegative position, all edges inside the grid, and no overlapping rectangles.

The pure shared validator, starting-layout conversion, free-space search, and TV
geometry live in [`dashboardLayout.ts`](../functions/src/utils/dashboardLayout.ts).
The file stays inside the Functions deployment tree and contains no server
imports. The TV's Metro configuration watches that folder; the companion imports
the same TypeScript directly. Keep the repository structure when building either
client.

Optional `appearance.cardStyles` maps supported IDs to
`{backgroundColor: "#EFE5CE", opacity: 0.9}`. Each entry requires a six-digit hex
color and finite opacity in `[0,1]`; unknown IDs or fields are rejected. Missing
entries use the palette surface, and `{}` restores all theme surfaces. Validation,
RGBA generation, and estimated-composite text contrast share
[`cardStyle.ts`](../functions/src/utils/cardStyle.ts). Opacity affects only the
surface, leaving text/artwork unaffected. The TV scopes foreground theme colors
to the card; actual contrast at low opacity depends on the background photograph.

Optional `appearance.backgroundZoom` is a finite number in `[1,1.5]`, shared through
[`photoFraming.ts`](../functions/src/utils/photoFraming.ts). Both clients normalize
missing/invalid values to `1.05`; the API rejects invalid supplied values. Legacy
saves omitting the field preserve an existing saved zoom.

## Rendering and editing

The TV measures the available card area and converts cell positions into pixels.
It uses a 12-point gap, or 8 points in compact native TV mode.
`AdaptiveDashboardCard` budgets content for width and height: titles can wrap,
and taller cards add schedule entries, tasks, meal sides/notes/following dinners,
weather data/forecasts, activity metrics/goal visuals, or media artwork/progress.
Short tiles keep the essentials. Content is positioned from the top rather than
centering a three-line summary in a tall card. All cards keep their existing
remote-selectable detail view. The same stored grid scales to both TV sizes;
there is no independent compact layout document. Automatic rows retain their
existing widgets and also apply custom card surfaces.

The phone canvas has a 16:9 preview and 4-pixel gaps. It previews labels, positions,
card colors/opacity, and the saved Google background when selected. It does not
fetch personal widget data or reproduce exact TV fonts, available area, or focus
animation. Photos are read from authenticated saved-image endpoints, and the
gallery supports enlarged viewing. The TV settings also show a schematic grid
preview with the saved card colors. Moving/resizing into occupied space is rejected, and
hiding a card leaves other positions intact. Showing a hidden card searches for
an empty 3-by-2 space; a full canvas asks the user to make room first.

Summary height and data-row height are measured after rendering, so a short title
does not consume the budget of a three-line title. Short Tasks cards use compact
icon rows; medium Activity cards reuse the original centered-percentage ring and
colored metric icons without repeating the percentage in the subtitle. Larger
cards grow their ring/artwork within bounds. Medium Media cards show a poster
beside the title and smaller artwork for following queue entries. Playback
progress appears only when TV Play Next supplies a position and positive duration;
a real zero position is valid. Missing artwork uses the existing movie icon.
Activity distance remains in kilometers, consistent with the Fit response.

Dashboard backgrounds use measured screen dimensions and a centered, clipped zoom.
The favorites viewport extends through the horizontal safe margins to the screen
edges, while tile content keeps an initial inset. Focus scrolling measures the
viewport and keeps the selected tile fully visible, including the first/last app.

TV colors/backgrounds and ambient settings preserve the grid. TV row arrangement
controls are disabled while it is active and point users to the companion QR.
Choosing a TV preset or restoring defaults explicitly switches back to rows.
Choosing a companion starting preset resets the current arrangement while
preserving the selected rows/free-layout mode.

## API and concurrent edits

`GET /userAppearance` returns `appearance`, `updatedAtMs`, and `seededFromWeb`.
The studio keeps the loaded revision and sends:

```text
PUT /userAppearance
Authorization: Bearer <Firebase ID token>
{ appearance: <complete preferences>, source: "web", expectedUpdatedAtMs: <loaded revision> }
```

The server validates the complete input and uses a Firestore transaction to read
the current revision, reject a stale save with `409`, and write a monotonically
increasing `updatedAtMs`. The studio retains the unsaved draft on rejection;
**Discard changes** reloads the newer saved configuration. This is conflict
detection, not automatic merging or history. A first save uses revision `0`.
The existing TV client saves without a conditional revision.

Old clients may omit `grid`. The server preserves an existing canvas during such
saves and validates it against the incoming card visibility. An incompatible
visibility change returns `400`; it cannot silently erase the canvas. An explicit
`grid: null` clears it. Old TV builds ignore the grid and use the legacy card list
as a row fallback; current clients also fall back to rows for invalid or unknown
grid versions. The older client's row order/width changes can still affect the
fallback list without altering the canvas.

The same compatibility rule applies to card styles: omitting `cardStyles`
preserves the stored map, while an explicit `{}` clears all custom surfaces.
Layout presets preserve the map; restoring default appearance clears it.

## Release and verification

Deploy updated Functions and Hosting together, then distribute an updated TV
build. A Hosting-only release cannot provide server validation or conflict
detection; an older TV binary cannot display free placement. No Firestore rules
change or data migration is required for the layout document.

The Functions Node test suite covers all 4,032 nonempty visibility/width
combinations, geometry validation, pixel bounds, adding cards, legacy preservation,
explicit clearing, and revision conflicts. TypeScript checks and Expo exports
verify the client builds. Before release, verify D-pad navigation and readability
on Android TV at both compact and full-size resolutions, including smallest tiles,
modal return focus, and a layout change while the TV is running.

Surface tests cover invalid color/opacity input, legacy preservation, and
foreground contrast across all opaque grayscale values. Browser fixture checks
cover photo viewing/clearing, style preview/save/reload/reset, and adaptive card
content at compact and full-size dimensions. Fixture rendering verifies layout
and selection but does not replace a native TV check for fonts, photo contrast,
poster access, or remote navigation.
Photo zoom validation and legacy preservation are covered by the Functions suite.
Browser fixtures exercise the original tall layout and the mixed medium/short
arrangement at compact and full-size dimensions, including queue posters, a zero
playback position, multiple tasks, one centered Activity percentage, carousel
first/last focus visibility, photo zoom preview, and saved zoom reload. A connected
Android TV check also confirmed actual artwork, metric icons and the background
border crop in the mixed layout.
