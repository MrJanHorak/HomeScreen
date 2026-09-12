# HomeScreen <i>(working title)</i>

A personal, ad-free smart TV dashboard built with **React Native** and designed specifically for **Android TV / 10-foot interfaces**.

The goal is to create a TV experience that is useful even when you're not actively watching something — providing a quick glance at the information, entertainment, and activities that matter to you and your family.

> **The TV belongs to the owner, not the advertisers.**

---

## 🚧 Project Status

**Early development — Phase 1: UI Prototype**

Currently focusing on:

* TV-first UI and visual design
* D-pad navigation and focus behavior
* Reusable TV components
* Mock data
* 16:9 (1920×1080 for mock-up / **3840 × 2160 (4K UHD)** for implementation) layout
* Home dashboard
* Calendar
* Watch / media sections
* Favorites
* Settings

External APIs and persistent user data will be introduced in later phases.

---

## 🎯 Vision

This project is intended to become a **personal household information and entertainment dashboard**, rather than another streaming launcher.

The home screen should answer:

> **"What's going on right now?"**

At a glance, users should be able to see:

* 🕐 Current time
* 🌤️ Weather
* 📅 Today's schedule
* 👟 Activity / step count
* 🎬 Continue watching
* ⭐ Favorites
* 📺 Watchlist
* 🏠 Smart-home information
* 📰 Optional news and information

The dashboard should remain calm, useful, and personal rather than becoming another source of advertising or endless content feeds.

---

## 🖥️ Design Philosophy

The interface is designed for **10-foot viewing** and remote control.

### Core principles

1. **Readable from across the room**
2. **Large, clear typography**
3. **Generous spacing**
4. **Obvious focus states**
5. **Predictable D-pad navigation**
6. **Minimal visual clutter**
7. **Respect the user's attention**
8. **Personal rather than advertiser-driven**
9. **TV-first rather than mobile UI scaled up**
10. **Useful even when nobody is actively watching**

---

## 🧭 Planned Navigation

```text
Home
├── Calendar
├── Watch
├── Favorites
└── Settings
```

Additional functionality will live within these primary sections.

---

## 🏠 Home Dashboard

The Home screen is intended to provide a quick overview of the household.

### Current concept

* Personalized greeting
* Date and large clock
* Current weather
* Weather forecast
* Today's calendar
* Activity progress
* Continue Watching
* Quick navigation

Example:

```text
┌──────────────────────────────────────────────────────────────┐
│ Good evening, Jan                          8:42 PM            │
│ Wednesday, September 9, 2026                                  │
│                                                               │
│ ┌──────────────────┐  ┌──────────────────┐                   │
│ │     WEATHER      │  │      TODAY       │                   │
│ │      72°F        │  │  9:00  Standup   │                   │
│ │      Clear       │  │ 10:00  Class     │                   │
│ │  H 78°  L 61°    │  │  3:00  Planning  │                   │
│ └──────────────────┘  └──────────────────┘                   │
│                                                               │
│ ┌──────────────────┐                                          │
│ │     ACTIVITY     │                                          │
│ │    7,842 steps   │                                          │
│ │    ████████░░    │                                          │
│ └──────────────────┘                                          │
│                                                               │
│ Continue Watching                                              │
│ [ The Bear ] [ Stranger Things ] [ Dune ] [ Fallout ]        │
│                                                               │
│ Home   Calendar   Watch   Favorites   Settings                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧩 Planned TV Component System

Rather than relying entirely on a general-purpose mobile component library, the project will use a small internal TV component system.

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

The components will encapsulate TV-specific behavior such as:

* D-pad focus
* Focus animations
* Scale effects
* Visual focus indicators
* Press feedback
* Accessibility
* Spatial navigation
* Consistent spacing and typography

---

## 📐 Target Display

Primary design target:

**3840 × 2160 (4K UHD)**

The interface should also scale appropriately to other common TV resolutions while maintaining the 10-foot viewing experience.

---

## 🛠️ Technology

### Current

* React Native
* React Native for TV
* TypeScript
* React Navigation
* Reanimated
* Local mock data

### Planned

* Weather API
* Google Calendar
* TMDB
* Health Connect
* Local persistence
* Family profiles
* Customizable widgets
* Ambient Mode
* Smart-home integration
* Home Assistant
* Optional AI-powered information/search features

---

## 📊 Mock Data

Phase 1 uses local mock data so the UI can be developed independently of external services.

Planned mock data includes:

```text
User
├── Profile
├── Greeting
└── Preferences

