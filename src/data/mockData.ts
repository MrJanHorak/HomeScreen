export const mockUser = {
  id: "user-001",
  name: "Jan",
  firstName: "Jan",
  avatar: null,
};

export const mockDateTime = {
  dayOfWeek: "Wednesday",
  month: "September",
  day: 9,
  year: 2026,
  time: "8:42 PM",
  greeting: "Good evening",
};

// --------------------------------------------------
// WEATHER
// --------------------------------------------------

export const mockWeather = {
  location: "Home",
  temperature: 72,
  feelsLike: 70,
  condition: "Clear",
  conditionIcon: "moon",
  humidity: 54,
  windSpeed: 4,
  windDirection: "NW",

  high: 78,
  low: 61,

  forecast: [
    {
      day: "Thu",
      condition: "Partly Cloudy",
      icon: "cloud-sun",
      high: 79,
      low: 62,
    },
    {
      day: "Fri",
      condition: "Sunny",
      icon: "sun",
      high: 82,
      low: 64,
    },
    {
      day: "Sat",
      condition: "Mostly Sunny",
      icon: "sun",
      high: 84,
      low: 66,
    },
    {
      day: "Sun",
      condition: "Scattered Rain",
      icon: "cloud-rain",
      high: 76,
      low: 63,
    },
    // {
    //   day: "Mon",
    //   condition: "Severe Thunderstorms",
    //   icon: "cloud-rain",
    //   high: 76,
    //   low: 63,
    // },
  ],
};

// --------------------------------------------------
// CALENDAR
// --------------------------------------------------

export const mockCalendarEvents = [
  {
    id: "event-001",
    title: "Team Standup",
    time: "9:00 AM",
    endTime: "9:30 AM",
    category: "work",
    color: "blue",
  },
  {
    id: "event-002",
    title: "Software Engineering Class",
    time: "10:00 AM",
    endTime: "12:00 PM",
    category: "work",
    color: "purple",
  },
  {
    id: "event-003",
    title: "Lunch",
    time: "12:30 PM",
    endTime: "1:30 PM",
    category: "personal",
    color: "green",
  },
  {
    id: "event-004",
    title: "Project Planning",
    time: "3:00 PM",
    endTime: "4:00 PM",
    category: "work",
    color: "orange",
  },
  {
    id: "event-005",
    title: "Relax & Unwind",
    time: "8:00 PM",
    endTime: "10:00 PM",
    category: "personal",
    color: "purple",
  },
];

export const mockUpcomingEvents = [
  {
    id: "event-006",
    title: "Coffee with Sarah",
    date: "Tomorrow",
    time: "10:00 AM",
  },
  {
    id: "event-007",
    title: "Dentist Appointment",
    date: "Friday",
    time: "2:30 PM",
  },
  {
    id: "event-008",
    title: "Family Dinner",
    date: "Saturday",
    time: "6:00 PM",
  },
];

// --------------------------------------------------
// ACTIVITY
// --------------------------------------------------

export const mockActivity = {
  steps: 1000,
  stepGoal: 10000,

  distance: 6.2,
  distanceGoal: 8,

  calories: 428,

  activeMinutes: 74,

  progress: .01
};

// --------------------------------------------------
// CONTINUE WATCHING
// --------------------------------------------------

export const mockContinueWatching = [
  {
    id: "movie-001",
    title: "The Bear",
    type: "TV",
    season: 3,
    episode: 5,
    episodeTitle: "Children",
    progress: 0.72,
    duration: "38 min",
    remaining: "11 min",
    image: "the-bear",
  },

  {
    id: "movie-002",
    title: "Stranger Things",
    type: "TV",
    season: 4,
    episode: 3,
    episodeTitle: "The Monster and the Superhero",
    progress: 0.43,
    duration: "1 hr 4 min",
    remaining: "36 min",
    image: "stranger-things",
  },

  {
    id: "movie-003",
    title: "Dune",
    type: "Movie",
    progress: 0.61,
    duration: "2 hr 46 min",
    remaining: "1 hr 5 min",
    image: "dune",
  },

  {
    id: "movie-004",
    title: "Fallout",
    type: "TV",
    season: 1,
    episode: 6,
    episodeTitle: "The Trap",
    progress: 0.28,
    duration: "58 min",
    remaining: "42 min",
    image: "fallout",
  },

  {
    id: "movie-005",
    title: "The Mandalorian",
    type: "TV",
    season: 3,
    episode: 2,
    episodeTitle: "The Mines of Mandalore",
    progress: 0.84,
    duration: "42 min",
    remaining: "7 min",
    image: "mandalorian",
  },
];

// --------------------------------------------------
// WATCHLIST
// --------------------------------------------------

