import Datastore from 'nedb-promises';
import path from 'path';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

export const minersDb = Datastore.create(path.resolve(process.cwd(), 'data', 'miners.db'));

export const createMiner = (data) => minersDb.insert({
  ...data,
  _id: uuidV4(),
  timestampUpdated: moment().unix(),
  timestampCreated: moment().unix(),
});

minersDb.ensureIndex({ fieldName: 'serialId', unique: true });

export const updateMiner = (id, data) => minersDb.update({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
}, { multi: false });

export const setMinerFields = (id, data) => minersDb.updateOne(
  { _id: id }, { $set: { ...data, timestampUpdated: moment().unix() } },
);
