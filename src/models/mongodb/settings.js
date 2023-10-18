// Import required modules and dependencies
import mongoose from 'mongoose';
import { v4 as uuidV4 } from 'uuid';
import moment from 'moment';

// Define the Mongoose schema
const settingsSchema = new mongoose.Schema({
  metrics: [String],
  minerId: String,
  timestampUpdated: Number,
  _id: String,
});

// Create the Mongoose model
const SettingsModel = mongoose.model('Settings', settingsSchema);

export const settingsDb = SettingsModel;

// Function to create a new settings document
export const createSettings = async (data) => {
  const newSettings = new SettingsModel({
    ...data,
    _id: uuidV4(),
    timestampUpdated: moment().unix(),
  });

  return newSettings.save();
};

// Function to update an existing settings document
export const updateSettings = async (id, data) => {
  const updatedSettings = await SettingsModel.findOneAndUpdate(
    { _id: id },
    {
      ...data,
      timestampUpdated: moment().unix(),
    },
    { new: true },
  );

  return updatedSettings;
};
