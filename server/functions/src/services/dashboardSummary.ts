import {DashboardSummaryResponse, HealthSummary, StoredUserTokens} from "../types";
import {getStoredUserTokens} from "../utils/db";
import {boundSummary} from "../utils/summary";
import {fetchCalendarEvents} from "./googleCalendar";
import {fetchActiveTasks} from "./googleTasks";
import {fetchHealthData} from "./googleFit";
import {fetchLocalWeather} from "./weatherService";
import {fetchMealPlan} from "./mealSheet";
import {mergeDashboardSources} from "../utils/dashboardSources";

function unavailableHealth(tokens: StoredUserTokens): HealthSummary {
  return {
    status: "unavailable",
    message: "Google Fit activity is unavailable right now. Try refreshing later.",
    steps: 0,
    stepGoal: tokens.stepGoal || 10000,
    distance: 0,
    distanceGoal: tokens.distanceGoal || 8,
    calories: 0,
    activeMinutes: null,
    progress: 0,
    weekly: [],
  };
}

/** Fetch each data source independently so one failure leaves other cards usable. */
export async function fetchUserDashboard(userId: string, timeZone = "UTC", previous?: DashboardSummaryResponse): Promise<DashboardSummaryResponse> {
  const tokens = await getStoredUserTokens(userId);
  const [calendar, tasks, health, weather, meals] = await Promise.allSettled([
    fetchCalendarEvents(tokens.google),
    fetchActiveTasks(tokens.google),
    fetchHealthData(tokens.google, {
      stepGoal: tokens.stepGoal,
      distanceGoal: tokens.distanceGoal,
    }, timeZone),
    fetchLocalWeather(tokens.savedLocations?.find((loc) => loc.isDefault)?.query ||
      tokens.savedLocations?.[0]?.query || tokens.location || tokens.weatherCity),
    fetchMealPlan(tokens.mealSheet),
  ]);

  const updatedAt = new Date().toISOString();
  const connected = !!(tokens.google?.accessToken || tokens.google?.refreshToken);
  return mergeDashboardSources(previous, boundSummary({
    sources: {
      calendar: !connected ? {status: "not_connected"} : calendar.status === "fulfilled" ?
        {status: "ok", updatedAt} : {status: "unavailable"},
      tasks: !connected ? {status: "not_connected"} : tasks.status === "fulfilled" ?
        {status: "ok", updatedAt} : {status: "unavailable"},
    },
    schedule: calendar.status === "fulfilled" ? calendar.value.today : [],
    upcomingEvents: calendar.status === "fulfilled" ? calendar.value.upcoming : [],
    tasks: tasks.status === "fulfilled" ? tasks.value : [],
    health: health.status === "fulfilled" ? health.value : unavailableHealth(tokens),
    weather: weather.status === "fulfilled" ? weather.value : {temp: "--", condition: "Unknown"},
    meals: meals.status === "fulfilled" ? meals.value : {
      status: "unavailable", items: [], message: "Meal plan is unavailable.",
    },
    savedLocations: tokens.savedLocations,
    updatedAt,
  }));
}
