import {HealthDay} from "../types";
import {PrototypeDay, MetricResult} from "./googleHealthPrototype";

type Difference = {status: "compared"; percent: number} |
  {status: "health_missing" | "health_unavailable" | "fit_zero_or_missing" | "fit_missing"};
export interface ComparisonDay {date: string; steps: Difference; distance: Difference; calories: Difference}

function compareMetric(health: MetricResult<number>, fit: number | undefined): Difference {
  if (health.status === "missing") return {status: "health_missing"};
  if (health.status === "unavailable") return {status: "health_unavailable"};
  if (fit === undefined || !Number.isFinite(fit) || fit < 0) return {status: "fit_missing"};
  // Fit fills absent data with zero; it cannot distinguish a genuine zero here.
  if (fit === 0) return {status: "fit_zero_or_missing"};
  const percent = Math.round((health.value - fit) / fit * 1000) / 10;
  return Number.isFinite(percent) ? {status: "compared", percent} : {status: "fit_missing"};
}

/** Relative differences only for completed matching dates; no raw health values. */
export function compareCompletedHealthDays(health: PrototypeDay[], fit: HealthDay[], today: string): ComparisonDay[] {
  const fitByDate = new Map(fit.map((day) => [day.date, day]));
  return health.filter((day) => day.date < today).map((day) => {
    const other = fitByDate.get(day.date);
    return {date: day.date, steps: compareMetric(day.steps, other?.steps),
      distance: compareMetric(day.distanceKm, other?.distance), calories: compareMetric(day.calories, other?.calories)};
  });
}
