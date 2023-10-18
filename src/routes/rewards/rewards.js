import moment from 'moment';
import { handler } from '../../middlewares/handler';
import models from '../../models';
import { ADMIN_ROLES, requireAdminAuth } from '../../middlewares/adminAuth';
import { validateRewardCreation } from './validation';
import { CLIENT_ROLES, requireClientAuth } from '../../middlewares/clientAuth';
import { fixed } from '../../utils';
import { PERIOD_REWARD } from '../../config/config';
import { eventRewards, findUptimeAndWeeklyReward } from '../../services/rewards';

/**
 * Populates reward data with additional information based on role and user ID.
 * @param {Object} reward - The reward object.
 * @param {string} role - The role of the user.
 * @param {string} userId - The user ID.
 * @returns {Object} - The populated reward object.
 */
const populateReward = async (reward, role = 'admin', userId = '') => {
  let info;
  if (role !== 'admin') {
    info = await findUptimeAndWeeklyReward(userId);
  }
  return {
    ...reward,
    id: reward?._id,
    uptime: info?.uptime ?? 0,
    maxWeeklyReward: info?.weeklyReward ?? 0,
  };
};

/**
 * Calculates reward elements such as weekly reward, end date, and next reward date.
 * @param {number} startDate - The start date of the reward period.
 * @param {number} total - The total reward amount.
 * @param {number} totalWeeks - The total number of weeks for the reward period.
 * @returns {Object} - The calculated reward elements.
 */
const calculateRewardElements = async (startDate, total, totalWeeks) => {
  const weeklyReward = fixed(total / totalWeeks, 6);
  const nextRewardDate = startDate + PERIOD_REWARD;
  const endDate = startDate + PERIOD_REWARD * totalWeeks;
  return { endDate, weeklyReward, nextRewardDate };
};

/**
 * Creates a new reward.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const createNewReward = async (req, res) => {
  const errors = await validateRewardCreation(req.body);
  if (errors.length) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }
  const { total, totalWeeks, startDate } = req.body;
  const { weeklyReward, endDate, nextRewardDate } = await calculateRewardElements(startDate, total, totalWeeks);
  const countCurrent = await models.rewardsDb.count({ weeksLeft: { $gte: 0 } });
  if (countCurrent > 0) {
    res.status(400).json({ message: 'Only one working reward period can exist' });
    return;
  }
  const reward = await models.createReward({
    total,
    weeklyReward,
    totalWeeks,
    weeksLeft: totalWeeks,
    startWeek: startDate,
    endWeek: nextRewardDate,
    startDate,
    endDate,
  });
  res.status(200).json(reward);
};

/**
 * Fetches rewards based on query parameters.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getRewards = async (req, res) => {
  const {
    _sort,
    _order,
    _start,
    _end,
    ...filter
  } = req.query;
  const {
    id,
    ...filterRest
  } = filter;
  const { role, id: userId } = req.user;
  const ids = id && (Array.isArray(id) ? id : [id]);
  const sortField = _sort;
  const sortOrder = _order === 'ASC' ? 1 : -1;
  const skip = +_start;
  const limit = +_end - skip;
  const builtFilter = {
    $and: [
      { _id: { $ne: null } },
      ids && { _id: { $in: ids } },
      filterRest,
      role === 'user' && { startDate: { $lte: moment().unix() }, endDate: { $gte: moment().unix() } },
    ].filter((item) => !!item && !!Object.keys(item).length),
  };

  const total = await models.rewardsDb.count(builtFilter);
  const rewards = await models.rewardsDb.find(builtFilter)
    .sort({ [sortField]: sortOrder }).skip(skip).limit(limit);
  let populatedItems;
  if (role !== 'admin') {
    populatedItems = await Promise.all(rewards.map(async (item) => populateReward(item, 'user', userId)));
  } else {
    populatedItems = await Promise.all(rewards.map(populateReward));
  }
  res
    .setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    .setHeader('X-Total-Count', total)
    .status(200)
    .json(populatedItems);
};
/**
 * Fetches a single reward by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getReward = async (req, res) => {
  const { id } = req.params;
  const item = await models.rewardsDb.findOne({ _id: id });
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const populatedItem = await populateReward(item);

  res.status(200).json(populatedItem);
};

/**
 * Updates a reward.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const updateRewardRoute = async (req, res) => {
  const { id } = req.params;
  const errors = await validateRewardCreation(req.body);
  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }
  const {
    total, startDate, timestampCreated, totalWeeks,
  } = req.body;
  const { weeklyReward, endDate, nextRewardDate } = await calculateRewardElements(startDate, total, totalWeeks);
  const updated = await models.updateReward(id, {
    total,
    weeklyReward,
    weeksLeft: totalWeeks,
    startDate,
    startWeek: startDate,
    endWeek: nextRewardDate,
    endDate,
    timestampCreated,
    totalWeeks,
  });
  if (!updated) {
    res.status(404).json({ error: 'Update failed' });
    return;
  }
  const item = await models.rewardsDb.findOne({ _id: id });
  const populatedItem = await populateReward(item);
  eventRewards.emit('assigned');
  res.status(200).json(populatedItem);
};

/**
 * Deletes a reward by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const deleteReward = async (req, res) => {
  const { id } = req.params;
  const removed = await models.rewardsDb.remove({ _id: id }, { multi: false });
  if (!removed) {
    res.status(404).json({ error: 'Remove failed' });
    return;
  }
  eventRewards.emit('assigned');
  res.status(200).json({ message: 'OK' });
};

/**
 * Sets up reward-related routes.
 * @param {Object} app - The express app.
 */
export default (app) => {
  app.get('/rewards', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getRewards));
  app.get('/rewards/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getReward));
  app.put('/rewards/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(updateRewardRoute));
  app.delete('/rewards/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(deleteReward));
  app.post('/rewards', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(createNewReward));
  app.get('/client-api/rewards',
    requireClientAuth([CLIENT_ROLES.ADMIN, CLIENT_ROLES.USER]), handler(getRewards));
};
