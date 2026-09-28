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

export interface StoredUserTokens {
  google: GoogleTokens;
  location?: UserLocation;
  weatherCity?: string;
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
  title: string;
  due: string | null;
  completed?: boolean;
}

export interface HealthSummary {
  steps: number;
  stepGoal: number;
  distance: number;
  distanceGoal: number;
  calories: number;
  activeMinutes: number;
  progress: number;
}

export interface WeatherForecastItem {
  day: string;
  condition: string;
  icon: string;
  high: number;
  low: number;
}

export interface WeatherSummary {
  temp: string;
  condition: string;
  temperature?: number;
  feelsLike?: number;
  conditionIcon?: string;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  high?: number;
  low?: number;
  forecast?: WeatherForecastItem[];
}

export interface DashboardSummaryResponse {
  schedule: CalendarEventSummary[];
  tasks: TaskSummary[];
  health: HealthSummary;
  weather: WeatherSummary;
  updatedAt: string;
}

export interface DevicePairingCode {
  code: string;
  status: "pending" | "authorized" | "expired";
  createdAt: number;
  expiresAt: number;
  userId?: string;
  customToken?: string;
}
