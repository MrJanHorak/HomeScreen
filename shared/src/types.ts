// shared/src/types.ts

export interface WeatherForecast {
  day: string;
  condition: string;
  icon: string;
  high: number;
  low: number;
}

export interface Weather {
  temp: string;
  condition: string;
  location?: string;
  temperature?: number;
  feelsLike?: number;
  conditionIcon?: string;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  high?: number;
  low?: number;
  forecast?: WeatherForecast[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime: string;
  category: string;
  color: string;
  date?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  due: string | null;
  completed?: boolean;
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

export interface DashboardSummaryResponse {
  schedule: CalendarEvent[];
  tasks: TaskItem[];
  health: Activity;
  weather: Weather;
  updatedAt: string;
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

export interface DevicePairingResponse {
  code: string;
  verificationUrl: string;
  expiresIn: number;
}