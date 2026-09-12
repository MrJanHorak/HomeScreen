# TV Dashboard UI Design Specification

## Project Vision

This application is a **personal, ad-free household information and entertainment dashboard designed specifically for a 10-foot TV experience**.

The TV should not feel like another advertising platform or a traditional streaming-service launcher.

> **The TV belongs to the family, not the advertisers.**

The application should provide useful information when nobody is actively watching TV while also making it easy to access personal entertainment when desired.

The experience should feel:

* Calm
* Personal
* Cinematic
* Useful
* Uncluttered
* Family-oriented
* Easy to operate with a remote
* Designed specifically for a 10-foot viewing distance

---

# 1. Design Philosophy

## The TV Is an Information Surface

The application should answer:

> **"What's going on right now?"**

without requiring the user to open several applications.

The Home screen should provide a quick view of:

* Current time
* Date
* Weather
* Today's schedule
* Activity
* Continue Watching
* Upcoming events
* Optional household information

The application should avoid unnecessary feeds, advertisements, notifications, and visual noise.

---

# 2. 10-Foot UI Principles

This is a TV application, not a phone application scaled up.

## Large Typography

Recommended starting sizes:

| Type            |    Size |
| --------------- | ------: |
| Display / Clock | 72–96px |
| Hero            | 48–64px |
| H1              | 36–44px |
| H2              | 28–32px |
| Body            | 20–24px |
| Labels          | 16–18px |

These values are starting points and should be adjusted based on actual TV testing.

## Generous Spacing

Use larger spacing than a typical mobile application.

```ts
const tvSpacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
};
```

## Clear Focus

Every interactive element must make its focused state immediately obvious.

Example:

```text
NORMAL                         FOCUSED

┌───────────────┐              ┏━━━━━━━━━━━━━━━┓
│               │              ┃               ┃
│    WEATHER    │      →       ┃    WEATHER    ┃
│      72°      │              ┃      72°      ┃
│               │              ┃               ┃
└───────────────┘              ┗━━━━━━━━━━━━━━━┛
```

Focus can be represented through:

* Scale
* Border
* Shadow/elevation
* Brightness
* Background change
* Animation

Do not rely on subtle focus indicators.

---

# 3. Technology Foundation

The application should use:

* React Native
* `react-native-tvos`
* React Navigation
* React Native Reanimated
* A lightweight design system built specifically for this application

The TV-specific React Native functionality should handle:

* D-pad navigation
* Focus and blur
* TV-specific scrolling
* Focus guides
* Preferred focus
* Directional navigation

The application should not depend on a traditional mobile component library to solve TV navigation.

General component libraries can be used for primitives, but TV behavior should belong to the application's own TV component layer.

---

# 4. Application Navigation

Primary navigation should remain small.

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         CONTENT                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Home     Calendar     Watch     Favorites     Settings     │
└─────────────────────────────────────────────────────────────┘
```

Primary pages:

1. Home
2. Calendar
3. Watch
4. Favorites
5. Settings

Secondary features should live inside these sections.

---

# 5. Home Screen

## Purpose

The Home screen is the central household dashboard.

It should answer:

> **"What do I need to know right now?"**

### Suggested Layout

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Good evening, Jan                         8:42 PM           │
│  Wednesday, September 9, 2026              72°  Clear        │
│                                                              │
├────────────────────┬────────────────────┬────────────────────┤
│                    │                    │                    │
│      WEATHER       │       TODAY        │      ACTIVITY      │
│                    │                    │                    │
│       72°          │   8:00  Morning    │     7,842 steps   │
│       Clear        │  10:30  Meeting    │                    │
│                    │   4:30  Pick up    │       ◯ 6.2 mi    │
│                    │                    │                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  CONTINUE WATCHING                                           │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │  DUNE  │ │  BEAR  │ │ FALLOUT│ │STRANGER│ │MANDALO │     │
│  │ █████░ │ │ ███░░░ │ │ ██████░ │ │ ██░░░░ │ │ ████░░ │     │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Home       Calendar       Watch       Favorites       ⚙     │
└──────────────────────────────────────────────────────────────┘
```

## Home Widgets

Initial widgets:

* Greeting
* Clock
* Date
* Current weather
* Weather forecast
* Today's calendar
* Tomorrow's calendar
* Activity / steps
* Continue Watching

