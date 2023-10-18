import mongoose from 'mongoose';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

// Define the Miner schema
const minerSchema = new mongoose.Schema({
  name: String,
  model: String,
  serialId: { type: String, unique: true },
  userId: String,
  connectDate: Number,
  currentAIRO: Number,
  ageRate: Number,
  totalRewards: Number,
  wallet: String,
  _id: String,
  timestampUpdated: Number,
  timestampCreated: Number,
});

// Create the Miner model
const MinerModel = mongoose.model('Miner', minerSchema);

// Ensure a unique index on the serialId field
MinerModel.ensureIndexes({ serialId: 1 }, { unique: true });

export const minersDb = MinerModel;

export const createMiner = (data) => {
  const miner = new MinerModel({
    ...data,
    serialId: uuidV4(), // Generate a unique serialId
    timestampUpdated: moment().unix(),
    timestampCreated: moment().unix(),
  });
  return miner.save();
};

export const updateMiner = (id, data) => MinerModel.updateOne(
  { _id: id },
  {
    ...data,
    timestampUpdated: moment().unix(),
  },
);

export const setMinerFields = (id, data) => MinerModel.updateOne(
  { _id: id },
  {
    $set: {
      ...data,
      timestampUpdated: moment().unix(),
    },
  },
);
