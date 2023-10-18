import Datastore from 'nedb-promises';
import path from 'path';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';

export const transactionHistoryDb = Datastore.create(path.resolve(process.cwd(), 'data', 'transaction-history.db'));

export const createTransaction = (data) => transactionHistoryDb.insert({
  ...data,
  _id: uuidV4(),
  timestampUpdated: moment().unix(),
  timestampCreated: moment().unix(),
});

export const updateTransaction = (id, data) => transactionHistoryDb.update({ _id: id }, {
  ...data,
  timestampUpdated: moment().unix(),
}, { multi: false });
