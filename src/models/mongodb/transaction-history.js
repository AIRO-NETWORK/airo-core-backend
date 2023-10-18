import mongoose from 'mongoose';
import { v4 as uuidV4 } from 'uuid';
import moment from 'moment';

const transactionHistorySchema = new mongoose.Schema({
  userId: String,
  status: String,
  ageRate: Number,
  uptimeRate: Number,
  metricCount: Number,
  health: Number,
  reward: Number,
  activeMiners: Number,
  rewardForOneMiner: Number,
  value: Number,
  type: String,
  minerId: String,
  timestampUpdated: Number,
  timestampCreated: Number,
});

const TransactionHistoryModel = mongoose.model('TransactionHistory', transactionHistorySchema);

export const transactionHistoryDb = TransactionHistoryModel;

export const createTransaction = (data) => {
  const record = new TransactionHistoryModel({
    ...data,
    _id: uuidV4(),
    timestampUpdated: moment().unix(),
    timestampCreated: moment().unix(),
  });
  return record.save();
};

export const updateTransaction = (id, data) => TransactionHistoryModel.updateOne(
  { _id: id },
  {
    ...data,
    timestampUpdated: moment().unix(),
  },
);
