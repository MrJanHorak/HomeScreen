export const GOAL_OVERFLOW_COLOR = '#FBBF24';

/** Derive progress from counts, since older summaries cap their progress at 1. */
export function goalProgress(steps: number, goal: number): number {
  return Number.isFinite(steps) && Number.isFinite(goal) && goal > 0
    ? Math.max(0, steps / goal) : 0;
}

export function goalProgressLayers(progress: number) {
  const value = Number.isFinite(progress) ? Math.max(0, progress) : 0;
  return {
    value,
    percent: Math.round(value * 100),
    base: Math.min(1, value),
    overflow: Math.min(1, Math.max(0, value - 1)),
  };
}
