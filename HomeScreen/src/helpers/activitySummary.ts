import type { ActivityDay } from '../../../shared/src/types';

export interface WeeklyActivitySummary {
  steps: number;
  averageSteps: number;
  distance: number;
  calories: number;
  moveMinutes: number | null;
  daysWithMoveMinutes: number;
}

/** Missing Move Minutes remain distinct from a recorded zero. */
export function summarizeActivityWeek(
  weekly: ActivityDay[],
): WeeklyActivitySummary {
  let steps = 0;
  let distance = 0;
  let calories = 0;
  let moveMinutes = 0;
  let daysWithMoveMinutes = 0;
  for (const day of weekly) {
    steps += day.steps;
    distance += day.distance;
    calories += day.calories;
    if (day.activeMinutes != null) {
      moveMinutes += day.activeMinutes;
      daysWithMoveMinutes += 1;
    }
  }
  return {
    steps,
    averageSteps: weekly.length ? Math.round(steps / weekly.length) : 0,
    distance,
    calories,
    moveMinutes: daysWithMoveMinutes ? moveMinutes : null,
    daysWithMoveMinutes,
  };
}

export function activityChartPeak(
  weekly: ActivityDay[],
  stepGoal: number,
): number {
  return Math.max(stepGoal, ...weekly.map((day) => day.steps), 1);
}

/** Keep a positive day's bar visible without fabricating activity on a zero day. */
export function activityBarPercent(steps: number, peak: number): number {
  return Math.max(steps > 0 ? 3 : 0, (steps / peak) * 100);
}
