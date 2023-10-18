import mongoose from 'mongoose';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

// Create a Mongoose schema based on the JSON schema
const MetricSchema = new mongoose.Schema({
  co: Number,
  dust1: Number,
  co2: Number,
  pressure: Number,
  dust25: Number,
  humidity: Number,
  dust10: Number,
  quality: Number,
  temperature: Number,
  state: String,
  serialId: String,
  hasUser: Boolean,
  minerId: String,
  _id: String,
  timestampUpdated: Number,
  timestampCreated: Number,
});

// Create a Mongoose model for the metrics
const MetricModel = mongoose.model('Metric', MetricSchema);

export const metricsDb = MetricModel;

// Function to create a new metric document
export const createMetric = (data) => {
  const metric = new MetricModel({
    ...data,
    _id: uuidV4(),
    timestampUpdated: moment().unix(),
    timestampCreated: moment().unix(),
  });
  return metric.save();
};

// Function to update a metric document by ID
export const updateMetric = (id, data) => MetricModel.updateOne(
  { _id: id },
  {
    ...data,
    timestampUpdated: moment().unix(),
  },
);

// Function to set a specific metric field for a miner by ID
export const setMetric = (id, metric, data) => MetricModel.updateOne(
  { minerId: id },
  {
    $set: {
      [metric]: data,
      timestampUpdated: moment().unix(),
    },
  },
);
