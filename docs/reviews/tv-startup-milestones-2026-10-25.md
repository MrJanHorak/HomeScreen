# Sony startup milestones — October 25, 2026

## Question and measurement boundaries

The user reports loading cards for roughly a minute when opening HomeScreen.
Earlier samples restored cached data but lacked timings for authentication,
appearance, disk storage and the first populated card commit. A preceding
card-focus optimization did not establish an overall speedup.

This diagnostic change adds process-local milestones around those phases and
the first dashboard request's token, HTTP and JSON stages. Logs contain fixed
phase names, elapsed time from the JS entry module and epoch time only. Each
phase emits once during the first two minutes; account IDs, tokens, source
timestamps and household content are excluded. No dashboard behavior, cache
expiry, credentials or preference policy is changed.

`cached-content-effect` / `live-content-effect` run after a measured non-media
card has committed with summary data. Their frame-callback markers measure a
subsequent JavaScript animation-frame callback. They are **not pixel-presentation
timestamps**, and do not imply all artwork or independent feeds are ready.
`auth-ready` means Firebase's initial auth callback has fired, including the
signed-out case. `appearance-ready` means the account's local appearance has
resolved, including fallback on disk error. Cache outcome logs distinguish
restoration from missing, expired or incompatible snapshots.

The first summary request is timed as one operation. If it fails or outlives the
session's timeout, its milestones describe that first request, not later retries.

## Device protocol

Use the private Sony BRAVIA VU1 (`192.168.1.103:5555`) with the existing account,
layout, solid background and motion setting. Force-stop, pause one second,
explicitly launch, verify the actual foreground activity and retry launch if the
stock launcher remains. Reject a capture if HomeScreen is not foreground at the
end. No screen recording, screenshots, UIAutomator or input runs during the
measurement interval. An early activity-state query verifies foreground; it is
the only diagnostic read during the wait.

Untraced samples wait 35 seconds after launch; the native trace waits 22 seconds
and uses a larger trace buffer. Read logs afterward. A screenshot after capture
can verify the eventual UI, but cannot establish first-presentation time. Raw
artifacts stay under ignored `artifacts/tv-startup-2026-10-25/`, since Android logs
and UI captures may contain private information beyond the bounded milestones.

The original minute-long delay, physical offline startup and earlier ARD freeze
remain unresolved unless a dated result below explicitly demonstrates otherwise.

## Builds and validation

Source baseline: `68dd873`. The first diagnostic release, APK SHA-256
`e49a40402e26399dc49ae6b9c183ec85efec2e4e6bca0af7aea225e8a49993d9`,
provided the broad phases. The refinement adds separate timings for Firebase's
first two saved-user reads and its subsequent saved-user write; the keys and
values are never logged. Final installed APK SHA-256:
`7fcc9830d72cb0700e856d46d1184429f8529aeac013dcb9c8714b6e00c69123`.

Both signed `armeabi-v7a` builds passed signature v2 verification and installed
with `adb install -r`, preserving pairing and preferences. TV TypeScript passed
before both builds. All 117 default TV tests passed after adding the broad
instrumentation; the refinement only adds storage milestones and passed
TypeScript. No backend deployment, dependency update or auth-policy change.

After all captures, device screenshot/hierarchy 96 showed the final installed
build with populated, readable cards and the saved solid background. The TV was
left on HomeScreen. No household data or preferences were edited during this pass.

## Sony results

All values below are milliseconds. Commit and frame-callback times start at
`js-entry`, **not the remote launch action**. Storage awaits, effects and fetch
awaits include JavaScript scheduling/native delivery delays; they are not pure
disk, CPU or wire timings. Every run logged `Dashboard cache: restored`.

