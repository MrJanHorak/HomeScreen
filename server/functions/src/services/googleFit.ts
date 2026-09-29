import { google } from "googleapis";
import { GoogleTokens, HealthSummary } from "../types";
import { getOAuth2Client } from "./googleAuth";

/**
 * Fetch daily health activity (steps, calories, distance, active minutes) from Google Fit
 */
export async function fetchHealthData(
  tokens: GoogleTokens,
  goals: { stepGoal?: number; distanceGoal?: number } = {}
): Promise<HealthSummary> {
  const stepGoal = goals.stepGoal || 10000;
  const distanceGoal = goals.distanceGoal || 8;

  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return {
      steps: 0,
      stepGoal,
      distance: 0,
      distanceGoal,
      calories: 0,
      activeMinutes: 0,
      progress: 0,
    };
  }

  const auth = getOAuth2Client(tokens);
  const fitness = google.fitness({ version: "v1", auth });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const startTimeMillis = startOfDay.getTime();
  const endTimeMillis = now.getTime();

  try {
    const response = await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [
          // This is the merged step stream used for Google Fit's daily total.
          { dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps" },
          { dataTypeName: "com.google.calories.expended" },
          { dataTypeName: "com.google.distance.delta" },
          { dataTypeName: "com.google.active_minutes" },
        ],
        bucketByTime: { durationMillis: (endTimeMillis - startTimeMillis).toString() },
        startTimeMillis: startTimeMillis.toString(),
        endTimeMillis: endTimeMillis.toString(),
      },
    });

    let steps = 0;
    let calories = 0;
    let distanceMeters = 0;
    let activeMinutes = 0;

    const buckets = response.data.bucket || [];
    for (const bucket of buckets) {
      for (const dataset of bucket.dataset || []) {
        const source = dataset.dataSourceId || "";
        const points = dataset.point || [];

        for (const pt of points) {
          const val = pt.value?.[0];
          if (!val) continue;

          if (source.includes("step_count")) {
            steps += val.intVal || 0;
          } else if (source.includes("calories")) {
            calories += Math.round(val.fpVal || 0);
          } else if (source.includes("distance")) {
            distanceMeters += val.fpVal || 0;
          } else if (source.includes("active_minutes")) {
            // com.google.active_minutes stores duration in milliseconds.
            activeMinutes += (val.intVal || 0) / 60000;
          }
        }
      }
    }

    const distanceKm = Number((distanceMeters / 1000).toFixed(1));
    const progress = stepGoal > 0 ? Number(Math.min(1, steps / stepGoal).toFixed(2)) : 0;

    return {
      steps,
      stepGoal,
      distance: distanceKm,
      distanceGoal,
      calories,
      activeMinutes: Math.round(activeMinutes),
      progress,
    };
  } catch (error) {
    console.error("Error fetching Google Fit data:", error);
    // Return safe fallback values if Google Fit API is not authorized or errors
    return {
      steps: 0,
      stepGoal,
      distance: 0,
      distanceGoal,
      calories: 0,
      activeMinutes: 0,
      progress: 0,
    };
  }
}
