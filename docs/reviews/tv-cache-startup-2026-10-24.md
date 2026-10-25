# Sony cached startup — October 24, 2026

The user reported all dashboard cards loading on opening the Sony app, with
data arriving roughly a minute later. It is unknown whether this also happens
on an immediate reopen. This report does not establish the original delay fixed.

## Observations before the change

ADB reconnected to the existing Sony at `192.168.1.103:5555`. Its installed APK
SHA-256 was `810c2f08b3e28e6253bedcf7e3322666169cad8ceb63760c99ab67bc3281ec2b`,
matching the October 23 ambient fix. The paired dashboard was already foreground.
No relevant errors appeared in the filtered ReactNativeJS log buffer.

Two force-stop/reopen checks retained the paired account. In the timed second
check, Android activity launch WaitTime was 1,483 ms. Screenshots were captured
approximately 3.8, 8.0, 12.5 and 18.9 seconds from the start of the probe. The
first showed a blank launch surface, the second the header and empty card frames,
and the later two populated information cards, media and favorite apps. Those
captures do not prove whether disk or the network supplied the summary, and
activity launch timing does not measure data readiness. The minute-long wait
was not reproduced. No network settings or account data were changed.

## Source change

The previous loader rejected snapshots more than 24 hours old. A daily opening
slightly later than the previous day's use could therefore require a network
startup. This is a plausible explanation, not a measured cache-miss cause on
this installed release, which lacked cache-result diagnostics.

- Extend the existing account-scoped snapshot restoration window to seven days,
  measured from the original source timestamp. No schema migration or additional
  cache is introduced; sign-out/revocation cleanup and size/shape validation stay
  in place. First-ever startup and older snapshots still need a connection.
- Label restored data with its last-updated date/time and Updating while waiting
  for live data; clear the notice on a successful response. Failed refreshes
  continue to show retry status. The footer occupies the existing reserved space.
- Log cache outcome categories without account identifiers, contents or tokens,
  including missing/expired/incompatible entries and storage failures.

This does not resolve provider failures becoming empty Calendar/Tasks lists,
persist secondary-city weather or People/Polls feeds, or establish faster native
startup. Saved tasks/activity can be out of date, as the footer now makes explicit.

## Validation

All 113 default TV tests and the TV TypeScript check passed. Tests include
one-, two- and six-day snapshot restoration without timestamp renewal, expired
and malformed rejection, account isolation/removal ordering, disk/network races,
offline recovery, and the saved-data footer's pending/failure/success states.

Raw screenshots, probe output and build/test logs are under the ignored
`artifacts/tv-baseline-2026-10-23/` directory because they include household data.

## Signed build and device follow-up

The release APK built successfully and passed APK Signature Scheme v2 verification
with the existing HomeScreen Upload certificate. APK SHA-256:
`1c51901c69abfa6496fe794f906ec8406fd61cf80e2b5362646439a104f9a550`.
It was installed successfully with `adb install -r`; pairing, layout and favorites
were retained. No backend or companion deployment was involved.

The updated app's cold activity launch WaitTime was 1,170 ms. Screenshots at
approximately 3.1, 7.3, 11.9 and 18.4 seconds from probe start again show startup,
empty card frames, then the populated dashboard. The new release emitted
`Dashboard cache { result: 'restored' }` at 22:25:41 local time. This establishes
that the existing on-device snapshot passes validation and is restored on this
run. The populated cards later include updated activity/weather values.
It does not establish a native startup speedup or explain the reported longer
delay. The pending-refresh footer was not captured before the live response;
its transition is covered by the component test. Multi-day restoration is
covered by the cache tests rather than changing the TV clock or stored data.
Offline restart and an actual next-day opening remain to be verified.

The Sony was left awake on the populated dashboard. Logs and screenshots for the
updated build use the `cache-after` prefix in the same ignored artifact directory.