export const mockWatchlist = [
  {
    id: "watch-001",
    title: "Severance",
    type: "TV",
    year: 2025,
    genre: "Sci-Fi / Thriller",
    image: "severance",
  },

  {
    id: "watch-002",
    title: "The Last of Us",
    type: "TV",
    year: 2025,
    genre: "Drama",
    image: "last-of-us",
  },

  {
    id: "watch-003",
    title: "Interstellar",
    type: "Movie",
    year: 2014,
    genre: "Sci-Fi / Drama",
    image: "interstellar",
  },

  {
    id: "watch-004",
    title: "Oppenheimer",
    type: "Movie",
    year: 2023,
    genre: "Drama / History",
    image: "oppenheimer",
  },

  {
    id: "watch-005",
    title: "Andor",
    type: "TV",
    year: 2025,
    genre: "Sci-Fi / Adventure",
    image: "andor",
  },
];

// --------------------------------------------------
// RECENTLY WATCHED
// --------------------------------------------------

export const mockRecentlyWatched = [
  {
    id: "recent-001",
    title: "The Bear",
    watched: "Today",
    image: "the-bear",
  },

  {
    id: "recent-002",
    title: "Dune",
    watched: "Yesterday",
    image: "dune",
  },

  {
    id: "recent-003",
    title: "Fallout",
    watched: "Monday",
    image: "fallout",
  },

  {
    id: "recent-004",
    title: "The Mandalorian",
    watched: "Sunday",
    image: "mandalorian",
  },
];

// --------------------------------------------------
// PERSONAL SUGGESTIONS
// --------------------------------------------------

export const mockSuggestions = [
  {
    id: "suggestion-001",
    title: "Blade Runner 2049",
    reason: "Because you watched Dune",
    genre: "Sci-Fi",
    rating: 8.0,
    year: 2017,
    image: "blade-runner-2049",
  },

  {
    id: "suggestion-002",
    title: "True Detective",
    reason: "Based on your recent viewing",
    genre: "Crime / Drama",
    rating: 8.9,
    year: 2014,
    image: "true-detective",
  },

  {
    id: "suggestion-003",
    title: "Arrival",
    reason: "You might enjoy this",
    genre: "Sci-Fi / Drama",
    rating: 7.9,
    year: 2016,
    image: "arrival",
  },

  {
    id: "suggestion-004",
    title: "The Expanse",
    reason: "Because you like sci-fi",
    genre: "Sci-Fi",
    rating: 8.5,
    year: 2015,
    image: "the-expanse",
  },
];

// --------------------------------------------------
// FAVORITE DASHBOARD WIDGETS
// --------------------------------------------------

export const mockFavoriteWidgets = [
  {
    id: "widget-weather",
    type: "weather",
    title: "Weather",
    enabled: true,
    position: 1,
  },

  {
    id: "widget-calendar",
    type: "calendar",
    title: "Calendar",
    enabled: true,
    position: 2,
  },

  {
    id: "widget-activity",
    type: "activity",
    title: "Activity",
    enabled: true,
    position: 3,
  },

  {
    id: "widget-watchlist",
    type: "watchlist",
    title: "Watchlist",
    enabled: true,
    position: 4,
  },

  {
    id: "widget-sports",
    type: "sports",
    title: "Sports",
    enabled: false,
    position: 5,
  },

  {
    id: "widget-news",
    type: "news",
    title: "News",
    enabled: false,
    position: 6,
  },

  {
    id: "widget-smart-home",
    type: "smart-home",
    title: "Smart Home",
    enabled: false,
    position: 7,
  },
];

// --------------------------------------------------
// NAVIGATION
// --------------------------------------------------

export const mockNavigation = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    route: "Home",
  },

  {
    id: "calendar",
    label: "Calendar",
    icon: "calendar",
    route: "Calendar",
  },

  {
    id: "watch",
    label: "Watch",
    icon: "play",
    route: "Watch",
  },

  {
    id: "favorites",
    label: "Favorites",
    icon: "star",
    route: "Favorites",
  },

  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    route: "Settings",
  },
];

// --------------------------------------------------
// PROFILE OPTIONS
// --------------------------------------------------

export const mockProfiles = [
  {
    id: "profile-jan",
    name: "Jan",
    avatar: null,
  },

  {
    id: "profile-family",
    name: "Family",
    avatar: null,
  },

  {
    id: "profile-guest",
    name: "Guest",
    avatar: null,
  },
];

// --------------------------------------------------
// HOME SCREEN DATA
// --------------------------------------------------

export const mockHomeData = {
  user: mockUser,
  dateTime: mockDateTime,
  weather: mockWeather,
  calendar: mockCalendarEvents,
  activity: mockActivity,
  continueWatching: mockContinueWatching,
  navigation: mockNavigation,
};