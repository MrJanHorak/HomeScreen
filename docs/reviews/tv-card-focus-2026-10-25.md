# Sony card-focus investigation — October 25, 2026

## Finding and change

`TVCard` rebuilt the theme object for a customized card surface on every local
focus/blur update. The ink colors do not depend on focus, but the new context
value caused content consumers to render again. The card theme is now memoized
by the custom surface and parent theme. Focus decoration still updates the shell;
appearance and reading preferences still update content colors.

A browser regression using production React, the actual `TVCard` and theme/color
helpers, and a DOM replacement for the native pressable failed before the fix:
focusing increased the content render count from one to two. With the fix,
focus/blur retain the initial count; white/dark surface and contrast-reading
changes update the ink. This demonstrates the removed context invalidation,
not an Android frame-rate or startup guarantee.

## Build and checks

- Before: source `3571310`; installed APK SHA-256
  `34084a9461dac98ae6f12a38a3544d41fb9e41001bcb9890d0a633fcd0516583`.
- After: the card-theme memo and regression after that commit; signed release
  APK SHA-256
  `6206dec90bfa98e987d1d9084317938d5f81318e1246845daf2dff3d288c52cc`.
  Signature v2 verification passed; `adb install -r` succeeded on the Sony
  BRAVIA VU1, retaining account and preferences.
- TV TypeScript, all 117 default TV tests, all eight experience browser checks,
  and `git diff --check` passed. Browser checks include focus returns, ambient
  arrow/Select/Back wake and reduced-motion behavior.
- The signed `armeabi-v7a` release build completed. No backend changes/deployment.

## Native method

Before/after each use a fresh app process, verified dashboard foreground, a
20-second startup settle, eight Up presses to anchor Settings, a freshly dumped
focus hierarchy, a three-second quiet period, one warm-up loop, then a two-second
pause. Five measured loops follow Settings → Activity → Meals → Schedule → Meals
→ Activity → Settings. Each arrow has a 500 ms pause; ADB invocation adds overhead.
Frame statistics are reset/read for each loop. No screenshots or UI hierarchy
dumps run during measurement. Settings/account/layout/motion remain unchanged.

Scheduling, graphics/view, VM/GC and input tracing runs around the five loops.
The trace buffer wraps, retaining only the last part of the scenario; aggregate
CPU totals cannot represent all five loops. Frame statistics cover each loop.
The sequential single-TV comparison does not freeze live data, clock, JIT,
thermal state or other system work. Frame times are not remote-input latency.

Exploratory runs are excluded: early anchors selected offscreen app favorites,
one launch stayed on the stock launcher despite Android reporting success, and
other passes used a long-lived process or lacked the final quiet/warm-up steps.
The final helper verifies actual foreground and Settings focus before timing.

## Native results

Final matched captures are `focus-before-6` and `focus-after-1`.

| Observation | Before | After |
| --- | --- | --- |
| Per-loop p50 frame time (ms) | 31.72 / 30.84 / 30.82 / 32.85 / 30.31 | 35.08 / 30.09 / 31.93 / 31.42 / 30.69 |
| Per-loop p95 frame time (ms) | 78.84 / 56.73 / 65.73 / 62.22 / 54.93 | 75.16 / 59.40 / 65.47 / 66.15 / 62.31 |
| Median of loop p95s (ms) | 62.22 | 65.47 |
| Janky / total rendered frames | 95 / 111 (85.6%) | 92 / 111 (82.9%) |
| Retained trace duration (seconds) | 31.66 | 31.31 |
| JavaScript CPU in retained trace (ms) | ~1,620 | ~1,190 |
| Main / RenderThread CPU in retained trace (ms) | ~1,694 / ~620 | ~1,771 / ~634 |

Results are mixed: slight jank reduction, slightly higher median frame
percentiles, and less JavaScript CPU in the retained trace. This is consistent
with removing avoidable JS work but does not establish an overall native
speedup. The trace windows omit earlier loops and can contain different
background work. Keep the deterministic render-count regression as the evidence
for this scoped optimization; do not extrapolate it to the reported startup wait.

After measurement, device captures 91/92 show Meal Planner opening and Back
restoring Meals focus with readable content and focus decoration. Captures 93–95
show the exit confirmation, Exit app returning to the stock landing screen, and
a retained-task HOT reopen with populated cards, Meals focus and no exit modal.
The TV was left on the dashboard. These observations recheck the previously
reported modal bug on this binary.

## Remaining startup work

A separate screenshot-free cold-start trace on the earlier installed build
retained about 22 seconds: JavaScript CPU ~3,575 ms, main CPU ~3,166 ms, JIT CPU
~2,817 ms and RenderThread CPU ~1,612 ms. Its longest observed native-allocation
GC slice was ~1,126 ms. These are approximate observations from one trace, not
presentation timings or proof that any particular component causes the delay.

The original minute-long opening, physical offline recovery and earlier ARD
freeze remain open. Continue with startup presentation markers and a focused
allocation/render investigation. Raw helpers, device logs, frame samples and
traces remain in ignored `artifacts/tv-startup-2026-10-25/` because they can contain
household/system information.
