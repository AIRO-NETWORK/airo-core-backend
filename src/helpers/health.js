/**
 * Calculates the health of the user based on their total rewards and current AIRO balance.
 * @param {number} totalRewards - The total rewards earned by the user.
 * @param {number} currentAIRO - The current AIRO balance of the user.
 * @returns {number} The health of the user.
 */
export const getHealth = (totalRewards, currentAIRO) => {
  // If the total rewards is 0, the user is considered to be in perfect health.
  if (totalRewards === 0) {
    return 100;
  }

  // Calculate the bag balance by taking the minimum value between total rewards and current AIRO balance.
  const bagBalance = Math.min(totalRewards, currentAIRO);

  // Calculate the bag balance ratio by dividing the bag balance by the total rewards.
  const bagBalanceRatio = bagBalance / totalRewards;

  // Calculate the health by multiplying the bag balance ratio by 50 and adding 50.
  const health = 50 * bagBalanceRatio + 50;

  // Return the calculated health.
  return health;
};
