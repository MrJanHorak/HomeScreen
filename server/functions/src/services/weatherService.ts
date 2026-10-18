import { HourlyForecastItem, UserLocation, WeatherForecastItem, WeatherSummary } from "../types";
import * as crypto from "crypto";
import {Timestamp} from "firebase-admin/firestore";
import {db} from "../utils/db";
import {logSafeError} from "../utils/safeLog";

function mapWeatherIcon(weatherMain: string, iconCode: string): string {
  const isNight = iconCode.endsWith("n");
  const main = weatherMain.toLowerCase();

  if (main.includes("clear")) {
    return isNight ? "moon" : "sun";
  }
  if (main.includes("cloud")) {
    return isNight ? "cloud-moon" : "cloud-sun";
  }
  if (main.includes("rain") || main.includes("drizzle") || main.includes("thunderstorm")) {
    return "cloud-rain";
  }
  if (main.includes("snow")) {
    return "snowflake";
  }
  return isNight ? "moon" : "sun";
}

function getWindDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index] || "N";
}

interface OpenWeatherCurrent {
  name?: string;
  dt?: number;
  timezone?: number;
  coord?: {lat: number; lon: number};
  sys?: {country?: string};
  main?: {temp?: number; feels_like?: number; humidity?: number; pressure?: number};
  weather?: {main: string; icon: string}[];
  wind?: {speed?: number; deg?: number};
}

interface OpenWeatherForecast {
  city?: {timezone?: number};
  list?: {dt: number; main?: {temp?: number}; weather?: {main: string; icon: string}[]; pop?: number}[];
}

/**
 * Fetch local weather and 5-day forecast from OpenWeatherMap
 */
async function fetchWeatherUncached(
  location?: UserLocation | string
): Promise<WeatherSummary> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Do not present sample conditions as live weather.
  if (!apiKey) {
    return {
      temp: "--",
      condition: "Unavailable",
    };
  }

  let queryParam = "q=New+York";
  if (typeof location === "string" && location.trim().length > 0) {
    queryParam = `q=${encodeURIComponent(location.trim())}`;
  } else if (location && typeof location === "object") {
    if (location.lat !== undefined && location.lon !== undefined) {
      queryParam = `lat=${location.lat}&lon=${location.lon}`;
    } else if (location.city) {
      queryParam = `q=${encodeURIComponent(location.city)}`;
    }
  }

  const units = "imperial"; // Default Fahrenheit, matches client mock

  try {
    const [currentResult, forecastResult] = await Promise.allSettled([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${queryParam}&appid=${apiKey}&units=${units}`,
        {signal: AbortSignal.timeout(10_000)}),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${queryParam}&appid=${apiKey}&units=${units}`,
        {signal: AbortSignal.timeout(10_000)}),
    ]);

    if (currentResult.status === "rejected") throw currentResult.reason;
    const currentRes = currentResult.value;
    if (!currentRes.ok) {
      throw new Error(`OpenWeather API error: ${currentRes.status} ${currentRes.statusText}`);
    }

    const currentData = await currentRes.json();
    // Forecast outages must not discard successful current conditions.
    let forecastData = null;
    if (forecastResult.status === "fulfilled" && forecastResult.value.ok) {
      try {
        forecastData = await forecastResult.value.json();
      } catch {
        // Current conditions are still useful.
      }
    }
    return buildWeatherSummary(currentData, forecastData);
  } catch (error) {
    logSafeError("Error fetching OpenWeather data", error);
    return {temp: "--", condition: "Unknown"};
  }
}

