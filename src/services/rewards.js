import cron from 'node-cron';
import moment from 'moment';
import EventEmitter from 'node:events';
import { fixed, dateToCron } from '../utils';
import models from '../models';
import { getTotalMiners } from '../helpers/miners';
import {
  COUNT_PERIOD_METRICS,
  COUNT_PERIOD_REWARD,
  PERIOD_REWARD,
} from '../config/config';
import { getHealth } from '../helpers/health';

/**
 * Event emitter for rewards.
 */
export const eventRewards = new EventEmitter();

/**
 * Holds the timestamp of the last fetched reward.
 */
let lastFetched = moment().unix();

const scheduleOptions = {
  scheduled: true,
  recoverMissedExecutions: true,
};

/**
 * Finds the uptime and weekly reward for a user.
 *
 * @param {string} userId - The user ID.
 * @returns {Promise<Object>} - An object containing uptime and weekly reward.
 */
export const findUptimeAndWeeklyReward = async (userId) => {
  // Find the active reward period
  const reward = await models.rewardsDb.findOne({
    startDate: { $lte: moment().unix() },
    endDate: { $gte: moment().unix() },
    weeksLeft: { $gt: 0 },
  });

  if (!reward) {
    return reward;
  }

  // Retrieve the list of total miners in this reward period
  const totalMiners = await getTotalMiners(reward.startWeek);
  let uptimeInMinutes = 0;
  let userMinersCount = 0;
  let totalMinersCount = 0;

  // Calculate uptime and count miners in the reward period
  await Promise.all(totalMiners.map(async (minerId) => {
    const miner = await models.minersDb.findOne({
      _id: minerId,
      ageRate: { $gt: 0 },
      $and: [
        { userId: { $ne: null } },
        { userId: { $ne: '' } },
      ],
    });

    if (miner) totalMinersCount += 1;
    return miner;
  }));

  await Promise.all(totalMiners.map(async (minerId) => {
    const miner = await models.minersDb.findOne({
      _id: minerId,
      userId,
      ageRate: { $gt: 0 },
      $and: [
        { userId: { $ne: null } },
        { userId: { $ne: '' } },
      ],
    });

    if (!miner) return;

    // Count the number of metrics recorded in the reward period
    const metricCount = await models.metricsDb.count({
      minerId,
      timestampCreated: { $gte: reward.startWeek },
      state: 'ready',
    });

    uptimeInMinutes += metricCount * 2;
    userMinersCount += 1;
  }));

  return {
    uptime: uptimeInMinutes,
    weeklyReward: fixed(
      (totalMiners.length ? (reward.weeklyReward / totalMinersCount) : 0) * userMinersCount,
    ),
  };
};

/**
 * Assigns reward based on uptime, age rate, health rate, and reward.
 *
 * @param {number} uptimeRate - Uptime rate.
 * @param {number} ageRate - Age rate.
 * @param {number} healthRate - Health rate.
 * @param {number} reward - Reward value.
 * @returns {number} - Assigned reward.
 */
const assignReward = (uptimeRate, ageRate = 100, healthRate, reward = 100) => fixed(
  uptimeRate * ((ageRate + healthRate) / 200) * reward,
  5,
);

/**
 * Finds the coefficient based on current and total values.
 *
 * @param {number} current - Current value.
 * @param {number} total - Total value.
 * @returns {number} - Coefficient.
 */
const findCoefficient = (current, total) => {
  const currentCoeff = current / total;
  return Math.round(currentCoeff * 10) / 10;
};

/**
 * Performs the reward distribution.
 */
