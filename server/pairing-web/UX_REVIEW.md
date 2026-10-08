# Companion UX review and settings parity

## October 7 update: navigation and poll workflow

The companion now uses a shared application shell instead of a large setup card
on every route. Desktop navigation groups Dashboard and Polls, TV content, and
account/setup actions. Phones use the same links in a compact grid. Account identity
and switching sit in the header. Page titles describe the destination; explanatory
copy stays short and the controls follow directly. The root URL opens Dashboard.

Polls have one editing step at a time: New poll → save question → choose TV and
closing rule → Start voting → Add to dashboard. Saved questions, live voting, and
history use separate library views. Reusable React components own question editing,
starting, saved-question cards, and voting-result cards. Advanced privacy settings
and round-management actions use disclosure; invitation codes and pending review
stay visible where the owner needs them. Tabs support arrow-key navigation.

Dashboard provides Add a poll above the editor, with the requested voting round
preselected from a poll's link. Adding automatically preserves/upgrades the existing
layout. The preview and controls remain together; draft status, undo/redo, and Save
to TV appear above them. Photo selection lives beside background settings. Linked
TVs precede connected services in account management. Data deletion remains inside
its explicit management disclosure and confirmation flow.

The reported startup failure exposed missing secret bindings in all three poll
HTTP trigger definitions. These are now explicit and checked in the deployment
manifest test, following [Firebase's secret binding requirements](https://firebase.google.com/docs/functions/config-env).
Configuration is validated before a round is committed; start retries carry one
request ID. A successful mutation followed by a failed library refresh is reported
as saved, keeping its next-step link, rather than inviting another submission.

Browser checks cover all six pages at 320, 390, 768, 1024, and 1440 pixels, along
with draft recovery, saving, account isolation, Photos, poll setup, repeat-start
recovery, and independent widget styles. Phone/desktop screenshots are inspected
to adjust hierarchy, control widths, and save placement. These are local source
and fixture checks; production logs, deployment, real Google consent, physical TV
scanning, and user usability sessions have not been verified in this update.

The October 4 review below records the earlier settings-parity work.

Reviewed October 4, 2026 against the companion source, TV settings, authenticated API contracts, and local browser screenshots. The browser runs use mocked sign-in and API responses. Production Google consent, Photos downloads, and physical TV interaction still require a release smoke test.

The existing dark palette, restrained accent, clear labels, and live dashboard preview were a good visual foundation. The original companion did not yet offer complete settings parity: weather cities and favorite apps were local to the TV, photo selection started on the TV, and ambient preferences had no companion controls. Pairing and meal setup stayed in a narrow phone card on larger screens. Repeated account sections and prominent destructive actions also competed with the main task.

The revised experience follows established usability patterns: task-based navigation, one primary task per page, visible save feedback, explicit draft/publish boundaries, keyboard alternatives to dragging, and progressive disclosure for advanced options and longer instructions. This is a stronger, more consistent implementation. “Better than industry standard” needs evidence from real user testing; this review is not a WCAG conformance certification.

## Findings addressed

| Finding | Change and purpose |
| --- | --- |
| Missing TV settings | Added shared weather cities and active/default selection, ambient preferences, Google Photos picking, and per-TV favorite-app visibility, selection, and order. |
| Pairing page also acted as settings/account page | Added Weather & goals and TVs & account routes. Pairing now concentrates on connecting a TV; meal setup stays on Meals. |
| Narrow desktop forms | All pages use the same bounded responsive shell. Pairing, weather, and meal forms gain adjacent guidance on tablets/laptops. TV/account cards and photo galleries gain columns as space allows. |
| Too much instruction text at once | Short help stays beside the input. Detailed photo, meal, ambient, and location explanations use native expandable sections, which work by touch and keyboard. Essential instructions do not depend on hover tooltips. |
| Accidental destructive actions | Service removal and account deletion sit inside a separate expandable section, with explicit effects in the existing confirmations. Removing one TV remains distinct from revoking all sessions. |
| Ambiguous save behavior | Dashboard and ambient changes use existing autosaved drafts and Save to TV. Weather/goals and favorites have explicit saves. Photo selection immediately stores media; publishing the chosen source still uses Save to TV. The UI explains that distinction. |
| Risk of overwriting another device | Weather and favorites use transactional revision checks. A conflict keeps companion edits visible until the user explicitly reloads. Existing appearance conflict protection remains in place. |
| Preview/control obstruction | The floating publish bar no longer covers the preview or card controls at any width. Mobile preview scrolls with the page, and canvas help is no longer clipped. |
| Touch/keyboard friction | Standard controls have visible focus; main actions and navigation have 44px minimum heights. Labels, live statuses, native dialogs, reduced-motion handling, and a skip link remain available. Reordering retains arrow controls. |

## Persistent TV settings coverage

| TV setting | Companion location | Scope |
| --- | --- | --- |
| Palette, accent, background color and source, photo zoom | Dashboard → Colors and background | All TVs on the account |
| Layout preset, card order, visibility, widths, free positions/sizes | Dashboard → Layout and cards | All TVs on the account |
| Card surfaces, opacity, borders, corners | Dashboard → Card style | All TVs on the account |
| Ambient on/off, idle delay, source, slideshow timing, flow colors, information and rotation timing | Dashboard → Ambient mode | All TVs on the account |
| Google photo selection, saved image preview, choose a saved background | Dashboard → Photos | Account gallery; up to eight selected images |
| Saved weather cities, active city, default city, remove city | Weather & goals | All TVs on the account |
| Activity targets | Weather & goals → Activity goals | All TVs on the account |
| Meal Sheet connection and removal | Meals | All TVs on the account |
| Favorite apps, show/hide row, ordering | TVs & account → a linked TV → Favorite apps | Selected TV only |
| TV name and individual sign-out | TVs & account → Linked TVs | Selected TV only |
| Connections, all-device sign-out, account deletion | TVs & account | Account-wide |

Ambient preview, launching installed apps, and the TV’s immediate Refresh Live Data action still execute on the TV. They are device actions rather than stored settings. This change does not create a remote-control service or manage Android system settings outside HomeScreen. The companion provides contextual directions for ambient preview.

## Accessibility and visual checks

Browser regression checks cover every route at 320, 390, 768, 1024, and 1440 CSS pixels with no document-level horizontal overflow. Screenshots at phone, tablet, and laptop sizes were visually inspected; the mobile preview overlap was fixed during that inspection. Existing studio tests check editing, undo/redo, draft recovery, and conflicts. New browser flows check weather saves/conflicts, ambient publishing, both photo picker purposes, and per-TV favorites.

Verification completed: 66 backend tests, 10 browser tests, 6 existing TV card tests, companion production build, TV TypeScript check, and backend lint. Browser coverage also includes expired photo session guidance and stopping/clearing photo selection on sign-out.

The review uses [WCAG 2.2 reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) as references. The chosen 44px heights for primary controls exceed the 24px AA minimum target-size dimension, but no blanket target-size or accessibility certification is claimed: compact canvas controls, custom photo backgrounds, actual screen-reader behavior, zoom, and focus visibility under all scroll states need broader accessibility testing. Existing theme/card contrast tests remain in the backend suite; arbitrary translucent photo surfaces depend on the image beneath them.

The Photos implementation follows [Google’s picker session model](https://developers.google.com/photos/picker/guides/sessions): open the returned picker URL, poll using the server’s interval, save only completed selections, and provide restart/error instructions. Companion polls include the session ID so they cannot finish a newer picker accidentally; downloaded media commits also verify the session is still current.

## Release and remaining validation

Deploy Hosting and the Functions together, including the new `userPreferences` and `deviceApps` endpoints and the updated Photos handler/callback. Distribute the updated TV app for two-way weather/favorite synchronization. Old TVs can still use existing APIs, but cannot receive these new shared settings until updated. The updated TV imports local weather cities only when the account has no saved cities; local favorite apps seed only an empty per-TV record. Polls normally run every 45 seconds. Activity card data uses its existing dashboard refresh interval.

Before describing this as a polished public release, smoke-test real Google sign-in and Photos consent/selection on iOS Safari and Android Chrome, then verify a physical TV receives weather, ambient, and favorite changes. A small usability study should measure whether people can distinguish draft/publish and active/default city, find Photos, and recover from an expired picker without assistance. Weather currently accepts a city query; city-result autocomplete/geocoding would be a useful subsequent improvement for ambiguous names.
