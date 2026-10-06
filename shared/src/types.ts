export interface SavedLocation {
  id: string;
  name: string;
  query: string;
  isDefault?: boolean;
}

export interface UserPreferences {
  savedLocations: SavedLocation[];
  activeLocationId: string;
  stepGoal: number;
  distanceGoal: number;
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
  /** Absolute occurrence bounds; optional for compatibility with cached/older feeds. */
  startMs?: number;
  endMs?: number;
  allDay?: boolean;
  timeZone?: string;
}

export interface MealPlanItem {
  date: string;
  title: string;
  side?: string;
  cook?: string;
  servings?: string;
  recipeId?: string;
  note?: string;
  recipeUrl?: string;
}

export interface MealPlanSummary {
  status: 'ok' | 'not_connected' | 'unavailable';
  items: MealPlanItem[];
  message?: string;
}

export interface TaskItem {
  id: string;
  tasklistId?: string;
  title: string;
  due: string | null;
  completed?: boolean;
}

export interface Activity {
  status?: 'ok' | 'not_connected' | 'unavailable';
  message?: string;
  steps: number;
  stepGoal: number;
  distance: number;
  distanceGoal: number;
  calories: number;
  activeMinutes: number | null;
  progress: number;
  weekly?: ActivityDay[];
  fetchedAt?: string;
  stepsRecordedThrough?: string;
  caloriesRecordedThrough?: string;
  estimatedRestingCalories?: number;
}

export interface ActivityDay {
  date: string;
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number | null;
}

export interface DashboardSummaryResponse {
  schedule: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  meals: MealPlanSummary;
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