Weather
├── Current conditions
├── High / Low
└── Forecast

Calendar
├── Today's events
└── Upcoming events

Activity
├── Steps
├── Distance
├── Calories
└── Active minutes

Media
├── Continue Watching
├── Watchlist
├── Recently Watched
└── Suggestions

Dashboard
└── Favorite Widgets
```

---

## 🖼️ Image & Media Assets

### Background Image

Photo by **Jonatan Pie** on Unsplash.

[View photographer on Unsplash](https://unsplash.com/@r3dmax)

[View original photograph](https://unsplash.com/photos/silhouette-of-off-road-car-h8nxGssjQXs)

The image is used as a visual/design asset for the dashboard prototype.

### TV & Movie Artwork

Mock TV and movie media artwork is sourced from **TMDB (The Movie Database)** for development and UI prototyping.

[TMDB](https://www.themoviedb.org/)

> Media artwork is used for development/prototyping purposes and is subject to the respective rights and licensing of the content owners.

### NASA / ESA / Hubble

Space and astronomy imagery may be sourced from:

* NASA
* ESA
* Hubble Space Telescope

These assets are intended primarily for future **Ambient Mode**, backgrounds, and informational displays.

[NASA](https://www.nasa.gov/)

[ESA](https://www.esa.int/)

[Hubble Space Telescope](https://science.nasa.gov/mission/hubble/)

---

## 🗺️ Development Roadmap

### Phase 1 — UI Prototype

* [ ] Project structure
* [ ] TV theme/design tokens
* [ ] Home screen
* [ ] TV typography
* [ ] TV cards
* [ ] Focus states
* [ ] D-pad navigation
* [ ] Calendar screen
* [ ] Watch screen
* [ ] Favorites screen
* [ ] Settings screen
* [ ] Mock media artwork
* [ ] 1920×1080 polish

### Phase 2 — Real Data

* [ ] Weather API
* [ ] Calendar integration
* [ ] TMDB integration
* [ ] Watchlist persistence
* [ ] Recently watched
* [ ] Continue Watching

### Phase 3 — Personalization

* [ ] Family profiles
* [ ] Custom dashboard
* [ ] Widget configuration
* [ ] Favorite widgets
* [ ] Persistent preferences
* [ ] Custom layouts

### Phase 4 — TV Polish

* [ ] Advanced focus management
* [ ] Focus transitions
* [ ] Remote navigation
* [ ] Back-button behavior
* [ ] Performance optimization
* [ ] Accessibility
* [ ] TV readability testing

### Phase 5 — Ambient Mode

* [ ] Information mode
* [ ] Photo mode
* [ ] NASA / Hubble imagery
* [ ] Time-of-day backgrounds
* [ ] Weather-aware backgrounds
* [ ] Screensaver behavior
* [ ] Automatic transitions

### Phase 6 — Smart Home

Potential integrations:

* [ ] Home Assistant
* [ ] Thermostat
* [ ] Lights
* [ ] Door / garage status
* [ ] Sensors
* [ ] Home energy information

---

## 💡 Long-Term Concept

The long-term goal is to explore the idea of a **personal household operating system for the TV**.

Not:

> "Which streaming service should I watch?"

But:

> "What's happening in my world?"

The TV becomes a shared household information surface combining:

**Information + Entertainment + Activity + Personalization + Smart Home**

while remaining calm, private, and free from advertising.

---

## 📜 License

This project is currently a personal development project.

Third-party assets, artwork, photographs, logos, and media remain the property of their respective owners and are subject to their respective licenses and terms of use.