async function rewardDistribution() {
  // Find the active reward period
  const reward = await models.rewardsDb.findOne({
    startDate: { $lte: moment().unix() },
    endDate: { $gte: moment().unix() },
    weeksLeft: { $gt: 0 },
  });

  if (!reward) {
    console.log('Reward for distribution not found in the current period');
    return reward;
  }

  const totalMiners = await getTotalMiners();
  let totalMinersCount = 0;

  // Count the total active miners
  await Promise.all(totalMiners.map(async (minerId) => {
    const miner = await models.minersDb.findOne({
      _id: minerId,
      ageRate: { $gt: 0 },
      $and: [
        { userId: { $ne: null } },
        { userId: { $ne: '' } },
      ],
    });

    if (miner) totalMinersCount += 1;
    return miner;
  }));

  // Iterate through each miner to assign rewards
  await Promise.all(totalMiners.map(async (minerId) => {
    const miner = await models.minersDb.findOne({
      _id: minerId,
      ageRate: { $gt: 0 },
      $and: [
        { userId: { $ne: null } },
        { userId: { $ne: '' } },
      ],
    });

    if (!miner) return;

    // Count the number of metrics recorded in the reward period
    const metricCount = await models.metricsDb.count({
      minerId,
      timestampCreated: { $gt: reward.startWeek },
      state: 'ready',
    });

    // Calculate health rate
    const health = getHealth(miner.totalRewards, miner.currentAIRO);

    // Calculate uptime rate coefficient
    const uptimeRate = findCoefficient(metricCount, COUNT_PERIOD_REWARD);

    // Calculate reward for one miner
    const rewardForOneMiner = reward.weeklyReward / totalMinersCount;

    // Calculate the current reward for the miner
    const currentReward = assignReward(uptimeRate, miner.ageRate, health, rewardForOneMiner);

    // Update miner fields and create a transaction record
    await models.setMinerFields(minerId, {
      currentAIRO: fixed(+miner.currentAIRO + currentReward, 6),
      totalRewards: fixed(+miner.totalRewards + currentReward, 6),
      ageRate: miner.ageRate - uptimeRate,
    });

    if (currentReward !== 0) {
      await models.createTransaction({
        userId: miner.userId,
        status: 'success',
        ageRate: miner.ageRate,
        uptimeRate,
        metricCount: metricCount * COUNT_PERIOD_METRICS,
        health,
        reward: reward.weeklyReward,
        activeMiners: totalMinersCount,
        rewardForOneMiner,
        value: currentReward,
        type: 'REWARD',
        minerId,
      });
    }
  }));

  // Update the reward period
  await models.setRewardFields(reward._id, {
    startWeek: reward.endWeek,
    endWeek: reward.endWeek + PERIOD_REWARD,
    weeksLeft: reward.weeksLeft - 1,
  });

  // Update the last fetched timestamp
  lastFetched = moment().unix();
  return lastFetched;
}

/**
 * Gets the current reward period.
 *
 * @returns {Promise<Object>} - The current reward period.
 */
const getCurrentRewardPeriod = async () => {
  // Find the active reward period, or the upcoming one if none is active
  const reward = await models.rewardsDb.findOne({
    startDate: { $lte: moment().unix() },
    endDate: { $gte: moment().unix() },
    weeksLeft: { $gt: 0 },
  }) || await models.rewardsDb.findOne({
    startDate: { $gt: moment().unix() },
    endDate: { $gt: moment().unix() },
    weeksLeft: { $gt: 0 },
  });
  return reward;
};

/**
 * Initializes the reward period.
 */
const initial = async () => {
  const reward = await getCurrentRewardPeriod();
  if (reward && (reward.startWeek < moment().unix() || !reward?.startWeek)) {
    // Update the reward period with the current timestamp and end date
    await models.setRewardFields(reward._id, {
      startWeek: moment().unix(),
      endWeek: moment().unix() + PERIOD_REWARD,
      endDate: moment().unix() + PERIOD_REWARD * reward.weeksLeft,
    });
  }
  return reward;
};

/**
 * Assigns the reward job using a cron schedule.
 */
const assignRewardJob = async () => {
  let reward = await getCurrentRewardPeriod();
  const task = reward?.endWeek ? cron.schedule(dateToCron(reward.endWeek), async () => {
    await rewardDistribution();
    eventRewards.emit('assigned');
  }, scheduleOptions) : cron.schedule('* * * * *', async () => {
    reward = await getCurrentRewardPeriod();
    if (reward) {
      eventRewards.emit('assigned');
    }
  });
  return task;
};

/**
 * Starts the reward job.
 */
const startRewardJob = async () => {
  // Initialize the reward period
  await initial();
  let task = await assignRewardJob();
  eventRewards.on('assigned', async () => {
    // Stop the previous task and assign a new one
    task.stop();
    task = await assignRewardJob();
  });
};

// Initialize and start the reward job.
startRewardJob();