Future widgets:

* Traffic
* Smart-home status
* News
* Sports
* Reminders
* Countdown
* Home temperature
* Air quality
* Favorite locations
* Custom widgets

---

# 6. Calendar Page

## Purpose

Provide a TV-friendly view of upcoming personal events.

The calendar should be more useful than simply displaying a traditional monthly calendar.

### Monthly View

```text
┌──────────────────────────────────────────────────────────────┐
│  ←  CALENDAR                                    SEPTEMBER    │
│                                                              │
│             < September 2026 >                              │
│                                                              │
│  SUN    MON    TUE    WED    THU    FRI    SAT              │
│                  1      2      3      4      5               │
│   6      7      8      9     10     11     12               │
│                         ● TODAY                              │
│  13     14     15     16     17     18     19               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  WEDNESDAY · SEPTEMBER 9                                    │
│                                                              │
│  8:00 AM     Morning routine                                │
│  10:30 AM    Team meeting                                   │
│  12:00 PM    Lunch                                           │
│  4:30 PM     Pick up                                         │
│                                                              │
│  TOMORROW                                                     │
│  9:00 AM     Dentist                                         │
│  6:00 PM     Dinner                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Week View

A TV-specific week view should also be available.

```text
TODAY        THU 10       FRI 11       SAT 12
─────────────────────────────────────────────────
Morning      Dentist       —             —
Afternoon    Work          Meeting       —
Evening      Dinner        —             Movie
```

The week view may be more useful than a traditional calendar when viewed from across a room.

---

# 7. Watch Page

## Purpose

Provide a personal media dashboard rather than attempting to become another streaming service.

The Watch page should focus on things the user has deliberately watched or saved.

## Continue Watching

```text
CONTINUE WATCHING

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │ │          │
│   DUNE   │ │ THE BEAR │ │ FALLOUT  │ │ STRANGER │
│          │ │          │ │          │ │  THINGS  │
│ ██████░░ │ │ ███░░░░░ │ │ █████░░░ │ │ ██░░░░░░ │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Watch Sections

### Continue Watching

Shows and movies that have been started but not finished.

### Watchlist

Media explicitly saved by the user.

### Recently Watched

A history of recently viewed content.

### Suggestions

Optional recommendations based on the user's interests.

Recommendations should be intentionally restrained.

Avoid turning the application into an endless recommendation feed.

The goal is:

> **"Here are a few things you might enjoy."**

not:

> **"Here are hundreds of things competing for your attention."**

---

# 8. Favorites Page

Favorites should be more than a movie favorites list.

It should become a **personal information dashboard**.

Example:

```text
FAVORITES

┌─────────────────────┐ ┌─────────────────────┐
│                     │ │                     │
│       WEATHER       │ │      CALENDAR       │
│        72°          │ │     3 events        │
│                     │ │                     │
└─────────────────────┘ └─────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐
│                     │ │                     │
│     MY WATCHLIST    │ │       ACTIVITY      │
│        12           │ │    7,842 steps      │
│                     │ │                     │
└─────────────────────┘ └─────────────────────┘
```

Eventually users should be able to pin widgets such as:

* Weather
* Calendar
* Activity
* Watchlist
* Favorite movies
* Sports
* Traffic
* Smart lights
* Home temperature
* News
* NASA imagery
* Countdown timers
* Quotes
* Reminders
* Custom API data

The concept is:

> **My TV should show me the information I care about.**

---

# 9. Settings Page

Settings should use large TV-friendly cards rather than a dense traditional settings list.

```text
SETTINGS

┌─────────────────────┐ ┌─────────────────────┐
│ 👤 PROFILES         │ │ 🎨 APPEARANCE       │
│ Family members      │ │ Theme & background  │
└─────────────────────┘ └─────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐
│ 🧩 WIDGETS          │ │ 🔌 CONNECTIONS      │
│ Customize Home      │ │ APIs & services     │
└─────────────────────┘ └─────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐
│ 📺 DISPLAY          │ │ 🌙 AMBIENT MODE      │
│ Brightness/layout   │ │ Screensaver         │
└─────────────────────┘ └─────────────────────┘
```

Settings areas:

* Profiles
* Appearance
* Home customization
* API connections
* Display
* Ambient mode
* Notifications
* Privacy
* About

---

