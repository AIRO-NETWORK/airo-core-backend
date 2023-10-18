import moment from 'moment';
import models from '../models';
import { PERIOD_REWARD } from '../config/config';

/**
 * Gets the total number of miners who have earned rewards in the specified time period.
 * @param {number} lastFetched - The timestamp of the last time the function was called.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of unique miner IDs.
 */
export const getTotalMiners = async (lastFetched = null) => {
  // Find all metrics that were created after the last fetch time or within the reward period.
  const metrics = await models.metricsDb.find({
    timestampCreated: { $gte: lastFetched || moment().unix() - PERIOD_REWARD },
    state: 'ready',
    hasUser: true,
  });

  // Get an array of unique miner IDs from the metrics.
  const totalMiners = [...new Set(metrics.map((miner) => miner.minerId))];

  // Return the array of unique miner IDs.
  return totalMiners;
};
