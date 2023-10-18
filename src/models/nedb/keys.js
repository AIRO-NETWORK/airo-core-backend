import Datastore from 'nedb-promises';
import path from 'path';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

export const keysDb = Datastore.create(path.resolve(process.cwd(), 'data', 'keys.db'));

export const createKey = (data) => keysDb.insert({
  ...data,
  _id: uuidV4(),
  timestampUpdated: moment().unix(),
  timestampCreated: moment().unix(),
});

keysDb.ensureIndex({ fieldName: 'type', unique: true });

export const updateKey = (id, data) => keysDb.update({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
}, { multi: false });
