# TV experience and performance

Implemented in source October 22, 2026. Native changes require a new Android app
build; JavaScript updates alone do not add the new native functions. Physical-TV
verification and before/after performance measurements remain required. Source
inspiration and licensing are recorded in [third-party notices](THIRD_PARTY_NOTICES.md).

## App discovery and background work

The native app catalog caches installed-app labels and 160×90 artwork in process
memory. Ordinary returns from another app reuse it. Package install, update,
removal, and enabled-state broadcasts invalidate the snapshot; several broadcasts
while covered lead to one rebuild on return. Foreground updates are coalesced for
150 ms. A change arriving during discovery remains invalidated for the next read.
Settings → Apps → Refresh bypasses the cache, including for changed labels or OEMs
that miss broadcasts. A new process starts with an empty catalog. Favorites remain
keyed by package name, including while an app is temporarily unavailable.

The dashboard clock updates at minute boundaries and at registered poll closing
times, and catches up immediately on resume. It has no background timer. Favorites and appearance polling skip
background/inactive work; favorite preferences refresh on resume. The dashboard
summary's existing foreground-aware refresh/cache behavior is retained.

## Focus and motion

Dashboard widgets, favorite apps, Settings, and TV controls register stable focus
IDs with screen-local memory. The dashboard stays mounted beneath ambient mode,
preserving measurements and state while disabling focus/accessibility on its controls.
Closing a detail panel, waking from ambient mode,
or returning from another app restores the selected ID after the next layout
commit. Removed items fall back to a neighboring registered entry. Detail controls
do not overwrite the dashboard return target. This does not introduce global
remote interception or system Home-button remapping.

Settings → Accessibility → Motion offers **Use device setting** and **Reduce motion**.
It is saved on this TV, independently of account appearance. The system setting
is observed through Android accessibility or the browser's reduced-motion media
query. Reduced motion removes control zoom/parallax, long modal fades, ambient
photo pan/zoom, and plasma movement. Photos and information still rotate; the
ambient information block changes corner every 90 seconds to avoid keeping it in
one position. Ambient animation loops and timers stop when backgrounded.

## TV controls

The Android header's **TV controls** button opens Settings → Device. It shows
Wi-Fi/Ethernet/offline status, Network settings and Android settings shortcuts,
and visible passthrough inputs reported by Android's `TvInputManager`, using custom
input names when available. Devices with no reported inputs show no input list.
Use **Refresh TV status** after connecting a source; status also refreshes after
returning from system settings. Firmware that does not expose standard controls
may require the remote's Settings/Input button. No SSID/location permission or
vendor-specific service invocation is added.

## Verification

From `HomeScreen`:

```powershell
npm run typecheck
npm test
npm run test:experience
# Browser checks need Playwright and Chromium (as with the other browser fixtures).
npm run test:experience:browser
```

Native cache regression tests, with the Android SDK and JDK configured:

```powershell
cd android
.\gradlew.bat :tv-watch-next:testDebugUnitTest
```

October 22 verification: TV TypeScript checks, all 102 default unit tests,
5 focus/motion browser checks, 27 existing settings browser checks, 4 native cache
unit tests, native Kotlin compilation, Android Metro/Hermes export, and the
benchmark's dry run passed. Browser checks used installed Chrome with bundled
Playwright. They do not establish native TV focus behavior or a hardware speedup.

On a physical TV, verify return focus after an app launch, a detail panel, Android
settings, and ambient mode. Also remove/reorder the focused widget through the
companion. Install/update/disable an app while another app is foregrounded, then
return and confirm the app list is current. Check both motion choices, the OS's
animation setting, input naming/switching, and devices without HDMI inputs.

## Repeatable device benchmark

Use the same TV, firmware, account, layout, wallpaper, motion preference and release
build mode for both revisions. Close dialogs, start on the dashboard, let content
settle, then run five repetitions per revision. Connect with the normal ADB
workflow in [RELEASE.md](RELEASE.md) first. The script requires an explicit device
and does not install builds or change the default launcher.

```powershell
node scripts/benchmark-tv.cjs --help
node scripts/benchmark-tv.cjs --serial 192.168.1.103:5555 --label before --runs 5
# Install the comparison build using the release guide, then repeat:
node scripts/benchmark-tv.cjs --serial 192.168.1.103:5555 --label after --runs 5
```

Optional `--adb` selects the executable, `--component` selects an activity within
`--package`, and `--out` selects a result directory. `--dry-run` prints the planned
ADB commands without contacting the TV. The real run force-stops HomeScreen for
cold launches, opens Android Settings for resume measurements, and sends a fixed
sequence of arrow keys. Do not run it during normal household use.

Results are timestamped JSON in `artifacts/tv-benchmarks` relative to the working
directory. Compare all repetitions, including outliers. The records contain model,
Android/firmware, Android activity launch/wait times, navigation frame percentiles,
Android's jank counts, and final process PSS memory. Unavailable metrics are null.
Raw dumps and other apps' process lists are not saved.

Android launch timing measures activity startup, not first populated dashboard
content. Frame duration measures drawing, not key-to-focus latency. The frame ring
buffer is only a sample, while Android's total/janky frame counters can cover a
larger window. This initial harness does not measure idle CPU or provide Perfetto
traces. Supplement it with Android tracing when investigating a specific stall;
do not infer a speedup from source changes or browser results alone.
