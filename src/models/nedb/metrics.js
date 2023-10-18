import Datastore from 'nedb-promises';
import path from 'path';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

export const metricsDb = Datastore.create(path.resolve(process.cwd(), 'data', 'metrics.db'));

export const createMetric = (data) => metricsDb.insert({
  ...data,
  _id: uuidV4(),
  timestampUpdated: moment().unix(),
  timestampCreated: moment().unix(),
});

export const updateMetric = (id, data) => metricsDb.update({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
}, { multi: false });

export const setMetric = (id, metric, data) => metricsDb.updateOne(
  { minerId: id }, { $set: { [metric]: data, timestampUpdated: moment().unix() } },
);
