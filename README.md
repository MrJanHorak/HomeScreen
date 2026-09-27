# HomeScreen — A Personal Dashboard for Smart TVs

**HomeScreen** is a personal project exploring what a Smart TV home screen could look like if it were designed around the people using it rather than advertising.

The original motivation is simple: I want a Smart TV screen that I don't mind leaving on.

Most Smart TV home screens are designed primarily as launchers for streaming services and often dedicate a significant amount of screen space to advertisements, sponsored content, and recommendations that may have little relevance to the viewer.

HomeScreen takes a different approach.

The goal is to create a calm, customizable dashboard that provides useful household information at a glance while still serving as a convenient starting point for entertainment.

> **The TV should remain useful even when nobody is actively watching it.**

---

## Project Vision

HomeScreen is intended to become a personal and household / dorm / work information dashboard designed specifically for a **10-foot TV experience**.

At a glance, the dashboard should be able to answer questions such as:

- What's happening today?
- What's on the calendar?
- What tasks still need to be completed?
- What's the weather?
- How active have I been today?
- What's for dinner?
- What were we watching?
- What should the family watch this weekend?

The interface should be simple enough to understand from across the room and easy to navigate using a standard TV remote.

---

## Design Philosophy

The project is built around a few core ideas:

- **Information at a glance**
- **No advertising**
- **User-controlled content**
- **Clear visual hierarchy**
- **Large, readable typography**
- **Simple D-pad navigation**
- **Customizable widgets and layouts**
- **Minimal interruptions**
- **Useful even when the TV is idle**

I have always appreciated software that allows users to make an interface their own — going all the way back to the customization available in the MySpace era.

HomeScreen follows that philosophy.

Rather than forcing every user into the same dashboard layout, the long-term goal is for users to decide which widgets appear, where they appear, and what information matters most to their household.

---

## Current Scope

The initial version of HomeScreen will focus heavily on integrations with Google services because they can provide much of the information needed for a useful household dashboard.

Potential widgets include:

- **Tasks / To-Dos**
  - Google Tasks
  - Upcoming tasks
  - Completed tasks

- **Calendar**
  - Today's schedule
  - Upcoming events
  - Family calendar information

- **Health & Activity**
  - Step count
  - Daily activity goals
  - Basic fitness statistics

- **Weather**
  - Current conditions
  - Today's forecast
  - Multi-day forecast

- **Meals**
  - Today's meal
  - Weekly meal plan
  - Family meal schedule

- **Photos & Backgrounds**
  - User-selected backgrounds
  - Google Photos integration
  - Rotating screensaver / ambient images

- **Family & Community Polls**
  - Movie of the week
  - Game of the week
  - Dinner choices
  - Family activity planning
  - Roommate or community event planning

For example, a household could keep a running poll throughout the week for Friday's movie night rather than trying to make the decision when everyone finally sits down.

---

## Widget-Based Dashboard

The dashboard will eventually be highly customizable.

Each piece of information will be represented by a **widget** that provides a concise overview.

For example:

```text
┌─────────────────────┐
│ Weather             │
│                     │
│ 72°F                │
│ Clear               │
│                     │
│ H: 78°   L: 61°     │
└─────────────────────┘
```

Selecting a widget with the TV remote should open a more detailed view.

For example:

```text
Dashboard
    │
    ├── Weather
    │      └── Detailed Forecast
    │
    ├── Calendar
    │      └── Weekly / Monthly View
    │
    ├── Tasks
    │      └── Task Management
    │
    ├── Activity
    │      └── Health Details
    │
    └── Media
           └── Watch / Continue Watching
```

The Home screen should remain intentionally simple while deeper screens provide additional information and controls.

---

## Customization

Long term, users should be able to determine both the **widgets** and the **layout** of their dashboard.

Possible customization options include:

- Enable or disable widgets
- Reorder widgets
- Choose widget sizes
- Select background images
- Configure data sources
- Configure profiles
- Choose which calendars appear
- Configure household polls
- Customize media sections
- Select ambient / screensaver modes

Because configuring these options with a TV remote could become tedious, a future companion web or mobile interface could provide easier dashboard management.

---

## Profiles

HomeScreen may eventually support multiple household profiles.

Each profile could have its own:

- Calendar
- Tasks
- Activity information
- Watchlist
- Continue Watching history
- Favorite widgets
- Dashboard layout
- Background preferences

The TV could then switch between personal dashboards while still supporting shared household information.

---

## Media Integration

A long-term goal is to make HomeScreen useful as an entertainment launcher without turning it into another advertising-driven recommendation screen.

Potential media features include:

- Continue Watching
- Recently Watched
- Personal Watchlist
- Favorite movies and shows
- Music shortcuts
- Family movie polls
- User-controlled recommendations

The goal is not to recreate Netflix, Disney+, Spotify, or other media services.

Instead, HomeScreen could act as a **personal media hub** that helps users return to content they have already chosen.

---

## Cross-App Deep Linking

One of the project's more ambitious goals is to launch content directly in installed streaming applications.

For example:

```text
HomeScreen
     │
     ▼
Continue Watching
     │
     ▼
"The Bear"
     │
     ▼
Streaming App
     │
     ▼
Episode
```

Where supported by the platform and streaming provider, cross-app deep linking could allow HomeScreen to launch movies, shows, music, or other media directly in the appropriate application.

This would allow HomeScreen to function as an alternative starting point to the default Smart TV launcher.

---

# Architecture

The initial architecture uses a React Native TV client backed by cloud services and Firebase.

