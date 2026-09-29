import { onRequest } from "firebase-functions/v2/https";
import { authenticatedUserId } from "./utils/requestAuth";
import { fetchLocalWeather } from "./services/weatherService";

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
    if (!await authenticatedUserId(req)) {
      res.status(401).json({ error: "Valid Firebase ID token required" });
      return;
    }
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    if (!city || city.length > 100) {
      res.status(400).json({ error: "A city name is required" });
      return;
    }
    const weather = await fetchLocalWeather(city);
    res.status(200).json(weather);
  }
);
