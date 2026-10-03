import { onRequest } from "firebase-functions/v2/https";
import { authenticatedUserId } from "./utils/requestAuth";
import { fetchLocalWeather } from "./services/weatherService";
import {recordUserQuota} from "./utils/db";

/** Live weather for a city selected in the TV's saved locations. */
export const getLocationWeatherHandler = onRequest(
  { cors: true, maxInstances: 10, secrets: ["OPENWEATHER_API_KEY"] },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Valid Firebase ID token required" });
      return;
    }
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    if (!city || city.length > 100) {
      res.status(400).json({ error: "A city name is required" });
      return;
    }
    if (!await recordUserQuota(userId, "weather", 60, 60 * 60 * 1000)) {
      res.status(429).json({error: "Too many weather lookups"});
      return;
    }
    const weather = await fetchLocalWeather(city);
    res.status(200).json(weather);
  }
);