```text
                        ┌─────────────────────────────────┐
                        │   React Native TV App (Client)  │
                        └────────────────┬────────────────┘
                                         │
       ┌─────────────────────┬────────────┼────────────┬─────────────────────┐
       │                     │            │            │                     │
       ▼                     ▼            ▼            ▼                     │
┌────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ Dashboard      │   │ Device OAuth   │   │ Remote         │   │ Background     │
│ Summary        │   │ & Pairing      │   │ Actions        │   │ Sync           │
└───────┬────────┘   └───────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                    │                    │                    │
        └────────────────────┴──────────┬─────────┴────────────────────┘
                                        │
                              ┌─────────▼──────────┐
                              │ Firebase Firestore │
                              └────────────────────┘
```

The architecture is designed around one important TV-specific requirement:

> **The dashboard should feel immediate when the TV turns on.**

Where practical, external data is synchronized and cached ahead of time so the TV does not need to wait for several external APIs before displaying the dashboard.

---

## Cloud Functions

### `getDashboardSummary`

**HTTP GET — High-Performance Dashboard Reader**

Fetches the information required to render the user's dashboard and returns it as a lightweight JSON payload.

Potential data includes:

- Calendar events
- Tasks
- Activity information
- Weather
- Meal information
- Polls
- Widget configuration

Where multiple external services must be queried, the backend can use `Promise.allSettled()` so a failure from one service does not prevent the rest of the dashboard from loading.

For example:

```text
Weather API ──────── ✓
Calendar API ─────── ✓
Tasks API ────────── ✕
Activity API ─────── ✓

                    │
                    ▼

Dashboard still renders available data.
```

Cached widget data can be stored in Firestore so the initial dashboard request does not depend entirely on live third-party API calls.

---

### `authDevice`

**HTTP POST — TV Authentication & Pairing Manager**

Handles account authorization and device pairing.

Typing usernames, passwords, and authorization information using a TV remote is a poor user experience, so authentication should be designed around a TV-friendly pairing process.

A typical flow could look like:

```text
TV
 │
 ▼
Display QR / Pairing Code
 │
 ▼
Phone or Computer
 │
 ▼
User Authorizes Account
 │
 ▼
Backend Receives Authorization
 │
 ▼
TV Becomes Connected
```

The backend is responsible for securely associating authorization credentials with the appropriate user or device.

Any long-lived credentials or refresh tokens should be encrypted and never stored directly on the TV client.

---

### `executeAction`

**HTTP POST — Remote-Control Interactions**

Handles actions initiated from the TV interface.

Examples include:

```text
TOGGLE_TASK
REFRESH_WIDGET
SWITCH_PROFILE
SUBMIT_POLL
```

Possible actions:

- Mark a task as complete
- Refresh a widget
- Switch the active profile
- Submit a poll response
- Update a dashboard preference

Keeping these operations behind a consistent action API allows TV components to remain relatively simple.

---

### `syncUserData`

**Scheduled Background Synchronization**

Runs periodically in the cloud to refresh data from connected services.

Possible synchronized data includes:

- Calendar events
- Tasks
- Activity metrics
- Weather
- Household information

The updated data is written to Firestore before the TV requests it.

```text
External Services
       │
       ▼
syncUserData
       │
       ▼
   Firestore
       │
       ▼
getDashboardSummary
       │
       ▼
      TV
```

This approach reduces the number of external API calls required during dashboard startup and helps minimize visible loading states.

---

## Performance Philosophy

A television dashboard should not behave like a traditional web page that displays several loading spinners while waiting for independent API requests.

Whenever possible, HomeScreen should follow this pattern:

```text
Synchronize → Cache → Display → Refresh
```

rather than:

```text
Open App → Call APIs → Wait → Wait → Wait → Display
```

Cached information can appear immediately while newer information is refreshed in the background.

---

## Target Platform

HomeScreen is being designed primarily for:

- Smart TVs
- Android TV
- Google TV
- TV-focused React Native applications

The primary design target is:

**3840 × 2160 (4K UHD)**

The interface should remain resolution-independent so that it can scale appropriately to other common TV resolutions, including **1920 × 1080**.

The design assumes a typical **10-foot viewing distance**, meaning controls and information must remain understandable from across a room.

---

## Technology

The project currently explores technologies including:

```text
React Native
React Native TV
TypeScript
Firebase
Firestore
Cloud Functions
Google APIs
OAuth 2.0
```

Additional services and APIs will likely be introduced as individual widgets are developed.

---

# Future Ideas

HomeScreen is intentionally an experimental project, so the feature set may evolve considerably.

Some ideas include:

### Ambient Mode

When the dashboard is inactive, the TV could transition into a minimal information or photo display containing:

- Time
- Weather
- Upcoming event
- Photos
- Artwork
- Astronomy imagery
- Minimal household information

### Smart Home

Possible future integrations include:

- Lights
- Thermostats
- Door sensors
- Garage status
- Cameras
- Home Assistant

### Companion App

A web or mobile companion could make it easier to:

- Configure dashboards
- Reorder widgets
- Manage profiles
- Create polls
- Select backgrounds
- Connect services
- Configure media shortcuts

### Universal Search

A future search system could allow queries such as:

```text
What's happening tomorrow?

What's the weather this weekend?

What movie did we vote for?

What tasks do I still have?

What was I watching last night?
```

---

# Long-Term Goal

The larger idea behind HomeScreen is not simply to build another Smart TV launcher.

It is to explore what a television home screen could become if it were treated as a **personal household dashboard**.

A TV occupies one of the largest and most visible screens in many homes. Even when nobody is watching a movie or television show, that screen could still provide useful information.

HomeScreen aims to make that space:

**Personal. Useful. Calm. Customizable. Ad-free.**

The TV should work for the household — not the advertisers.