# 10. Profiles

Profiles allow the TV to become personal to different members of the household.

Example:

```text
WHO'S USING THE TV?

        👨 Jan          👩 Family Member

        👧 Family       👦 Family

              + Add Profile
```

A profile can control:

* Greeting
* Calendar
* Watchlist
* Continue Watching
* Recommendations
* Favorites
* Widgets
* Preferences

The Home screen can therefore change from:

> Good evening, Jan

to:

> Good evening, Bro

while retaining shared household information.

---

# 11. Home Customization

Customization should eventually be a first-class feature.

```text
CUSTOMIZE HOME

Choose which widgets appear and their order.

┌──────────────────────────────────────────────┐
│ ☁ WEATHER                         ON     ≡   │
├──────────────────────────────────────────────┤
│ 📅 CALENDAR                       ON     ≡   │
├──────────────────────────────────────────────┤
│ 👟 ACTIVITY                        ON     ≡   │
├──────────────────────────────────────────────┤
│ 🎬 CONTINUE WATCHING              ON     ≡   │
├──────────────────────────────────────────────┤
│ 📰 NEWS                             OFF    ≡   │
├──────────────────────────────────────────────┤
│ 🚗 TRAFFIC                          OFF    ≡   │
└──────────────────────────────────────────────┘

                 + ADD WIDGET
```

Because this is a TV interface, don't require traditional drag-and-drop.

Use D-pad actions:

* Move Up
* Move Down
* Move Left
* Move Right
* Enable
* Disable

---

# 12. Ambient Mode

Ambient Mode is an important part of the application's identity.

When the TV has been inactive for a configurable period, the interface should transition into a calm information display.

The TV becomes useful even when nobody is actively watching it.

## Information Mode

```text
                         72°

                    GOOD EVENING

                       8:42 PM

                  Wednesday
                  September 9

              ─────────────────

                    ☁ Clear

               7,842 steps today
```

## Schedule Mode

```text
                       8:42 PM

                    72° · Clear

              ─────────────────────

                     Tomorrow

              9:00 AM    Dentist
              6:00 PM    Dinner

              ─────────────────────

                    7,842 steps
```

## Photo / Art Mode

Display:

* Personal photos
* Artwork
* Landscape photography
* NASA imagery
* User-selected backgrounds

Information can remain subtle and optional.

---

# 13. Smart Home Page

This can be added later.

The TV could eventually become a household control/status screen.

```text
HOME

TEMPERATURE

72° inside
68° outside

────────────────────────────────

LIGHTS

Living Room        ● ON
Kitchen            ○ OFF
Bedroom            ○ OFF

────────────────────────────────

DEVICES

TV                 ● ON
Front Door         ● Locked
Garage             ● Closed
Thermostat         72°
```

Potential future integration:

* Home Assistant
* Smart lights
* Thermostats
* Door locks
* Garage
* Cameras
* Sensors

This should be treated as an expansion rather than an MVP requirement.

---

# 14. News / Information

News should remain optional.

The application should not become another infinite scrolling news feed.

Potential layout:

```text
TODAY'S BRIEF

LOCAL
3 important things happening nearby

WEATHER
Clear · 72°

WORLD
3 headlines

TECH
2 headlines

SPORTS
Your teams
```

The philosophy is:

> **Information you chose to see.**

---

# 15. Search

A future universal search could search across both personal data and external APIs.

```text
SEARCH

[________________________________]

Try:

"Dune"
"Tomorrow"
"Weather"
"Calendar"
```

Potential natural-language queries:

* "What's on my calendar tomorrow?"
* "When did I last watch Dune?"
* "What's the weather Saturday?"
* "Show my watchlist."
* "What did I watch last night?"

AI integration can be added later without making AI the central purpose of the application.

---

# 16. Focus Architecture

Focus management is one of the most important parts of the application.

Every interactive component should have predictable directional behavior.

Example:

```text
                    WEATHER
                       ↑
                       │
        CALENDAR ←── CURRENT ──→ ACTIVITY
                       │
                       ↓
                CONTINUE WATCHING
```

Avoid situations where pressing a D-pad direction causes focus to jump somewhere unexpected.

Use TV-specific React Native functionality such as:

