```
HomeScreen (inside TVScreenWrapper)
 ├── Top Bar Header (Greeting, Clock, Date, Weather) [Section 5]
 │
 ├── TVSection: "Overview Grid" (3 Columns) [Section 5]
 │    ├── WeatherCard (TVCard)  -> Temp, conditions, forecast [Section 5]
 │    ├── TodayCard (TVCard)    -> Today's calendar events [Section 5]
 │    └── ActivityCard (TVCard) -> Step counts, miles [Section 5]
 │
 ├── TVSection: "Continue Watching" (Horizontal Row / Carousel) [Section 5, 20]
 │    └── TVCarousel [Section 17, 20]
 │         ├── MovieCard (TVCard) -> Dune + progress bar [Section 5]
 │         ├── MovieCard (TVCard) -> The Bear + progress bar [Section 5]
 │         └── MovieCard (TVCard) ...
 │
 └── TVNavigation / Bottom Nav Bar [Section 4]
      └── Navigation Items (TVCard or TVButton) [Section 4, 17]