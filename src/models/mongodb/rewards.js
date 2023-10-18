import mongoose from 'mongoose';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

// Define a Mongoose schema for the rewards collection
const rewardSchema = new mongoose.Schema({
  total: Number,
  weeklyReward: Number,
  totalWeeks: Number,
  weeksLeft: Number,
  startWeek: Number,
  endWeek: Number,
  startDate: Number,
  endDate: Number,
  _id: String,
  timestampUpdated: Number,
  timestampCreated: Number,
});

// Create a Mongoose model for the rewards collection
const RewardModel = mongoose.model('Reward', rewardSchema);

export const rewardsDb = RewardModel;

export const createReward = (data) => {
  // Generate a new _id for the reward document
  const reward = new RewardModel({
    ...data,
    _id: uuidV4(),
    timestampUpdated: moment().unix(),
    timestampCreated: moment().unix(),
  });

  // Save the reward document to the database
  return reward.save();
};

// Update the reward document with the provided _id
export const updateReward = (id, data) => RewardModel.findOneAndUpdate({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
});

// Update specific fields of the reward document
export const setRewardFields = (id, data) => RewardModel.findOneAndUpdate({ _id: id }, {
  $set: { ...data, timestampUpdated: moment().unix() },
});
