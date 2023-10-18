import Datastore from 'nedb-promises';
import path from 'path';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

export const rewardsDb = Datastore.create(path.resolve(process.cwd(), 'data', 'rewards.db'));

export const createReward = (data) => rewardsDb.insert({
  ...data,
  _id: uuidV4(),
  timestampUpdated: moment().unix(),
  timestampCreated: moment().unix(),
});

export const updateReward = (id, data) => rewardsDb.update({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
}, { multi: false });

export const setRewardFields = (id, data) => rewardsDb.updateOne(
  { _id: id }, { $set: { ...data, timestampUpdated: moment().unix() } },
);
