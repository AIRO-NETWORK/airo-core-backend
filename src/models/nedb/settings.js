import Datastore from 'nedb-promises';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';
import moment from 'moment';

export const settingsDb = Datastore.create(path.resolve(process.cwd(), 'data', 'settings.db'));

export const createSettings = (data) => settingsDb.insert({
  ...data,
  _id: uuidV4(),
  timestampUpdated: moment().unix(),
  timestampCreated: moment().unix(),
});

settingsDb.ensureIndex({ fieldName: 'minerId', unique: true });

export const updateSettings = (id, data) => settingsDb.update({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
}, { multi: false });
