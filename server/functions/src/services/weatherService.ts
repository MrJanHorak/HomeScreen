import { UserLocation, WeatherForecastItem, WeatherSummary } from "../types";

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

/**
 * Fetch local weather and 5-day forecast from OpenWeatherMap
 */
export async function fetchLocalWeather(
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
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${queryParam}&appid=${apiKey}&units=${units}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${queryParam}&appid=${apiKey}&units=${units}`),
    ]);

    if (!currentRes.ok) {
      throw new Error(`OpenWeather API error: ${currentRes.status} ${currentRes.statusText}`);
    }

    const currentData = await currentRes.json();
    const forecastData = forecastRes.ok ? await forecastRes.json() : null;

    const weatherMain = currentData.weather?.[0]?.main || "Clear";
    const iconCode = currentData.weather?.[0]?.icon || "01d";
    const temp = Math.round(currentData.main?.temp ?? 70);
    const feelsLike = Math.round(currentData.main?.feels_like ?? temp);
    const high = Math.round(currentData.main?.temp_max ?? temp);
    const low = Math.round(currentData.main?.temp_min ?? temp);
    const humidity = currentData.main?.humidity ?? 50;
    const windSpeed = Math.round(currentData.wind?.speed ?? 0);
    const windDirection = getWindDirection(currentData.wind?.deg ?? 0);

    // Extract daily forecast (aggregating 3-hour slices)
    const forecast: WeatherForecastItem[] = [];
    if (forecastData?.list && Array.isArray(forecastData.list)) {
      const dailyMap: Record<string, { high: number; low: number; conditions: string[]; icons: string[] }> = {};

      for (const item of forecastData.list) {
        const date = new Date(item.dt * 1000);
        const dayStr = date.toLocaleDateString("en-US", { weekday: "short" });
        const itemTemp = item.main?.temp;
        const itemCondition = item.weather?.[0]?.main || "Clear";
        const itemIcon = item.weather?.[0]?.icon || "01d";

        if (!dailyMap[dayStr]) {
          dailyMap[dayStr] = {
            high: itemTemp,
            low: itemTemp,
            conditions: [itemCondition],
            icons: [itemIcon],
          };
        } else {
          dailyMap[dayStr].high = Math.max(dailyMap[dayStr].high, itemTemp);
          dailyMap[dayStr].low = Math.min(dailyMap[dayStr].low, itemTemp);
          dailyMap[dayStr].conditions.push(itemCondition);
          dailyMap[dayStr].icons.push(itemIcon);
        }
      }

      // Take first 4 days excluding today
      const todayStr = new Date().toLocaleDateString("en-US", { weekday: "short" });
      for (const [day, values] of Object.entries(dailyMap)) {
        if (day === todayStr) continue;
        if (forecast.length >= 4) break;

        const primaryCondition = values.conditions[Math.floor(values.conditions.length / 2)] || "Clear";
        const primaryIcon = values.icons[Math.floor(values.icons.length / 2)] || "01d";

        forecast.push({
          day,
          condition: primaryCondition,
          icon: mapWeatherIcon(primaryCondition, primaryIcon),
          high: Math.round(values.high),
          low: Math.round(values.low),
        });
      }
    }

    return {
      temp: `${temp}°`,
      condition: weatherMain,
      temperature: temp,
      feelsLike,
      conditionIcon: mapWeatherIcon(weatherMain, iconCode),
      humidity,
      windSpeed,
      windDirection,
      high,
      low,
      forecast,
    };
  } catch (error) {
    console.error("Error fetching OpenWeather data:", error);
    return {
      temp: "--",
      condition: "Unknown",
    };
  }
}
