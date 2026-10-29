import {MetricResult, PrototypeDay} from "./googleHealthPrototype";

/** Staged contract: consumers must handle each metric's availability explicitly. */
export interface GoogleHealthSummary {
  provider: "google_health";
  stepGoal: number;
  distanceGoal: number;
  progress: MetricResult<number>;
  today: PrototypeDay;
  weekly: PrototypeDay[];
  fetchedAt: string;
}

/** Map rollups without treating missing data as zero or equating activity levels with Fit Move Minutes. */
export function makeGoogleHealthSummary(days: PrototypeDay[],
  goals: {stepGoal: number; distanceGoal: number}, fetchedAt: Date): GoogleHealthSummary {
  if (days.length !== 7 || days.some((day, index) => index > 0 && day.date <= days[index - 1].date)) {
    throw new Error("Expected seven ordered, distinct daily rollups");
  }
  if (!Number.isFinite(goals.stepGoal) || goals.stepGoal <= 0 ||
      !Number.isFinite(goals.distanceGoal) || goals.distanceGoal <= 0 ||
      !Number.isFinite(fetchedAt.getTime())) {
    throw new Error("Expected positive goals and a valid fetch time");
  }
  const today = days[days.length - 1];
  const progress: MetricResult<number> = today.steps.status === "ok" ?
    {status: "ok", value: Math.min(1, today.steps.value / goals.stepGoal)} :
    {status: today.steps.status};
  return {provider: "google_health", ...goals, progress, today, weekly: days,
    fetchedAt: fetchedAt.toISOString()};
}
