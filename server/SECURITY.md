# Security and retention setup

The Firestore Rules screenshot reviewed in October 2026 shows the default database
denying all client reads and writes. The same policy is now versioned in
`firestore.rules` and referenced by `firebase.json`. The Admin SDK used by Cloud
Functions bypasses Firestore Rules, so each HTTP handler still verifies a Firebase
ID token and uses its UID for user data.

## Deploy the versioned rules

From `server/`, review the target Firebase project and run:

```bash
firebase use
firebase deploy --only firestore:rules
```

Check the Rules tab afterwards. Do not replace this policy if another app in the
same Firestore database needs direct client access; merge its requirements first.

## Enable Firestore TTL

Cloud Functions set a `deleteAt` Firestore timestamp on temporary pairing state,
request counters, dashboard caches, shared weather caches, and Photos Picker
session documents. Enable a TTL policy for `deleteAt` on these collection groups
in the Google Cloud Firestore **Time-to-live** page:

- `device_codes`
- `oauth_states`
- `pair_attempts`
- `code_request_limits`
- `user_request_limits`
- `cache`
- `weather_cache`
- `appearance` (only picker documents have `deleteAt`)

The console's collection-group suggestions may omit groups with no documents yet.
Deploying the functions does not create these groups: `code_request_limits` is
written when a TV requests a new pairing code, `user_request_limits` when an
authenticated user requests a forced sync or city weather, and `weather_cache`
after a successful weather fetch. If the console will not accept a group name
typed into the field, open Cloud Shell in the `tv-homescreen-backend` project
and create the missing policies directly:

```sh
gcloud firestore fields ttls update deleteAt --collection-group=code_request_limits --database='(default)' --enable-ttl --project=tv-homescreen-backend
gcloud firestore fields ttls update deleteAt --collection-group=user_request_limits --database='(default)' --enable-ttl --project=tv-homescreen-backend
gcloud firestore fields ttls update deleteAt --collection-group=weather_cache --database='(default)' --enable-ttl --project=tv-homescreen-backend
gcloud firestore fields ttls list --database='(default)' --project=tv-homescreen-backend
```

The expiration offset is zero when omitted. Create policies only for groups
missing from the TTL table; a deployed function alone is not evidence that a
policy exists. New documents need a Firestore timestamp in `deleteAt` to expire.

TTL deletion is asynchronous and generally follows expiration within a day.
Existing documents without `deleteAt` are not affected. The account deletion
endpoint removes a user's stored credentials, dashboard cache, appearance, and
photos immediately through the Admin SDK.

## Account controls

The pairing site exposes controls to remove the stored Photos connection and
images, disconnect Calendar/Tasks/activity credentials, revoke Firebase sessions,
and delete the Firebase account and its user data. Revocation is enforced by the
Cloud Functions ID-token check; a TV that is displaying an old summary signs out
when its next API request receives `401` (normally within 45 seconds from the
appearance refresh). Disconnecting either Google data source also revokes sessions
so the TV clears old information.

Google can retain a previously granted OAuth consent after local credentials are
deleted. Users can also revoke HomeScreen in their Google Account's third-party
connections. A local TV sign-out removes that TV's local preferences but does not
disconnect all other devices.

## Operational follow-up

The public code endpoint has a per-IP best-effort quota, and signed-in weather
and forced-sync endpoints have per-user quotas. For public deployment, add an
edge rate limit and cost alerts, then review Cloud Functions, Firestore, and
Google API quotas. Test the account actions and Firestore deny rules in the
Firebase Emulator Suite before deployment. The repository does not contain a
service-account IAM policy or the currently deployed ruleset; verify both in the
target project.

## Dependency audit (October 2, 2026)

`npm audit --omit=dev` reports 8 high and 8 moderate advisories in the TV
dependency tree, 4 high in the pairing-site tree, and 8 moderate in the
backend tree. The high findings involve transitive `@grpc/grpc-js` from the
Firebase package and `node-forge` from Expo tooling. The backend moderate
finding involves transitive `uuid` from Google/Firebase libraries. The audit's
automatic `--force` suggestions include breaking major version changes; do not
apply those without compatibility testing. Track upstream fixes and repeat the
audit before release. The pairing site uses only Firebase Auth and App; its
current production bundle contains no `@grpc/grpc-js`, `getAuthContext`, or
`node-forge` signatures. Keep auditing the installed tree because build tooling
and future imports can change the exposure.
