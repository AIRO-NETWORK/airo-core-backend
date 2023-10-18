import mongoose from 'mongoose';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

// Define a Mongoose schema based on the JSON example
const keySchema = new mongoose.Schema({
  keyName: String,
  keyPassword: String,
  type: String,
  keyBody: String,
  _id: String,
  timestampUpdated: Number,
  timestampCreated: Number,
});

// Create a Mongoose model for the 'keys' collection using the schema
const KeyModel = mongoose.model('Key', keySchema);

// Ensure uniqueness constraint based on 'type' field
KeyModel.ensureIndexes({ type: 1 }, { unique: true });

// Export the functions to work with the 'keys' collection
export const keysDb = KeyModel;

// Create a new key
export const createKey = async (data) => {
  const key = new KeyModel({
    ...data,
    _id: uuidV4(),
    timestampUpdated: moment().unix(),
    timestampCreated: moment().unix(),
  });
  return key.save();
};

// Update an existing key
export const updateKey = (id, data) => KeyModel.updateOne({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
});
