# Sony detail-return verification — October 26, 2026

## Scope and build

The next remote/lifecycle baseline subcheck covered the five widgets visible in
the current household layout: Weather, Schedule, Meals, Activity and Media.
This is a focus-restoration check on the physical TV, not a performance result.

- Sony BRAVIA VU1, Android 11; network ADB `192.168.1.103:5555`.
- Repository baseline `121b578`, clean working tree before this pass.
- Installed APK SHA-256:
  `7fcc9830d72cb0700e856d46d1184429f8529aeac013dcb9c8714b6e00c69123`.
  This matches the startup-diagnostic binary used for the October 25 checks;
  the newer repository commit records the motion evidence, not a new binary.
- Initial and final HomeScreen PID `3731`; the process was not restarted.
- Captures use UTC timestamps on October 27; the local test date is October 26
  in America/New_York (EDT).

Navigation used ADB-injected D-pad Select and Back on the TV. For each widget,
a fresh native UI hierarchy records the focused card before opening, the
detail panel's title and focused Back control, and the focused card after Back.
The return must match both the original accessibility label and pixel bounds;
the detail title must be absent from the returned dashboard. Screenshots were
also inspected for all five open detail panels.

## Results

All five detail-return checks passed with standard motion active.

| Widget | Before / detail / return captures | Return focus bounds |
| --- | --- | --- |
| Activity | 131 / 133 / 134 | `[1409,156][1860,605]` |
| Meals | 135 / 136 / 137 | `[955,156][1419,605]` |
| Schedule | 138 / 139 / 140 | `[501,156][965,605]` |
| Weather | 141 / 142 / 143 | `[60,156][511,605]` |
| Media | 144 / 145 / 146 | `[60,602][1860,818]` |

The opened titles were Fitness & Health Goals, Meal Planner, Calendar & Timeline,
Weather Forecast and Watch Queue & Streaming respectively. Every opened panel
had its Back control focused; every returned dashboard had one focused target
matching the originating card. A local assertion pass checked these conditions
against the JSON captures and saved a five-widget verification record.

## Capture limitations and observations

The initial TV screen was photo ambient. Capture 129 could not obtain an idle
UI hierarchy; its screenshot establishes ambient content only. An arrow wake
returned to the dashboard with Settings focused (130).

The first Activity Select attempt (132) still showed the focused dashboard card.
A subsequent Select opened the expected detail (133), and Back restored Activity
(134). The first attempt is excluded from successful-open evidence. This pass
does not determine whether the extra Select was an input-delivery, timing or
application issue; it must not be described as an all-inputs reliability pass.

An additional navigation sequence from Media reached Meals rather than the
intended Schedule (147), so 148 is another Meal Planner opening, not Schedule
evidence. Back again restored Meals (149). A fresh hierarchy then confirmed
Schedule focus before opening it (150–151).

The additional Schedule route was Back control → Down to the Today agenda (152)
→ Up to Upcoming (153) → Select (154). The hierarchy confirmed Upcoming selected
and the Upcoming agenda present. Back restored Schedule with the same bounds
(155). A repeat Activity opening succeeded with one Select (156–157), and Back
again restored Activity (158). This repeat does not establish the cause of 132.

Capture 159 leaves the populated dashboard with Settings focused, matching the
starting dashboard's visible control labels and bounds, including the favorite
row's scroll position. Local assertions verified that match, the Upcoming
selection/agenda and both repeated returns. No preference or household data was
edited during the pass.

## Evidence and remaining work

Raw PNG/XML/JSON captures and `details-2026-10-26-verification.json` are in the
ignored `artifacts/tv-baseline-2026-10-23/` directory because they contain household
information. No application code, APK, backend or companion deployment changed.
The capture assertions, documentation link checks and `git diff --check` passed.
Product unit tests were not rerun for these observation/documentation changes.

This closes basic detail-return verification for the five visible widgets on
this Sony/build. Tasks, Polls, RSS and shared-person Activity were absent from
the layout and remain untested here. Removal/reorder fallback while a detail is
open, other devices, physical-remote latency, offline/account recovery, full
photo/information rotation and audio accessibility remain open. The earlier ARD
freeze, the initial Select observation and the reported slow startup are not
resolved by these successful return checks.
