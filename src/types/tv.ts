// src/types/tv.ts

export interface WeatherForecast {
  day: string;
  condition: string;
  icon: string;
  high: number;
  low: number;
}

export interface Weather {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  conditionIcon: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  high: number;
  low: number;
  forecast: WeatherForecast[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime: string;
  category: string;
  color: string;
}

export interface Activity {
  steps: number;
  stepGoal: number;
  distance: number;
  distanceGoal: number;
  calories: number;
  activeMinutes: number;
  progress: number;
}

export interface MediaItem {
  id: string;
  title: string;
  type: "TV" | "Movie";
  image: string;
  progress?: number;
  duration?: string;
  remaining?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}