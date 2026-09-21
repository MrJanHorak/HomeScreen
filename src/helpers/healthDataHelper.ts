export const calculateStepPercentages = (
  steps: number,
  stepGoal: number,
  // progress: number,
): { stepPercentage: number; stepPercentageLeft: number } => {
  const stepPercentage = steps / stepGoal;
  const percentageLeftTillGoalReached = 1 - stepPercentage;

  return {
    stepPercentage: stepPercentage * 100,
    stepPercentageLeft: percentageLeftTillGoalReached * 100,
  };
};
