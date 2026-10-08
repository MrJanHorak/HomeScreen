# People and shared activity

Implemented in source: Settings → People on the TV and `/people` on the
companion site. Deploy the backend and companion and install the updated TV
app together before using this feature.

## Household flow

1. The dashboard owner opens People and selects **Add person**. The TV displays
   an invitation QR; the companion supplies a link to copy. The link is a
   bearer invitation: anyone receiving it can accept. It expires after 30
   minutes, accepts one person, and can be cancelled before use.
2. The participant opens the invitation on their phone, signs in with their own
   Google account, enters their shared name and individual goals, explicitly
   approves sharing, and completes Google activity consent. Selecting the
   dashboard owner's account fails with a prompt to switch accounts.
3. Connecting makes **Activity · Name** available in Dashboard Studio; it does
   not rearrange the saved dashboard. Add one activity widget per person, then
   hide, resize, position, and style each independently. The TV People page can
   also show or hide each person's activity widget. A widget opens that person's
   detail view and seven-day history.
4. The participant opens People to **Stop sharing** with an individual
   dashboard, or disconnect their activity connection to stop all sharing. The
   dashboard owner can remove someone from People on the companion or TV.

All TVs linked to the dashboard account share its people and layout. Only
activity is shared; invitations do not pair a new TV, change the TV's login, or
grant dashboard-editing, Calendar, Tasks, Photos, or meal access. A participant's
name, steps, distance, calories, move minutes, goals, and seven-day history are
visible to anyone viewing those TVs. Name and goals belong to the participant;
reconnecting updates their shared name across their existing activity shares.
Goals for the original owner's legacy activity card remain in Weather & goals.
Goals for the separate sharing connection live in People.

## Storage and authorization

- `activity_invitations/{sha256(token)}` stores dashboard identity, expiry, and
  authorization version. The raw invitation token is never stored. Acceptance
  consumes the invitation in the same transaction that saves the connection
  and membership. The configured `deleteAt` TTL removes expired invitations;
  application code enforces expiry even before Firestore removes the document.
- `activity_shares/{hash(dashboardUid, participantUid)}` records the sharing
  grant. Limits are 12 other people per dashboard and 12 shared dashboards per
  participant. Display capacity remains eight visible widgets in automatic
  rows or twelve fitting the free canvas, including all other widget types.
- `users/{participantUid}/activity/connection` holds their separately encrypted
  Google credentials, provider, name, goals, and connection revision. The TV and
  dashboard owner never receive these credentials or the participant's Firebase
  UID. Google OAuth retains PKCE, single-use state, identity matching, scope
  validation, and the account deletion/disconnect authorization barrier.
- Activity caches are scoped to participant and TV timezone, expire after ten
  minutes, and refresh at a local-day boundary. Provider failures affect only
  that person's card. Grant, connection revision, and account deletion are
  checked again after provider/cache reads before sending the feed.
- `peopleActivity` is separate from the original ten-minute dashboard summary
  cache. Updated TVs request it every 30 seconds. Shared health exists only in
  TV memory and clears on a failed refresh, after 45 seconds without a valid
  refresh, when backgrounded, or when the account changes. Removal normally
  clears on the next poll; during an outage the 45-second expiry prevents the
  last successful snapshot staying on screen indefinitely. Existing TVs do not
  receive another person's metrics through the legacy activity card.
- Removing a share retains the participant's private connection/cache for
  other authorized dashboards, but the removed dashboard can no longer read
  it. Disconnect deletes that participant's connection/caches and contributed
  shares. Account deletion also deletes their owned shares and invitations.
  An unavailable widget retains geometry and can be hidden or removed; it
  never falls back to displaying the owner's data.

Existing Firestore client rules deny direct access to all collections; these
features use authenticated Functions. Invitations can be created from an
already paired TV. Participant consent, own goals, and disconnect require a
Google browser session. A TV can remove only its dashboard's members.

## Deployment

Use the existing Google OAuth client, callback URL, `PAIRING_URL`,
`GOOGLE_CLIENT_SECRET`, and `TOKEN_ENCRYPTION_KEY` settings. The new activity
consent asks only for OpenID/email and Fit activity/location read scopes. No
additional Google permission is required simply to manage the layout.

From `server`, deploy Functions, Hosting, and the TTL configuration:

```powershell
firebase deploy --only functions,hosting,firestore:indexes
```

New Functions are `people`, `peopleActivity`, and `beginGoogleActivity`; the
existing `googleOAuthCallback` and `accountSecurity` also change. Hosting adds
the `/people` rewrite. Build and install the updated TV app using
`HomeScreen/RELEASE.md`. Keep existing deployed TTL policies when reviewing the
index deployment.

Then verify with two real accounts: invite from the owner TV, accept on the
participant phone, add the card, verify each person's numbers and detail view,
stop sharing while the TV stays open, and verify removal within 45 seconds.
Also check cancellation, wrong-account consent, an expired invitation, a full
layout, and an offline TV. Automated coverage uses mocked Google responses;
live consent and a physical remote still need this deployment smoke test.

## Activity provider transition

This version preserves Google Fit REST to work with the current project's
existing setup. Google says Fit APIs are supported only through the end of
2026: [migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit).
The connection records a provider, and provider/cache handling is centralized
in `sharedPersonActivity` so membership and widget identity can survive a later
adapter change. Google Health API project eligibility and metric coverage must
be checked before migration; the current site says new projects are not being
onboarded: [Google Health API](https://developers.google.com/health).
Health Connect would require a phone app that uploads summaries.
