export interface GoogleTokens {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiryDate?: number;
  scope?: string;
}

export interface UserLocation {
  lat?: number;
  lon?: number;
  city?: string;
  units?: "metric" | "imperial";
}

export interface SavedLocation {
  id: string;
  name: string;
  query: string;
  isDefault?: boolean;
}

export interface StoredUserTokens {
  google: GoogleTokens;
  location?: UserLocation;
  weatherCity?: string;
  savedLocations?: SavedLocation[];
  stepGoal?: number;
  distanceGoal?: number;
}


export interface CalendarEventSummary {
  id: string;
  title: string;
  time: string;
  endTime: string;
  category: string;
  color: string;
  date?: string;
}

export interface TaskSummary {
  id: string;
  tasklistId?: string;
  title: string;
  due: string | null;
  completed?: boolean;
}

export interface HealthSummary {
  status: "ok" | "not_connected" | "unavailable";
  message?: string;
  steps: number;
  stepGoal: number;
  distance: number;
  distanceGoal: number;
  calories: number;
  activeMinutes: number | null;
  progress: number;
  weekly: HealthDay[];
  fetchedAt?: string;
  stepsRecordedThrough?: string;
  caloriesRecordedThrough?: string;
  estimatedRestingCalories?: number;
}

export interface HealthDay {
  date: string;
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number | null;
}

export interface WeatherForecastItem {
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

export interface WeatherSummary {
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
  forecast?: WeatherForecastItem[];
  hourly?: HourlyForecastItem[];
}

export interface DashboardSummaryResponse {
  schedule: CalendarEventSummary[];
  tasks: TaskSummary[];
  health: HealthSummary;
  weather: WeatherSummary;
  savedLocations?: SavedLocation[];
  updatedAt: string;
}


export interface DevicePairingCode {
  code: string;
  status: "pending" | "authorized" | "expired";
  createdAt: number;
  expiresAt: number;
  userId?: string;
  customToken?: string;
  pollSecretHash: string;
}
