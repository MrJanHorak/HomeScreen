export interface SavedLocation {
  id: string;
  name: string;
  query: string;
  isDefault?: boolean;
}

export interface WeatherForecast {

  day: string;
  condition: string;
  icon: string;
  high: number;
  low: number;
}

export interface HourlyForecastItem {
  time: string;
  temp: number;
  icon: string;
  pop: string;
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
  pressure?: number;
  high?: number;
  low?: number;
  forecast?: WeatherForecast[];
  hourly?: HourlyForecastItem[];
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
  tasklistId?: string;
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
  savedLocations?: SavedLocation[];
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
  pollSecret: string;
  verificationUrl: string;
  expiresIn: number;
}
