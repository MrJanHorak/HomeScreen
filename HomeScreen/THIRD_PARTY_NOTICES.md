# Third-party acknowledgments

The October 22, 2026 TV experience improvements were informed by
[CleanYourTV](https://github.com/Gathin23/cleanyourtv), copyright (c) 2026 Gathin,
at revision `30626a8e4714f86bf837384b109b5c73ee736917` (MIT).

References used:

- `TileRefresh.java`: invalidate app discovery when installed packages change.
- `MainActivity.java`: remember app identity through refreshes; expose supported TV controls.
- `Motion.java` and `GlassView.java`: central motion choices and focus presentation.
- `tools/bench.py` and `docs/workflows/perf-ab.md`: repeatable cold/resume/navigation measurements.

HomeScreen uses implementations written for its Expo/React Native dashboard;
the upstream launcher, artwork, font, device debloat lists, and remote accessibility
services are not included. The benchmark launches HomeScreen explicitly because
the dashboard is not registered as the system Home activity.

The upstream copyright and full MIT license are preserved in
[cleanyourtv-notice.txt](modules/tv-watch-next/android/src/main/assets/cleanyourtv-notice.txt).
This file also ships as an Android asset with the native module. Keep it when
redistributing these changes. Existing Expo and bundled font licenses remain in
[LICENSE](LICENSE) and [assets/fonts](assets/fonts/README.md).