/** The free forecast contains future three-hour samples, not full-day extrema. */
export function buildWeatherSummary(
  currentData: OpenWeatherCurrent, forecastData: OpenWeatherForecast | null, nowMs = Date.now()
): WeatherSummary {
  if (!Number.isFinite(currentData.main?.temp)) throw new Error("Current weather temperature is missing");
  const weatherMain = currentData.weather?.[0]?.main || "Clear";
  const iconCode = currentData.weather?.[0]?.icon || "01d";
  const temp = Math.round(currentData.main!.temp!);
  const feelsLike = Math.round(currentData.main?.feels_like ?? temp);
  const humidity = currentData.main?.humidity ?? 50;
  const windSpeed = Math.round(currentData.wind?.speed ?? 0);
  const windDirection = getWindDirection(currentData.wind?.deg ?? 0);

  // Extract daily forecast (aggregating 3-hour slices)
  const forecast: WeatherForecastItem[] = [];
  const hourly: HourlyForecastItem[] = [];
  let todayRange: {high: number; low: number} | undefined;
  const utcOffsetSeconds = currentData.timezone ?? forecastData?.city?.timezone ?? 0;
  const todayKey = new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 10);
  if (forecastData?.list && Array.isArray(forecastData.list)) {
    const dailyMap: Record<string, { day: string; high: number; low: number; conditions: string[]; icons: string[] }> = {};

    for (const item of [...forecastData.list].sort((a, b) => a.dt - b.dt)) {
      // A cached upstream forecast may still include past or malformed samples.
      if (!Number.isFinite(item.dt) || item.dt * 1000 < nowMs ||
        typeof item.main?.temp !== "number" || !Number.isFinite(item.main.temp)) continue;
      const localDate = new Date((item.dt + utcOffsetSeconds) * 1000);
      const dateKey = localDate.toISOString().slice(0, 10);
      const dayStr = localDate.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const itemTemp = item.main.temp;
      const itemCondition = item.weather?.[0]?.main || "Clear";
      const itemIcon = item.weather?.[0]?.icon || "01d";

      if (hourly.length < 7) {
        hourly.push({
          time: localDate.toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" }),
          temp: Math.round(itemTemp ?? temp),
          icon: mapWeatherIcon(itemCondition, itemIcon),
          pop: `${Math.round((item.pop ?? 0) * 100)}%`,
        });
      }

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          day: dayStr,
          high: itemTemp,
          low: itemTemp,
          conditions: [itemCondition],
          icons: [itemIcon],
        };
      } else {
        dailyMap[dateKey].high = Math.max(dailyMap[dateKey].high, itemTemp);
        dailyMap[dateKey].low = Math.min(dailyMap[dateKey].low, itemTemp);
        dailyMap[dateKey].conditions.push(itemCondition);
        dailyMap[dateKey].icons.push(itemIcon);
      }
    }

    if (dailyMap[todayKey]) {
      todayRange = {high: Math.round(dailyMap[todayKey].high), low: Math.round(dailyMap[todayKey].low)};
    }
    // Take first 4 days excluding today.
    for (const [dateKey, values] of Object.entries(dailyMap)) {
      if (dateKey === todayKey) continue;
      if (forecast.length >= 4) break;

      const primaryCondition = values.conditions[Math.floor(values.conditions.length / 2)] || "Clear";
      const primaryIcon = values.icons[Math.floor(values.icons.length / 2)] || "01d";

      forecast.push({
        day: values.day,
        condition: primaryCondition,
        icon: mapWeatherIcon(primaryCondition, primaryIcon),
        high: Math.round(values.high),
        low: Math.round(values.low),
      });
    }
  }

  return {
    ...(currentData.name && {location: currentData.name}),
    fetchedAt: new Date(nowMs).toISOString(),
    ...(typeof currentData.dt === "number" && Number.isFinite(currentData.dt) && currentData.dt > 0 &&
      {observedAt: new Date(currentData.dt * 1000).toISOString()}),
    timezoneOffset: utcOffsetSeconds,
    ...(currentData.coord && Number.isFinite(currentData.coord.lat) && Number.isFinite(currentData.coord.lon) &&
      {resolvedLocation: {name: currentData.name || "Weather location", ...currentData.coord,
        ...(currentData.sys?.country && {country: currentData.sys.country})}}),
    temp: `${temp}°`,
    condition: weatherMain,
    temperature: temp,
    feelsLike,
    conditionIcon: mapWeatherIcon(weatherMain, iconCode),
    humidity,
    windSpeed,
    windDirection,
    ...(typeof currentData.main?.pressure === "number" && {pressure: currentData.main.pressure}),
    ...(todayRange && {high: todayRange.high, low: todayRange.low, highLowPeriod: "rest_of_day" as const}),
    forecast,
    hourly,
  };
}

/** Match city strings and legacy city objects, ignoring unrelated unit preferences. */
export function weatherCacheKey(location?: UserLocation | string): string {
  const query = typeof location === "object" && location.lat !== undefined && location.lon !== undefined ?
    `coordinates:${location.lat},${location.lon}` :
    (typeof location === "string" ? location : location?.city) || "New York";
  return crypto.createHash("sha256").update(`v2:imperial:${query.trim().toLowerCase().replace(/\s*,\s*/g, ",").replace(/\s+/g, " ")}`).digest("hex");
}

const pending = new Map<string, Promise<WeatherSummary>>();

/** Weather can be shared between users without storing an identifying city in the document ID. */
export async function fetchLocalWeather(location?: UserLocation | string): Promise<WeatherSummary> {
  const key = weatherCacheKey(location);
  const existing = pending.get(key);
  if (existing) return existing;
  const request = fetchCachedWeather(key, location);
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}

async function fetchCachedWeather(key: string, location?: UserLocation | string): Promise<WeatherSummary> {
  const ref = db.collection("weather_cache").doc(key);
  try {
    const snapshot = await ref.get();
    const cached = snapshot.data();
    if (typeof cached?.cachedAtMs === "number" && Date.now() >= cached.cachedAtMs &&
      Date.now() - cached.cachedAtMs < 10 * 60 * 1000) return cached.weather as WeatherSummary;
  } catch {
    // Weather still works if the shared cache is unavailable.
  }
  const weather = await fetchWeatherUncached(location);
  if (weather.condition !== "Unavailable" && weather.condition !== "Unknown") {
    try {
      await ref.set({weather, cachedAtMs: Date.now(),
        deleteAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)});
    } catch {
      // A cache failure must not hide a successful weather lookup.
    }
  }
  return weather;
}