| Capture | Auth init → ready | Local appearance | Cache read await | Cache validation | Cache apply → content effect | Cached content effect | Cached frame callback | Live content effect |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| timing-1, untraced | 3,796 | 27 | 698 | 3 | 726 | 6,813 | 7,414 | 10,322 |
| timing-2, untraced | 1,172 | 16 | 109 | 5 | 712 | 2,970 | 3,379 | 4,707 |
| timing-3, traced | 1,399 | 13 | 124 | 3 | 846 | 3,431 | 3,937 | 6,454 |
| auth-timing-1, untraced | 1,344 | 12 | 598 | 38 | 886 | 3,856 | 4,436 | 6,743 |
| auth-timing-2, untraced | 1,266 | 11 | 443 | 3 | 693 | 3,340 | 3,714 | 5,391 |

The final two runs split authentication further:

| Stage | auth-timing-1 | auth-timing-2 |
| --- | ---: | ---: |
| First secure saved-user read | 36 | 20 |
| Second secure saved-user read | 16 | 23 |
| Second read resolved → SDK begins saving validated user | 762 | 710 |
| Saved-user write | 27 | 30 |

The validation gap includes SDK/session/network processing and scheduling, not
an isolated HTTP measurement. It dwarfs secure-storage time in these samples.
The largest measured whole-auth wait was the first sample; it predates the
storage refinement, so its 3.8 seconds cannot be split more precisely.

Summary token awaits were 45–95 ms, fetch awaits 1.69–4.46 seconds, and the
following response/JSON stage 33–600 ms across these runs. Saved content committed
before the live response in every sample. Neither remote appearance nor the
summary response held up a restored cache. The minute-long loading state was
not reproduced. These sequential diagnostic runs are not a speedup comparison.

## Confirmed network gate and its limits

The installed Firebase SDK (`firebase` 12.19.0 / `@firebase/auth` 1.13.6) reloads
the stored user before completing initialization. A network failure permits
restoration of that user; other invalid-session errors can clear it. Our Root
waits for that auth callback before mounting the dashboard and reading its cache.
See the versioned [Firebase initialization source](https://github.com/firebase/firebase-js-sdk/blob/firebase@12.19.0/packages/auth/src/core/auth/auth_impl.ts).

A private local probe ran the actual installed React Native auth entry with
fictional persisted credentials and intercepted every fetch. It held only the
account-lookup response. Both storage reads completed while `auth.currentUser`
remained null and the initial callback did not fire. Releasing a successful
response, or a simulated network failure, released auth and restored the fixture
user. With simulated timers, the callback remained blocked at 59,999 ms and
restored the fixture user at the SDK's 60,000 ms network timeout. No real project,
account, TV connection or network setting was used in this probe.

This matches the SDK's [API timeout selection](https://github.com/firebase/firebase-js-sdk/blob/firebase@12.19.0/packages/auth/src/api/index.ts)
and [mobile-delay logic](https://raw.githubusercontent.com/firebase/firebase-js-sdk/firebase@12.19.0/packages/auth/src/core/util/delay.ts).
It confirms a potential one-minute **startup-screen** wait on a stalled auth
request. It does not prove this occurred on the Sony or explain the user's
specific report of already-visible loading cards. The dashboard's separate
15-second request timeout starts only after auth and provider mounting.

Do not bypass Firebase initialization or infer a signed-in account from a timer
or cached account ID. No such workaround was added. The installed milestones
can distinguish this gate from a late/missing cache or a delayed content commit
if the reported slow launch recurs; logs must be collected before they rotate.

## Native trace interpretation

The 22.15-second traced run retained approximate CPU totals of JavaScript
3,615 ms, main 3,168 ms, JIT 2,910 ms, native async queue 1,621 ms and RenderThread
1,552 ms. These span later refresh/artwork work as well as initial startup and
do not identify a particular component's cost.

Its longest concurrent GC lasted ~994 ms in wall time. Logcat reports only
486 microseconds paused; the event completed after the populated card effect
and frame callback. A one-second concurrent GC span must not be reported as a
one-second stop-the-world freeze. Long drawing/layout work remains worth
investigating, but this trace does not establish the earlier minute-long stall's
cause. The safe next investigation is a capture of that actual slow state using
the installed phases, plus more targeted first-commit rendering measurements.