* `TVFocusGuideView`
* `hasTVPreferredFocus`
* `nextFocusUp`
* `nextFocusDown`
* `nextFocusLeft`
* `nextFocusRight`
* TV-aware `Pressable`
* Focus/blur events

---

# 17. Application Component Library

Rather than depending entirely on a generic UI library, create a small internal TV design system.

Suggested structure:

```text
src/
└── components/
    └── tv/
        ├── TVButton.tsx
        ├── TVCard.tsx
        ├── TVIconButton.tsx
        ├── TVNavigation.tsx
        ├── TVFocusRow.tsx
        ├── TVFocusGrid.tsx
        ├── TVCarousel.tsx
        ├── TVModal.tsx
        ├── TVSection.tsx
        ├── TVText.tsx
        └── TVScreen.tsx
```

Example usage:

```tsx
<TVScreen>

  <TVSection title="Weather">
    <WeatherCard />
  </TVSection>

  <TVSection title="Today">
    <CalendarCard />
  </TVSection>

  <TVSection title="Continue Watching">
    <TVCarousel>
      <MovieCard />
      <MovieCard />
      <MovieCard />
    </TVCarousel>
  </TVSection>

</TVScreen>
```

---

# 18. TVCard

`TVCard` should automatically provide consistent focus behavior.

Example:

```tsx
<TVCard
  title="Weather"
  onPress={openWeather}
>
  ...
</TVCard>
```

The component should manage:

* Focus state
* Scale animation
* Border
* Shadow/elevation
* Press feedback
* Accessibility
* D-pad interaction

This means the entire application gets consistent interaction behavior.

---

# 19. TVText

Use semantic typography rather than arbitrary font sizes throughout the application.

Example:

```tsx
<TVText variant="display">
  8:42 PM
</TVText>

<TVText variant="hero">
  Good evening
</TVText>

<TVText variant="heading">
  Continue Watching
</TVText>

<TVText variant="body">
  Your next event is at 9:00 AM
</TVText>

<TVText variant="label">
  Weather
</TVText>
```

Suggested variants:

* `display`
* `hero`
* `heading`
* `subheading`
* `body`
* `label`
* `caption`
* `clock`

---

# 20. TVCarousel

Carousels are particularly useful for:

* Continue Watching
* Watchlist
* Recently Watched
* Suggestions
* Favorites

The carousel must be fully usable with the D-pad.

Expected behavior:

```text
← previous       [CURRENT]       next →
```

When focus reaches the edge, the carousel should scroll naturally to reveal the next item.

---

# 21. Visual Style

The visual direction should be:

### Cinematic

Use rich photography or subtle animated backgrounds.

### Dark

A dark UI works well in a living-room environment and allows content cards to stand out.

### Translucent

Use dark translucent surfaces over backgrounds when appropriate.

Example:

```text
Background
     ↓
┌──────────────────────────────┐
│ rgba(10,10,15,0.65)          │
│                              │
│       WEATHER                │
│       72°                    │
│                              │
└──────────────────────────────┘
```

### Rounded

Use moderately rounded cards rather than excessive pill-shaped UI.

### Calm

Avoid:

* Excessive animations
* Flashing elements
* Dense layouts
* Constant notifications
* Advertising
* Aggressive recommendation systems

---

# 22. Backgrounds

The Home screen can use dynamic backgrounds.

Possible sources:

* Local images
* User-selected images
* Unsplash
* NASA imagery
* Weather-dependent backgrounds
* Time-of-day backgrounds
* Seasonal backgrounds

Example:

```text
Morning → bright landscape

Afternoon → blue sky

Evening → sunset

Night → dark landscape / stars
```

Backgrounds should remain subtle enough that text and cards remain readable.

---

# 23. Time-of-Day Modes

The application can adapt its presentation throughout the day.

## Morning

```text
GOOD MORNING

☀️ 68°

Today's schedule
Weather
Traffic
Activity
```

## Afternoon

```text
GOOD AFTERNOON

72° · Sunny

Upcoming events
Activity
Calendar
```

## Evening

```text
GOOD EVENING

72° · Clear · 8:42 PM

Tomorrow
Continue Watching
Relax & Unwind
```

## Weekend

```text
SATURDAY

72° · Sunny

Nothing scheduled today 🎉

Movies
Family activities
Weather
```

---

# 24. Focus Animation

Focus animation should be quick and subtle.

Example:

```text
Unfocused:
scale: 1.00

Focused:
scale: 1.04–1.06
```

Animation duration:

```text
~150–250ms
```

Avoid large bouncing animations.

The user should immediately understand:

> **This is the item my remote is currently controlling.**

---

# 25. Data Architecture

Potential data sources:

| Feature       | Data Source       |
| ------------- | ----------------- |
| Weather       | Weather API       |
| Calendar      | Google Calendar   |
| Activity      | Health Connect    |
| Movies/TV     | TMDB              |
| Watch history | Local database    |
| Watchlist     | Local database    |
| Profiles      | Local database    |
| Smart Home    | Home Assistant    |
| News          | Optional news API |

External API data should be cached when appropriate.

The Home screen should remain functional even when a service is temporarily unavailable.

---

# 26. Suggested State/Data Structure

Conceptually:

```text
App
│
├── User/Profile
│
├── Home
│   ├── Weather
│   ├── Calendar
│   ├── Activity
│   └── Watch
│
├── Watch
│   ├── Continue Watching
│   ├── Watchlist
│   ├── Recently Watched
│   └── Suggestions
│
├── Favorites
│   └── Custom Widgets
│
└── Settings
    ├── Profiles
    ├── Appearance
    ├── Widgets
    ├── Connections
    └── Ambient Mode
```

---

# 27. MVP Development Plan

Do not build everything at once.

## Phase 1 — Visual Prototype

Build the Home screen with mock data.

Implement:

* Background
* Clock
* Greeting
* Weather card
* Calendar card
* Activity card
* Continue Watching
* Bottom navigation
* Focus states

Goal:

> Make the application look and feel excellent before integrating APIs.

---

## Phase 2 — Real APIs

Add:

* Weather API
* Calendar
* TMDB
* Local watchlist

Goal:

> Replace mock data with useful real-world information.

---

## Phase 3 — Personalization

Add:

* Profiles
* Favorites
* Widget configuration
* Custom Home layout
* Persistent preferences

Goal:

> Make the dashboard feel like it belongs to the user.

---

## Phase 4 — TV Polish

Focus heavily on:

* D-pad navigation
* Focus transitions
* Edge behavior
* Carousel navigation
* Back button behavior
* Performance
* TV readability
* Accessibility

Goal:

> Make it feel like a native TV application rather than a mobile application running on a TV.

---

## Phase 5 — Ambient Mode

Add:

* Screensaver
* Time-of-day backgrounds
* Photo mode
* Minimal information mode
* Automatic transitions

Goal:

> Make the TV useful even when nobody is actively watching.

---

## Phase 6 — Smart Home

Potential integrations:

* Home Assistant
* Lights
* Thermostat
* Locks
* Garage
* Sensors

Goal:

> Turn the TV into a household information and control center.

---

# 28. Long-Term Product Concept

The eventual experience should feel like:

```text
                    ┌─────────────────┐
                    │     MY TV       │
                    └────────┬────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
          INFORMATION    ENTERTAINMENT    HOME
             │               │               │
        ┌────┼────┐      ┌───┼────┐      ┌───┼────┐
        │    │    │      │   │    │      │   │    │
     Weather Cal Activity Watch List History Lights Thermostat
        │    │    │      │   │    │      │   │    │
        └────┴────┘      └───┴────┘      └───┴────┘
```

The TV becomes:

> **A personal household operating system.**

Not a streaming launcher.

Not an advertising platform.

Not an endless content feed.

A calm, useful screen that belongs to the people living in the home.

---

# 29. Guiding Principles

When deciding whether to add a feature, ask:

### 1. Does it make the TV more useful?

### 2. Can it be understood from across the room?

### 3. Can it be controlled easily with a D-pad?

### 4. Does it respect the user's attention?

### 5. Does it avoid unnecessary advertising?

### 6. Does it feel personal?

### 7. Does it make sense on a TV rather than simply being a mobile feature enlarged?

If the answer to most of these is no, the feature probably doesn't belong.

---

# 30. The North Star

The application should make someone walk into the room, glance at the TV, and immediately know:

> **What time is it?**
> **What's the weather?**
> **What's happening today?**
> **What's coming tomorrow?**
> **How am I doing?**
> **What was I watching?**
> **What can I do next?**

And if they aren't watching anything:

> **The TV is still useful.**
